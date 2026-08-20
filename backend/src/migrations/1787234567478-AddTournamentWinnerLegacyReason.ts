import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds "Tournament winner" as a fourth legacy reason — a whole team's registered
 *  roster promoted at once after winning a tournament outright. */
export class AddTournamentWinnerLegacyReason1787234567478 implements MigrationInterface {
  name = 'AddTournamentWinnerLegacyReason1787234567478';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "players_legacy_reason_enum" ADD VALUE 'TOURNAMENT_WINNER'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "players_legacy_reason_enum" RENAME TO "players_legacy_reason_enum_old"`);
    await queryRunner.query(
      `CREATE TYPE "players_legacy_reason_enum" AS ENUM ('QUALIFIED_MAIN_EVENT', 'ASSISTED_QUALIFICATION', 'QUALIFIER_WINNER')`,
    );
    await queryRunner.query(
      `ALTER TABLE "players" ALTER COLUMN "legacy_reason" TYPE "players_legacy_reason_enum" USING "legacy_reason"::text::"players_legacy_reason_enum"`,
    );
    await queryRunner.query(`DROP TYPE "players_legacy_reason_enum_old"`);
  }
}
