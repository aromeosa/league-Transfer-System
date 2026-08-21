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
import { CreateLegacyPlayerDto } from './dto/create-legacy-player.dto';

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
    return this.playersService.registerFreeAgent(
      dto.name,
      dto.position,
      dto.location,
      dto.email,
      dto.password,
      dto.idNumber,
    );
  }

  /** "Add player" — a brand-new player joins the owner's own roster directly, separate
   * from the transfer-request-based "sign or request a player" flow. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, ActiveTeamGuard)
  @Roles(UserRole.TEAM_OWNER)
  addPlayer(@Body() dto: CreatePlayerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.playersService.addPlayer(dto.name, dto.transferValue, dto.idNumber, user);
  }

  /** League Admin curates the Legacy Pool — the player starts unattached, available for
   * any team to request to sign. */
  @Post('legacy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEAGUE_ADMIN)
  addLegacyPlayer(@Body() dto: CreateLegacyPlayerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.playersService.addLegacyPlayer(dto.name, dto.legacyTeamId, dto.legacyReason, user);
  }

  /** League Admin releases a signed legacy player directly — no approval step needed,
   * unlike a team-initiated deregistration of a regular player. */
  @Post(':id/deregister-legacy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEAGUE_ADMIN)
  deregisterLegacyPlayer(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.playersService.adminDeregisterLegacyPlayer(id, user);
  }

  /** A Free Agent's own profile — works whether they're still unattached or signed. */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FREE_AGENT)
  findOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.playersService.findOwn(user);
  }

  /** Free Agent uploads/replaces their own profile photo — self-service, no team involved. */
  @Patch('me/photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.FREE_AGENT)
  updateOwnPhoto(@Body() dto: UpdatePlayerPhotoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.playersService.updateOwnPhoto(dto.photoDataUrl, user);
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
