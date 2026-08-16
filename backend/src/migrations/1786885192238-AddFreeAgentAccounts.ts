import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Free Agents now get their own login (§ free-agent-signup) so they can accept/reject
 * a team's signing offer themselves before it reaches League Admin. Mirrors the
 * one-account-per-team FK on UserAccount, but for players.
 */
export class AddFreeAgentAccounts1786885192238 implements MigrationInterface {
  name = 'AddFreeAgentAccounts1786885192238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "user_accounts_role_enum" ADD VALUE 'FREE_AGENT'`);
    await queryRunner.query(
      `ALTER TABLE "user_accounts" ADD COLUMN "player_id" uuid UNIQUE REFERENCES "players"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_accounts" DROP COLUMN "player_id"`);

    await queryRunner.query(`ALTER TYPE "user_accounts_role_enum" RENAME TO "user_accounts_role_enum_old"`);
    await queryRunner.query(`CREATE TYPE "user_accounts_role_enum" AS ENUM ('TEAM_OWNER', 'LEAGUE_ADMIN')`);
    await queryRunner.query(
      `ALTER TABLE "user_accounts" ALTER COLUMN "role" TYPE "user_accounts_role_enum" USING "role"::text::"user_accounts_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "user_accounts_role_enum_old"`);
  }
}
