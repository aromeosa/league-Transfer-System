import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { UserRole } from '../entities';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(UserRole.LEAGUE_ADMIN)
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role !== UserRole.LEAGUE_ADMIN && user.teamId !== id) {
      throw new ForbiddenException('You can only view your own team');
    }
    return this.teamsService.getTeam(id);
  }
}
