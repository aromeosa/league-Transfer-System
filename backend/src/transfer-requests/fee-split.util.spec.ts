import { computeFeeSplit, wouldBreachSquadFloor } from './fee-split.util';

describe('computeFeeSplit', () => {
  it('splits the worked example from §1.3 exactly (R1,000 -> 200/400/400 entitlement)', () => {
    const split = computeFeeSplit(1000);
    expect(split.leagueAmount).toBe(200);
    expect(split.clubSettlementAmount).toBe(800); // 20/80 real settlement legs, not 20/40/40
    expect(split.playerEntitlement).toBe(400);
  });

  it('always sums league + club exactly to the total fee, even at odd cent values', () => {
    const oddFees = [500, 501, 733.33, 999.99, 1234.56, 5000];
    for (const fee of oddFees) {
      const split = computeFeeSplit(fee);
      expect(split.leagueAmount + split.clubSettlementAmount).toBeCloseTo(fee, 2);
    }
  });

  it('never pays the player a separate settlement leg (§1.4 #10)', () => {
    const split = computeFeeSplit(2500);
    // playerEntitlement is a tracked record only; it is not one of the two real legs.
    expect(split.leagueAmount + split.clubSettlementAmount).toBe(2500);
  });

  it('splits correctly at both a small fee and a large one — no upper/lower band anymore', () => {
    for (const fee of [50, 50000]) {
      expect(computeFeeSplit(fee)).toEqual({
        leagueAmount: fee * 0.2,
        clubSettlementAmount: fee * 0.8,
        playerEntitlement: fee * 0.4,
      });
    }
  });
});

describe('wouldBreachSquadFloor', () => {
  it('flags when removing a player would drop the roster below the 5-player minimum', () => {
    expect(wouldBreachSquadFloor(5)).toBe(true); // 5 - 1 = 4 < 5
    expect(wouldBreachSquadFloor(6)).toBe(false); // 6 - 1 = 5, not below minimum
    expect(wouldBreachSquadFloor(15)).toBe(false);
  });

  it('is a warn-only signal, not a validity check (§1.3 — allowed, League Admin reviews)', () => {
    // The function only answers "would this breach the floor", it never throws —
    // callers are expected to flag, not block, per the resolved squad-floor rule.
    expect(() => wouldBreachSquadFloor(1)).not.toThrow();
    expect(wouldBreachSquadFloor(1)).toBe(true);
  });
});
