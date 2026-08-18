import { createHash } from 'crypto';

/**
 * PayFast's signature is validated against PHP's urlencode() output specifically, which
 * differs from JS's encodeURIComponent(): PHP encodes space as "+" and additionally
 * encodes ! ' ( ) * ~ (which encodeURIComponent leaves untouched, since those are
 * "unreserved" under RFC 3986 but not under PHP's RFC 1738-style form-urlencoding).
 * Getting this wrong is the most common cause of PayFast "signature mismatch" errors.
 */
export function phpUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E')
    .replace(/%20/g, '+');
}

/**
 * Builds the pf_output parameter string and MD5-signs it. `fields` must be provided in
 * the order PayFast expects — insertion order for outbound (redirect) requests must
 * match PayFast's documented field order (not alphabetical); for inbound ITN
 * verification, use the order the fields arrived in the POST body. Blank/undefined
 * values are skipped, matching PayFast's own examples.
 */
export function buildPayfastSignature(fields: Record<string, string | undefined>, passphrase: string): string {
  let pfOutput = '';
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== '') {
      pfOutput += `${key}=${phpUrlEncode(String(value).trim())}&`;
    }
  }
  pfOutput = pfOutput.slice(0, -1);
  if (passphrase) {
    pfOutput += `&passphrase=${phpUrlEncode(passphrase.trim())}`;
  }
  return createHash('md5').update(pfOutput).digest('hex');
}
