import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Powers the admin events timeline (§ AdminEventsPage) showing team registration and
 * approval/rejection as events, not just transfers. Existing teams get `created_at`
 * defaulted to now() — their real registration date was never captured, so this is the
 * best available value rather than a false precision; `decided_at` stays null for them
 * since we likewise don't know when (or whether) they were approved.
 */
export class AddTeamTimestamps1787254771612 implements MigrationInterface {
  name = 'AddTeamTimestamps1787254771612';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN "decided_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "decided_at"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "created_at"`);
  }
}
