import { PaymentStatus } from '../entities';

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

export interface GatewaySettlementRequest {
  paymentId: string;
  transferRequestId: string;
  totalFee: number;
  leagueAmount: number;
  clubSettlementAmount: number;
  itemName: string;
  buyerEmail: string;
}

export interface GatewaySettlementResult {
  /**
   * Unknown at initiation time for a redirect-based gateway (PayFast) — only becomes
   * known once the ITN webhook arrives. The mock gateway still returns one immediately.
   */
  gatewayTransactionId?: string;
  /**
   * A real gateway returns INITIATED here and confirms later via the ITN webhook
   * (§7.4/§6.3). The dev stub short-circuits straight to CONFIRMED so the vertical
   * slice is testable without a real vendor.
   */
  status: PaymentStatus;
  /** Present when the payer must be redirected to complete payment (e.g. PayFast's hosted checkout). */
  redirectUrl?: string;
}

/** Swap the provider bound to PAYMENT_GATEWAY (see payment-gateway.module.ts) for a real vendor later. */
export interface PaymentGatewayService {
  initiateSettlement(request: GatewaySettlementRequest): Promise<GatewaySettlementResult>;
}
