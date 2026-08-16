import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A Free Agent with their own account (see AddFreeAgentAccounts) must now accept a
 * signing request themselves — PENDING_PLAYER_APPROVAL — before it can proceed to
 * payment, mirroring PENDING_RELEASING_APPROVAL for a releasing team.
 */
export class AddPlayerApprovalWorkflow1786885216695 implements MigrationInterface {
  name = 'AddPlayerApprovalWorkflow1786885216695';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" ADD VALUE 'PENDING_PLAYER_APPROVAL'`);
    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" ADD VALUE 'REJECTED_BY_PLAYER'`);
    await queryRunner.query(`ALTER TYPE "approval_actions_actor_role_enum" ADD VALUE 'PLAYER'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "approval_actions_actor_role_enum" RENAME TO "approval_actions_actor_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "approval_actions_actor_role_enum" AS ENUM ('RELEASING_TEAM', 'LEAGUE_ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_actions" ALTER COLUMN "actor_role" TYPE "approval_actions_actor_role_enum" USING "actor_role"::text::"approval_actions_actor_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "approval_actions_actor_role_enum_old"`);

    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" RENAME TO "transfer_requests_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "transfer_requests_status_enum" AS ENUM (
      'PENDING_RELEASING_APPROVAL',
      'PENDING_PAYMENT',
      'PENDING_LEAGUE_APPROVAL',
      'APPROVED',
      'REJECTED_BY_RELEASING_TEAM',
      'REJECTED_BY_LEAGUE_ADMIN',
      'CANCELLED_WINDOW_CLOSED',
      'CANCELLED_PLAYER_UNAVAILABLE'
    )`);
    await queryRunner.query(
      `ALTER TABLE "transfer_requests" ALTER COLUMN "status" TYPE "transfer_requests_status_enum" USING "status"::text::"transfer_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "transfer_requests_status_enum_old"`);
  }
}
