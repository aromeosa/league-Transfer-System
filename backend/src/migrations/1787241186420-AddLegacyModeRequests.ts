import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A team owner can now request "legacy mode" for their own team — the same outcome as
 * a League Admin directly marking them a tournament winner (whole registered roster
 * promoted to Legacy status), but gated on the admin's approval instead. Its own table
 * rather than piggybacking on transfer_requests: no player/fee/other-team involved,
 * it's a whole-team status change.
 */
export class AddLegacyModeRequests1787241186420 implements MigrationInterface {
  name = 'AddLegacyModeRequests1787241186420';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "legacy_mode_requests_status_enum" AS ENUM ('PENDING_LEAGUE_APPROVAL', 'APPROVED', 'REJECTED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "legacy_mode_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "team_id" uuid NOT NULL REFERENCES "teams"("id"),
        "requested_by_user_id" uuid NOT NULL REFERENCES "user_accounts"("id"),
        "status" "legacy_mode_requests_status_enum" NOT NULL DEFAULT 'PENDING_LEAGUE_APPROVAL',
        "decision_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "decided_at" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_legacy_mode_requests_status" ON "legacy_mode_requests" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_legacy_mode_requests_team_id" ON "legacy_mode_requests" ("team_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "legacy_mode_requests"`);
    await queryRunner.query(`DROP TYPE "legacy_mode_requests_status_enum"`);
  }
}
