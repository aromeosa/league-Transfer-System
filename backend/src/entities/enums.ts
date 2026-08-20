export enum UserRole {
  TEAM_OWNER = 'TEAM_OWNER',
  LEAGUE_ADMIN = 'LEAGUE_ADMIN',
  /** A self-registered Free Agent — logs in to accept/reject signing offers (see FreeAgentDto). */
  FREE_AGENT = 'FREE_AGENT',
  /** Represents a curated LegacyTeam — logs in to approve/reject requests to sign one
   *  of that legacy team's players (see TransferRequestsService.legacyTeamDecision). */
  LEGACY_TEAM_OWNER = 'LEGACY_TEAM_OWNER',
}

/** Self-registered teams start PENDING_APPROVAL; admin-created teams start ACTIVE. */
export enum TeamStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  REJECTED = 'REJECTED',
}

export enum PlayerStatus {
  FREE_AGENT = 'FREE_AGENT',
  REGISTERED = 'REGISTERED',
  LEGACY = 'LEGACY',
}

export enum PlayerOrigin {
  FREE_AGENT_ORIGIN = 'FREE_AGENT_ORIGIN',
  DIRECT_REGISTRATION = 'DIRECT_REGISTRATION',
}

export enum PlayerPosition {
  GK = 'GK',
  DF = 'DF',
  MD = 'MD',
  ST = 'ST',
}

export enum LegacyReason {
  QUALIFIED_MAIN_EVENT = 'QUALIFIED_MAIN_EVENT',
  ASSISTED_QUALIFICATION = 'ASSISTED_QUALIFICATION',
  QUALIFIER_WINNER = 'QUALIFIER_WINNER',
  /** A team's whole registered roster promoted at once after winning a tournament outright
   *  (see TeamsService.markTournamentWinner) — distinct from qualifying for one. */
  TOURNAMENT_WINNER = 'TOURNAMENT_WINNER',
}

export enum WindowStatus {
  SCHEDULED = 'SCHEDULED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum RequestType {
  FREE_AGENT_SIGNING = 'FREE_AGENT_SIGNING',
  CLUB_TRANSFER = 'CLUB_TRANSFER',
  LEGACY_TRANSFER = 'LEGACY_TRANSFER',
}

/**
 * "Submitted" from the §5.2 state diagram is transient — a request is created
 * directly into PENDING_RELEASING_APPROVAL (has a current club), PENDING_PLAYER_APPROVAL
 * (Free Agent signing of a player with their own account — they must accept first), or
 * PENDING_PAYMENT (unattached Registered player / Free Agent with no account on file).
 */
export enum RequestStatus {
  PENDING_RELEASING_APPROVAL = 'PENDING_RELEASING_APPROVAL',
  PENDING_PLAYER_APPROVAL = 'PENDING_PLAYER_APPROVAL',
  /** A Free Agent approached this team directly — awaiting the team owner's decision
   *  (reverse of the usual team-initiates flow; see TransferRequestsService.approachTeam). */
  PENDING_TEAM_APPROVAL = 'PENDING_TEAM_APPROVAL',
  /** A team requested to sign an unattached Legacy Player — awaiting that legacy
   *  team's own owner account to approve (see TransferRequestsService.legacyTeamDecision). */
  PENDING_LEGACY_TEAM_APPROVAL = 'PENDING_LEGACY_TEAM_APPROVAL',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_LEAGUE_APPROVAL = 'PENDING_LEAGUE_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED_BY_RELEASING_TEAM = 'REJECTED_BY_RELEASING_TEAM',
  REJECTED_BY_PLAYER = 'REJECTED_BY_PLAYER',
  /** The approached team turned down a Free Agent's approach. */
  REJECTED_BY_REQUESTING_TEAM = 'REJECTED_BY_REQUESTING_TEAM',
  /** The legacy team's owner turned down a request to sign one of their players. */
  REJECTED_BY_LEGACY_TEAM = 'REJECTED_BY_LEGACY_TEAM',
  REJECTED_BY_LEAGUE_ADMIN = 'REJECTED_BY_LEAGUE_ADMIN',
  CANCELLED_WINDOW_CLOSED = 'CANCELLED_WINDOW_CLOSED',
  /** A competing request for the same player was approved first (see leagueDecision). */
  CANCELLED_PLAYER_UNAVAILABLE = 'CANCELLED_PLAYER_UNAVAILABLE',
}

export enum ApprovalActorRole {
  RELEASING_TEAM = 'RELEASING_TEAM',
  /** The team being approached, deciding on a Free-Agent-initiated approach. */
  REQUESTING_TEAM = 'REQUESTING_TEAM',
  PLAYER = 'PLAYER',
  /** The legacy team's own owner account, deciding on a request to sign their player. */
  LEGACY_TEAM = 'LEGACY_TEAM',
  LEAGUE_ADMIN = 'LEAGUE_ADMIN',
}

export enum Decision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum DeregistrationReason {
  BAD_BEHAVIOUR = 'BAD_BEHAVIOUR',
  MUTUAL_AGREEMENT = 'MUTUAL_AGREEMENT',
}

export enum DeregistrationStatus {
  PENDING_LEAGUE_APPROVAL = 'PENDING_LEAGUE_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** A team requesting the same outcome as TeamsService.markTournamentWinner, but
 *  needing League Admin sign-off first rather than the admin declaring it directly. */
export enum LegacyModeRequestStatus {
  PENDING_LEAGUE_APPROVAL = 'PENDING_LEAGUE_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
