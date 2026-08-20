import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Decision, LegacyModeRequest, LegacyModeRequestStatus, Player, PlayerStatus, Team, UserAccount, UserRole } from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { TeamsService } from '../teams/teams.service';

const DETAIL_RELATIONS = ['team', 'requestedByUser'];

@Injectable()
export class LegacyModeRequestsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly teamsService: TeamsService,
  ) {}

  /**
   * Team Owner asks for their whole roster to be promoted to Legacy status — the
   * team-initiated counterpart to a League Admin directly marking them a tournament
   * winner. Nothing changes on the roster until a League Admin approves.
   */
  async request(actingUser: AuthenticatedUser): Promise<LegacyModeRequest> {
    if (actingUser.role !== UserRole.TEAM_OWNER || !actingUser.teamId) {
      throw new ForbiddenException('Only a team owner may request legacy mode for their team');
    }
    const teamId = actingUser.teamId;

    return this.dataSource.transaction(async (manager) => {
      const alreadyPending = await manager.count(LegacyModeRequest, {
        where: { team: { id: teamId }, status: LegacyModeRequestStatus.PENDING_LEAGUE_APPROVAL },
      });
      if (alreadyPending > 0) {
        throw new ConflictException(
          'A legacy mode request for your team is already awaiting League Admin approval',
        );
      }

      const registeredCount = await manager.count(Player, {
        where: { currentTeam: { id: teamId }, status: PlayerStatus.REGISTERED },
      });
      if (registeredCount === 0) {
        throw new ConflictException('Your team has no registered players to promote to legacy status');
      }

      const request = manager.create(LegacyModeRequest, {
        team: { id: teamId } as Team,
        requestedByUser: { id: actingUser.userId } as UserAccount,
        status: LegacyModeRequestStatus.PENDING_LEAGUE_APPROVAL,
      });
      const saved = await manager.save(LegacyModeRequest, request);
      return manager.findOneOrFail(LegacyModeRequest, { where: { id: saved.id }, relations: DETAIL_RELATIONS });
    });
  }

  /**
   * League Admin authorization gate. Approving actually promotes the roster (via the
   * same path as the direct admin action); rejecting leaves every player exactly as
   * they were.
   */
  async decide(
    requestId: string,
    decision: Decision,
    notes: string | undefined,
    actingUser: AuthenticatedUser,
  ): Promise<LegacyModeRequest> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may decide on a legacy mode request');
    }

    const repo = this.dataSource.getRepository(LegacyModeRequest);
    const request = await repo.findOne({ where: { id: requestId }, relations: DETAIL_RELATIONS });
    if (!request) {
      throw new NotFoundException('Legacy mode request not found');
    }
    if (request.status !== LegacyModeRequestStatus.PENDING_LEAGUE_APPROVAL) {
      throw new ConflictException(`Request is not awaiting a decision (status: ${request.status})`);
    }

    if (decision === Decision.APPROVE) {
      await this.teamsService.promoteTeamToLegacy(request.team.id);
    }

    request.status = decision === Decision.APPROVE ? LegacyModeRequestStatus.APPROVED : LegacyModeRequestStatus.REJECTED;
    request.decisionNotes = notes ?? null;
    request.decidedAt = new Date();
    await repo.save(request);
    return repo.findOneOrFail({ where: { id: requestId }, relations: DETAIL_RELATIONS });
  }

  async findForUser(actingUser: AuthenticatedUser): Promise<LegacyModeRequest[]> {
    const repo = this.dataSource.getRepository(LegacyModeRequest);
    if (actingUser.role === UserRole.LEAGUE_ADMIN) {
      return repo.find({ relations: DETAIL_RELATIONS, order: { createdAt: 'DESC' } });
    }
    if (actingUser.role === UserRole.TEAM_OWNER && actingUser.teamId) {
      return repo.find({
        where: { team: { id: actingUser.teamId } },
        relations: DETAIL_RELATIONS,
        order: { createdAt: 'DESC' },
      });
    }
    return [];
  }
}
