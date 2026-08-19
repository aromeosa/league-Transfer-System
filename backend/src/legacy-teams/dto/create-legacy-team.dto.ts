import { IsString, MinLength } from 'class-validator';

export class CreateLegacyTeamDto {
  @IsString()
  @MinLength(1)
  name: string;
}
