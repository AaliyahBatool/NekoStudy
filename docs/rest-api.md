# REST API Spec v0.2 (v1 scope)

Base path: `/api/v1`. JSON in, JSON out. Companion to `websocket-events.md`.

## 1. Principle: what goes where

- **REST** = anything one-off or request/response: auth, scenes, invites, notes, stats, loading initial state.
- **WebSocket** = shared live state that must reach other people instantly: presence, scene change, timer, agenda, chat.
- **One service layer.** Business logic lives in services (`roomService`, `timerService`...). REST controllers and socket handlers are thin wrappers that call the same functions. Never duplicate rules in two places.

## 2. Conventions

- **Auth:** access token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie (+ short-lived refresh). Sockets reuse the same token at handshake.
- **IDs:** UUIDs. **Times:** ISO 8601 UTC strings.
- **Errors (always this shape):**
```
{ "error": { "code": "ROOM_FULL", "message": "This room is full.", "details": {} } }
```
- **Codes:** `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `EMAIL_TAKEN` (409), `INVALID_CREDENTIALS` (401), `INVITE_INVALID` (410), `ROOM_FULL` (409), `ROOM_LIMIT` (409), `BANNED` (403), `RATE_LIMITED` (429).
- **Validation:** every body/query validated with a schema (e.g. zod). Reject unknown fields.
- **Passwords:** argon2id or bcrypt. Never log passwords or tokens.

## 3. Endpoints

### Auth and account
| Method | Path | Auth | Body / notes | Returns |
|---|---|---|---|---|
| POST | `/auth/signup` | no | `{ email, password, displayName, timezone }`. In ONE transaction: create user, settings, a default room and its timer. | 201 `{ user }` + cookies |
| POST | `/auth/login` | no | `{ email, password }` | 200 `{ user }` + cookies |
| POST | `/auth/logout` | yes | clears cookies | 204 |
| POST | `/auth/refresh` | cookie | rotates tokens | 204 |
| GET | `/me` | yes | | `{ user, ownedRoomCount }` |
| PATCH | `/me` | yes | `{ displayName?, timezone? }` | `{ user }` |
| GET | `/me/settings` | yes | | `{ widgetLayout, ambientEnabled, ambientVolume }` |
| PATCH | `/me/settings` | yes | same fields, all optional | updated settings |

### Scenes (public: visitors can browse the dashboard)

| Method | Path | Auth | Notes | Returns |
|---|---|---|---|---|
| GET | `/scenes?category=` | no | Optional category filter; sorted by name | `[{ id, name, category, thumbnailUrl, ambientAudioUrl }]` |
| GET | `/scenes/:id` | no | UUID scene ID; 404 if missing | `{ id, name, category, thumbnailUrl, ambientAudioUrl, assetUrl }` |

Asset URLs are resolved from relative database keys using `ASSET_BASE_URL`.
The database never stores environment-specific asset hostnames.

### Rooms (a user owns up to 5)
| Method | Path | Auth | Notes | Returns |
|---|---|---|---|---|
| GET | `/rooms` | yes | rooms I own and rooms I belong to, with scene and member count | `{ owned: [...], member: [...] }` |
| PATCH | `/rooms/:id` | owner | `{ sceneId?, name?, focusMin?, shortBreakMin?, longBreakMin?, cyclesBeforeLong? }`. Bounds-checked. If people are connected, the service also broadcasts (same code as the socket path). | room |
| POST | `/rooms/:id/close` | owner | removes all members except the owner, revokes the invite link, stops the timer, broadcasts `room:closed`. Scene, durations and agenda are kept. Creating a new link reopens the room. | 204 |
| DELETE | `/rooms/:id` | owner | deletes the room (cascade: members, links, timer, agenda), broadcasts `room:deleted`. Study history is kept. UI must ask for confirmation. | 204 |
| POST | `/rooms` | yes | `{ name, sceneId }` creates a room with its own timer. 409 `ROOM_LIMIT` if you already own 5. Limit checked in a transaction. | 201 room |
| GET | `/rooms/:id` | member | 403 if not a member, 404 if missing | room + members |
| DELETE | `/rooms/:id/membership` | member | "Leave room" | 204 |

### Invites
| Method | Path | Auth | Notes | Returns |
|---|---|---|---|---|
| POST | `/rooms/:id/invites` | owner | `{ expiresInDays? }`. Creates a new link and **revokes the previous active one**. Raw token returned once. | 201 `{ url, expiresAt }` |
| GET | `/rooms/:id/invites/active` | owner | metadata only, never the raw token | `{ createdAt, expiresAt } or 404` |
| DELETE | `/rooms/:id/invites/active` | owner | "Turn off" | 204 |
| GET | `/invites/:token` | no | landing/signup preview. Rate-limited. Returns only low-risk info. | `{ state: "valid\|revoked\|expired\|full", roomName, ownerName, sceneThumbnailUrl, memberCount }` |
| POST | `/invites/:token/accept` | yes | validates token, ban list, capacity (in a transaction). **Idempotent**: already a member returns 200. | `{ roomId }` |

After `accept`, the client opens the socket and emits `room:join { roomId }`.

### Notes (personal, private)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notes` | yes | list mine |
| POST | `/notes` | yes | `{ body }` (max length enforced) |
| PATCH | `/notes/:id` | yes | owner of note only |
| DELETE | `/notes/:id` | yes | owner of note only |

