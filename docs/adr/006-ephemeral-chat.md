# ADR-006: Chat is ephemeral

**Status:** Accepted

**Context:** Rooms are private study spaces. Chat is a convenience, not a record.

**Decision:** Keep the last 100 messages per room in Redis, expiring after about 3 hours. Not stored in the main database.

**Consequences**
- (+) Better privacy; no moderation backlog; no cleanup job; simpler schema
- (-) No chat history after expiry or a Redis restart (intended)
- (-) Abuse reports can't rely on stored evidence in v1
