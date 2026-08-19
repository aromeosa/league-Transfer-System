import { Type } from 'class-transformer';
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';

export class LegacyTeamOwnerDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class CreateLegacyTeamDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** The account that logs in to approve/reject requests to sign this legacy team's players. */
  @ValidateNested()
  @Type(() => LegacyTeamOwnerDto)
  owner: LegacyTeamOwnerDto;
}
