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
import { computeFeeSplit, wouldBreachSquadFloor } from './fee-split.util';

const ACTIVE_REQUEST_STATUSES = [
  RequestStatus.PENDING_RELEASING_APPROVAL,
  RequestStatus.PENDING_PLAYER_APPROVAL,
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
  'payment',
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
        relations: ['currentTeam', 'account'],
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
      const releasingRosterSize = releasingTeam
        ? await manager.count(Player, { where: { currentTeam: { id: releasingTeam.id } } })
        : 0;
      const requestingRosterSize = await manager.count(Player, {
        where: { currentTeam: { id: requestingTeamId } },
      });

      // Hard gate — a transfer that would leave either squad outside the
      // ROSTER_MIN/MAX band is rejected outright at submission, not just flagged.
      if (releasingTeam && releasingRosterSize - 1 < BusinessRules.ROSTER_MIN) {
        throw new BadRequestException(
          `This transfer would drop ${releasingTeam.name}'s roster below the ${BusinessRules.ROSTER_MIN}-player minimum`,
        );
      }
      if (requestingRosterSize + 1 > BusinessRules.ROSTER_MAX) {
        throw new BadRequestException(
          `Your roster would exceed the ${BusinessRules.ROSTER_MAX}-player maximum`,
        );
      }

      const squadFloorFlag = releasingTeam ? wouldBreachSquadFloor(releasingRosterSize) : false;

      // A Free Agent who signed up with their own account must accept the offer
      // themselves before it can proceed to payment (§ free-agent-signup). Free Agents
      // from before that feature existed have no account to log in with, so they fall
      // back to the old behaviour and go straight to payment.
      const status = releasingTeam
        ? RequestStatus.PENDING_RELEASING_APPROVAL
        : dto.requestType === RequestType.FREE_AGENT_SIGNING && player.account
          ? RequestStatus.PENDING_PLAYER_APPROVAL
          : RequestStatus.PENDING_PAYMENT;

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
  // Free Agent decision (POST /transfer-requests/:id/player-decision)
  // ---------------------------------------------------------------------------
  async playerDecision(
    requestId: string,
    dto: { decision: Decision; notes?: string },
    actingUser: AuthenticatedUser,
  ): Promise<TransferRequest> {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.loadForUpdate(manager, requestId);

      if (request.status !== RequestStatus.PENDING_PLAYER_APPROVAL) {
        throw new ConflictException(`Request is not awaiting a player decision (status: ${request.status})`);
      }
      if (actingUser.role !== UserRole.FREE_AGENT || actingUser.playerId !== request.player.id) {
        throw new ForbiddenException('Only the Free Agent themselves may decide on this request');
      }

      await manager.save(
        ApprovalAction,
        manager.create(ApprovalAction, {
          request,
          actorUser: { id: actingUser.userId },
          actorRole: ApprovalActorRole.PLAYER,
          decision: dto.decision,
          notes: dto.notes ?? null,
        }),
      );

      request.status = dto.decision === Decision.APPROVE ? RequestStatus.PENDING_PAYMENT : RequestStatus.REJECTED_BY_PLAYER;
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
  async initiatePayment(
    requestId: string,
    actingUser: AuthenticatedUser,
  ): Promise<{ request: TransferRequest; payment: Payment; redirectUrl?: string }> {
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
        transferRequestId: request.id,
        totalFee,
        leagueAmount,
        clubSettlementAmount,
        itemName: `Transfer fee: ${request.player.name} to ${request.requestingTeam.name}`,
        buyerEmail: actingUser.email,
      });

      // A redirect-based gateway (PayFast) has no gatewayTransactionId yet — that only
      // arrives via the ITN webhook once the payer actually completes checkout — and
      // must stay INITIATED here rather than being marked CONFIRMED synchronously.
      if (result.gatewayTransactionId) {
        payment.gatewayTransactionId = result.gatewayTransactionId;
      }
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
      return { request: freshRequest, payment, redirectUrl: result.redirectUrl };
    });
  }

  /**
   * Called by PayfastWebhookController once it's checked the ITN's signature and run
   * PayFast's own server-side validate callback — see that controller for why raw
   * signature/IP checks alone aren't trusted. `claimedAmount`, if given, is compared
   * against this payment's actual totalFee — a mismatch (tampered/replayed ITN claiming
   * a different amount was paid) fails the payment instead of confirming it. Idempotent:
   * a payment already resolved out of INITIATED is a safe no-op, covering webhook
   * retries/replays.
   */
  async confirmGatewayPayment(
    paymentId: string,
    gatewayTransactionId: string,
    status: PaymentStatus,
    rawPayload: string,
    claimedAmount?: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: paymentId },
        relations: ['request'],
      });
      if (!payment || payment.status !== PaymentStatus.INITIATED) {
        return; // unknown payment, or already resolved — safe no-op
      }

      const amountMismatch =
        status === PaymentStatus.CONFIRMED &&
        claimedAmount !== undefined &&
        Math.abs(claimedAmount - payment.totalFee) > 0.01;

      payment.status = amountMismatch ? PaymentStatus.FAILED : status;
      payment.gatewayTransactionId = gatewayTransactionId;
      payment.gatewayRawPayload = rawPayload;
      if (payment.status === PaymentStatus.CONFIRMED) {
        payment.confirmedAt = new Date();
      }
      await manager.save(Payment, payment);

      if (payment.status === PaymentStatus.CONFIRMED) {
        await manager.update(TransferRequest, payment.request.id, { status: RequestStatus.PENDING_LEAGUE_APPROVAL });
      }
    });
  }

  /**
   * League Admin escape hatch for when PayFast's ITN never reaches us (webhook delivery
   * is inherently best-effort — a cold-started free-tier dyno, a dropped connection, etc.
   * can all silently swallow it) despite the payer having genuinely completed checkout.
   * Reuses confirmGatewayPayment so the same idempotency/status-transition guarantees
   * apply; the raw payload records who confirmed it and when, for audit purposes.
   */
  async confirmPaymentManually(requestId: string, actingUser: AuthenticatedUser): Promise<TransferRequest> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may manually confirm a payment');
    }
    const payment = await this.dataSource.getRepository(Payment).findOne({ where: { request: { id: requestId } } });
    if (!payment) {
      throw new NotFoundException('No payment found for this request');
    }
    if (payment.status !== PaymentStatus.INITIATED) {
      throw new ConflictException(`Payment is not awaiting confirmation (status: ${payment.status})`);
    }

    await this.confirmGatewayPayment(
      payment.id,
      'MANUAL_ADMIN_CONFIRM',
      PaymentStatus.CONFIRMED,
      JSON.stringify({ manual: true, confirmedByUserId: actingUser.userId, confirmedAt: new Date().toISOString() }),
      payment.totalFee,
    );

    return this.findOneForUser(requestId, actingUser);
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
      const player = await manager.findOneOrFail(Player, { where: { id: request.player.id }, relations: ['currentTeam'] });

      // A competing request for the same player may have already been approved while
      // this one sat at PENDING_LEAGUE_APPROVAL — re-check the player's current state
      // against what this request assumed at submission, rather than blindly
      // reassigning and silently overwriting whoever won the earlier approval.
      const stillAvailable = request.releasingTeam
        ? player.currentTeam?.id === request.releasingTeam.id
        : player.status === PlayerStatus.FREE_AGENT;

      if (!stillAvailable) {
        request.status = RequestStatus.CANCELLED_PLAYER_UNAVAILABLE;
        request.decidedAt = now;
        await manager.save(TransferRequest, request);
        return manager.findOneOrFail(TransferRequest, { where: { id: requestId }, relations: DETAIL_RELATIONS });
      }

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

    if (actingUser.role === UserRole.FREE_AGENT) {
      return this.requestRepo.find({
        where: { player: { id: actingUser.playerId! }, ...(status ? { status } : {}) },
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
      actingUser.teamId === request.releasingTeam?.id ||
      actingUser.playerId === request.player.id;
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
