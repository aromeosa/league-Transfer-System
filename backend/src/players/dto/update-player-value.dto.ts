import { IsNumber, Min } from 'class-validator';

export class UpdatePlayerValueDto {
  /** No upper/lower valuation band — just can't be negative. */
  @IsNumber()
  @Min(0)
  transferValue: number;
}
