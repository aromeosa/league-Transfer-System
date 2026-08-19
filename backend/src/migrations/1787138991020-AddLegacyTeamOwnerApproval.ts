import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A request to sign an unattached Legacy Player now requires that legacy team's own
 * owner account to approve first — PENDING_LEGACY_TEAM_APPROVAL, mirroring how a real
 * releasing team's owner approves a CLUB_TRANSFER. LEGACY_TEAM_OWNER is a new role,
 * one account per LegacyTeam (mirrors the one-account-per-Team FK already on
 * user_accounts). A legacy team created before this migration has no owner yet, so
 * requests against its players fall back to the old behaviour (straight to payment)
 * until an owner is assigned.
 */
export class AddLegacyTeamOwnerApproval1787138991020 implements MigrationInterface {
  name = 'AddLegacyTeamOwnerApproval1787138991020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "user_accounts_role_enum" ADD VALUE 'LEGACY_TEAM_OWNER'`);
    await queryRunner.query(
      `ALTER TABLE "user_accounts" ADD COLUMN "legacy_team_id" uuid UNIQUE REFERENCES "legacy_teams"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" ADD VALUE 'PENDING_LEGACY_TEAM_APPROVAL'`);
    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" ADD VALUE 'REJECTED_BY_LEGACY_TEAM'`);

    await queryRunner.query(`ALTER TYPE "approval_actions_actor_role_enum" ADD VALUE 'LEGACY_TEAM'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "approval_actions_actor_role_enum" RENAME TO "approval_actions_actor_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "approval_actions_actor_role_enum" AS ENUM ('RELEASING_TEAM', 'REQUESTING_TEAM', 'PLAYER', 'LEAGUE_ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "approval_actions" ALTER COLUMN "actor_role" TYPE "approval_actions_actor_role_enum" USING "actor_role"::text::"approval_actions_actor_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "approval_actions_actor_role_enum_old"`);

    await queryRunner.query(`ALTER TYPE "transfer_requests_status_enum" RENAME TO "transfer_requests_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "transfer_requests_status_enum" AS ENUM (
      'PENDING_RELEASING_APPROVAL',
      'PENDING_PLAYER_APPROVAL',
      'PENDING_TEAM_APPROVAL',
      'PENDING_PAYMENT',
      'PENDING_LEAGUE_APPROVAL',
      'APPROVED',
      'REJECTED_BY_RELEASING_TEAM',
      'REJECTED_BY_PLAYER',
      'REJECTED_BY_REQUESTING_TEAM',
      'REJECTED_BY_LEAGUE_ADMIN',
      'CANCELLED_WINDOW_CLOSED',
      'CANCELLED_PLAYER_UNAVAILABLE'
    )`);
    await queryRunner.query(
      `ALTER TABLE "transfer_requests" ALTER COLUMN "status" TYPE "transfer_requests_status_enum" USING "status"::text::"transfer_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "transfer_requests_status_enum_old"`);

    await queryRunner.query(`ALTER TABLE "user_accounts" DROP COLUMN "legacy_team_id"`);
    await queryRunner.query(`ALTER TYPE "user_accounts_role_enum" RENAME TO "user_accounts_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "user_accounts_role_enum" AS ENUM ('TEAM_OWNER', 'LEAGUE_ADMIN', 'FREE_AGENT')`);
    await queryRunner.query(
      `ALTER TABLE "user_accounts" ALTER COLUMN "role" TYPE "user_accounts_role_enum" USING "role"::text::"user_accounts_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "user_accounts_role_enum_old"`);
  }
}
