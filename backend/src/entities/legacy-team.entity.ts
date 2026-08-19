import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserAccount } from './user-account.entity';

/**
 * The curated list of clubs eligible to have Legacy Players — admin-managed. A player
 * can only be added to the Legacy Pool under a name from this list (§ legacy pool
 * validation), rather than any free-text club name. Expected to grow incrementally as
 * new teams earn legacy status each season.
 */
@Entity('legacy_teams')
export class LegacyTeam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  /** Inverse side — the owning FK (`legacy_team_id`) lives on UserAccount, mirroring
   * Team.ownerAccount. Null for a legacy team created before this existed. */
  @OneToOne(() => UserAccount, (owner) => owner.legacyTeam)
  ownerAccount?: UserAccount | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
