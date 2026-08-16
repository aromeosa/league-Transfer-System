export enum UserRole {
  TEAM_OWNER = 'TEAM_OWNER',
  LEAGUE_ADMIN = 'LEAGUE_ADMIN',
  /** A self-registered Free Agent — logs in to accept/reject signing offers (see FreeAgentDto). */
  FREE_AGENT = 'FREE_AGENT',
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
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_LEAGUE_APPROVAL = 'PENDING_LEAGUE_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED_BY_RELEASING_TEAM = 'REJECTED_BY_RELEASING_TEAM',
  REJECTED_BY_PLAYER = 'REJECTED_BY_PLAYER',
  REJECTED_BY_LEAGUE_ADMIN = 'REJECTED_BY_LEAGUE_ADMIN',
  CANCELLED_WINDOW_CLOSED = 'CANCELLED_WINDOW_CLOSED',
  /** A competing request for the same player was approved first (see leagueDecision). */
  CANCELLED_PLAYER_UNAVAILABLE = 'CANCELLED_PLAYER_UNAVAILABLE',
}

export enum ApprovalActorRole {
  RELEASING_TEAM = 'RELEASING_TEAM',
  PLAYER = 'PLAYER',
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
