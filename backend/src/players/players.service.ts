import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Player, PlayerOrigin, PlayerPosition, PlayerStatus, RosterHistory, Team, UserAccount, UserRole } from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { isUniqueViolation } from '../common/db-errors.util';
import { TransferWindowsService } from '../transfer-windows/transfer-windows.service';
import { BusinessRules } from '../config/business-rules.config';
import { hashIdNumber } from './id-number.util';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transferWindowsService: TransferWindowsService,
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
      relations: ['currentTeam'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Team Owner adjusts one of their own players' value — only while a transfer window
   * is OPEN. Once the window closes, values are locked until the next window opens
   * (mirrors the roster-lock rule; see HowTransfersWorkPage's plain-language summary).
   */
  async updateValue(playerId: string, transferValue: number, actingUser: AuthenticatedUser): Promise<Player> {
    const player = await this.getOwnedPlayer(playerId, actingUser);

    const openWindow = await this.transferWindowsService.getCurrent();
    if (!openWindow) {
      throw new ForbiddenException('Player values can only be changed while a transfer window is open');
    }

    player.transferValue = transferValue;
    return this.playerRepo.save(player);
  }

  /**
   * "Add player" — separate from the transfer-request-based "sign or request a player"
   * flow: a brand-new player (originType FREE_AGENT_ORIGIN) joins the acting owner's own
   * roster directly, with no other team/approval/actual free-agent-pool listing
   * involved. Window-gated and roster-capped the same way every other
   * roster-composition change is.
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

    const openWindow = await this.transferWindowsService.getCurrent();
    if (!openWindow) {
      throw new ForbiddenException('Players can only be added while a transfer window is open');
    }

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
   * Public self-signup — no auth, no approval workflow to join the pool (visible
   * immediately), but the account created here is what lets this Free Agent later log
   * in and accept/reject a team's signing offer themselves (see TransferRequestsService).
   */
  async registerFreeAgent(
    name: string,
    position: PlayerPosition,
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
