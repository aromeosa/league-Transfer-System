import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
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

  @IsOptional()
  @IsNumber()
  @Min(BusinessRules.VALUATION_MIN)
  @Max(BusinessRules.VALUATION_MAX)
  transferValue?: number;
}

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name: string;

  @ValidateNested()
  @Type(() => TeamOwnerDto)
  owner: TeamOwnerDto;

  @ValidateNested({ each: true })
  @Type(() => InitialPlayerDto)
  @ArrayMinSize(BusinessRules.ROSTER_MIN)
  @ArrayMaxSize(BusinessRules.ROSTER_MAX)
  players: InitialPlayerDto[];
}
