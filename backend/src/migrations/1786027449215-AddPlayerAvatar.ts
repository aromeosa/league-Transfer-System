import { MigrationInterface, QueryRunner } from 'typeorm';

/** Player profile photo, uploaded by the player's own team owner (stored as a data URL). */
export class AddPlayerAvatar1786027449215 implements MigrationInterface {
  name = 'AddPlayerAvatar1786027449215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "avatar_url" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "avatar_url"`);
  }
}
