import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BusinessRules } from '../../config/business-rules.config';

export class TeamOwnerDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class InitialPlayerDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** No upper/lower valuation band — just can't be negative. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  transferValue?: number;

  /** National ID or passport number — optional, hashed before storage (never kept raw). */
  @IsOptional()
  @IsString()
  @MinLength(4)
  idNumber?: string;
}

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** Optional at registration — a team can add or change it anytime afterward. */
  @IsOptional()
  @IsString()
  @MaxLength(1_500_000)
  @Matches(/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/]+=*$/)
  logoDataUrl?: string;

  @ValidateNested()
  @Type(() => TeamOwnerDto)
  owner: TeamOwnerDto;

  @ValidateNested({ each: true })
  @Type(() => InitialPlayerDto)
  @ArrayMinSize(BusinessRules.ROSTER_MIN)
  @ArrayMaxSize(BusinessRules.ROSTER_MAX)
  players: InitialPlayerDto[];
}
