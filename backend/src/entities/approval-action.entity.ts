import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ApprovalActorRole, Decision } from './enums';
import { TransferRequest } from './transfer-request.entity';
import { UserAccount } from './user-account.entity';

/** Append-only audit trail (§6.3) — a request's status is derived, never edited directly. */
@Entity('approval_actions')
export class ApprovalAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TransferRequest, { nullable: false })
  @JoinColumn({ name: 'request_id' })
  request: TransferRequest;

  @ManyToOne(() => UserAccount, { nullable: false })
  @JoinColumn({ name: 'actor_user_id' })
  actorUser: UserAccount;

  @Column({ name: 'actor_role', type: 'enum', enum: ApprovalActorRole })
  actorRole: ApprovalActorRole;

  @Column({ type: 'enum', enum: Decision })
  decision: Decision;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'decided_at' })
  decidedAt: Date;
}
