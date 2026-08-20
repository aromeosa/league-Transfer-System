import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Decision } from '../../entities';

export class LegacyModeDecisionDto {
  @IsEnum(Decision)
  decision: Decision;

  @IsOptional()
  @IsString()
  notes?: string;
}
