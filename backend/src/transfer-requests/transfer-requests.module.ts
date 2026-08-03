import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, TransferRequest } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { PaymentGatewayModule } from '../payment-gateway/payment-gateway.module';
import { TransferRequestsService } from './transfer-requests.service';
import { TransferRequestsController } from './transfer-requests.controller';
import { PaymentWebhookController } from './payment-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TransferRequest, Payment]), AuthModule, PaymentGatewayModule],
  controllers: [TransferRequestsController, PaymentWebhookController],
  providers: [TransferRequestsService],
  exports: [TransferRequestsService],
})
export class TransferRequestsModule {}
