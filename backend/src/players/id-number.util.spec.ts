import { hashIdNumber, normalizeIdNumber } from './id-number.util';

describe('normalizeIdNumber', () => {
  it('strips whitespace and dashes and uppercases', () => {
    expect(normalizeIdNumber(' 8501015 800-086 ')).toBe('8501015800086');
    expect(normalizeIdNumber('a1234567')).toBe('A1234567');
  });
});

describe('hashIdNumber', () => {
  it('produces the same hash for the same number regardless of formatting', () => {
    expect(hashIdNumber('8501015800086')).toBe(hashIdNumber('850101 5800-086'));
    expect(hashIdNumber('a1234567')).toBe(hashIdNumber(' A1234567 '));
  });

  it('produces different hashes for different numbers', () => {
    expect(hashIdNumber('8501015800086')).not.toBe(hashIdNumber('8501015800087'));
  });

  it('never returns the raw or a substring of the input', () => {
    const hash = hashIdNumber('8501015800086');
    expect(hash).not.toContain('8501015800086');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
