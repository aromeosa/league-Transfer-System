import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds "Qualifier winner" as a third option alongside the existing legacy reasons. */
export class AddQualifierWinnerLegacyReason1787136118051 implements MigrationInterface {
  name = 'AddQualifierWinnerLegacyReason1787136118051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "players_legacy_reason_enum" ADD VALUE 'QUALIFIER_WINNER'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "players_legacy_reason_enum" RENAME TO "players_legacy_reason_enum_old"`);
    await queryRunner.query(`CREATE TYPE "players_legacy_reason_enum" AS ENUM ('QUALIFIED_MAIN_EVENT', 'ASSISTED_QUALIFICATION')`);
    await queryRunner.query(
      `ALTER TABLE "players" ALTER COLUMN "legacy_reason" TYPE "players_legacy_reason_enum" USING "legacy_reason"::text::"players_legacy_reason_enum"`,
    );
    await queryRunner.query(`DROP TYPE "players_legacy_reason_enum_old"`);
  }
}
