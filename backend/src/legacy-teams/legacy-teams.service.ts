import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { LegacyTeam, UserAccount, UserRole } from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { isUniqueViolation } from '../common/db-errors.util';

@Injectable()
export class LegacyTeamsService {
  constructor(
    @InjectRepository(LegacyTeam) private readonly repo: Repository<LegacyTeam>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Every logged-in role can read this — team owners need it to browse the Legacy Pool by club. */
  findAll(): Promise<LegacyTeam[]> {
    return this.repo.find({ relations: ['ownerAccount'], order: { name: 'ASC' } });
  }

  /**
   * Admin-only, and the actual enforcement behind "a legacy player's club must be in
   * the list of legacy teams" — a legacy player can only ever be tagged with a
   * LegacyTeam that exists here (see PlayersService.addLegacyPlayer). Also creates the
   * team's own LEGACY_TEAM_OWNER account in the same transaction — that account is who
   * gets notified and must approve any request to sign one of this team's players
   * (see TransferRequestsService.legacyTeamDecision).
   */
  async create(
    name: string,
    owner: { name: string; email: string; password: string },
    actingUser: AuthenticatedUser,
  ): Promise<LegacyTeam> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may add a legacy team');
    }

    const existingOwner = await this.dataSource.getRepository(UserAccount).findOne({ where: { email: owner.email } });
    if (existingOwner) {
      throw new ConflictException('A user with this email already exists');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const legacyTeam = await manager.save(LegacyTeam, manager.create(LegacyTeam, { name }));

        const passwordHash = await bcrypt.hash(owner.password, 10);
        await manager.save(
          UserAccount,
          manager.create(UserAccount, {
            name: owner.name,
            email: owner.email,
            passwordHash,
            role: UserRole.LEGACY_TEAM_OWNER,
            legacyTeam,
          }),
        );

        return legacyTeam;
      });
    } catch (err) {
      if (isUniqueViolation(err, 'email')) {
        throw new ConflictException('A user with this email already exists');
      }
      if (isUniqueViolation(err, 'name')) {
        throw new ConflictException('A legacy team with this name already exists');
      }
      throw err;
    }
  }
}
