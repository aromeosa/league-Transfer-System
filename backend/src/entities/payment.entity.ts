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
}
