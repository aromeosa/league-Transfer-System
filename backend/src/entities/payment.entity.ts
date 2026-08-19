import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentStatus } from './enums';
import { TransferRequest } from './transfer-request.entity';
import { DecimalTransformer } from './decimal.transformer';

/**
 * Two real settlement legs move through the gateway: league_amount (20%) and
 * club_settlement_amount (80%, bundling the club's 40% and the player's 40%).
 * player_entitlement is a tracked record only — the system never pays a player
 * directly (§1.4 #10); the club forwards it outside the system.
 */
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => TransferRequest, { nullable: false })
  @JoinColumn({ name: 'request_id' })
  request: TransferRequest;

  @Column({ name: 'total_fee', type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  totalFee: number;

  @Column({ name: 'league_amount', type: 'decimal', precision: 10, scale: 2, transformer: DecimalTransformer })
  leagueAmount: number;

  @Column({
    name: 'club_settlement_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: DecimalTransformer,
  })
  clubSettlementAmount: number;

  @Column({
    name: 'player_entitlement',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: DecimalTransformer,
  })
  playerEntitlement: number;

  @Column({ name: 'gateway_transaction_id', nullable: true })
  gatewayTransactionId?: string | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.INITIATED })
  status: PaymentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt?: Date | null;

  /** Raw ITN body from the gateway, for audit/dispute purposes (PayFast only; null for the mock gateway). */
  @Column({ name: 'gateway_raw_payload', type: 'text', nullable: true })
  gatewayRawPayload?: string | null;

  /**
   * Everything lands in the league's own PayFast account (see payfast-gateway.service.ts
   * — one merchant_id for every transaction, no per-club split payment). These two
   * fields are the League Admin manually attesting that they've since forwarded the
   * money on: first the club's 80% bundle, then — once the club's had it — the
   * player's share within it. Neither ever happens automatically.
   */
  @Column({ name: 'club_paid_at', type: 'timestamptz', nullable: true })
  clubPaidAt?: Date | null;

  @Column({ name: 'player_paid_at', type: 'timestamptz', nullable: true })
  playerPaidAt?: Date | null;
}
