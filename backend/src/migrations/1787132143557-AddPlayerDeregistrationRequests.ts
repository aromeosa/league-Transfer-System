import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A team owner can now ask to remove one of their own players from the roster (reason:
 * bad behaviour or mutual agreement) — a League Admin must authorize it before the
 * player is actually removed. Deliberately its own table rather than piggybacking on
 * transfer_requests: no fee, no other team, no payment involved.
 */
export class AddPlayerDeregistrationRequests1787132143557 implements MigrationInterface {
  name = 'AddPlayerDeregistrationRequests1787132143557';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "player_deregistration_requests_reason_enum" AS ENUM ('BAD_BEHAVIOUR', 'MUTUAL_AGREEMENT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "player_deregistration_requests_status_enum" AS ENUM ('PENDING_LEAGUE_APPROVAL', 'APPROVED', 'REJECTED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "player_deregistration_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "player_id" uuid NOT NULL REFERENCES "players"("id"),
        "team_id" uuid NOT NULL REFERENCES "teams"("id"),
        "reason" "player_deregistration_requests_reason_enum" NOT NULL,
        "requested_by_user_id" uuid NOT NULL REFERENCES "user_accounts"("id"),
        "status" "player_deregistration_requests_status_enum" NOT NULL DEFAULT 'PENDING_LEAGUE_APPROVAL',
        "decision_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "decided_at" timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_player_deregistration_requests_status" ON "player_deregistration_requests" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_player_deregistration_requests_team_id" ON "player_deregistration_requests" ("team_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "player_deregistration_requests"`);
    await queryRunner.query(`DROP TYPE "player_deregistration_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "player_deregistration_requests_reason_enum"`);
  }
}
