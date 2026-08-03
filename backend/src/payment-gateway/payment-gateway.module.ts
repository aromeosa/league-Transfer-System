import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';
import { MockGatewayService } from './mock-gateway.service';

@Module({
  providers: [{ provide: PAYMENT_GATEWAY, useClass: MockGatewayService }],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentGatewayModule {}
