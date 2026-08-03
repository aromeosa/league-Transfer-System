import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from './enums';
import { Team } from './team.entity';

@Entity('user_accounts')
export class UserAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  /** One account per team (§1.1) — null for LeagueAdmin accounts. */
  @OneToOne(() => Team, (team) => team.ownerAccount, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team?: Team | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
