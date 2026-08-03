import { PaymentStatus } from '../entities';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface GatewaySettlementRequest {
  paymentId: string;
  totalFee: number;
  leagueAmount: number;
  clubSettlementAmount: number;
}

export interface GatewaySettlementResult {
  gatewayTransactionId: string;
  /**
   * A real gateway returns INITIATED here and confirms later via the
   * `/webhooks/payment-gateway` callback (§7.4/§6.3). The dev stub short-circuits
   * straight to CONFIRMED so the vertical slice is testable without a real vendor.
   */
  status: PaymentStatus;
}

/** Swap the provider bound to PAYMENT_GATEWAY (see payment-gateway.module.ts) for a real vendor later. */
export interface PaymentGatewayService {
  initiateSettlement(request: GatewaySettlementRequest): Promise<GatewaySettlementResult>;
}
