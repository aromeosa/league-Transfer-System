import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserAccount } from './user-account.entity';

/**
 * Single-use, expiring tokens for the forgot-password flow. Only the SHA-256 hash of
 * the raw token is stored (mirrors password hashing) — the raw token exists only in
 * the emailed link and the reset request itself.
 */
@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserAccount, { nullable: false })
  @JoinColumn({ name: 'user_account_id' })
  userAccount: UserAccount;

  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
