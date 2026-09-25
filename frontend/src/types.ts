export type UserRole = 'TEAM_OWNER' | 'LEAGUE_ADMIN' | 'FREE_AGENT' | 'LEGACY_TEAM_OWNER';
export type TeamStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';
export type PlayerStatus = 'FREE_AGENT' | 'REGISTERED' | 'LEGACY' | 'PENDING_APPROVAL';
export type PlayerPosition = 'GK' | 'DF' | 'MD' | 'ST';
export type LegacyReason = 'QUALIFIED_MAIN_EVENT' | 'ASSISTED_QUALIFICATION' | 'QUALIFIER_WINNER' | 'TOURNAMENT_WINNER';
export type RequestType = 'FREE_AGENT_SIGNING' | 'CLUB_TRANSFER' | 'LEGACY_TRANSFER';
export type RequestStatus =
  | 'PENDING_RELEASING_APPROVAL'
  | 'PENDING_PLAYER_APPROVAL'
  | 'PENDING_TEAM_APPROVAL'
  | 'PENDING_LEGACY_TEAM_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'PENDING_LEAGUE_APPROVAL'
  | 'APPROVED'
  | 'REJECTED_BY_RELEASING_TEAM'
  | 'REJECTED_BY_PLAYER'
  | 'REJECTED_BY_REQUESTING_TEAM'
  | 'REJECTED_BY_LEGACY_TEAM'
  | 'REJECTED_BY_LEAGUE_ADMIN'
  | 'CANCELLED_WINDOW_CLOSED'
  | 'CANCELLED_PLAYER_UNAVAILABLE';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  teamStatus: TeamStatus | null;
  playerId: string | null;
  legacyTeamId: string | null;
  legacyTeamName: string | null;
}

export interface LegacyTeam {
  id: string;
  name: string;
  ownerAccount?: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  status: PlayerStatus;
  originType: 'FREE_AGENT_ORIGIN' | 'DIRECT_REGISTRATION';
  legacyReason?: LegacyReason | null;
  legacyTeam?: LegacyTeam | null;
  position?: PlayerPosition | null;
  location?: string | null;
  transferValue?: number | null;
  transferCount: number;
  currentTeam?: Team | null;
  avatarUrl?: string | null;
  createdAt: string;
  /** Whether an ID/passport number is on file (hashed) — the number itself is never exposed. */
  idVerified: boolean;
  /** True only for a player who self-registered through the public Free Agent signup
   *  form — false for one a team/admin added directly, even with the same originType. */
  hasAccount: boolean;
}

export interface Team {
  id: string;
  name: string;
  status: TeamStatus;
  logoUrl?: string | null;
  roster?: Player[];
  ownerAccount?: { id: string; name: string; email: string };
  createdAt: string;
  decidedAt?: string | null;
}

export interface TransferWindow {
  id: string;
  opensAt: string;
  closesAt: string;
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED';
}

export interface TransferRequest {
  id: string;
  window: TransferWindow;
  player: Player;
  releasingTeam: Team | null;
  requestingTeam: Team;
  requestType: RequestType;
  agreedFee: number;
  status: RequestStatus;
  squadFloorFlag: boolean;
  createdAt: string;
  decidedAt: string | null;
  payment?: Payment | null;
}

export type DeregistrationReason = 'BAD_BEHAVIOUR' | 'MUTUAL_AGREEMENT';
export type DeregistrationStatus = 'PENDING_LEAGUE_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface PlayerDeregistrationRequest {
  id: string;
  player: Player;
  team: Team;
  reason: DeregistrationReason;
  requestedByUser: { id: string; name: string; email: string };
  status: DeregistrationStatus;
  decisionNotes?: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export type LegacyModeRequestStatus = 'PENDING_LEAGUE_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface LegacyModeRequest {
  id: string;
  team: Team;
  requestedByUser: { id: string; name: string; email: string };
  status: LegacyModeRequestStatus;
  decisionNotes?: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface Payment {
  id: string;
  totalFee: number;
  leagueAmount: number;
  clubSettlementAmount: number;
  playerEntitlement: number;
  status: 'INITIATED' | 'CONFIRMED' | 'FAILED';
  gatewayTransactionId?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  clubPaidAt?: string | null;
  playerPaidAt?: string | null;
}
