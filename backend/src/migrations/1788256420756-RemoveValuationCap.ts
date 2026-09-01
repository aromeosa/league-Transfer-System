import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the R500-R5,000 valuation/fee band entirely (see RestoreProductionValuationBand
 * for how that band came to be). Replaced with a bare non-negative sanity check — no
 * upper or lower bound tied to an arbitrary business number anymore. Widening a
 * constraint like this is safe to validate immediately (no NOT VALID needed): every row
 * that satisfied the old, tighter band already satisfies this looser one.
 */
export class RemoveValuationCap1788256420756 implements MigrationInterface {
  name = 'RemoveValuationCap1788256420756';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "CHK_players_transfer_value_band"`);
    await queryRunner.query(`
      ALTER TABLE "players" ADD CONSTRAINT "CHK_players_transfer_value_nonneg" CHECK (
        "transfer_value" IS NULL OR "transfer_value" >= 0
      )
    `);

    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT "CHK_transfer_requests_agreed_fee_band"`);
    await queryRunner.query(`
      ALTER TABLE "transfer_requests" ADD CONSTRAINT "CHK_transfer_requests_agreed_fee_nonneg" CHECK (
        (
          "request_type" = 'FREE_AGENT_SIGNING'
          AND "agreed_fee" >= 0
        )
        OR (
          "request_type" != 'FREE_AGENT_SIGNING'
          AND "agreed_fee" > 0
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT "CHK_transfer_requests_agreed_fee_nonneg"`);
    await queryRunner.query(`
      ALTER TABLE "transfer_requests" ADD CONSTRAINT "CHK_transfer_requests_agreed_fee_band" CHECK (
        (
          "request_type" = 'FREE_AGENT_SIGNING'
          AND ("agreed_fee" = 0 OR ("agreed_fee" >= 500 AND "agreed_fee" <= 5000))
        )
        OR (
          "request_type" != 'FREE_AGENT_SIGNING'
          AND "agreed_fee" >= 500 AND "agreed_fee" <= 5000
        )
      ) NOT VALID
    `);

    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "CHK_players_transfer_value_nonneg"`);
    await queryRunner.query(`
      ALTER TABLE "players" ADD CONSTRAINT "CHK_players_transfer_value_band" CHECK (
        "transfer_value" IS NULL OR ("transfer_value" >= 500 AND "transfer_value" <= 5000)
      ) NOT VALID
    `);
  }
}
