import { MigrationInterface, QueryRunner } from 'typeorm';

/** Where a Free Agent is based, collected at self-signup so teams browsing the pool
 *  can see it. Nullable — existing players and ones registered another way have none. */
export class AddPlayerLocation1787306272595 implements MigrationInterface {
  name = 'AddPlayerLocation1787306272595';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "location" varchar(100)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "location"`);
  }
}
