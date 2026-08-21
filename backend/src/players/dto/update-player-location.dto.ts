import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePlayerLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  location: string;
}
