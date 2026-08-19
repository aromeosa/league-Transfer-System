import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Legacy Pool shows each Legacy Player's originating club name — a new field, since
 * legacy players previously had no way to record it (only seed.ts ever created one).
 */
export class AddPlayerLegacyClubName1787134337883 implements MigrationInterface {
  name = 'AddPlayerLegacyClubName1787134337883';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "legacy_club_name" varchar`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "legacy_club_name"`);
  }
}
