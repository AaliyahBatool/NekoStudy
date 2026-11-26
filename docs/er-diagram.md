# Data Model (ER Diagram) v0.3

Postgres assumed. NOT in the DB: presence (Redis/memory), chat (Redis, capped list + TTL), host role (derived from presence).

```mermaid
erDiagram
    USERS ||--o{ ROOMS : owns
    USERS ||--o{ ROOM_MEMBERS : has
    ROOMS ||--o{ ROOM_MEMBERS : has
    ROOMS ||--o{ INVITE_LINKS : has
    ROOMS ||--|| ROOM_TIMERS : has
    ROOMS ||--o{ AGENDA_ITEMS : has
    SCENES ||--o{ ROOMS : themes
    USERS ||--o{ STUDY_SESSIONS : logs
    ROOMS |o--o{ STUDY_SESSIONS : "happened in"
    USERS ||--|| USER_SETTINGS : has
    USERS ||--o{ NOTES : writes

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string display_name
        string timezone "e.g. Asia/Kolkata, for streaks"
        timestamptz created_at
    }
    USER_SETTINGS {
        uuid user_id PK, FK
        jsonb widget_layout "positions, open/closed; default {}"
        bool ambient_enabled "default false"
        float ambient_volume "default 0.5"
    }
    SCENES {
        uuid id PK
        string name
        string category
        string asset_url
        string thumbnail_url
        string ambient_audio_url "optional loop"
        string license_note
    }
    ROOMS {
        uuid id PK
        uuid owner_id FK "up to 5 rooms per user (app rule)"
        uuid scene_id FK
        string name
        int max_members "default 50"
        int focus_min "default 25"
        int short_break_min "default 5"
        int long_break_min "default 15"
        int cycles_before_long "default 4"
        timestamptz created_at
        timestamptz closed_at "null while open"
    }
    ROOM_MEMBERS {
        uuid room_id PK, FK "ON DELETE CASCADE"
        uuid user_id PK, FK
        timestamptz joined_at
        timestamptz banned_at "null unless removed"
    }
    INVITE_LINKS {
        uuid id PK
        uuid room_id FK "ON DELETE CASCADE"
        string token_hash UK "hash, not raw token"
        timestamptz created_at
        timestamptz expires_at
        timestamptz revoked_at
    }
    ROOM_TIMERS {
        uuid room_id PK, FK "ON DELETE CASCADE"
        string mode "focus | short_break | long_break | idle"
        timestamptz started_at "null while idle"
        int duration_ms "null while idle"
        timestamptz paused_at "null if running"
        int accumulated_ms "elapsed before pauses"
        int cycle_count
        int version "bump on every change, helps clients ignore stale updates"
    }
    AGENDA_ITEMS {
        uuid id PK
        uuid room_id FK "ON DELETE CASCADE"
        string text
        int position
        bool done
        timestamptz created_at
    }
    STUDY_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid room_id FK "nullable, ON DELETE SET NULL"
        timestamptz started_at
        timestamptz ended_at
        int focused_seconds
    }
    NOTES {
        uuid id PK
        uuid user_id FK
        string body
        timestamptz updated_at
    }
```

## What changed from v0.1
- **Removed:** `MESSAGES` (chat is Redis), `ACTIVE_TIMERS` (timer now belongs to the room), `SOUND_LAYERS`, `SOUND_PRESETS`, `PRESET_LAYERS` (mixer is a later version), `is_default`, `is_private`, `deleted_at`, `role` on members
- **Added:** `ROOM_TIMERS`, `AGENDA_ITEMS`, `NOTES`, timer durations on `ROOMS`
- **`ROOMS.owner_id` is no longer unique:** a user can own several rooms (limit 5, checked in a transaction). Zero is allowed after deletes.
- **Roles:** owner = `ROOMS.owner_id`. Host is derived from presence at runtime, so it is not a column.

## Design notes
1. **Timer = timestamps.** Remaining = `duration - (now - started_at) - accumulated pauses`. Late joiners, refreshes and second devices all compute the same answer. `version` stops an old update from overwriting a newer one after a reconnect.
2. **Timer writes are cheap and rare.** Only state *changes* (start, pause, reset, skip) are written, never per-second ticks.
3. **Study sessions are written per member** when a focus block completes while they were present. Stats and streaks are computed from this table with the user's timezone; no streak column.
4. **Delete rules:** room deletion cascades to members, invites, timer, agenda. Sessions survive with `room_id = null`.
5. **Member cap (50)** must be enforced in a transaction, because two people can join at the same instant.
6. **Room closure is explicit.** `ROOMS.closed_at` is nullable. A null value means the room is open; a timestamp means it is closed. Non-owners cannot join a closed room, while the owner retains access. Closing a room is distinct from deleting it. The close and reopen workflows must maintain this field consistently.
7. **Indexes to add:** `STUDY_SESSIONS (user_id, started_at)`, `AGENDA_ITEMS (room_id, position)`, `INVITE_LINKS (token_hash)`, `ROOMS (owner_id)`, `ROOM_MEMBERS (user_id)` (to list the rooms I belong to).
8. **The active room is not in the database.** Which room a user is currently in lives in Redis presence (`userId -> activeRoomId`). Joining a second room removes the first. This also stops one focus block being credited in two rooms.
9. **Room limit (5 per owner)** must be checked inside a transaction when creating a room, because two creates can race.
10. **Idle timer rule.** A new room's `ROOM_TIMERS` row is created with `mode = idle`, `started_at = null`, `duration_ms = null`, `accumulated_ms = 0`, `cycle_count = 0`, `version = 0`. `started_at` and `duration_ms` are set on the first `start` and are both null again after `reset` back to idle. `timerService` must treat `mode = idle` as "no remaining time to compute" and never read `started_at` in that state.
11. **Timestamps are `timestamptz`.** Every instant in the schema is stored with its timezone (UTC), matching ADR-003 (timer as server timestamps).
