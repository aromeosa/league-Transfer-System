import { IsEnum, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Decision } from '../../entities';

export class TeamDecisionDto {
  @IsEnum(Decision)
  decision: Decision;

  // The Free Agent never proposes a fee themselves — the team sets it now, on approval.
  // Not validated on REJECT, where it's meaningless.
  @ValidateIf((o: TeamDecisionDto) => o.decision === Decision.APPROVE)
  @IsNumber()
  @Min(0)
  fee?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
