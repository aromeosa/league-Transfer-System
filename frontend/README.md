# 5quadLeague Transfer System — Frontend

React single-page app for the 5quadLeague Transfer System — public team/free-agent
pools plus role-specific dashboards for Team Owners, Free Agents, Legacy Team Owners,
and League Admins. Talks to the [backend API](../backend/README.md) over JWT-authenticated
REST.

See the [root README](../README.md) for the project overview.

## Tech stack

- **React 19** + **TypeScript**
- **Vite** — dev server and build
- **React Router v7** — client-side routing, including per-role protected routes
- No CSS framework/UI kit — hand-rolled components under `src/components/`

## Local setup

1. Install dependencies and configure environment:
   ```bash
   npm install
   cp .env.example .env
   ```
2. Make sure the backend is running locally (see [backend/README.md](../backend/README.md))
   — `VITE_API_URL` in `.env` should point at it (`http://localhost:3000` by default).
3. Start the dev server:
   ```bash
   npm run dev
   ```
   Vite prints the local URL (default `http://localhost:5173`).

## Environment variables

| Variable | Notes |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend API. Vite inlines this at **build time**, so on Netlify/GoDaddy it must be set as a build-time environment variable before the build runs, not after |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally, for a production-like smoke test |
| `npm run lint` | oxlint |
| `npm start` | Runs `server.js` against `dist/` — only relevant for the GoDaddy deployment path, see below |

## Project structure

- `src/pages/` — one file per route: public pages (login, team/free-agent registration,
  public team list, free agent pool, legacy pool, "How transfers work") and the four
  role dashboards
- `src/components/` — shared UI: `PlayerStatusBadge`, `TeamLogo`, `PasswordInput`,
  `TeamRegistrationForm`, `FreeAgentsTable`, etc.
- `src/layout/` — `DashboardShell`, `Sidebar`, `Topbar`, and `nav.tsx`, the single
  source of truth for which nav links each role sees
- `src/auth/` (or equivalent) — JWT storage, the logged-in user context, and route
  guards that redirect based on role

## Roles at a glance

- **Team Owner** — registers/manages a team, edits its roster and logo, signs free
  agents and initiates transfers (subject to backend window/cap rules), can request
  Legacy status for the whole roster
- **Free Agent** — registers into the pool with an asking value and location, edits
  their own listing, can be signed by any team
- **Legacy Team Owner** — a read-mostly variant for retired/legacy clubs, distinct
  from an active Team Owner
- **League Admin** — approves/rejects team registrations, transfers, deregistration
  and legacy-mode requests, can act directly on any team, and sees a full event
  timeline across the whole league

Badges (blue/gold/green next to a player's name, everywhere a roster is shown)
indicate registered / legacy / free-agent status at a glance — driven purely by the
player record the API returns, no client-side state.

## Deployment

Two deployment paths exist in this repo; **Netlify is the primary one** (the live
frontend at `transfermarket.5quadleague.com` runs there):

- **Netlify** (`netlify.toml` at the repo root) — base directory `frontend`, build
  command `npm run build`, publish directory `dist`, with a catch-all redirect to
  `index.html` so client-side routing works on a hard refresh/deep link. Set
  `VITE_API_URL` under Site configuration → Environment variables, and auto-deploy
  triggers on push to `master`.
- **GoDaddy Node.js Hosting** (`server.js`) — an alternate path for hosts that require
  a long-running Node process rather than a static file server. `server.js` uses only
  Node built-ins to serve `dist/` with the same SPA fallback, listening on
  `process.env.PORT`. Build locally (or via the host's build step) with
  `npm run build`, then `npm start` runs `server.js`.
