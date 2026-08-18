import { MigrationInterface, QueryRunner } from 'typeorm';

/** Forgot-password flow — single-use, expiring, hashed tokens (see PasswordResetToken). */
export class AddPasswordResetTokens1787051452649 implements MigrationInterface {
  name = 'AddPasswordResetTokens1787051452649';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_account_id" uuid NOT NULL REFERENCES "user_accounts"("id"),
        "token_hash" varchar NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_user_account_id" ON "password_reset_tokens" ("user_account_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
