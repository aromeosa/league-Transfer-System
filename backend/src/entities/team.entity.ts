import { Column, CreateDateColumn, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserAccount } from './user-account.entity';
import { Player } from './player.entity';
import { TeamStatus } from './enums';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: TeamStatus, default: TeamStatus.PENDING_APPROVAL })
  status: TeamStatus;

  /** Data URL (client resizes/re-encodes before upload) — no external file storage needed. */
  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null;

  /** Inverse side — the owning FK (`team_id`) lives on UserAccount, see §4.1. */
  @OneToOne(() => UserAccount, (owner) => owner.team)
  ownerAccount?: UserAccount;

  @OneToMany(() => Player, (player) => player.currentTeam)
  roster?: Player[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Set when a League Admin approves/rejects a self-registered team (§ TeamsService.decide)
   *  — stays null for a team the admin created directly, since that skips approval entirely. */
  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;
}
