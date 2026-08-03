import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { WindowStatus } from './enums';

@Entity('transfer_windows')
export class TransferWindow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'opens_at', type: 'timestamptz' })
  opensAt: Date;

  @Column({ name: 'closes_at', type: 'timestamptz' })
  closesAt: Date;

  @Column({ type: 'enum', enum: WindowStatus, default: WindowStatus.SCHEDULED })
  status: WindowStatus;
}
