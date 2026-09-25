import { IsEmail, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** Where their registration-confirmation link is sent — required, they must accept
   *  it before they count as a real Registered player. */
  @IsEmail()
  email: string;

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
