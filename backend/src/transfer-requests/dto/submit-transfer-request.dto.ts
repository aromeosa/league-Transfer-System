import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
import { RequestType } from '../../entities';

export class SubmitTransferRequestDto {
  @IsUUID()
  playerId: string;

  @IsEnum(RequestType)
  requestType: RequestType;

  // The free-agent-only R0 allowance depends on requestType, so it's enforced in
  // TransferRequestsService.submit() instead — see there for why a free agent signing
  // can be R0 but a club/legacy transfer can't. No upper/lower valuation band.
  @IsNumber()
  @Min(0)
  proposedFee: number;
}
