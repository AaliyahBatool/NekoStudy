# Project Setup Checklist (M0 to start of M1)

Goal: by the end of this list you have an empty-but-real app that runs locally, passes CI, and is deployed, with every planning doc in the repo. This "walking skeleton" is the foundation everything else sits on. No product features yet.

Do the phases in order. Tick boxes in Notion. Write an ADR whenever you make a decision marked **[ADR]**.

---

## Phase 0: Decide the tooling (1 evening)

Each of these is a real decision. My recommendation is in bold; change it if you have a reason and write the reason down.

- [ ] **Language: TypeScript** everywhere. Why: the socket event names and payloads live in one shared package, so the client and server can't drift apart. Also a good signal on a placement project. **[ADR]**
- [ ] **Package manager: pnpm workspaces** (npm workspaces also fine). One repo, several packages.
- [ ] **Frontend: React + Vite**
- [ ] **Backend: Node + Express + Socket.IO** (already decided)
- [ ] **Database access: Prisma** (fastest to start, built-in migrations) or Drizzle (closer to SQL, more control). Pick one. **[ADR]**
- [ ] **Validation: zod**, shared between client and server
- [ ] **Tests: Vitest** (unit + integration), `supertest` for HTTP, `socket.io-client` for socket tests
- [ ] **Lint/format: ESLint + Prettier**
- [ ] **Logging: pino** (structured JSON logs)
- [ ] **Deployment target [ADR]:** the backend needs a **long-running server** (WebSockets), so serverless functions won't work. Check the *current* free tiers of a few hosts for the API, Postgres and Redis before choosing, and note when you checked. The frontend can go on any static host.

---

## Phase 1: Repo skeleton

- [ ] Create the GitHub repo (private is fine for now). Add a license decision to the README later.
- [ ] Add `.gitignore` (node_modules, `.env`, build output) **before the first commit**
- [ ] Create this structure:

```
nekostudy/
  apps/
    web/                  # React + Vite
    api/                  # Express + Socket.IO
  packages/
    shared/               # zod schemas, socket event names/payloads, error codes
  docs/
    srs.md
    er-diagram.md
    rest-api.md
    websocket-events.md
    adr/                  # one file per ADR: 001-socketio.md ...
  .github/workflows/ci.yml
  docker-compose.yml
  .env.example
  README.md
```

- [ ] Inside `apps/api/src`, organize **by feature, not by file type**:

```
config/env.ts             # reads and validates env vars with zod; crash on startup if invalid
lib/                      # db client, redis client, logger, errors
modules/
  auth/      routes.ts  controller.ts  service.ts  repo.ts
  rooms/     ...
  invites/   ...
  timer/     ...
  notes/     ...
  stats/     ...
realtime/                 # socket handlers (thin: validate -> call service -> emit)
app.ts                    # builds the Express app (no listen)
server.ts                 # starts HTTP + Socket.IO
```

- [ ] **The rule from the REST spec:** controllers and socket handlers are thin. All business rules live in `service.ts`. Write this at the top of the API README.
- [ ] Copy the five planning docs and `adr-drafts.md` into `docs/` (split the ADRs into separate files as you go)
- [ ] First commit: "chore: initial repo structure and docs"

---

## Phase 2: Local infrastructure

- [ ] `docker-compose.yml` with **Postgres** and **Redis** (named volumes for data, health checks)
- [ ] `.env.example` listing every variable with fake values (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `CLIENT_ORIGIN`, `PORT`...). The real `.env` is never committed.
- [ ] `config/env.ts` validates them with zod and fails fast with a clear message
- [ ] `docker compose up -d` works and you can connect to both from a client
- [ ] Add a `pnpm dev` script that starts API and web together

---

## Phase 3: API skeleton

- [ ] Express app with: JSON body limit, `helmet`, CORS locked to `CLIENT_ORIGIN` with credentials, request ID, request logging
- [ ] **One error handler** that returns the standard error shape from the REST spec (`{ error: { code, message, details } }`). Define error classes with codes in `lib/errors.ts`.
- [ ] `GET /api/v1/health` returns `{ status: "ok" }` and checks DB and Redis
- [ ] Database: set up the ORM and create the **first migration** from `er-diagram.md` (users, user_settings, scenes, rooms, room_members, invite_links, room_timers, agenda_items, study_sessions, notes). Add the indexes listed in the ER doc.
- [ ] Seed script with 3 to 5 scenes (placeholder thumbnails are fine)
- [ ] Socket.IO attached to the same HTTP server; **handshake auth middleware** that rejects connections without a valid token. No real events yet.
- [ ] Graceful shutdown (close HTTP, sockets, DB, Redis on SIGTERM)

