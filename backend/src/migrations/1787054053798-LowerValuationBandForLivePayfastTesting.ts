import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Temporarily lowers the R500-R5,000 valuation/fee band to R10-R20 for live PayFast
 * testing with real (but small) transactions. Also adds a column to store the raw
 * PayFast ITN payload per payment, for audit/dispute purposes.
 */
export class LowerValuationBandForLivePayfastTesting1787054053798 implements MigrationInterface {
  name = 'LowerValuationBandForLivePayfastTesting1787054053798';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clamp existing rows into the new band first — plenty of test data was seeded
    // under the old R500-R5,000 range, and the ADD CONSTRAINT below would otherwise
    // fail outright the moment any existing row violates it.
    await queryRunner.query(`UPDATE "players" SET "transfer_value" = 20 WHERE "transfer_value" > 20`);
    await queryRunner.query(
      `UPDATE "players" SET "transfer_value" = 10 WHERE "transfer_value" IS NOT NULL AND "transfer_value" < 10`,
    );
    await queryRunner.query(`UPDATE "transfer_requests" SET "agreed_fee" = 20 WHERE "agreed_fee" > 20`);
    await queryRunner.query(`UPDATE "transfer_requests" SET "agreed_fee" = 10 WHERE "agreed_fee" < 10`);

    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "CHK_players_transfer_value_band"`);
    await queryRunner.query(`
      ALTER TABLE "players" ADD CONSTRAINT "CHK_players_transfer_value_band" CHECK (
        "transfer_value" IS NULL OR ("transfer_value" >= 10 AND "transfer_value" <= 20)
      )
    `);

    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT "CHK_transfer_requests_agreed_fee_band"`);
    await queryRunner.query(`
      ALTER TABLE "transfer_requests" ADD CONSTRAINT "CHK_transfer_requests_agreed_fee_band"
        CHECK ("agreed_fee" >= 10 AND "agreed_fee" <= 20)
    `);

    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "gateway_raw_payload" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "gateway_raw_payload"`);

    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT "CHK_transfer_requests_agreed_fee_band"`);
    await queryRunner.query(`
      ALTER TABLE "transfer_requests" ADD CONSTRAINT "CHK_transfer_requests_agreed_fee_band"
        CHECK ("agreed_fee" >= 500 AND "agreed_fee" <= 5000)
    `);

    await queryRunner.query(`ALTER TABLE "players" DROP CONSTRAINT "CHK_players_transfer_value_band"`);
    await queryRunner.query(`
      ALTER TABLE "players" ADD CONSTRAINT "CHK_players_transfer_value_band" CHECK (
        "transfer_value" IS NULL OR ("transfer_value" >= 500 AND "transfer_value" <= 5000)
      )
    `);
  }
}
