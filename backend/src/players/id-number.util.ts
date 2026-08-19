import { createHmac } from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('IdNumberUtil');
const PEPPER = process.env.ID_NUMBER_HASH_PEPPER ?? '';

if (!PEPPER && process.env.NODE_ENV === 'production') {
  logger.warn(
    'ID_NUMBER_HASH_PEPPER is not set — ID/passport numbers would be hashed without a secret pepper, which is unsafe for a low-entropy value like a national ID number. Set it in the Render dashboard before collecting any.',
  );
}

/**
 * National ID and passport numbers get typed inconsistently (spaces, dashes, case) —
 * normalize before hashing so "850101 5800 086" and "8501015800086" collide as the
 * same identity for duplicate detection instead of silently not matching.
 */
export function normalizeIdNumber(raw: string): string {
  return raw.trim().replace(/[\s-]/g, '').toUpperCase();
}

/**
 * One-way HMAC-SHA256 keyed by a server-side pepper (never stored in the DB) — turns a
 * low-entropy value like an SA ID number (13 digits, largely derivable from a known
 * birthdate) into something infeasible to brute-force without server access, while
 * still letting two matching numbers produce the same hash for duplicate detection.
 */
export function hashIdNumber(raw: string): string {
  return createHmac('sha256', PEPPER).update(normalizeIdNumber(raw)).digest('hex');
}
