import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentStatus } from '../entities';
import { GatewaySettlementRequest, GatewaySettlementResult, PaymentGatewayService } from './payment-gateway.interface';

/**
 * Dev/test stand-in for the real vendor (Peach Payments / PayFast / etc., §6.1).
 * Auto-confirms instantly. Real payment-gateway vendor integration is explicitly
 * deferred (see the implementation plan) — this keeps the same interface so
 * swapping it later doesn't touch the schema or TransferRequestsService.
 */
@Injectable()
export class MockGatewayService implements PaymentGatewayService {
  private readonly logger = new Logger(MockGatewayService.name);

  async initiateSettlement(request: GatewaySettlementRequest): Promise<GatewaySettlementResult> {
    const gatewayTransactionId = `mock_${randomUUID()}`;
    this.logger.log(
      `[MOCK GATEWAY] Settling payment ${request.paymentId}: league R${request.leagueAmount} + club R${request.clubSettlementAmount} = R${request.totalFee} -> ${gatewayTransactionId} (auto-confirmed)`,
    );
    return { gatewayTransactionId, status: PaymentStatus.CONFIRMED };
  }
}
