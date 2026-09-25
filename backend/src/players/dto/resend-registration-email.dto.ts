import { IsEmail, IsOptional } from 'class-validator';

export class ResendRegistrationEmailDto {
  /** Only needed the first time for a player who never had one on file — e.g. a
   *  retroactive verification request for a player registered before this feature. */
  @IsOptional()
  @IsEmail()
  email?: string;
}
