import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { BusinessRules } from '../../config/business-rules.config';

export class CreatePlayerDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(BusinessRules.VALUATION_MIN)
  @Max(BusinessRules.VALUATION_MAX)
  transferValue?: number;

  /** National ID or passport number — optional, hashed before storage (never kept raw). */
  @IsOptional()
  @IsString()
  @MinLength(4)
  idNumber?: string;
}
