import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Player } from './player.entity';

/**
 * Single-use, expiring tokens for the player-registration confirmation flow — a team
 * owner registers a player (initial roster or "Add player") and the player must accept
 * by email before they count as REGISTERED (see PlayerRegistrationService). Mirrors
 * PasswordResetToken: only the SHA-256 hash of the raw token is stored, the raw token
 * exists only in the emailed link.
 */
@Entity('player_registration_tokens')
export class PlayerRegistrationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Player, { nullable: false })
  @JoinColumn({ name: 'player_id' })
  player: Player;

  @Column({ name: 'token_hash', unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
