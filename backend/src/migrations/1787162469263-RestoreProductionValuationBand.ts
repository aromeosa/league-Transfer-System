import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Live PayFast testing is done — restores the real R500-R5,000 valuation/fee band
 * (was temporarily R10-R20, see LowerValuationBandForLivePayfastTesting).
 *
 * Unlike that migration, this one does NOT clamp existing rows into the new band: the
 * R10-R20 rows are real, already-settled live test transactions, and rewriting their
 * recorded amounts would falsify what actually happened. The new constraints are added
 * NOT VALID — enforced for every new insert/update from now on, but not retroactively
 * checked against pre-existing rows, so that test-era history stays intact and honest.
 */
export class RestoreProductionValuationBand1787162469263 implements MigrationInterface {
  name = 'RestoreProductionValuationBand1787162469263';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "CHK_players_transfer_value_band"`);
    await queryRunner.query(`
      ALTER TABLE "players" ADD CONSTRAINT "CHK_players_transfer_value_band" CHECK (
        "transfer_value" IS NULL OR ("transfer_value" >= 500 AND "transfer_value" <= 5000)
      ) NOT VALID
    `);

    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT "CHK_transfer_requests_agreed_fee_band"`);
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT "CHK_transfer_requests_agreed_fee_band"`);
    await queryRunner.query(`
      ALTER TABLE "transfer_requests" ADD CONSTRAINT "CHK_transfer_requests_agreed_fee_band" CHECK (
        (
          "request_type" = 'FREE_AGENT_SIGNING'
          AND ("agreed_fee" = 0 OR ("agreed_fee" >= 10 AND "agreed_fee" <= 20))
        )
        OR (
          "request_type" != 'FREE_AGENT_SIGNING'
          AND "agreed_fee" >= 10 AND "agreed_fee" <= 20
        )
      ) NOT VALID
    `);

    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "CHK_players_transfer_value_band"`);
    await queryRunner.query(`
      ALTER TABLE "players" ADD CONSTRAINT "CHK_players_transfer_value_band" CHECK (
        "transfer_value" IS NULL OR ("transfer_value" >= 10 AND "transfer_value" <= 20)
      ) NOT VALID
    `);
  }
}
