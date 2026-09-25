import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A team owner-registered player (initial roster or "Add player") now needs an email
 * on file and must accept a confirmation link before counting as REGISTERED — see
 * PlayerRegistrationService and PlayerRegistrationToken.
 */
export class AddPlayerRegistrationApproval1788300000000 implements MigrationInterface {
  name = 'AddPlayerRegistrationApproval1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "players_status_enum" ADD VALUE 'PENDING_APPROVAL'`);
    await queryRunner.query(`ALTER TABLE "players" ADD COLUMN "email" varchar(255)`);

    await queryRunner.query(`
      CREATE TABLE "player_registration_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "player_id" uuid NOT NULL REFERENCES "players"("id"),
        "token_hash" varchar NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_player_registration_tokens_player_id" ON "player_registration_tokens" ("player_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "player_registration_tokens"`);
    await queryRunner.query(`ALTER TABLE "players" DROP COLUMN "email"`);

    // Can't DROP VALUE from a Postgres enum — rebuild the type without it, same as every
    // other enum-narrowing migration in this project (see AddTournamentWinnerLegacyReason).
    // Any row already PENDING_APPROVAL would break this cast; not expected in practice
    // since this only ever runs during local rollback, never against real production data.
    await queryRunner.query(`ALTER TYPE "players_status_enum" RENAME TO "players_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "players_status_enum" AS ENUM ('FREE_AGENT', 'REGISTERED', 'LEGACY')`);
    await queryRunner.query(
      `ALTER TABLE "players" ALTER COLUMN "status" TYPE "players_status_enum" USING "status"::text::"players_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "players_status_enum_old"`);
  }
}
