import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tracks email verification independently of PlayerStatus — a brand-new player is
 * PENDING_APPROVAL *and* unverified together, but a team can also retroactively request
 * verification from an already-REGISTERED player (added before this feature existed)
 * without touching their active status. Defaults true so no pre-existing player is
 * retroactively flagged just because this column now exists.
 */
export class AddPlayerEmailVerified1788310000000 implements MigrationInterface {
  name = 'AddPlayerEmailVerified1788310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "email_verified" boolean NOT NULL DEFAULT true`);
    // Backfill: any player already sitting PENDING_APPROVAL (added after the previous
    // migration shipped, before this one ran) genuinely hasn't verified yet — the
    // column's own default of true would otherwise mislabel them as verified.
    await queryRunner.query(`UPDATE "players" SET "email_verified" = false WHERE "status" = 'PENDING_APPROVAL'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "email_verified"`);
  }
}
