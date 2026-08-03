import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Player } from './player.entity';
import { Team } from './team.entity';
import { TransferRequest } from './transfer-request.entity';

@Entity('roster_history')
export class RosterHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt?: Date | null;

  @ManyToOne(() => TransferRequest, { nullable: true })
  @JoinColumn({ name: 'via_request_id' })
  viaRequest?: TransferRequest | null;
}
