import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Legacy Players can no longer be tagged with any free-text club name — the name must
 * come from a curated, admin-managed LegacyTeam list (§ legacy pool validation), and
 * the Legacy Pool now browses by legacy team first, then that team's players. Existing
 * free-text legacy_club_name values (if any) are backfilled into legacy_teams rows
 * before the column is dropped, so nothing already entered is silently lost.
 */
export class AddLegacyTeams1787135286735 implements MigrationInterface {
  name = 'AddLegacyTeams1787135286735';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "legacy_teams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL UNIQUE,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO "legacy_teams" ("name")
      SELECT DISTINCT "legacy_club_name" FROM "players" WHERE "legacy_club_name" IS NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "legacy_team_id" uuid REFERENCES "legacy_teams"("id")`);
    await queryRunner.query(`
      UPDATE "players" p SET "legacy_team_id" = lt."id"
      FROM "legacy_teams" lt WHERE p."legacy_club_name" = lt."name"
    `);

    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "legacy_club_name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "legacy_club_name" varchar`);
    await queryRunner.query(`
      UPDATE "players" p SET "legacy_club_name" = lt."name"
      FROM "legacy_teams" lt WHERE p."legacy_team_id" = lt."id"
    `);

    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "legacy_team_id"`);
    await queryRunner.query(`DROP TABLE "legacy_teams"`);
  }
}
