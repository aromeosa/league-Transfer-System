import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data fix for a bug in the first cut of retroactive verification: the old
 * resendRegistrationEmail saved the player's email *before* a guard that could still
 * throw "already confirmed" right after, without ever calling issueInvite — leaving
 * email set but emailVerified stuck at its default true, with no registration token
 * ever actually issued. That made the player silently render as fully verified (no
 * "Unverified" badge matches email-set-but-never-flipped-false) while also permanently
 * blocking any future resend, even though no email was ever sent.
 *
 * Resets email back to NULL for any player in exactly that state — one with no
 * matching row in player_registration_tokens at all — restoring them to the same
 * "never asked" state as an ordinary pre-existing player, so they can be cleanly
 * re-requested with a correct address. A player who genuinely went through the flow
 * (PENDING_APPROVAL from creation, or a real retroactive request after the fix) always
 * has a token row, so this never touches them.
 */
export class FixOrphanedPlayerEmails1788400000000 implements MigrationInterface {
  name = 'FixOrphanedPlayerEmails1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "players"
      SET "email" = NULL
      WHERE "email" IS NOT NULL
        AND "email_verified" = true
        AND NOT EXISTS (
          SELECT 1 FROM "player_registration_tokens" WHERE "player_registration_tokens"."player_id" = "players"."id"
        )
    `);
  }

  public async down(): Promise<void> {
    // Not reversible — the original (incorrectly saved) email values are gone, and
    // reinstating them would just recreate the bug they're a symptom of.
  }
}
