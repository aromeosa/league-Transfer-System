import { IsEnum, IsString, MinLength } from 'class-validator';
import { LegacyReason } from '../../entities';

export class CreateLegacyPlayerDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** The club this Legacy Player originally qualified/is associated with. */
  @IsString()
  @MinLength(1)
  clubName: string;

  @IsEnum(LegacyReason)
  legacyReason: LegacyReason;
}
