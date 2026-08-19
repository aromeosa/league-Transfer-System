import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { RequestStatus } from '../entities';
import { ActiveTeamGuard } from '../teams/active-team.guard';
import { TransferRequestsService } from './transfer-requests.service';
import { SubmitTransferRequestDto } from './dto/submit-transfer-request.dto';
import { DecisionDto } from './dto/decision.dto';
import { ApproachTeamDto } from './dto/approach-team.dto';
import { TeamDecisionDto } from './dto/team-decision.dto';

@Controller('transfer-requests')
@UseGuards(JwtAuthGuard)
export class TransferRequestsController {
  constructor(private readonly service: TransferRequestsService) {}

  @Post()
  @UseGuards(ActiveTeamGuard)
  submit(@Body() dto: SubmitTransferRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.submit(dto, user);
  }

  @Get()
  findAll(@Query('status') status: RequestStatus | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findForUser(user, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOneForUser(id, user);
  }

  @Get(':id/payment')
  getPayment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getPayment(id, user);
  }

  @Post(':id/releasing-decision')
  @UseGuards(ActiveTeamGuard)
  releasingDecision(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.releasingDecision(id, dto, user);
  }

  /** Free Agent accepts/rejects a signing offer — no ActiveTeamGuard, they have no team. */
  @Post(':id/player-decision')
  playerDecision(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.playerDecision(id, dto, user);
  }

  /** Free Agent approaches a team to join — no ActiveTeamGuard, they have no team. */
  @Post('approach')
  approachTeam(@Body() dto: ApproachTeamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approachTeam(dto.teamId, user);
  }

  /** The approached team accepts (setting the fee) or rejects an inbound approach. */
  @Post(':id/team-decision')
  @UseGuards(ActiveTeamGuard)
  teamDecision(@Param('id') id: string, @Body() dto: TeamDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.teamDecision(id, dto, user);
  }

  /** The legacy team's own owner account accepts/rejects a request to sign one of
   * their players — no ActiveTeamGuard, they don't own a real Team. */
  @Post(':id/legacy-team-decision')
  legacyTeamDecision(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.legacyTeamDecision(id, dto, user);
  }

  @Post(':id/payment/initiate')
  @UseGuards(ActiveTeamGuard)
  initiatePayment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.initiatePayment(id, user);
  }

  @Post(':id/payment/confirm-manually')
  confirmPaymentManually(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.confirmPaymentManually(id, user);
  }

  /** Step 2 of the payment timeline — attests the club's bundled settlement has been forwarded. */
  @Post(':id/payment/mark-club-paid')
  markClubPaid(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markClubPaid(id, user);
  }

  /** Step 3 — attests the player's entitlement (via the club) has been forwarded. */
  @Post(':id/payment/mark-player-paid')
  markPlayerPaid(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markPlayerPaid(id, user);
  }

  @Post(':id/league-decision')
  leagueDecision(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.leagueDecision(id, dto, user);
  }
}
