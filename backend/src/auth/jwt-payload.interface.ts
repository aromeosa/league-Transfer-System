import { UserRole } from '../entities';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  playerId: string | null;
  legacyTeamId: string | null;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  playerId: string | null;
  legacyTeamId: string | null;
}
