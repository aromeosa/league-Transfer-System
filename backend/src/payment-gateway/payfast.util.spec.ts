import { buildPayfastSignature, phpUrlEncode } from './payfast.util';

describe('phpUrlEncode', () => {
  // Fixtures are PHP's own documented urlencode() output for each input — the whole
  // point of this helper is to match PHP exactly, not JS's encodeURIComponent.
  it.each([
    ['hello world', 'hello+world'],
    ['a&b', 'a%26b'],
    ['100% sure!', '100%25+sure%21'],
    ['test@example.com', 'test%40example.com'],
    ["O'Brien (Ltd)*~", 'O%27Brien+%28Ltd%29%2A%7E'],
    ['plain-text_stays.same', 'plain-text_stays.same'],
  ])('encodes %j as PHP would: %j', (input, expected) => {
    expect(phpUrlEncode(input)).toBe(expected);
  });
});

describe('buildPayfastSignature', () => {
  it('matches a hand-computed MD5 over key=value pairs joined with &, skipping blanks', () => {
    const fields = { merchant_id: '10000100', merchant_key: '46f0cd694581a', amount: '10.00', item_name: 'Test Item' };
    const expectedString = 'merchant_id=10000100&merchant_key=46f0cd694581a&amount=10.00&item_name=Test+Item';
    const crypto = require('crypto');
    const expected = crypto.createHash('md5').update(expectedString).digest('hex');

    expect(buildPayfastSignature(fields, '')).toBe(expected);
  });

  it('appends the passphrase before hashing when one is set', () => {
    const fields = { amount: '10.00' };
    const withoutPassphrase = buildPayfastSignature(fields, '');
    const withPassphrase = buildPayfastSignature(fields, 'my-secret');
    expect(withPassphrase).not.toBe(withoutPassphrase);

    const crypto = require('crypto');
    const expected = crypto.createHash('md5').update('amount=10.00&passphrase=my-secret').digest('hex');
    expect(withPassphrase).toBe(expected);
  });

  it('skips undefined and empty-string fields entirely', () => {
    const withBlank = buildPayfastSignature({ a: '1', b: '', c: undefined, d: '2' }, '');
    const withoutBlank = buildPayfastSignature({ a: '1', d: '2' }, '');
    expect(withBlank).toBe(withoutBlank);
  });

  it('is order-sensitive (insertion order determines the signed string, not alphabetical)', () => {
    const forward = buildPayfastSignature({ a: '1', b: '2' }, '');
    const reversed = buildPayfastSignature({ b: '2', a: '1' }, '');
    expect(forward).not.toBe(reversed);
  });
});
