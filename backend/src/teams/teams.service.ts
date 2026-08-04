import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Player,
  PlayerOrigin,
  PlayerStatus,
  RosterHistory,
  Team,
  TeamStatus,
  UserAccount,
  UserRole,
} from '../entities';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** League Admin only — direct creation is already an implicit approval, so the team is ACTIVE immediately. */
  async createTeam(dto: CreateTeamDto): Promise<Team> {
    return this.createTeamRecord(dto, TeamStatus.ACTIVE);
  }

  /** Public self-registration — sits PENDING_APPROVAL until a League Admin approves or rejects it. */
  async registerTeam(dto: CreateTeamDto): Promise<Team> {
    return this.createTeamRecord(dto, TeamStatus.PENDING_APPROVAL);
  }

  private async createTeamRecord(dto: CreateTeamDto, status: TeamStatus): Promise<Team> {
    const existingOwner = await this.dataSource
      .getRepository(UserAccount)
      .findOne({ where: { email: dto.owner.email } });
    if (existingOwner) {
      throw new ConflictException('A user with this email already exists');
    }

    return this.dataSource.transaction(async (manager) => {
      const team = await manager.save(Team, manager.create(Team, { name: dto.name, status }));

      const passwordHash = await bcrypt.hash(dto.owner.password, 10);
      await manager.save(
        UserAccount,
        manager.create(UserAccount, {
          name: dto.owner.name,
          email: dto.owner.email,
          passwordHash,
          role: UserRole.TEAM_OWNER,
          team,
        }),
      );

      const players = dto.players.map((p) =>
        manager.create(Player, {
          name: p.name,
          currentTeam: team,
          status: PlayerStatus.REGISTERED,
          originType: PlayerOrigin.DIRECT_REGISTRATION,
          transferValue: p.transferValue ?? null,
          transferCount: 0,
        }),
      );
      const savedPlayers = await manager.save(Player, players);

      const joinedAt = new Date();
      await manager.save(
        RosterHistory,
        savedPlayers.map((player) => manager.create(RosterHistory, { player, team, joinedAt })),
      );

      return this.getTeam(team.id, manager.getRepository(Team));
    });
  }

  async getTeam(teamId: string, repo: Repository<Team> = this.teamRepo): Promise<Team> {
    const team = await repo.findOne({
      where: { id: teamId },
      relations: ['roster', 'ownerAccount'],
    });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  /** League Admin only — powers the pending-approval queue (and general team listing). */
  findAll(status?: TeamStatus): Promise<Team[]> {
    return this.teamRepo.find({
      where: status ? { status } : {},
      relations: ['roster', 'ownerAccount'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Public team directory — active teams and their rosters only. Deliberately doesn't
   * load `ownerAccount` (unlike `findAll`), so owner names/emails never reach this
   * unauthenticated response.
   */
  findPublicActive(): Promise<Team[]> {
    return this.teamRepo.find({
      where: { status: TeamStatus.ACTIVE },
      relations: ['roster'],
      order: { name: 'ASC' },
    });
  }

  async approve(teamId: string): Promise<Team> {
    return this.decide(teamId, TeamStatus.ACTIVE);
  }

  async reject(teamId: string): Promise<Team> {
    return this.decide(teamId, TeamStatus.REJECTED);
  }

  private async decide(teamId: string, next: TeamStatus): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.status !== TeamStatus.PENDING_APPROVAL) {
      throw new ConflictException(`Team is not pending approval (status: ${team.status})`);
    }
    team.status = next;
    await this.teamRepo.save(team);
    return this.getTeam(teamId);
  }
}
