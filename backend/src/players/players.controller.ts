import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { RegisterFreeAgentDto } from './dto/register-free-agent.dto';
import { CreatePlayerDto } from './dto/create-player.dto';

/**
 * Guards are per-method rather than class-level (unlike siblings guarded wholesale)
 * because the Free Agent directory/signup routes must stay completely public.
 */
@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('status') status?: PlayerStatus, @Query('unattached') unattached?: string) {
    return this.playersService.findByStatus(status, unattached === 'true');
  }

  /** Public directory — used by the Teams page and the Free Agents page, no auth required. */
  @Get('free-agents')
  findFreeAgents() {
    return this.playersService.findFreeAgents();
  }

  /** Public self-signup — no auth, visible in the pool immediately (no approval workflow). */
  @Post('free-agents')
  registerFreeAgent(@Body() dto: RegisterFreeAgentDto) {
    return this.playersService.registerFreeAgent(dto.name, dto.position, dto.email, dto.password);
  }

  /** "Add player" — a brand-new player joins the owner's own roster directly, separate
   * from the transfer-request-based "sign or request a player" flow. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveTeamGuard)
  @Roles(UserRole.TEAM_OWNER)
  addPlayer(@Body() dto: CreatePlayerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.playersService.addPlayer(dto.name, dto.transferValue, user);
  }

  @Patch(':id/value')
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveTeamGuard)
  @Roles(UserRole.TEAM_OWNER)
  updateValue(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerValueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playersService.updateValue(id, dto.transferValue, user);
  }

  @Patch(':id/photo')
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveTeamGuard)
  @Roles(UserRole.TEAM_OWNER)
  updatePhoto(
    @Param('id') id: string,
    @Body() dto: UpdatePlayerPhotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.playersService.updatePhoto(id, dto.photoDataUrl, user);
  }
}
