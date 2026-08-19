import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { TeamStatus, UserRole } from '../entities';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamLogoDto } from './dto/update-team-logo.dto';

/**
 * Guards are per-method rather than class-level (unlike TeamsController's siblings)
 * because `register` must stay completely public.
 */
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEAGUE_ADMIN)
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(dto);
  }

  /** Public team self-registration — created PENDING_APPROVAL, no auth required. */
  @Post('register')
  register(@Body() dto: CreateTeamDto) {
    return this.teamsService.registerTeam(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEAGUE_ADMIN)
  findAll(@Query('status') status?: TeamStatus) {
    return this.teamsService.findAll(status);
  }

  /**
   * Public team directory — active teams and rosters only, no auth required.
   * Registered before `:id` so it isn't shadowed by that wildcard route.
   */
  @Get('public')
  findPublicActive() {
    return this.teamsService.findPublicActive();
  }

  /** Team Owner uploads/replaces their own team's logo — self-service, works anytime. */
  @Patch('me/logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEAM_OWNER)
  updateOwnLogo(@Body() dto: UpdateTeamLogoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.updateOwnLogo(dto.logoDataUrl, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role !== UserRole.LEAGUE_ADMIN && user.teamId !== id) {
      throw new ForbiddenException('You can only view your own team');
    }
    return this.teamsService.getTeam(id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEAGUE_ADMIN)
  approve(@Param('id') id: string) {
    return this.teamsService.approve(id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEAGUE_ADMIN)
  reject(@Param('id') id: string) {
    return this.teamsService.reject(id);
  }
}
