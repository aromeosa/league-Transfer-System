import { IsString, MinLength } from 'class-validator';

export class ConfirmPlayerRegistrationDto {
  @IsString()
  @MinLength(1)
  token: string;
}
