import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegacyTeam, UserRole } from '../entities';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { isUniqueViolation } from '../common/db-errors.util';

@Injectable()
export class LegacyTeamsService {
  constructor(@InjectRepository(LegacyTeam) private readonly repo: Repository<LegacyTeam>) {}

  /** Every logged-in role can read this — team owners need it to browse the Legacy Pool by club. */
  findAll(): Promise<LegacyTeam[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  /**
   * Admin-only, and the actual enforcement behind "a legacy player's club must be in
   * the list of legacy teams" — a legacy player can only ever be tagged with a
   * LegacyTeam that exists here (see PlayersService.addLegacyPlayer).
   */
  async create(name: string, actingUser: AuthenticatedUser): Promise<LegacyTeam> {
    if (actingUser.role !== UserRole.LEAGUE_ADMIN) {
      throw new ForbiddenException('Only a League Admin may add a legacy team');
    }
    try {
      return await this.repo.save(this.repo.create({ name }));
    } catch (err) {
      if (isUniqueViolation(err, 'name')) {
        throw new ConflictException('A legacy team with this name already exists');
      }
      throw err;
    }
  }
}
