import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  ApprovalAction,
  ApprovalActorRole,
  Decision,
  Payment,
  PaymentStatus,
  Player,
  PlayerOrigin,
  PlayerStatus,
  RequestStatus,
  RequestType,
  RosterHistory,
  Team,
  TransferRequest,
  TransferWindow,
  UserRole,
  WindowStatus,
} from '../entities';
import { BusinessRules } from '../config/business-rules.config';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { SubmitTransferRequestDto } from './dto/submit-transfer-request.dto';
import { PAYMENT_GATEWAY, PaymentGatewayService } from '../payment-gateway/payment-gateway.interface';
import { computeFeeSplit, transferCountCapFor, wouldBreachSquadFloor } from './fee-split.util';

const ACTIVE_REQUEST_STATUSES = [
  RequestStatus.PENDING_RELEASING_APPROVAL,
  RequestStatus.PENDING_PAYMENT,
  RequestStatus.PENDING_LEAGUE_APPROVAL,
  RequestStatus.APPROVED,
];

const WINDOW_CAP_BY_TYPE: Record<RequestType, number> = {
  [RequestType.FREE_AGENT_SIGNING]: BusinessRules.WINDOW_CAP_FREE_AGENT_SIGNING,
  [RequestType.CLUB_TRANSFER]: BusinessRules.WINDOW_CAP_CLUB_TRANSFER,
  [RequestType.LEGACY_TRANSFER]: BusinessRules.WINDOW_CAP_LEGACY_TRANSFER,
};

const REQUIRED_STATUS_BY_TYPE: Record<RequestType, PlayerStatus> = {
  [RequestType.FREE_AGENT_SIGNING]: PlayerStatus.FREE_AGENT,
  [RequestType.CLUB_TRANSFER]: PlayerStatus.REGISTERED,
  [RequestType.LEGACY_TRANSFER]: PlayerStatus.LEGACY,
};

const DETAIL_RELATIONS = [
  'window',
  'player',
  'player.currentTeam',
  'releasingTeam',
  'requestingTeam',
  'requestedByUser',
];

