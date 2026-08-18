import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RequestStatus, RequestType } from './enums';
import { Team } from './team.entity';
import { Player } from './player.entity';
import { TransferWindow } from './transfer-window.entity';
import { UserAccount } from './user-account.entity';
import { Payment } from './payment.entity';
import { DecimalTransformer } from './decimal.transformer';

@Entity('transfer_requests')
export class TransferRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TransferWindow, { nullable: false })
  @JoinColumn({ name: 'window_id' })
  window: TransferWindow;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  /** Null for a Free Agent signing, or a currently-unattached Registered player (§1.4 #7). */
  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'releasing_team_id' })
  releasingTeam?: Team | null;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({ name: 'requesting_team_id' })
  requestingTeam: Team;

  @ManyToOne(() => UserAccount, { nullable: false })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser: UserAccount;

  @Column({ name: 'request_type', type: 'enum', enum: RequestType })
  requestType: RequestType;

  @Column({
    name: 'agreed_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: DecimalTransformer,
  })
  agreedFee: number;

  @Column({ type: 'enum', enum: RequestStatus })
  status: RequestStatus;

  /** Informational only — squad floor is a soft, League-Admin-reviewed flag (§1.3). */
  @Column({ name: 'squad_floor_flag', type: 'boolean', default: false })
  squadFloorFlag: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;

  /** Inverse side — the owning FK (`request_id`) lives on Payment. Null until payment is initiated. */
  @OneToOne(() => Payment, (payment) => payment.request)
  payment?: Payment | null;
}
