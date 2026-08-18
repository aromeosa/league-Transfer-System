import { IsEnum, IsNumber, IsUUID, Min } from 'class-validator';
import { RequestType } from '../../entities';

export class SubmitTransferRequestDto {
  @IsUUID()
  playerId: string;

  @IsEnum(RequestType)
  requestType: RequestType;

  // Upper bound and the free-agent-only R0 allowance are business rules that depend on
  // requestType, so they're enforced in TransferRequestsService.submit() instead — see
  // there for why a free agent signing can be R0 but a club/legacy transfer can't.
  @IsNumber()
  @Min(0)
  proposedFee: number;
}
