import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { LegacyReason, PlayerOrigin, PlayerPosition, PlayerStatus } from './enums';
import { Team } from './team.entity';
import { UserAccount } from './user-account.entity';
import { DecimalTransformer } from './decimal.transformer';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /**
   * Current roster (§4.1). Null means either never registered (Free Agent) or
   * previously registered and currently unattached (still REGISTERED status, §1.4 #7).
   */
  @ManyToOne(() => Team, (team) => team.roster, { nullable: true })
  @JoinColumn({ name: 'current_team_id' })
  currentTeam?: Team | null;

  @Column({ type: 'enum', enum: PlayerStatus, default: PlayerStatus.FREE_AGENT })
  status: PlayerStatus;

  @Column({ name: 'origin_type', type: 'enum', enum: PlayerOrigin })
  originType: PlayerOrigin;

  @Column({ name: 'legacy_reason', type: 'enum', enum: LegacyReason, nullable: true })
  legacyReason?: LegacyReason | null;

  /** GK/DF/MD/ST — collected at Free Agent self-signup; nullable for players registered another way. */
  @Column({ type: 'enum', enum: PlayerPosition, nullable: true })
  position?: PlayerPosition | null;

  /** R500–R5,000 (§1.3) — nullable until the current team assigns one. */
  @Column({
    name: 'transfer_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: DecimalTransformer,
  })
  transferValue?: number | null;

  /** Season transfer count, capped by originType (§1.4 #4/#9). */
  @Column({ name: 'transfer_count', type: 'int', default: 0 })
  transferCount: number;

  /** Data URL (client resizes/re-encodes before upload) — no external file storage needed. */
  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl?: string | null;

  /** Inverse side — the owning FK (`player_id`) lives on UserAccount. Free Agents only. */
  @OneToOne(() => UserAccount, (account) => account.player)
  account?: UserAccount | null;

  /**
   * One-way HMAC of a national ID/passport number (never the raw value — see
   * id-number.util.ts) — anti-fraud duplicate-identity check only. The unique
   * constraint is the actual enforcement; nobody, including a League Admin, can ever
   * recover the original number from this. Multiple NULLs are allowed (most existing
   * players have none on file).
   */
  @Exclude()
  @Column({ name: 'id_number_hash', type: 'varchar', length: 64, nullable: true, unique: true })
  idNumberHash?: string | null;

  @Expose()
  get idVerified(): boolean {
    return !!this.idNumberHash;
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
