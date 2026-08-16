import { QueryFailedError } from 'typeorm';

const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * True if `error` is a Postgres unique-constraint violation on `column`. Used as a
 * defense-in-depth backstop behind an app-level "does this already exist" check —
 * that check alone leaves a race window (two requests both pass it before either
 * commits), which this catches by matching Postgres's own error detail instead of
 * guessing an auto-generated constraint name.
 */
export function isUniqueViolation(error: unknown, column: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { code?: string; detail?: string } | undefined;
  return driverError?.code === POSTGRES_UNIQUE_VIOLATION && !!driverError.detail?.includes(`(${column})`);
}
