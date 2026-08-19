import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import {
  Decision,
  DeregistrationReason,
  DeregistrationStatus,
  Player,
  PlayerDeregistrationRequest,
  RosterHistory,
  Team,
  UserAccount,
  UserRole,
} from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';

const DETAIL_RELATIONS = ['player', 'team', 'requestedByUser'];

@Injectable()
export class PlayerDeregistrationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Team owner asks to remove one of their own players — the reason is required up
   * front (§ deregistration) so it's visible to the League Admin before they decide,
   * not added after the fact. No fee, no other team, no window gate: unlike adding a
   * player, removing one doesn't compete for limited roster slots.
   */
  async request(
    playerId: string,
    reason: DeregistrationReason,
    actingUser: AuthenticatedUser,
  ): Promise<PlayerDeregistrationRequest> {
    if (actingUser.role !== UserRole.TEAM_OWNER || !actingUser.teamId) {
      throw new ForbiddenException('Only a team owner may deregister a player');
    }
    const teamId = actingUser.teamId;

    return this.dataSource.transaction(async (manager) => {
      const player = await manager.findOne(Player, { where: { id: playerId }, relations: ['currentTeam'] });
      if (!player) {
        throw new NotFoundException('Player not found');
      }
      if (player.currentTeam?.id !== teamId) {
        throw new BadRequestException('Player is not on your roster');
      }

      const alreadyPending = await manager.count(PlayerDeregistrationRequest, {
        where: { player: { id: playerId }, status: DeregistrationStatus.PENDING_LEAGUE_APPROVAL },
      });
      if (alreadyPending > 0) {
        throw new ConflictException(
          'A deregistration request for this player is already awaiting League Admin approval',
        );
      }

      const request = manager.create(PlayerDeregistrationRequest, {
        player,
        team: { id: teamId } as Team,
        reason,
        requestedByUser: { id: actingUser.userId } as UserAccount,
        status: DeregistrationStatus.PENDING_LEAGUE_APPROVAL,
      });
      const saved = await manager.save(PlayerDeregistrationRequest, request);
      return manager.findOneOrFail(PlayerDeregistrationRequest, {
        where: { id: saved.id },
        relations: DETAIL_RELATIONS,
      });
    });
  }

  /** League Admin authorization gate — actually removes the player from the roster on approval. */
  async decide(
    requestId: string,
    decision: Decision,
    notes: string | undefined,
    actingUser: AuthenticatedUser,
  ): Promise<PlayerDeregistrationRequest> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may decide on a deregistration request');
    }

    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(PlayerDeregistrationRequest, {
        where: { id: requestId },
        relations: DETAIL_RELATIONS,
      });
      if (!request) {
        throw new NotFoundException('Deregistration request not found');
      }
      if (request.status !== DeregistrationStatus.PENDING_LEAGUE_APPROVAL) {
        throw new ConflictException(`Request is not awaiting a decision (status: ${request.status})`);
      }

      const now = new Date();
      if (decision === Decision.APPROVE) {
        const player = await manager.findOneOrFail(Player, {
          where: { id: request.player.id },
          relations: ['currentTeam'],
        });
        // Only actually remove them if they're still on the team this request was about
        // — guards against a race with some other roster change in the meantime.
        if (player.currentTeam?.id === request.team.id) {
          player.currentTeam = null;
          await manager.save(Player, player);

          await manager.update(
            RosterHistory,
            { player: { id: player.id }, team: { id: request.team.id }, leftAt: IsNull() },
            { leftAt: now },
          );
        }
        request.status = DeregistrationStatus.APPROVED;
      } else {
        request.status = DeregistrationStatus.REJECTED;
      }
      request.decisionNotes = notes ?? null;
      request.decidedAt = now;
      await manager.save(PlayerDeregistrationRequest, request);
      return manager.findOneOrFail(PlayerDeregistrationRequest, {
        where: { id: requestId },
        relations: DETAIL_RELATIONS,
      });
    });
  }

  async findForUser(actingUser: AuthenticatedUser): Promise<PlayerDeregistrationRequest[]> {
    const repo = this.dataSource.getRepository(PlayerDeregistrationRequest);
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
