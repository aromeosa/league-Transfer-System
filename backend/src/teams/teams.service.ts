import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Player, PlayerOrigin, PlayerStatus, RosterHistory, Team, UserAccount, UserRole } from '../entities';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team) private readonly teamRepo: Repository<Team>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** League Admin only (§1.4 #11 — one-time setup ahead of a team's first window, no distinct off-season ruleset). */
  async createTeam(dto: CreateTeamDto): Promise<Team> {
    const existingOwner = await this.dataSource
      .getRepository(UserAccount)
      .findOne({ where: { email: dto.owner.email } });
    if (existingOwner) {
      throw new ConflictException('A user with this email already exists');
    }

    return this.dataSource.transaction(async (manager) => {
      const team = await manager.save(Team, manager.create(Team, { name: dto.name }));

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
}
