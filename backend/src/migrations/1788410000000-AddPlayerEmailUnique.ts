import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A player's registration/verification email must be unique — same anti-duplicate
 * intent as id_number_hash. Defensively clears any pre-existing duplicates first (keeps
 * whichever row was created first, nulls the rest) so the constraint can never fail to
 * apply against whatever's already live, same caution as the id_number_hash rollout.
 */
export class AddPlayerEmailUnique1788410000000 implements MigrationInterface {
  name = 'AddPlayerEmailUnique1788410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH ranked AS (
        SELECT "id", ROW_NUMBER() OVER (PARTITION BY "email" ORDER BY "created_at") AS rn
        FROM "players"
        WHERE "email" IS NOT NULL
      )
      UPDATE "players" SET "email" = NULL
      WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1)
    `);
    await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "UQ_players_email" UNIQUE ("email")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "UQ_players_email"`);
  }
}
