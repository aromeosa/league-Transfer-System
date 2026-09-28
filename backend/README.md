# 5quadLeague Transfer System — Backend

REST API for the 5quadLeague Transfer System: team registration, player rosters, the
free agent pool, transfer requests with role-based approval workflows, PayFast
payments, and the Legacy Player system. Built with [NestJS](https://nestjs.com/),
[TypeORM](https://typeorm.io/), and PostgreSQL.

See the [frontend README](../frontend/README.md) for the React client, and the
[root README](../README.md) for the project overview.

## Tech stack

- **NestJS 10** (Express platform) — modular controller/service/module structure
- **TypeORM 0.3** over **PostgreSQL** — migration-based schema, no `synchronize`
- **Passport + JWT** — stateless auth, role embedded in the token
- **class-validator / class-transformer** — request DTO validation and response
  serialization (`@Exclude`/`@Expose` control what actually reaches the client)
- **@nestjs/schedule** — in-process cron for the transfer-window sweep

## Local setup

1. Start a local Postgres (from the repo root, one level up):
   ```bash
   docker compose up -d
   ```
2. Install dependencies and configure environment:
   ```bash
   npm install
   cp .env.example .env
   ```
3. Run migrations, then optionally seed some dev data:
   ```bash
   npm run migration:run
   npm run seed   # prints seeded accounts + a shared dev password
   ```
4. Start the API:
   ```bash
   npm run start:dev
   ```
   Listens on `http://localhost:3000` by default.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | | `development` locally, `production` on Render |
| `PORT` | | Defaults to `3000` |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | local dev | Used when `DATABASE_URL` is unset — matches `docker-compose.yml` |
| `DATABASE_URL` | production | Single connection string; takes priority over the `DB_*` vars, used with SSL |
| `JWT_SECRET` | ✅ | Signs auth tokens — Render generates this for you |
| `JWT_EXPIRES_IN` | | e.g. `8h` |
| `CORS_ORIGIN` | ✅ | Comma-separated list of allowed origins |
| `FRONTEND_URL` | production | Base URL used to build links sent in emails (e.g. the password-reset link) |
| `BACKEND_URL` | production | This service's own public URL — required for PayFast's ITN webhook callback |
| `SWEEP_SECRET` | production | Shared secret an external cron pinger sends as `x-sweep-secret` to `POST /internal/sweep`, so the transfer-window schedule still advances even if the process was asleep |
| `PAYFAST_MERCHANT_ID` / `PAYFAST_MERCHANT_KEY` / `PAYFAST_PASSPHRASE` | optional | Live PayFast credentials. Unset in dev — a mock gateway (`payment-gateway/mock-gateway.service.ts`) stands in instead, confirming payments synchronously with no real charge |
| `PAYFAST_MODE` | | `sandbox` for PayFast's test environment, anything else (or unset) for live |
| `ID_NUMBER_HASH_PEPPER` | production | Secret pepper for hashing player ID/passport numbers — never stored alongside the hash |
| `RESEND_API_KEY` | optional | Enables real transactional email via [Resend](https://resend.com) — password resets and player registration-confirmation invites. Unset in dev — a mock mail service just logs the link instead |
| `RESEND_FROM_EMAIL` | optional | Must be an address on a domain verified in Resend; falls back to their shared, rate-limited sender if unset |

`.env.example` has the local-dev subset. Everything production-only lives in
`render.yaml` (mostly `sync: false`, meaning it's set directly in the Render
dashboard and never overwritten by a blueprint sync).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Dev server with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm test` | Unit tests (Jest) |
| `npm run test:cov` | Unit tests with coverage |
| `npm run migration:generate -- src/migrations/SomeName` | Generate a migration from entity changes |
| `npm run migration:run` / `migration:run:prod` | Apply pending migrations (dev / compiled build) |
| `npm run migration:revert` | Roll back the last migration |
| `npm run seed` | Populate a handful of dev teams/players/accounts |
| `npm run backup` | Dump every table to stdout as JSON — a manual backup, since the free Postgres tier has no automated ones. **Never commit the output** — it contains password hashes |
| `npm run wipe` | Destructive, pre-launch data reset with a keep-list. Dry-runs by default; only `npm run wipe -- --confirm` actually deletes anything |

## Project structure

Each domain is its own Nest module under `src/`:

- `auth/` — login, JWT strategy/guards, role decorator, forgot/reset password
- `teams/` — team registration (self-service + admin-direct), approval, logo upload, "mark tournament winner"
- `players/` — player records, free agent self-signup, roster additions, legacy pool entries, League Admin renames
- `player-registration/` — the email-confirmation flow for a team-registered player (see below), shared by `teams/` and `players/` since neither module can depend on the other
- `transfer-requests/` — the core transfer state machine (see below) and its approval decisions
- `transfer-windows/` — the monthly window schedule and its cron sweep
- `legacy-teams/` — admin-curated legacy club list, each with its own owner account
- `legacy-mode-requests/` — a team's request to have its whole roster promoted to Legacy status, gated on admin approval
- `player-deregistrations/` — a team's request to remove one of its own players, gated on admin approval
- `payment-gateway/` — PayFast integration + its mock, behind one swappable interface
- `mail/` — Resend integration + its mock, same swappable-provider pattern
- `entities/` — all TypeORM entities and enums
- `migrations/` — every schema change, in order; read chronologically for the system's evolution
- `config/business-rules.config.ts` — the tunable constants below

## Core business rules

Centralized in `config/business-rules.config.ts`:

- **Roster size**: 5–15 players per team
- **Transfer window**: opens automatically the 1st of each month, closes the 7th — a
  League Admin can force-open or force-close at any time. Any request still unresolved
  when a window closes is auto-cancelled
- **Per-window caps** (per team, independent counters): 2 free agent signings, 2 club
  transfers, 1 legacy transfer
- **Fee split**: 20% to the league, 40% to the releasing club, 40% entitlement recorded
  for the player (the club is responsible for passing that share on — the system
  doesn't pay the player directly)
- **Real settlement legs**: only two money movements actually happen — 20% to the
  league, 80% (the bundled club + player share) to the club — tracked via a 3-step
  timeline a League Admin manually attests to (payment received → paid to club → paid
  to player)
- Player valuations and transfer fees have no fixed price band — any non-negative
  amount, except a real transfer (not a free agent signing) must be more than R0

Four roles: `LEAGUE_ADMIN`, `TEAM_OWNER`, `FREE_AGENT`, `LEGACY_TEAM_OWNER` — each with
a distinct dashboard and permission set, enforced by `RolesGuard` plus per-service
ownership checks (a team owner can only ever act on their own team).

## Player registration & email verification

A player a team owner registers directly — the initial roster at team signup, or
"Add player" afterward — needs an email and starts `PENDING_APPROVAL`: it counts
toward the roster (and its 15-player cap) immediately, but isn't a real `REGISTERED`
player until they click a confirmation link emailed to them
(`PlayerRegistrationService`, a single-use token expiring after 7 days, same pattern as
the password-reset flow). Free Agent self-signups and admin-curated Legacy Pool players
are unaffected — they already have their own account or approval path.

Verification is tracked separately from status via `Player.emailVerified` (defaults
`true`, so no pre-existing player is retroactively flagged) and `hasEmailOnFile` —
that split is what lets a team also request verification *retroactively* from an
already-`REGISTERED` player who predates this feature: same token/email flow, but their
status never changes. A team owner can resend a lost/expired invite, or kick off that
first-time retroactive request, via `POST /players/:id/resend-registration-email`.

## Deployment

Deploys from `render.yaml` at the repo root: a Node web service plus a managed
Postgres, both currently on paid Render instances. The web service's start command
(`npm run migration:run:prod && npm run start:prod`) runs pending migrations before
every boot, so a deploy and a schema change ship together. The transfer-window sweep
also runs in-process via `@nestjs/schedule`; an external cron pinger hitting
`POST /internal/sweep` (authenticated with `SWEEP_SECRET`) is a backstop in case the
service was ever asleep when a window was due to open or close.
