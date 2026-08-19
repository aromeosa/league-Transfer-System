import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
