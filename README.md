```markdown
# 5quadLeague Transfer System

Player transfer management system for 5quadLeague: team registration and rosters, a
free agent pool, transfer requests with role-based approval workflows, PayFast
payments, and a Legacy Player system for retired/former clubs.

Live at [transfermarket.5quadleague.com](https://transfermarket.5quadleague.com).

## Structure

This is a two-package monorepo:

| Package | What it is | README |
| --- | --- | --- |
| `backend/` | NestJS + TypeORM + PostgreSQL REST API | [backend/README.md](backend/README.md) |
| `frontend/` | React + Vite + TypeScript single-page app | [frontend/README.md](frontend/README.md) |

`docker-compose.yml` (repo root) spins up a local Postgres for backend development.
`render.yaml` (repo root) is the Render blueprint that deploys the backend + its
database. `netlify.toml` (repo root) is the Netlify build config for the frontend.

## Roles

- **League Admin** — approves registrations and transfers, can act directly on any
  team, sees a full event timeline
- **Team Owner** — manages a team's roster, signs free agents, initiates transfers
- **Free Agent** — lists themselves for signing by any team
- **Legacy Team Owner** — owns a retired/legacy club in the Legacy Player pool

## Quick start (local dev)

```bash
# 1. Database
docker compose up -d

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run migration:run
npm run seed        # optional — some dev teams/players/accounts
npm run start:dev   # http://localhost:3000

# 3. Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

Full setup, environment variables, and architecture details are in each package's own
README — see the table above.

## Deployment

- **Backend + database**: [Render](https://render.com), via `render.yaml`. Migrations
  run automatically on every deploy, before the app boots.
- **Frontend**: [Netlify](https://netlify.com), via `netlify.toml`, deployed to the
  custom domain above. An alternate static/Node deployment path for GoDaddy hosting
  also exists — see the frontend README.

Both deploy on push to `master`.

```
