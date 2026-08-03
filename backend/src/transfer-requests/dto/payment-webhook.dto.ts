import { IsEnum, IsString } from 'class-validator';
import { PaymentStatus } from '../../entities';

export class PaymentWebhookDto {
  @IsString()
  gatewayTransactionId: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
