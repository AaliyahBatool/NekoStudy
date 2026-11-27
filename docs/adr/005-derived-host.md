# ADR-005: Host role is derived from presence, not stored

**Status:** Accepted

**Context:** The owner keeps the room permanently, but someone must control the timer, scene and agenda when the owner is away.

**Options considered**

1. Store `host_id` in the database and update it on handoff
2. Derive the host at runtime from who is present

**Decision:** Option 2. Host = the owner if present, otherwise the earliest-joined present member.

**Consequences**

- (+) No stale host after crashes or disconnects; one rule, recomputed on every presence change
- (+) Owner returning reclaims host automatically
- (-) Needs a 10 s disconnect grace period so a refresh doesn't trigger handoff
- (-) Edge cases to test: two joins at once, host disconnects mid-sprint