### Timer (solo / M1 path)
Same `timerService` the socket handlers will call later. Owner-only here; guest hosts use sockets.

| Method | Path | Notes | Returns |
|---|---|---|---|
| GET | `/rooms/:id/timer` | current state + `serverTime` | timer state |
| POST | `/rooms/:id/timer/start` | `{ mode? }` | timer state |
| POST | `/rooms/:id/timer/pause` | | timer state |
| POST | `/rooms/:id/timer/resume` | | timer state |
| POST | `/rooms/:id/timer/reset` | | timer state |
| POST | `/rooms/:id/timer/skip` | | timer state |

Study sessions are **never created by the client**. The server writes them when a focus block completes.

### Stats
| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/me/stats?range=today\|week\|month` | yes | `{ focusSeconds, sessions, streak: { current, longest }, byDay: [{ date, focusSeconds }] }` computed in the user's timezone |

### Health
| Method | Path | Auth | Notes | Returns |
|---|---|---|---|---|
| GET | `/health/live` | no | **Liveness:** the process is up. Checks no dependencies, so a database blip never makes a platform restart a healthy API. Point the host's restart/health probe here. | 200 `{ status: "ok" }` |
| GET | `/health` | no | **Readiness:** PostgreSQL (`SELECT 1`) and Redis (`PING`) are both reachable. Failures are logged server-side, never returned to the client. | 200 `{ status: "ok", database: "connected", redis: "connected" }` or 503 `{ status: "error", database: "...", redis: "..." }` |

Health endpoints are exempt from the standard error shape on purpose: monitors expect a simple status body.

## 4. Security notes

- **Invite tokens:** 32 random bytes, base64url. Store only a SHA-256 hash (tokens are high-entropy, so a fast hash is fine). Look up by hash.
- **Authorization lives in services**, not just routes: every room action checks membership, ban status and role.
- **Rate limits (starting values):** login 5/min per IP+email, signup 5/hour per IP, `GET /invites/:token` 30/min per IP, `POST /invites/:token/accept` 10/min per user, invite creation 10/hour per user, room creation 10/hour per user.
- **CORS:** allow only your frontend origin, credentials on. **CSRF:** SameSite cookies + require a custom header on state-changing requests.
- **Never return** password hashes, token hashes, or other users' emails.
- Members list shows `displayName` only.

## 5. Conflicts this spec found (resolve before coding)

1. **RESOLVED: close vs delete.** Both exist (see ADR-007). Close keeps the room and its settings; delete removes it. A user may have zero rooms; `POST /rooms` creates one (max 5 owned).
2. **RESOLVED: joining by invite token.** **REST `accept` is the only place tokens are checked.** The socket event `room:join` takes only `{ roomId }` and verifies membership (the socket catalog has been updated to match).
3. **Milestone M1 and the timer.** With a room-owned timer, even a solo user has server-side timer state. This spec gives M1 REST timer endpoints (plus the server scheduling completion), so you can ship M1 **before** learning sockets. M2 adds socket wrappers over the same service.
4. **RESOLVED: one active room per user.** Users may own up to 5 rooms and belong to many, but are active in only one at a time. This is enforced on the socket side (see the socket catalog, rule 8), not in REST.

## 6. Open questions

- [ ] Email verification and password reset in v1, or later?
- [ ] Access token lifetime vs refresh lifetime
- [ ] Minimum focus seconds before a day counts for the streak
- [ ] Notes: one note or many per user in the UI?
