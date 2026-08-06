import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Player, PlayerStatus, UserRole } from '../entities';
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
    if (actingUser.role !== UserRole.TEAM_OWNER || !actingUser.teamId) {
      throw new ForbiddenException('Only a team owner may set a player value');
    }

    const player = await this.playerRepo.findOne({ where: { id: playerId }, relations: ['currentTeam'] });
    if (!player || player.currentTeam?.id !== actingUser.teamId) {
      throw new NotFoundException('Player not found on your roster');
    }

    const openWindow = await this.transferWindowsService.getCurrent();
    if (!openWindow) {
      throw new ForbiddenException('Player values can only be changed while a transfer window is open');
    }

    player.transferValue = transferValue;
    return this.playerRepo.save(player);
  }
}
