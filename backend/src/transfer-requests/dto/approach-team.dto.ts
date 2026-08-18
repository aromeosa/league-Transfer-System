import { IsUUID } from 'class-validator';

export class ApproachTeamDto {
  @IsUUID()
  teamId: string;
}
