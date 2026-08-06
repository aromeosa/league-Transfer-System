import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { ActiveTeamGuard } from '../teams/active-team.guard';
import { PlayerStatus, UserRole } from '../entities';
import { PlayersService } from './players.service';
import { UpdatePlayerValueDto } from './dto/update-player-value.dto';
import { UpdatePlayerPhotoDto } from './dto/update-player-photo.dto';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  findAll(@Query('status') status?: PlayerStatus, @Query('unattached') unattached?: string) {
    return this.playersService.findByStatus(status, unattached === 'true');
  }

  @Patch(':id/value')
  @UseGuards(RolesGuard, ActiveTeamGuard)
  @Roles(UserRole.TEAM_OWNER)
  updateValue(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerValueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playersService.updateValue(id, dto.transferValue, user);
  }

  @Patch(':id/photo')
  @UseGuards(RolesGuard, ActiveTeamGuard)
  @Roles(UserRole.TEAM_OWNER)
  updatePhoto(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerPhotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playersService.updatePhoto(id, dto.photoDataUrl, user);
  }
}
