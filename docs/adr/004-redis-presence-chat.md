# ADR-004: Presence, chat and rate-limit counters live in Redis

**Status:** Accepted (see the honest note below on why Redis is optional for a single instance)

**Context:** Presence changes every few seconds and disappears on disconnect. Chat is ephemeral. Rate limits need fast counters with expiry.

**Options considered**
1. In-memory maps inside the Node process
2. Postgres
3. Redis

**Decision:** Redis.

**Why**
- TTLs give ephemeral chat and expiring counters for free
- Capped lists (last 100 messages) are a natural fit
- Gives a path to multiple server instances (Socket.IO Redis adapter)

**Consequences**
- (+) Right tool for ephemeral data; scalable path
- (-) One more service to run, deploy and pay for
- (-) Presence/chat is lost if Redis restarts (acceptable for ephemeral data)

**Honest note:** for a single-instance v1, in-memory maps would work and be simpler. Choose Redis if you want the scaling story and the rate-limiting backend; choose in-memory if you want to cut scope. Either is defensible, as long as the ADR says why.

**Be ready to answer:** "Do you really need Redis for this?"
