import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  LegacyReason,
  LegacyTeam,
  Player,
  PlayerOrigin,
  PlayerStatus,
  RosterHistory,
  Team,
  TeamStatus,
  UserAccount,
  UserRole,
} from '../entities';
import { isUniqueViolation } from '../common/db-errors.util';
import { hashIdNumber } from '../players/id-number.util';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
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
    // Checked up front for a friendly error in the common case; the catch below is the
    // real guarantee — it closes the race where two signups with the same email both
    // pass this check before either commits (see PlayersService.registerFreeAgent for
    // the same pattern, since both roles share the one user_accounts.email uniqueness).
    const existingOwner = await this.dataSource
      .getRepository(UserAccount)
      .findOne({ where: { email: dto.owner.email } });
    if (existingOwner) {
      throw new ConflictException('A user with this email already exists');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const team = await manager.save(
          Team,
          manager.create(Team, { name: dto.name, status, logoUrl: dto.logoDataUrl ?? null }),
        );

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
            idNumberHash: p.idNumber ? hashIdNumber(p.idNumber) : null,
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
    } catch (err) {
      if (isUniqueViolation(err, 'email')) {
        throw new ConflictException('A user with this email already exists');
      }
      if (isUniqueViolation(err, 'id_number_hash')) {
        throw new ConflictException('One of these ID/passport numbers is already registered to another player');
      }
      throw err;
    }
  }

  /** Team Owner uploads/replaces their own team's logo — self-service, not window-locked. */
  async updateOwnLogo(logoDataUrl: string, actingUser: AuthenticatedUser): Promise<Team> {
    if (actingUser.role !== UserRole.TEAM_OWNER || !actingUser.teamId) {
      throw new ForbiddenException('Only a Team Owner may manage their own team logo');
    }
    const team = await this.teamRepo.findOne({ where: { id: actingUser.teamId } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    team.logoUrl = logoDataUrl;
    await this.teamRepo.save(team);
    return this.getTeam(team.id);
  }

  /**
   * League Admin declares a team the outright winner of a tournament, right now, no
   * approval step — the direct counterpart to a team *requesting* the same outcome via
   * LegacyModeRequestsService (§ legacy mode), which does need admin sign-off.
   */
  async markTournamentWinner(teamId: string, actingUser: AuthenticatedUser): Promise<Team> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may declare a tournament winner');
    }
    return this.promoteTeamToLegacy(teamId);
  }

  /**
   * Every currently-REGISTERED player on this team's roster is promoted to LEGACY at
   * once, tagged TOURNAMENT_WINNER. A legacy player must belong to a LegacyTeam (§
   * admin-curated pool rule), so this finds-or-creates a LegacyTeam matching the team's
   * name (case/whitespace-insensitive, since real team names in this system carry stray
   * whitespace) rather than requiring one to be added separately first. Shared by the
   * direct admin action above and an approved legacy-mode request — same end state
   * either way, only the path to get there (and who needs to sign off) differs.
   */
  async promoteTeamToLegacy(teamId: string): Promise<Team> {
    const team = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['roster'] });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const eligiblePlayers = (team.roster ?? []).filter((p) => p.status === PlayerStatus.REGISTERED);
    if (eligiblePlayers.length === 0) {
      throw new ConflictException('This team has no registered players to promote to legacy status');
    }

    const normalizedName = team.name.trim().toLowerCase();

    return this.dataSource.transaction(async (manager) => {
      const legacyTeamRepo = manager.getRepository(LegacyTeam);
      let legacyTeam = (await legacyTeamRepo.find()).find(
        (lt) => lt.name.trim().toLowerCase() === normalizedName,
      );
      if (!legacyTeam) {
        legacyTeam = await legacyTeamRepo.save(legacyTeamRepo.create({ name: team.name }));
      }

      const playerRepo = manager.getRepository(Player);
      for (const player of eligiblePlayers) {
        player.status = PlayerStatus.LEGACY;
        player.legacyReason = LegacyReason.TOURNAMENT_WINNER;
        player.legacyTeam = legacyTeam;
      }
      await playerRepo.save(eligiblePlayers);

      return this.getTeam(teamId, manager.getRepository(Team));
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
    team.decidedAt = new Date();
    await this.teamRepo.save(team);
    return this.getTeam(teamId);
  }
}
