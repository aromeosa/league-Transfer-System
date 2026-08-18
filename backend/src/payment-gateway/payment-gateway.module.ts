import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import { MockGatewayService } from './mock-gateway.service';
import { PayFastGatewayService } from './payfast-gateway.service';

/**
 * Picks the real PayFast gateway only when its credentials are actually configured —
 * local/dev environments without PAYFAST_MERCHANT_ID fall back to the mock, so nothing
 * accidentally tries to hit a real payment provider without explicit opt-in.
 */
@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useFactory: () => (process.env.PAYFAST_MERCHANT_ID ? new PayFastGatewayService() : new MockGatewayService()),
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentGatewayModule {}
