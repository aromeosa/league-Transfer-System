/**
 * Constants derived from the 5quadLeague Transfer Rules business analysis (§1.3/§4.2).
 * Not yet DB-editable (deferred — see plan's "explicitly deferred" list).
 */
export const BusinessRules = {
  ROSTER_MIN: 5,
  ROSTER_MAX: 15,

  VALUATION_MIN: 500,
  VALUATION_MAX: 5000,

  // Per team, per window — each capped independently (§1.4 #1/#12).
  WINDOW_CAP_FREE_AGENT_SIGNING: 2,
  WINDOW_CAP_CLUB_TRANSFER: 2,
  WINDOW_CAP_LEGACY_TRANSFER: 1,

  // Per player, per season (§1.4 #4/#9) — distinct from the window caps above.
  TRANSFER_COUNT_CAP_FREE_AGENT_ORIGIN: 1,
  TRANSFER_COUNT_CAP_DIRECT_REGISTRATION: 2,

  // Fee split (§1.3) — entitlement record, not the real settlement legs.
  FEE_SPLIT_LEAGUE_PCT: 0.2,
  FEE_SPLIT_CLUB_PCT: 0.4,
  FEE_SPLIT_PLAYER_PCT: 0.4,

  // Real gateway settlement legs (§1.4 #10): league leg + bundled club leg (club + player).
  SETTLEMENT_LEAGUE_PCT: 0.2,
  SETTLEMENT_CLUB_PCT: 0.8,

  // Transfer window: first week of every calendar month (§1.4 #5).
  WINDOW_OPEN_DAY_OF_MONTH: 1,
  WINDOW_CLOSE_DAY_OF_MONTH: 7,
} as const;
