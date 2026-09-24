import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  LegacyReason,
  LegacyTeam,
  Player,
  PlayerOrigin,
  PlayerPosition,
  PlayerStatus,
  RosterHistory,
  Team,
  UserAccount,
  UserRole,
} from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { isUniqueViolation } from '../common/db-errors.util';
import { BusinessRules } from '../config/business-rules.config';
import { hashIdNumber } from './id-number.util';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * §7.2 GET /players. `unattached=true` narrows Registered players to those with no
   * current team — the pool a team can pick up via a standard transfer (§1.4 #7).
   */
  findByStatus(status?: PlayerStatus, unattached?: boolean): Promise<Player[]> {
    return this.playerRepo.find({
      where: {
        ...(status ? { status } : {}),
        ...(unattached ? { currentTeam: IsNull() } : {}),
      },
      relations: ['currentTeam', 'legacyTeam', 'account'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Team Owner adjusts one of their own players' value — roster upkeep, same as adding
   * or deregistering a player, so it works year-round rather than only while a transfer
   * window is open. Only actually *signing* a player (a real transfer) is window-gated.
   */
  async updateValue(playerId: string, transferValue: number, actingUser: AuthenticatedUser): Promise<Player> {
    const player = await this.getOwnedPlayer(playerId, actingUser);
    player.transferValue = transferValue;
    return this.playerRepo.save(player);
  }

  /**
   * "Add player" — separate from the transfer-request-based "sign or request a player"
   * flow: a brand-new player (originType FREE_AGENT_ORIGIN) joins the acting owner's own
   * roster directly, with no other team/approval/actual free-agent-pool listing
   * involved. Registration onto the system is persistent year-round — only *signing*
   * an existing player (a real transfer) is window-gated — so this stays roster-capped
   * but not window-gated.
   */
  async addPlayer(
    name: string,
    transferValue: number | undefined,
    idNumber: string | undefined,
    actingUser: AuthenticatedUser,
  ): Promise<Player> {
    if (actingUser.role !== UserRole.TEAM_OWNER || !actingUser.teamId) {
      throw new ForbiddenException('Only a team owner may add a player to their roster');
    }
    const teamId = actingUser.teamId;

    try {
      return await this.dataSource.transaction(async (manager) => {
        const rosterSize = await manager.count(Player, { where: { currentTeam: { id: teamId } } });
        if (rosterSize + 1 > BusinessRules.ROSTER_MAX) {
          throw new BadRequestException(`Your roster would exceed the ${BusinessRules.ROSTER_MAX}-player maximum`);
        }

        const player = await manager.save(
          Player,
          manager.create(Player, {
            name,
            currentTeam: { id: teamId } as Team,
            status: PlayerStatus.REGISTERED,
            // Unlike the initial team-registration bootstrap roster (DIRECT_REGISTRATION),
            // a player added this way is treated as having come from the free agent pool.
            originType: PlayerOrigin.FREE_AGENT_ORIGIN,
            transferValue: transferValue ?? null,
            transferCount: 0,
            idNumberHash: idNumber ? hashIdNumber(idNumber) : null,
          }),
        );

        await manager.save(
          RosterHistory,
          manager.create(RosterHistory, { player, team: { id: teamId } as Team, joinedAt: new Date() }),
        );

        return player;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'id_number_hash')) {
        throw new ConflictException('This ID/passport number is already registered to another player');
      }
      throw err;
    }
  }

  /** Public directory of current Free Agents — used by the Teams and Free Agents pages. */
  findFreeAgents(): Promise<Player[]> {
    return this.playerRepo.find({ where: { status: PlayerStatus.FREE_AGENT }, order: { name: 'ASC' } });
  }

  /**
   * League Admin curates the Legacy Pool directly — unlike every other player-creation
   * path, this one starts fully unattached (no team) so any team can browse the pool
   * and request to sign one. The one-legacy-signing-per-team-per-window cap is enforced
   * where every other request-type cap is, in TransferRequestsService.submit().
   *
   * legacyTeamId must reference an existing LegacyTeam — the actual enforcement behind
   * "a legacy player's club must be in the list of legacy teams" (§ legacy pool
   * validation); there's no free-text club name anymore.
   */
  async addLegacyPlayer(
    name: string,
    legacyTeamId: string,
    legacyReason: LegacyReason,
    actingUser: AuthenticatedUser,
  ): Promise<Player> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may add a legacy player');
    }
    const legacyTeam = await this.dataSource.getRepository(LegacyTeam).findOne({ where: { id: legacyTeamId } });
    if (!legacyTeam) {
      throw new BadRequestException('That legacy team does not exist — add it to the legacy teams list first');
    }
    return this.playerRepo.save(
      this.playerRepo.create({
        name,
        status: PlayerStatus.LEGACY,
        originType: PlayerOrigin.DIRECT_REGISTRATION,
        legacyReason,
        legacyTeam,
        transferCount: 0,
      }),
    );
  }

  /**
   * League Admin direct release of a signed legacy player — unlike a regular player,
   * who can only be deregistered via a team-submitted request that the League Admin
   * then approves (PlayerDeregistrationsService), the admin already curates the whole
   * Legacy Pool directly, so no separate approval step is needed here.
   */
  async adminDeregisterLegacyPlayer(playerId: string, actingUser: AuthenticatedUser): Promise<Player> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may deregister a legacy player directly');
    }

    return this.dataSource.transaction(async (manager) => {
      const player = await manager.findOne(Player, { where: { id: playerId }, relations: ['currentTeam'] });
      if (!player) {
        throw new NotFoundException('Player not found');
      }
      if (player.status !== PlayerStatus.LEGACY) {
        throw new BadRequestException('Only a legacy player can be deregistered this way');
      }
      if (!player.currentTeam) {
        throw new ConflictException('This legacy player is not currently signed to a team');
      }

      const now = new Date();
      await manager.update(
        RosterHistory,
        { player: { id: player.id }, team: { id: player.currentTeam.id }, leftAt: IsNull() },
        { leftAt: now },
      );
      player.currentTeam = null;
      return manager.save(Player, player);
    });
  }

  /**
   * Public self-signup — no auth, no approval workflow to join the pool (visible
   * immediately), but the account created here is what lets this Free Agent later log
   * in and accept/reject a team's signing offer themselves (see TransferRequestsService).
   */
  async registerFreeAgent(
    name: string,
    position: PlayerPosition,
    location: string,
    email: string,
    password: string,
    idNumber?: string,
  ): Promise<Player> {
    // Checked up front for a friendly error in the common case; the catch below is the
    // real guarantee — it closes the race where two signups with the same email both
    // pass this check before either commits (see TeamsService.createTeamRecord for the
    // same pattern, since both roles share the one user_accounts.email uniqueness).
    const existing = await this.dataSource.getRepository(UserAccount).findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const player = await manager.save(
          Player,
          manager.create(Player, {
            name,
            position,
            location,
            status: PlayerStatus.FREE_AGENT,
            originType: PlayerOrigin.FREE_AGENT_ORIGIN,
            idNumberHash: idNumber ? hashIdNumber(idNumber) : null,
          }),
        );

        const passwordHash = await bcrypt.hash(password, 10);
        await manager.save(
          UserAccount,
          manager.create(UserAccount, {
            name,
            email,
            passwordHash,
            role: UserRole.FREE_AGENT,
            player,
          }),
        );

        return player;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'email')) {
        throw new ConflictException('A user with this email already exists');
      }
      if (isUniqueViolation(err, 'id_number_hash')) {
        throw new ConflictException('This ID/passport number is already registered to another player');
      }
      throw err;
    }
  }

  /** Team Owner uploads/replaces a photo for one of their own players. Not window-locked. */
  async updatePhoto(playerId: string, photoDataUrl: string, actingUser: AuthenticatedUser): Promise<Player> {
    const player = await this.getOwnedPlayer(playerId, actingUser);
    player.avatarUrl = photoDataUrl;
    return this.playerRepo.save(player);
  }

  /** A Free Agent's own profile — works whether they're still unattached or have
   * since been signed (their account keeps the FREE_AGENT role either way). */
  async findOwn(actingUser: AuthenticatedUser): Promise<Player> {
    return this.getOwnPlayer(actingUser);
  }

  /** Free Agent uploads/replaces their own profile photo — self-service, no team involved. */
  async updateOwnPhoto(photoDataUrl: string, actingUser: AuthenticatedUser): Promise<Player> {
    const player = await this.getOwnPlayer(actingUser);
    player.avatarUrl = photoDataUrl;
    return this.playerRepo.save(player);
  }

  /** Free Agent updates where they're based — self-service, same as their photo. */
  async updateOwnLocation(location: string, actingUser: AuthenticatedUser): Promise<Player> {
    const player = await this.getOwnPlayer(actingUser);
    player.location = location;
    return this.playerRepo.save(player);
  }

  /**
   * League Admin corrects a player's name — e.g. a typo at signup or a legal name
   * change. Works on any player regardless of status/team. Keeps a linked login
   * account's own name in sync (Free Agents have one) so the name shown on their own
   * dashboard doesn't drift from what everyone else sees on the roster/pool.
   */
  async adminUpdateName(playerId: string, name: string, actingUser: AuthenticatedUser): Promise<Player> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may rename a player');
    }

    return this.dataSource.transaction(async (manager) => {
      const player = await manager.findOne(Player, { where: { id: playerId }, relations: ['account'] });
      if (!player) {
        throw new NotFoundException('Player not found');
      }

      player.name = name;
      if (player.account) {
        player.account.name = name;
        await manager.save(UserAccount, player.account);
      }
      return manager.save(Player, player);
    });
  }

  private async getOwnPlayer(actingUser: AuthenticatedUser): Promise<Player> {
    if (actingUser.role !== UserRole.FREE_AGENT || !actingUser.playerId) {
      throw new ForbiddenException('Only a Free Agent may manage their own profile');
    }
    const player = await this.playerRepo.findOne({
      where: { id: actingUser.playerId },
      relations: ['currentTeam'],
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    return player;
  }

  private async getOwnedPlayer(playerId: string, actingUser: AuthenticatedUser): Promise<Player> {
    if (actingUser.role !== UserRole.TEAM_OWNER || !actingUser.teamId) {
      throw new ForbiddenException('Only a team owner may manage their own players');
    }

    const player = await this.playerRepo.findOne({ where: { id: playerId }, relations: ['currentTeam'] });
    if (!player || player.currentTeam?.id !== actingUser.teamId) {
      throw new NotFoundException('Player not found on your roster');
    }
    return player;
  }
}
