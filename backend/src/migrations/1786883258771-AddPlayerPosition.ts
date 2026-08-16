import { MigrationInterface, QueryRunner } from 'typeorm';

/** Position (GK/DF/MD/ST), collected on the new Free Agent self-signup form. */
export class AddPlayerPosition1786883258771 implements MigrationInterface {
  name = 'AddPlayerPosition1786883258771';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "players_position_enum" AS ENUM ('GK', 'DF', 'MD', 'ST')`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "position" "players_position_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "position"`);
    await queryRunner.query(`DROP TYPE "players_position_enum"`);
  }
}
