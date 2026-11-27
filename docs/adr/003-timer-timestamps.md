# ADR-003: Timer state is stored as server timestamps

**Status:** Accepted

**Context:** The room timer must survive refresh, tab close and a second device, and stay in sync for every member.

**Options considered**

1. Each browser counts seconds locally
2. Server broadcasts a tick every second
3. Server stores `startedAt`, `durationMs`, `pausedAt`, `accumulatedMs`; clients compute remaining time

**Decision:** Option 3.

**Consequences**

- (+) Survives refresh/reconnect; late joiners compute the same answer; almost no bandwidth
- (+) Server schedules completion and writes study sessions, so the client can't fake them
- (-) Clients must correct for clock offset (`time:sync`)
- (-) Pausing needs extra fields; a `version` field guards against stale updates
- (-) Server restart must reschedule timers from the database

**Be ready to answer:** "What happens if the server restarts mid-session?"
