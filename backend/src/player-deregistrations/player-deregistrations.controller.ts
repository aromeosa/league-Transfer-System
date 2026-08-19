import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { ActiveTeamGuard } from '../teams/active-team.guard';
import { PlayerDeregistrationsService } from './player-deregistrations.service';
import { RequestDeregistrationDto } from './dto/request-deregistration.dto';
import { DeregistrationDecisionDto } from './dto/deregistration-decision.dto';

@Controller('player-deregistrations')
@UseGuards(JwtAuthGuard)
export class PlayerDeregistrationsController {
  constructor(private readonly service: PlayerDeregistrationsService) {}

  @Post()
  @UseGuards(ActiveTeamGuard)
  request(@Body() dto: RequestDeregistrationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.request(dto.playerId, dto.reason, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findForUser(user);
  }

  @Post(':id/decision')
  decide(@Param('id') id: string, @Body() dto: DeregistrationDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.decide(id, dto.decision, dto.notes, user);
  }
}
