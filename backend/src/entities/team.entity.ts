import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserAccount } from './user-account.entity';
import { Player } from './player.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  /** Inverse side — the owning FK (`team_id`) lives on UserAccount, see §4.1. */
  @OneToOne(() => UserAccount, (owner) => owner.team)
  ownerAccount?: UserAccount;

  @OneToMany(() => Player, (player) => player.currentTeam)
  roster?: Player[];
}
