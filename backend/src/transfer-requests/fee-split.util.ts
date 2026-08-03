import { BusinessRules } from '../config/business-rules.config';

export interface FeeSplit {
  leagueAmount: number;
  clubSettlementAmount: number;
  playerEntitlement: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * §1.3/§1.4 #10 — league_amount + club_settlement_amount always sums exactly to
 * totalFee (a DB CHECK constraint enforces this too): club_settlement_amount is
 * derived as the remainder, not rounded independently, to avoid rounding drift.
 * player_entitlement is a tracked-only record — it travels inside the club leg,
 * the system never pays it out separately.
 */
export function computeFeeSplit(totalFee: number): FeeSplit {
  const leagueAmount = round2(totalFee * BusinessRules.SETTLEMENT_LEAGUE_PCT);
  const clubSettlementAmount = round2(totalFee - leagueAmount);
  const playerEntitlement = round2(totalFee * BusinessRules.FEE_SPLIT_PLAYER_PCT);
  return { leagueAmount, clubSettlementAmount, playerEntitlement };
}

/** §1.3 squad floor — informational flag only, never blocks (League Admin reviews it). */
export function wouldBreachSquadFloor(currentRosterSize: number): boolean {
  return currentRosterSize - 1 < BusinessRules.ROSTER_MIN;
}

/** §1.4 #4/#9 — season transfer-count cap, distinct from the per-window team cap. */
export function transferCountCapFor(originType: 'FREE_AGENT_ORIGIN' | 'DIRECT_REGISTRATION'): number {
  return originType === 'FREE_AGENT_ORIGIN'
    ? BusinessRules.TRANSFER_COUNT_CAP_FREE_AGENT_ORIGIN
    : BusinessRules.TRANSFER_COUNT_CAP_DIRECT_REGISTRATION;
}
