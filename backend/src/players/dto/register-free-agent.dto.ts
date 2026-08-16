import { IsEnum, IsString, MinLength } from 'class-validator';
import { PlayerPosition } from '../../entities';

export class RegisterFreeAgentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(PlayerPosition)
  position: PlayerPosition;
}
