export type UserRole = 'TEAM_OWNER' | 'LEAGUE_ADMIN';
export type TeamStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';
export type PlayerStatus = 'FREE_AGENT' | 'REGISTERED' | 'LEGACY';
export type RequestType = 'FREE_AGENT_SIGNING' | 'CLUB_TRANSFER' | 'LEGACY_TRANSFER';
export type RequestStatus =
  | 'PENDING_RELEASING_APPROVAL'
  | 'PENDING_PAYMENT'
  | 'PENDING_LEAGUE_APPROVAL'
  | 'APPROVED'
  | 'REJECTED_BY_RELEASING_TEAM'
  | 'REJECTED_BY_LEAGUE_ADMIN'
  | 'CANCELLED_WINDOW_CLOSED';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  teamStatus: TeamStatus | null;
}

export interface Player {
  id: string;
  name: string;
  status: PlayerStatus;
  originType: 'FREE_AGENT_ORIGIN' | 'DIRECT_REGISTRATION';
  legacyReason?: string | null;
  transferValue?: number | null;
  transferCount: number;
  currentTeam?: Team | null;
  avatarUrl?: string | null;
}

export interface Team {
  id: string;
  name: string;
  status: TeamStatus;
  roster?: Player[];
  ownerAccount?: { id: string; name: string; email: string };
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
}

export interface Payment {
  id: string;
  totalFee: number;
  leagueAmount: number;
  clubSettlementAmount: number;
  playerEntitlement: number;
  status: 'INITIATED' | 'CONFIRMED' | 'FAILED';
  gatewayTransactionId?: string | null;
}
