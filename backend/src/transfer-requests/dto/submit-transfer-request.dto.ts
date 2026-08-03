import { IsEnum, IsNumber, IsUUID, Max, Min } from 'class-validator';
import { RequestType } from '../../entities';
import { BusinessRules } from '../../config/business-rules.config';

export class SubmitTransferRequestDto {
  @IsUUID()
  playerId: string;

  @IsEnum(RequestType)
  requestType: RequestType;

  @IsNumber()
  @Min(BusinessRules.VALUATION_MIN)
  @Max(BusinessRules.VALUATION_MAX)
  proposedFee: number;
}
