import { IsNumber, Max, Min } from 'class-validator';
import { BusinessRules } from '../../config/business-rules.config';

export class UpdatePlayerValueDto {
  @IsNumber()
  @Min(BusinessRules.VALUATION_MIN)
  @Max(BusinessRules.VALUATION_MAX)
  transferValue: number;
}
