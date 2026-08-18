import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Free agent signings no longer have a fee floor — an owner can sign one for R0. Every
 * other request type (club/legacy transfer) still must land in the R10-R20 band; the DB
 * constraint is tightened to match request_type exactly so it can't be bypassed by any
 * path other than TransferRequestsService.submit(), which enforces the same rule.
 */
export class AllowFreeAgentSigningForFree1787065848919 implements MigrationInterface {
  name = 'AllowFreeAgentSigningForFree1787065848919';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Any R0 free-agent-signing rows created under the relaxed constraint would violate
    // the old 10-20 band outright, so they're bumped back up to the floor first.
    await queryRunner.query(`UPDATE "transfer_requests" SET "agreed_fee" = 10 WHERE "agreed_fee" = 0`);
    await queryRunner.query(`ALTER TABLE "transfer_requests" DROP CONSTRAINT "CHK_transfer_requests_agreed_fee_band"`);
    await queryRunner.query(`
      ALTER TABLE "transfer_requests" ADD CONSTRAINT "CHK_transfer_requests_agreed_fee_band"
        CHECK ("agreed_fee" >= 10 AND "agreed_fee" <= 20)
    `);
  }
}
