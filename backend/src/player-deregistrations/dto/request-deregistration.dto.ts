import { IsEnum, IsUUID } from 'class-validator';
import { DeregistrationReason } from '../../entities';

export class RequestDeregistrationDto {
  @IsUUID()
  playerId: string;

  @IsEnum(DeregistrationReason)
  reason: DeregistrationReason;
}
