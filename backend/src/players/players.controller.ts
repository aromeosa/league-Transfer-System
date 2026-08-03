import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlayerStatus } from '../entities';
import { PlayersService } from './players.service';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  findAll(@Query('status') status?: PlayerStatus, @Query('unattached') unattached?: string) {
    return this.playersService.findByStatus(status, unattached === 'true');
  }
}
