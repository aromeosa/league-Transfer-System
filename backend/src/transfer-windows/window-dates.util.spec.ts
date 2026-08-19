import { firstWeekWindowBounds } from './window-dates.util';

describe('firstWeekWindowBounds', () => {
  it('spans the 1st 00:00:00.000 through the 7th 23:59:59.999 of the reference month', () => {
    const { opensAt, closesAt } = firstWeekWindowBounds(new Date(2026, 2, 15));
    expect(opensAt).toEqual(new Date(2026, 2, 1, 0, 0, 0, 0));
    expect(closesAt).toEqual(new Date(2026, 2, 7, 23, 59, 59, 999));
  });

  it('returns identical bounds for any two reference dates in the same month', () => {
    const a = firstWeekWindowBounds(new Date(2026, 5, 1, 0, 0, 1));
    const b = firstWeekWindowBounds(new Date(2026, 5, 22, 18, 30));
    expect(a).toEqual(b);
  });

  it('produces different bounds across a month boundary', () => {
    const a = firstWeekWindowBounds(new Date(2026, 5, 30));
    const b = firstWeekWindowBounds(new Date(2026, 6, 1));
    expect(a).not.toEqual(b);
  });
});
