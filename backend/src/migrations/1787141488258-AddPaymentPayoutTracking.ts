import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tracks the two manual settlement legs a League Admin attests to after a payment is
 * confirmed — forwarding the club's bundled 80% share, then the player's entitlement
 * within it. Powers the 3-step payment timeline UI (received / paid to club / paid to
 * player); neither leg is an automatic gateway payout.
 */
export class AddPaymentPayoutTracking1787141488258 implements MigrationInterface {
  name = 'AddPaymentPayoutTracking1787141488258';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "club_paid_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "player_paid_at" timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "player_paid_at"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "club_paid_at"`);
  }
}
