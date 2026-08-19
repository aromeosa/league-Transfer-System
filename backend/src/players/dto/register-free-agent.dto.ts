import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PlayerPosition } from '../../entities';

export class RegisterFreeAgentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(PlayerPosition)
  position: PlayerPosition;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  /** National ID or passport number — optional, hashed before storage (never kept raw). */
  @IsOptional()
  @IsString()
  @MinLength(4)
  idNumber?: string;
}
