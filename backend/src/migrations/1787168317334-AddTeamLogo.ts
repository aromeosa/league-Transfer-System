import { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional team logo, set at registration or updated anytime by the Team Owner — same
 * data-URL-column pattern as Player.avatarUrl, no external file storage needed. */
export class AddTeamLogo1787168317334 implements MigrationInterface {
  name = 'AddTeamLogo1787168317334';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN "logo_url" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN "logo_url"`);
  }
}
