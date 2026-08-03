import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema — the 8 entities from §4 of the Business Analysis & Spec, with the
 * real constraints (roster 5–15 enforced at the app layer per §4.2 note, valuation
 * R500–R5,000, fee split invariant, per-window/per-player caps enforced at the app
 * layer via advisory locks — see TransferRequestsService).
 */
export class InitSchema1785759960000 implements MigrationInterface {
  name = 'InitSchema1785759960000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`CREATE TYPE "user_accounts_role_enum" AS ENUM ('TEAM_OWNER', 'LEAGUE_ADMIN')`);
    await queryRunner.query(`CREATE TYPE "players_status_enum" AS ENUM ('FREE_AGENT', 'REGISTERED', 'LEGACY')`);
    await queryRunner.query(
      `CREATE TYPE "players_origin_type_enum" AS ENUM ('FREE_AGENT_ORIGIN', 'DIRECT_REGISTRATION')`,
    );
    await queryRunner.query(
      `CREATE TYPE "players_legacy_reason_enum" AS ENUM ('QUALIFIED_MAIN_EVENT', 'ASSISTED_QUALIFICATION')`,
    );
    await queryRunner.query(`CREATE TYPE "transfer_windows_status_enum" AS ENUM ('SCHEDULED', 'OPEN', 'CLOSED')`);
    await queryRunner.query(
      `CREATE TYPE "transfer_requests_request_type_enum" AS ENUM ('FREE_AGENT_SIGNING', 'CLUB_TRANSFER', 'LEGACY_TRANSFER')`,
    );
    await queryRunner.query(`CREATE TYPE "transfer_requests_status_enum" AS ENUM (
      'PENDING_RELEASING_APPROVAL', 'PENDING_PAYMENT', 'PENDING_LEAGUE_APPROVAL',
      'APPROVED', 'REJECTED_BY_RELEASING_TEAM', 'REJECTED_BY_LEAGUE_ADMIN', 'CANCELLED_WINDOW_CLOSED'
    )`);
    await queryRunner.query(
      `CREATE TYPE "approval_actions_actor_role_enum" AS ENUM ('RELEASING_TEAM', 'LEAGUE_ADMIN')`,
    );
    await queryRunner.query(`CREATE TYPE "approval_actions_decision_enum" AS ENUM ('APPROVE', 'REJECT')`);
    await queryRunner.query(`CREATE TYPE "payments_status_enum" AS ENUM ('INITIATED', 'CONFIRMED', 'FAILED')`);

    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL UNIQUE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar NOT NULL UNIQUE,
        "passwordHash" varchar NOT NULL,
        "name" varchar NOT NULL,
        "role" "user_accounts_role_enum" NOT NULL,
        "team_id" uuid UNIQUE REFERENCES "teams"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "players" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL,
        "current_team_id" uuid REFERENCES "teams"("id") ON DELETE SET NULL,
        "status" "players_status_enum" NOT NULL DEFAULT 'FREE_AGENT',
        "origin_type" "players_origin_type_enum" NOT NULL,
        "legacy_reason" "players_legacy_reason_enum",
        "transfer_value" numeric(10,2),
        "transfer_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_players_transfer_value_band" CHECK (
          "transfer_value" IS NULL OR ("transfer_value" >= 500 AND "transfer_value" <= 5000)
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_players_current_team_id" ON "players" ("current_team_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_players_status" ON "players" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "transfer_windows" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "opens_at" timestamptz NOT NULL,
        "closes_at" timestamptz NOT NULL,
        "status" "transfer_windows_status_enum" NOT NULL DEFAULT 'SCHEDULED'
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_transfer_windows_status" ON "transfer_windows" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "transfer_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "window_id" uuid NOT NULL REFERENCES "transfer_windows"("id"),
        "player_id" uuid NOT NULL REFERENCES "players"("id"),
        "releasing_team_id" uuid REFERENCES "teams"("id"),
        "requesting_team_id" uuid NOT NULL REFERENCES "teams"("id"),
        "requested_by_user_id" uuid NOT NULL REFERENCES "user_accounts"("id"),
        "request_type" "transfer_requests_request_type_enum" NOT NULL,
        "agreed_fee" numeric(10,2) NOT NULL,
        "status" "transfer_requests_status_enum" NOT NULL,
        "squad_floor_flag" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "decided_at" timestamptz,
        CONSTRAINT "CHK_transfer_requests_agreed_fee_band" CHECK ("agreed_fee" >= 500 AND "agreed_fee" <= 5000)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transfer_requests_cap_lookup" ON "transfer_requests" ("requesting_team_id", "window_id", "request_type", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transfer_requests_releasing_team_id" ON "transfer_requests" ("releasing_team_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_transfer_requests_status" ON "transfer_requests" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "approval_actions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL REFERENCES "transfer_requests"("id"),
        "actor_user_id" uuid NOT NULL REFERENCES "user_accounts"("id"),
        "actor_role" "approval_actions_actor_role_enum" NOT NULL,
        "decision" "approval_actions_decision_enum" NOT NULL,
        "notes" text,
        "decided_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_approval_actions_request_id" ON "approval_actions" ("request_id")`);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL UNIQUE REFERENCES "transfer_requests"("id"),
        "total_fee" numeric(10,2) NOT NULL,
        "league_amount" numeric(10,2) NOT NULL,
        "club_settlement_amount" numeric(10,2) NOT NULL,
        "player_entitlement" numeric(10,2) NOT NULL,
        "gateway_transaction_id" varchar UNIQUE,
        "status" "payments_status_enum" NOT NULL DEFAULT 'INITIATED',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "confirmed_at" timestamptz,
        CONSTRAINT "CHK_payments_split_sums_to_total" CHECK ("league_amount" + "club_settlement_amount" = "total_fee")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roster_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "player_id" uuid NOT NULL REFERENCES "players"("id"),
        "team_id" uuid NOT NULL REFERENCES "teams"("id"),
        "joined_at" timestamptz NOT NULL,
        "left_at" timestamptz,
        "via_request_id" uuid REFERENCES "transfer_requests"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_roster_history_player_team_open" ON "roster_history" ("player_id", "team_id", "left_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "roster_history"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "approval_actions"`);
    await queryRunner.query(`DROP TABLE "transfer_requests"`);
    await queryRunner.query(`DROP TABLE "transfer_windows"`);
    await queryRunner.query(`DROP TABLE "players"`);
    await queryRunner.query(`DROP TABLE "user_accounts"`);
    await queryRunner.query(`DROP TABLE "teams"`);

    await queryRunner.query(`DROP TYPE "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "approval_actions_decision_enum"`);
    await queryRunner.query(`DROP TYPE "approval_actions_actor_role_enum"`);
    await queryRunner.query(`DROP TYPE "transfer_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "transfer_requests_request_type_enum"`);
    await queryRunner.query(`DROP TYPE "transfer_windows_status_enum"`);
    await queryRunner.query(`DROP TYPE "players_legacy_reason_enum"`);
    await queryRunner.query(`DROP TYPE "players_origin_type_enum"`);
    await queryRunner.query(`DROP TYPE "players_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_accounts_role_enum"`);
  }
}
