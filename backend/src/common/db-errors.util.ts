import { QueryFailedError } from 'typeorm';

const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * True if `error` is a Postgres unique-constraint violation, optionally narrowed to a
 * specific column. Used as a defense-in-depth backstop behind an app-level "does this
 * already exist" check — that check alone leaves a race window (two requests both pass
 * it before either commits).
 *
 * Only matches on `column` when the driver actually exposes `constraint`/`detail` —
 * some managed Postgres providers (seen on Render) strip `detail` from client-visible
 * errors, and even `constraint` isn't guaranteed across drivers/versions. Call sites
 * that only reach one possible unique constraint (e.g. a single fresh INSERT statement)
 * should still pass `column` for the extra precision when it's available; the bare
 * SQLSTATE code is the actual guarantee.
 */
export function isUniqueViolation(error: unknown, column?: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { code?: string; constraint?: string; detail?: string } | undefined;
  if (driverError?.code !== POSTGRES_UNIQUE_VIOLATION) {
    return false;
  }
  if (!column) {
    return true;
  }
  const identifiers = [driverError.constraint, driverError.detail].filter((v): v is string => !!v);
  return identifiers.length === 0 || identifiers.some((v) => v.includes(column));
}
