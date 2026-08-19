import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Decision } from '../../entities';

export class DeregistrationDecisionDto {
  @IsEnum(Decision)
  decision: Decision;

  @IsOptional()
  @IsString()
  notes?: string;
}
