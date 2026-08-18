import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A Free Agent can now approach a team directly (reverse of the usual team-initiates
 * flow) — PENDING_TEAM_APPROVAL until the target team owner accepts (setting the fee)
 * or rejects (REJECTED_BY_REQUESTING_TEAM). ApprovalActorRole gets REQUESTING_TEAM to
 * record that decision distinctly from RELEASING_TEAM's.
 */
export class AddFreeAgentApproachWorkflow1787100000000 implements MigrationInterface {
  name = 'AddFreeAgentApproachWorkflow1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" ADD VALUE 'PENDING_TEAM_APPROVAL'`);
    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" ADD VALUE 'REJECTED_BY_REQUESTING_TEAM'`);
    await queryRunner.query(`ALTER TYPE "approval_actions_actor_role_enum" ADD VALUE 'REQUESTING_TEAM'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "approval_actions_actor_role_enum" RENAME TO "approval_actions_actor_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "approval_actions_actor_role_enum" AS ENUM ('RELEASING_TEAM', 'PLAYER', 'LEAGUE_ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_actions" ALTER COLUMN "actor_role" TYPE "approval_actions_actor_role_enum" USING "actor_role"::text::"approval_actions_actor_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "approval_actions_actor_role_enum_old"`);

    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" RENAME TO "transfer_requests_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "transfer_requests_status_enum" AS ENUM (
      'PENDING_RELEASING_APPROVAL',
      'PENDING_PLAYER_APPROVAL',
      'PENDING_PAYMENT',
      'PENDING_LEAGUE_APPROVAL',
      'APPROVED',
      'REJECTED_BY_RELEASING_TEAM',
      'REJECTED_BY_PLAYER',
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
