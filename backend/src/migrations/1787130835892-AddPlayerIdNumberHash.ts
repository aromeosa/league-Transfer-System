import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Anti-fraud duplicate-identity check: a one-way HMAC of a player's national
 * ID/passport number (never the raw value — see players/id-number.util.ts). The
 * unique constraint is the actual enforcement; nullable since most existing players
 * have none on file and it stays optional going forward.
 */
export class AddPlayerIdNumberHash1787130835892 implements MigrationInterface {
  name = 'AddPlayerIdNumberHash1787130835892';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "id_number_hash" varchar(64)`);
    await queryRunner.query(`ALTER TABLE "players" ADD CONSTRAINT "UQ_players_id_number_hash" UNIQUE ("id_number_hash")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "UQ_players_id_number_hash"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "id_number_hash"`);
  }
}
