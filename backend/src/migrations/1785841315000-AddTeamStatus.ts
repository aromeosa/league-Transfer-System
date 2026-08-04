import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Team self-registration (approval workflow) — adds a status to teams. Every team
 * that exists before this migration was created via the admin-only path, which is
 * already an implicit approval, so existing rows are backfilled to ACTIVE rather
 * than left at the new column's PENDING_APPROVAL default.
 */
export class AddTeamStatus1785841315000 implements MigrationInterface {
  name = 'AddTeamStatus1785841315000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "teams_status_enum" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'REJECTED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN "status" "teams_status_enum" NOT NULL DEFAULT 'PENDING_APPROVAL'`,
    );
    await queryRunner.query(`UPDATE "teams" SET "status" = 'ACTIVE'`);
    await queryRunner.query(`CREATE INDEX "IDX_teams_status" ON "teams" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_teams_status"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "teams_status_enum"`);
  }
}
