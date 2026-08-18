import { Controller, Logger, Post, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentStatus } from '../entities';
import { TransferRequestsService } from './transfer-requests.service';
import { buildPayfastSignature } from '../payment-gateway/payfast.util';

/**
 * §7.4 POST /webhooks/payfast-itn — PayFast's Instant Transaction Notification.
 * Nobody authenticates this request (PayFast can't send our JWTs), so it's verified by
 * three independent checks instead, all of which must pass before a "payment succeeded"
 * claim is ever trusted:
 *   1. Our own signature recomputation matches the one PayFast sent.
 *   2. PayFast's own server-to-server "validate" callback confirms the payload is
 *      genuine (mirrors what our signature check does, from PayFast's side — catches
 *      forged requests that happen to guess a valid-looking signature).
 *   3. The claimed amount matches what this payment actually charges (done inside
 *      TransferRequestsService.confirmGatewayPayment, which has the source-of-truth
 *      amount on record) — protects against a tampered/replayed ITN for a different sum.
 * Always acknowledges with 200 immediately (PayFast retries on non-200/timeout) —
 * failures are logged, not surfaced back to the caller.
 */
@Controller('webhooks')
export class PayfastWebhookController {
  private readonly logger = new Logger(PayfastWebhookController.name);
  private readonly passphrase = process.env.PAYFAST_PASSPHRASE ?? '';
  private readonly sandbox = process.env.PAYFAST_MODE === 'sandbox';

  constructor(private readonly service: TransferRequestsService) {}

  @Post('payfast-itn')
  handle(@Req() req: RawBodyRequest<Request>, @Res() res: Response): void {
    const body = (req.body ?? {}) as Record<string, string>;
    res.status(200).send('OK');

    this.process(body, req.rawBody?.toString('utf8') ?? '').catch((err) => {
      this.logger.error(`ITN processing failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  private async process(body: Record<string, string>, rawBody: string): Promise<void> {
    const { signature, ...fields } = body;
    const paymentId = body.m_payment_id;

    const expectedSignature = buildPayfastSignature(fields, this.passphrase);
    if (!signature || signature !== expectedSignature) {
      this.logger.warn(`ITN signature mismatch for m_payment_id=${paymentId}`);
      return;
    }

    if (!(await this.validateWithPayfast(rawBody))) {
      this.logger.warn(`ITN failed PayFast's own validate callback for m_payment_id=${paymentId}`);
      return;
    }

    if (!paymentId) {
      this.logger.warn('ITN passed signature + validate checks but is missing m_payment_id');
      return;
    }

    const status = body.payment_status === 'COMPLETE' ? PaymentStatus.CONFIRMED : PaymentStatus.FAILED;
    const claimedAmount = body.amount_gross ? Number(body.amount_gross) : undefined;

    await this.service.confirmGatewayPayment(
      paymentId,
      body.pf_payment_id ?? '',
      status,
      JSON.stringify(body),
      claimedAmount,
    );
  }

  private async validateWithPayfast(rawBody: string): Promise<boolean> {
    const url = this.sandbox
      ? 'https://sandbox.payfast.co.za/eng/query/validate'
      : 'https://www.payfast.co.za/eng/query/validate';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: rawBody,
      });
      return (await response.text()).trim() === 'VALID';
    } catch (err) {
      this.logger.error(`PayFast validate callback request failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
}
