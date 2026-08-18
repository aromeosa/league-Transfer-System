import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '../entities';
import { GatewaySettlementRequest, GatewaySettlementResult, PaymentGatewayService } from './payment-gateway.interface';
import { buildPayfastSignature } from './payfast.util';

/**
 * Real PayFast integration — redirect-based "Onsite" checkout. Unlike the mock, this
 * never confirms synchronously: it hands back a URL to send the payer's browser to,
 * and the actual confirmation arrives later via PayFast's ITN webhook
 * (see PayfastWebhookController), which is the only source of truth for CONFIRMED.
 */
@Injectable()
export class PayFastGatewayService implements PaymentGatewayService {
  private readonly logger = new Logger(PayFastGatewayService.name);

  private readonly merchantId = process.env.PAYFAST_MERCHANT_ID ?? '';
  private readonly merchantKey = process.env.PAYFAST_MERCHANT_KEY ?? '';
  private readonly passphrase = process.env.PAYFAST_PASSPHRASE ?? '';
  private readonly sandbox = process.env.PAYFAST_MODE === 'sandbox';
  private readonly frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  private readonly backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

  get processUrl(): string {
    return this.sandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';
  }

  async initiateSettlement(request: GatewaySettlementRequest): Promise<GatewaySettlementResult> {
    // Field order here is significant — PayFast's signature must be computed over
    // fields in the order they're documented/submitted, not alphabetically.
    const fields: Record<string, string> = {
      merchant_id: this.merchantId,
      merchant_key: this.merchantKey,
      return_url: `${this.frontendUrl}/payment-result?requestId=${request.transferRequestId}&outcome=success`,
      cancel_url: `${this.frontendUrl}/payment-result?requestId=${request.transferRequestId}&outcome=cancelled`,
      notify_url: `${this.backendUrl}/webhooks/payfast-itn`,
      email_address: request.buyerEmail,
      m_payment_id: request.paymentId,
      amount: request.totalFee.toFixed(2),
      item_name: request.itemName.slice(0, 100),
    };

    const signature = buildPayfastSignature(fields, this.passphrase);
    const query = new URLSearchParams({ ...fields, signature }).toString();

    this.logger.log(`[PAYFAST] Redirecting payment ${request.paymentId} (R${request.totalFee}) to hosted checkout`);

    return {
      status: PaymentStatus.INITIATED,
      redirectUrl: `${this.processUrl}?${query}`,
    };
  }
}
