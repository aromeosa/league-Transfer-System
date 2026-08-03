import { Body, Controller, Post } from '@nestjs/common';
import { TransferRequestsService } from './transfer-requests.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

/**
 * §7.4 POST /webhooks/payment-gateway — verified by the gateway's signature, not user auth.
 * Signature verification is left for the real vendor integration (deferred, see plan);
 * the mock gateway never actually calls this over HTTP (§payment-gateway module).
 */
@Controller('webhooks')
export class PaymentWebhookController {
  constructor(private readonly service: TransferRequestsService) {}

  @Post('payment-gateway')
  handle(@Body() dto: PaymentWebhookDto) {
    return this.service.handlePaymentWebhook(dto.gatewayTransactionId, dto.status);
  }
}
