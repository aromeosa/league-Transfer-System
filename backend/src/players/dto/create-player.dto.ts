import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePlayerDto {
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
