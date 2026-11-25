# NekoStudy

A real-time, scene-based study app. Pick a calm full-screen scene, run a focus timer, and invite friends into your room to study together with shared sprints, a shared agenda and live status.

> **Status: early development.** Planning is done (see [`docs/`](docs)). The API skeleton runs locally (Express, Prisma schema and migrations, Redis, health checks, Socket.IO handshake, graceful shutdown). No product features yet, the frontend is not started, and nothing is deployed.

## Why it's different

Most "study with others" tools sell atmosphere and video. NekoStudy is built around **intent and accountability**: the host sets an agenda, members see each other's live status (focusing / on break / away), and the room runs shared focus blocks and breaks.

## v1 features (planned)

- Scene library, browsable without an account
- Up to 5 rooms per user; active in one at a time
- Invite link, live presence, owner/host model (host derived from presence)
- Server-authoritative shared timer (Pomodoro, breaks, custom durations)
- Agenda and personal notes widgets
- Ephemeral room chat
- Focus stats and daily streak

Video, sound mixer, tab-leave detection and more are listed as stretch/later in the [SRS](docs/srs.md).

## Tech stack

TypeScript everywhere · pnpm workspaces · React + Vite · Node + Express + Socket.IO · PostgreSQL + Prisma · Redis · zod · Vitest · ESLint + Prettier · pino · Docker Compose · GitHub Actions

## Repository layout

```
apps/
  web/        React + Vite frontend
  api/        Express + Socket.IO backend
packages/
  shared/     zod schemas, socket event names/payloads, error codes
docs/         SRS, data model, API specs, ADRs
```

## Getting started

Requirements: Node 22 (see `.nvmrc`), pnpm 10.

```bash
# 1. Configuration (Windows PowerShell: Copy-Item .env.example .env)
cp .env.example .env        # then replace the placeholder secrets and passwords

# 2. Postgres and Redis
docker compose up -d
docker compose ps           # both should show "healthy"

# 3. Dependencies (also generates the Prisma client)
pnpm install
pnpm --filter @nekostudy/shared build

# 4. Database
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
cd ../..

# 5. Run
pnpm --filter @nekostudy/api dev
```

Check it: `GET http://localhost:4000/api/v1/health` should return `{ "status": "ok", "database": "connected", "redis": "connected" }`.

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health/live` | Liveness: the process is up |
| `GET /api/v1/health` | Readiness: PostgreSQL and Redis reachable |

Other useful commands: `pnpm typecheck`, `pnpm build`, `docker compose down` (keeps data), `docker compose down -v` (deletes data).

## Documentation

| Doc | What's in it |
|---|---|
| [SRS](docs/srs.md) | Scope, requirements, rules, NFRs |
| [Data model](docs/er-diagram.md) | ER diagram and design notes |
| [REST API](docs/rest-api.md) | Endpoints, errors, security |
| [WebSocket events](docs/websocket-events.md) | Real-time event catalog, roles, sequences |
| [ADRs](docs/adr) | Why each major decision was made |
| [Setup checklist](docs/setup-checklist.md) | Build-order plan from empty repo to deployed skeleton |

## Architecture rules

- Controllers and socket handlers are thin: validate, call a service, respond. Business rules live in services.
- One error handler; every error leaves the API as `{ error: { code, message, details } }`.
- Only `config/env.ts` reads `process.env`; it validates and fails fast at startup.
- The server is authoritative for time, host and membership (see [ADR-003](docs/adr/003-timer-timestamps.md), [ADR-005](docs/adr/005-derived-host.md)).

## Known limits

- Single server instance (no horizontal scaling yet; see ADR-001 for the path)
- Chat is ephemeral by design

## License

TBD.