---

## Phase 4: Frontend skeleton

- [ ] Vite + React + TypeScript, routing, a basic layout
- [ ] Copy the **design tokens** from your Figma (colors, fonts, radii, spacing) into CSS variables or a theme file. Do this once now; every screen reuses it.
- [ ] A typed API client (one place for fetch calls, error handling, cookies)
- [ ] Page stubs: Dashboard, Room, Invite landing, Login/Signup, Stats
- [ ] The dashboard calls `GET /scenes` and renders the cards (your first real end-to-end data flow)

---

## Phase 5: Quality gates and CI

- [ ] ESLint + Prettier configured at the repo root; `pnpm lint` and `pnpm typecheck` pass
- [ ] Husky + lint-staged: format and lint on commit
- [ ] Conventional Commit messages (`feat:`, `fix:`, `docs:`, `chore:`, `test:`)
- [ ] One test per layer to prove the setup works: a unit test, an API test against a real test database, a socket handshake test
- [ ] **GitHub Actions** workflow on every push and PR: install, lint, typecheck, test (with Postgres and Redis as service containers), build
- [ ] **Branch protection on `main`**: require CI to pass; work in short-lived branches and merge with PRs, even though you're solo. The PR history is part of the portfolio.
- [ ] PR template with a checklist: tests added, docs updated, ADR written if a decision was made
- [ ] Secret hygiene: `.env` ignored, enable GitHub secret scanning, never log tokens or passwords

---

## Phase 6: Walking skeleton, deployed

- [ ] Deploy the API, Postgres and Redis (check the free-tier notes from Phase 0)
- [ ] Deploy the frontend
- [ ] Set production env vars on the host (not in the repo); set cookies to `Secure` and `SameSite=Lax`
- [ ] Run migrations in the deploy step
- [ ] The deployed dashboard shows scenes from the deployed database. **This is the milestone for this phase.** Everything after is adding features to something that already works in production.
- [ ] Add a CI badge and the live link to the README

---

## Phase 7: Notion board

- [ ] Create a database with properties: **Status** (Backlog, Ready, In progress, In review, Done), **Milestone** (M0 to M6), **Type** (Feature, Bug, Spike, Docs, ADR), **Size** (S, M, L), **Doc link**
- [ ] Views: Board by Status, Table grouped by Milestone, a "This week" filter
- [ ] **Ticket template:**
  - Goal (one sentence)
  - Acceptance criteria (checkboxes, written as behaviour)
  - Links to the SRS requirement and the REST/socket doc section
  - Definition of done: tests pass, docs updated, ADR if needed, CI green
- [ ] Create the milestones from the SRS (M0 prep, M1 auth + rooms + timer, M2 invites + presence, M3 shared timer + agenda + notes, M4 chat + notifications, M5 load test + docs + deploy polish)
- [ ] Rule for yourself: **no deadlines, but every milestone ends with a demo** you could show someone (record a short screen capture)

---

## First tickets for M1 (copy into Notion)

1. Signup and login endpoints (hash passwords, cookies, refresh), in one transaction with default room + timer creation
2. `GET /me`, `PATCH /me`, settings endpoints
3. `GET /scenes` and the dashboard cards (logged-out view works)
4. Create a room (`POST /rooms`) with the 5-room limit, tested for the race condition
5. `GET /rooms`, `PATCH /rooms/:id`, scene switching
6. Timer service: start, pause, resume, reset, skip using timestamps; unit tests with a fake clock
7. Server-side timer completion scheduling + writing `study_sessions`
8. Room screen UI: scene background, widget dock, timer widget (client derives remaining time)
9. Personal notes CRUD + notes widget
10. Stats endpoint (focus time, streak in the user's timezone) + stats page
11. Close room and delete room endpoints, with a confirmation dialog in the UI
12. Rate limiting on auth endpoints

---

## Learning spikes (throwaway code, time-boxed to 1 to 2 days each)

- [ ] **Before M2:** Socket.IO chat spike. Two tabs, one room, join/leave, a counter that survives refresh, kill and restart the server mid-session and watch what happens.
- [ ] **Before M3:** clock offset spike. Two browsers with a deliberately wrong system clock; confirm the timer display still agrees.
- [ ] **Before M2:** race condition spike. Two simultaneous requests to join a full room; confirm only one succeeds.

---

## Healthy habits (these are what get noticed)

- Commit small and often; each PR does one thing
- Write the test or the doc in the same PR as the code
- Keep a `CHANGELOG` or release notes per milestone
- Record decisions in ADRs when you make them, not afterwards
- Keep the README honest: what works, what doesn't, known limits (for example, "single server instance")
