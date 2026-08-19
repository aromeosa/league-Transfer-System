import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DeregistrationReason, DeregistrationStatus } from './enums';
import { Player } from './player.entity';
import { Team } from './team.entity';
import { UserAccount } from './user-account.entity';

/**
 * A team owner asking to remove one of their own players from the roster — no other
 * team involved, no fee (unlike TransferRequest). The player stays on the roster until
 * a League Admin authorizes it; the reason is recorded at submission so it's visible to
 * the admin before they decide, not just logged after the fact.
 */
@Entity('player_deregistration_requests')
export class PlayerDeregistrationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'enum', enum: DeregistrationReason })
  reason: DeregistrationReason;

  @ManyToOne(() => UserAccount, { nullable: false })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser: UserAccount;

  @Column({ type: 'enum', enum: DeregistrationStatus, default: DeregistrationStatus.PENDING_LEAGUE_APPROVAL })
  status: DeregistrationStatus;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;
}
