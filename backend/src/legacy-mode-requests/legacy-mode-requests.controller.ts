import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { ActiveTeamGuard } from '../teams/active-team.guard';
import { LegacyModeRequestsService } from './legacy-mode-requests.service';
import { LegacyModeDecisionDto } from './dto/legacy-mode-decision.dto';

@Controller('legacy-mode-requests')
@UseGuards(JwtAuthGuard)
export class LegacyModeRequestsController {
  constructor(private readonly service: LegacyModeRequestsService) {}

  @Post()
  @UseGuards(ActiveTeamGuard)
  request(@CurrentUser() user: AuthenticatedUser) {
    return this.service.request(user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findForUser(user);
  }

  @Post(':id/decision')
  decide(@Param('id') id: string, @Body() dto: LegacyModeDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.decide(id, dto.decision, dto.notes, user);
  }
}