@Injectable()
export class TransferRequestsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(TransferRequest) private readonly requestRepo: Repository<TransferRequest>,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGatewayService,
  ) {}

  // ---------------------------------------------------------------------------
  // Submit (§7.4 POST /transfer-requests, FR-05/06/07, FR-22/23)
  // ---------------------------------------------------------------------------
  async submit(dto: SubmitTransferRequestDto, actingUser: AuthenticatedUser): Promise<TransferRequest> {
    if (actingUser.role !== UserRole.TEAM_OWNER || !actingUser.teamId) {
      throw new ForbiddenException('Only a team owner may submit a transfer request');
    }
    const requestingTeamId = actingUser.teamId;

    return this.dataSource.transaction(async (manager) => {
      const window = await manager.findOne(TransferWindow, { where: { status: WindowStatus.OPEN } });
      if (!window) {
        throw new BadRequestException('No transfer window is currently open');
      }

      const player = await manager.findOne(Player, {
        where: { id: dto.playerId },
        relations: ['currentTeam'],
      });
      if (!player) {
        throw new NotFoundException('Player not found');
      }

      if (player.status !== REQUIRED_STATUS_BY_TYPE[dto.requestType]) {
        throw new BadRequestException(
          `A ${dto.requestType} request requires the player to be ${REQUIRED_STATUS_BY_TYPE[dto.requestType]}, but they are ${player.status}`,
        );
      }

      if (player.currentTeam?.id === requestingTeamId) {
        throw new BadRequestException('Player is already on your roster');
      }

      // §1.4 #4/#9 — per-player season transfer-count cap, distinct from the per-window
      // team cap below. The initial Free Agent signing doesn't count against it.
      if (dto.requestType !== RequestType.FREE_AGENT_SIGNING) {
        const cap = transferCountCapFor(player.originType);
        if (player.transferCount >= cap) {
          throw new BadRequestException('This player has already used their season transfer allowance');
        }
      }

      // §1.4 #1/#12 — per-team, per-window cap, capped independently per category.
      // An advisory lock scoped to (team, window, category) closes the race between
      // the count check and the insert (§3 concurrency, §6.3).
      await this.acquireCapLock(manager, requestingTeamId, window.id, dto.requestType);
      const existingCount = await manager.count(TransferRequest, {
        where: {
          requestingTeam: { id: requestingTeamId },
          window: { id: window.id },
          requestType: dto.requestType,
          status: In(ACTIVE_REQUEST_STATUSES),
        },
      });
      const cap = WINDOW_CAP_BY_TYPE[dto.requestType];
      if (existingCount >= cap) {
        throw new ConflictException(
          `Your team has already reached the ${dto.requestType} cap of ${cap} for this window`,
        );
      }

      const releasingTeam = player.currentTeam ?? null;
      const squadFloorFlag = releasingTeam
        ? wouldBreachSquadFloor(await manager.count(Player, { where: { currentTeam: { id: releasingTeam.id } } }))
        : false;

      const status = releasingTeam ? RequestStatus.PENDING_RELEASING_APPROVAL : RequestStatus.PENDING_PAYMENT;

      const request = manager.create(TransferRequest, {
        window,
        player,
        releasingTeam,
        requestingTeam: { id: requestingTeamId } as Team,
        requestedByUser: { id: actingUser.userId },
        requestType: dto.requestType,
        agreedFee: dto.proposedFee,
        status,
        squadFloorFlag,
      });
      const saved = await manager.save(TransferRequest, request);
      return manager.findOneOrFail(TransferRequest, { where: { id: saved.id }, relations: DETAIL_RELATIONS });
    });
  }

  private async acquireCapLock(
    manager: EntityManager,
    teamId: string,
    windowId: string,
    requestType: RequestType,
  ): Promise<void> {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${teamId}:${windowId}:${requestType}`]);
  }

  // ---------------------------------------------------------------------------
  // Releasing-team decision (§7.4 POST /transfer-requests/:id/releasing-decision)
  // ---------------------------------------------------------------------------
  async releasingDecision(
    requestId: string,
    dto: { decision: Decision; notes?: string },
    actingUser: AuthenticatedUser,
  ): Promise<TransferRequest> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadForUpdate(manager, requestId);

      if (request.status !== RequestStatus.PENDING_RELEASING_APPROVAL) {
        throw new ConflictException(`Request is not awaiting a releasing-team decision (status: ${request.status})`);
      }
      if (actingUser.role !== UserRole.TEAM_OWNER || actingUser.teamId !== request.releasingTeam?.id) {
        throw new ForbiddenException('Only the releasing team may decide on this request');
      }

      await manager.save(
        ApprovalAction,
        manager.create(ApprovalAction, {
          request,
          actorUser: { id: actingUser.userId },
          actorRole: ApprovalActorRole.RELEASING_TEAM,
          decision: dto.decision,
          notes: dto.notes ?? null,
        }),
      );

      request.status =
        dto.decision === Decision.APPROVE ? RequestStatus.PENDING_PAYMENT : RequestStatus.REJECTED_BY_RELEASING_TEAM;
      if (dto.decision === Decision.REJECT) {
        request.decidedAt = new Date();
      }
      await manager.save(TransferRequest, request);
      return manager.findOneOrFail(TransferRequest, { where: { id: requestId }, relations: DETAIL_RELATIONS });
    });
  }

  // ---------------------------------------------------------------------------
  // Payment (§7.4 POST /transfer-requests/:id/payment/initiate)
  // ---------------------------------------------------------------------------
  async initiatePayment(requestId: string, actingUser: AuthenticatedUser): Promise<{ request: TransferRequest; payment: Payment }> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadForUpdate(manager, requestId);

      if (request.status !== RequestStatus.PENDING_PAYMENT) {
        throw new ConflictException(`Request is not awaiting payment (status: ${request.status})`);
      }
      if (actingUser.role !== UserRole.TEAM_OWNER || actingUser.teamId !== request.requestingTeam.id) {
        throw new ForbiddenException('Only the requesting team may initiate payment');
      }

      const totalFee = request.agreedFee;
      const { leagueAmount, clubSettlementAmount, playerEntitlement } = computeFeeSplit(totalFee);

      let payment = await manager.save(
        Payment,
        manager.create(Payment, {
          request,
          totalFee,
          leagueAmount,
          clubSettlementAmount,
          playerEntitlement,
          status: PaymentStatus.INITIATED,
        }),
      );

      const result = await this.paymentGateway.initiateSettlement({
        paymentId: payment.id,
        totalFee,
        leagueAmount,
        clubSettlementAmount,
      });

      payment.gatewayTransactionId = result.gatewayTransactionId;
      payment.status = result.status;
      if (result.status === PaymentStatus.CONFIRMED) {
        payment.confirmedAt = new Date();
        request.status = RequestStatus.PENDING_LEAGUE_APPROVAL;
        await manager.save(TransferRequest, request);
      }
      payment = await manager.save(Payment, payment);

      const freshRequest = await manager.findOneOrFail(TransferRequest, {
        where: { id: requestId },
        relations: DETAIL_RELATIONS,
      });
      return { request: freshRequest, payment };
    });
  }

  /** §7.4 POST /webhooks/payment-gateway — idempotent (FR-28); a real gateway would call this. */
  async handlePaymentWebhook(gatewayTransactionId: string, status: PaymentStatus): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { gatewayTransactionId },
        relations: ['request'],
      });
      if (!payment || payment.status !== PaymentStatus.INITIATED) {
        return; // already processed, or unknown reference — safe no-op for webhook retries
      }

      payment.status = status;
      if (status === PaymentStatus.CONFIRMED) {
        payment.confirmedAt = new Date();
      }
      await manager.save(Payment, payment);

      if (status === PaymentStatus.CONFIRMED) {
        await manager.update(TransferRequest, payment.request.id, { status: RequestStatus.PENDING_LEAGUE_APPROVAL });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // League Admin decision (§7.4 POST /transfer-requests/:id/league-decision, FR-26)
  // ---------------------------------------------------------------------------
  async leagueDecision(
    requestId: string,
    dto: { decision: Decision; notes?: string },
    actingUser: AuthenticatedUser,
  ): Promise<TransferRequest> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadForUpdate(manager, requestId);

      if (request.status !== RequestStatus.PENDING_LEAGUE_APPROVAL) {
        throw new ConflictException(`Request is not awaiting a League Admin decision (status: ${request.status})`);
      }
      if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
        throw new ForbiddenException('Only a League Admin may finalize this request');
      }

      await manager.save(
        ApprovalAction,
        manager.create(ApprovalAction, {
          request,
          actorUser: { id: actingUser.userId },
          actorRole: ApprovalActorRole.LEAGUE_ADMIN,
          decision: dto.decision,
          notes: dto.notes ?? null,
        }),
      );

      if (dto.decision === Decision.REJECT) {
        request.status = RequestStatus.REJECTED_BY_LEAGUE_ADMIN;
        request.decidedAt = new Date();
        await manager.save(TransferRequest, request);
        return manager.findOneOrFail(TransferRequest, { where: { id: requestId }, relations: DETAIL_RELATIONS });
      }

      const now = new Date();
      const player = await manager.findOneOrFail(Player, { where: { id: request.player.id } });

      if (request.releasingTeam) {
        await manager.update(
          RosterHistory,
          { player: { id: player.id }, team: { id: request.releasingTeam.id }, leftAt: IsNull() },
          { leftAt: now },
        );
      }

      player.currentTeam = request.requestingTeam;
      if (request.requestType === RequestType.FREE_AGENT_SIGNING) {
        player.status = PlayerStatus.REGISTERED;
      } else {
        player.transferCount += 1;
      }
      await manager.save(Player, player);

      await manager.save(
        RosterHistory,
        manager.create(RosterHistory, {
          player,
          team: request.requestingTeam,
          joinedAt: now,
          viaRequest: request,
        }),
      );

      request.status = RequestStatus.APPROVED;
      request.decidedAt = now;
      await manager.save(TransferRequest, request);

      return manager.findOneOrFail(TransferRequest, { where: { id: requestId }, relations: DETAIL_RELATIONS });
    });
  }

  // ---------------------------------------------------------------------------
  // Reads (§7.4 GET /transfer-requests, GET /transfer-requests/:id)
  // ---------------------------------------------------------------------------
  async findForUser(actingUser: AuthenticatedUser, status?: RequestStatus): Promise<TransferRequest[]> {
    if (actingUser.role === UserRole.LEAGUE_ADMIN) {
      return this.requestRepo.find({
        where: status ? { status } : {},
        relations: DETAIL_RELATIONS,
        order: { createdAt: 'DESC' },
      });
    }

    const [asRequester, asReleaser] = await Promise.all([
      this.requestRepo.find({
        where: { requestingTeam: { id: actingUser.teamId! }, ...(status ? { status } : {}) },
        relations: DETAIL_RELATIONS,
      }),
      this.requestRepo.find({
        where: { releasingTeam: { id: actingUser.teamId! }, ...(status ? { status } : {}) },
        relations: DETAIL_RELATIONS,
      }),
    ]);
    const byId = new Map([...asRequester, ...asReleaser].map((r) => [r.id, r]));
    return [...byId.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findOneForUser(requestId: string, actingUser: AuthenticatedUser): Promise<TransferRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId }, relations: DETAIL_RELATIONS });
    if (!request) {
      throw new NotFoundException('Transfer request not found');
    }
    const involved =
      actingUser.role === UserRole.LEAGUE_ADMIN ||
      actingUser.teamId === request.requestingTeam.id ||
      actingUser.teamId === request.releasingTeam?.id;
    if (!involved) {
      throw new ForbiddenException('You are not involved in this transfer request');
    }
    return request;
  }

  async getPayment(requestId: string, actingUser: AuthenticatedUser): Promise<Payment | null> {
    await this.findOneForUser(requestId, actingUser); // authorization + existence check
    return this.dataSource.getRepository(Payment).findOne({ where: { request: { id: requestId } } });
  }

  private async loadForUpdate(manager: EntityManager, requestId: string): Promise<TransferRequest> {
    const request = await manager.findOne(TransferRequest, {
      where: { id: requestId },
      relations: DETAIL_RELATIONS,
    });
    if (!request) {
      throw new NotFoundException('Transfer request not found');
    }
    return request;
  }
}
