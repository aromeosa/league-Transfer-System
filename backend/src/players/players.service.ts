import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Player, PlayerOrigin, PlayerPosition, PlayerStatus, UserRole } from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { TransferWindowsService } from '../transfer-windows/transfer-windows.service';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
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

  /** Public directory of current Free Agents — used by the Teams and Free Agents pages. */
  findFreeAgents(): Promise<Player[]> {
    return this.playerRepo.find({ where: { status: PlayerStatus.FREE_AGENT }, order: { name: 'ASC' } });
  }

  /** Public self-signup — no auth, no approval workflow; visible in the pool immediately. */
  registerFreeAgent(name: string, position: PlayerPosition): Promise<Player> {
    const player = this.playerRepo.create({
      name,
      position,
      status: PlayerStatus.FREE_AGENT,
      originType: PlayerOrigin.FREE_AGENT_ORIGIN,
    });
    return this.playerRepo.save(player);
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
