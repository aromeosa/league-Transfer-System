import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { LegacyReason } from '../../entities';

export class CreateLegacyPlayerDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** Must reference an existing LegacyTeam (POST /legacy-teams) — no free-text club name. */
  @IsUUID()
  legacyTeamId: string;

  @IsEnum(LegacyReason)
  legacyReason: LegacyReason;
}
