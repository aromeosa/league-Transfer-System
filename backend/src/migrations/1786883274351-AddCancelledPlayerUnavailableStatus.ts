import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * New terminal RequestStatus used when a League Admin approves a request but a
 * competing request for the same player was already approved first (transfer-requests
 * service's leagueDecision now re-checks player availability instead of silently
 * overwriting the earlier winner).
 */
export class AddCancelledPlayerUnavailableStatus1786883274351 implements MigrationInterface {
  name = 'AddCancelledPlayerUnavailableStatus1786883274351';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "transfer_requests_status_enum" ADD VALUE 'CANCELLED_PLAYER_UNAVAILABLE'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "transfer_requests_status_enum" RENAME TO "transfer_requests_status_enum_old"`,
    );
    await queryRunner.query(`CREATE TYPE "transfer_requests_status_enum" AS ENUM (
      'PENDING_RELEASING_APPROVAL',
      'PENDING_PAYMENT',
      'PENDING_LEAGUE_APPROVAL',
      'APPROVED',
      'REJECTED_BY_RELEASING_TEAM',
      'REJECTED_BY_LEAGUE_ADMIN',
      'CANCELLED_WINDOW_CLOSED'
    )`);
    await queryRunner.query(
      `ALTER TABLE "transfer_requests" ALTER COLUMN "status" TYPE "transfer_requests_status_enum" USING "status"::text::"transfer_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "transfer_requests_status_enum_old"`);
  }
}
