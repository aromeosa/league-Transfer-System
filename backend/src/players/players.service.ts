import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Player, PlayerStatus } from '../entities';

@Injectable()
export class PlayersService {
  constructor(@InjectRepository(Player) private readonly playerRepo: Repository<Player>) {}

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
}
