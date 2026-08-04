import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TeamStatus, UserRole } from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { TeamsService } from './teams.service';

/**
 * Blocks the mutating Team Owner actions (submit / releasing-decision / initiate
 * payment) for a team that isn't ACTIVE yet. Deliberately does a live DB lookup
 * rather than trusting team status embedded in the JWT — a team approved mid-session
 * would otherwise leave the owner's existing token stuck showing PENDING until they
 * re-log in (see auth.service.ts's login-response comment for the same reasoning).
 */
@Injectable()
export class ActiveTeamGuard implements CanActivate {
  constructor(private readonly teamsService: TeamsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    if (!user || user.role === UserRole.LEAGUE_ADMIN) {
      return true;
    }

    if (!user.teamId) {
      throw new ForbiddenException('No team associated with this account');
    }

    const team = await this.teamsService.getTeam(user.teamId);
    if (team.status !== TeamStatus.ACTIVE) {
      throw new ForbiddenException(
        team.status === TeamStatus.PENDING_APPROVAL
          ? 'Your team registration is still pending League Admin approval'
          : 'Your team registration was rejected',
      );
    }
    return true;
  }
}
