import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LegacyModeRequestStatus } from './enums';
import { Team } from './team.entity';
import { UserAccount } from './user-account.entity';

/**
 * A team owner asking for their whole roster to be promoted to Legacy status — the
 * same outcome as TeamsService.markTournamentWinner, just team-initiated and gated on
 * a League Admin's approval rather than the admin declaring it directly. Nothing
 * happens to the roster until approved; on rejection every player keeps their
 * original status.
 */
@Entity('legacy_mode_requests')
export class LegacyModeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Team, { nullable: false })
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @ManyToOne(() => UserAccount, { nullable: false })
  @JoinColumn({ name: 'requested_by_user_id' })
  requestedByUser: UserAccount;

  @Column({ type: 'enum', enum: LegacyModeRequestStatus, default: LegacyModeRequestStatus.PENDING_LEAGUE_APPROVAL })
  status: LegacyModeRequestStatus;

  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;
}
