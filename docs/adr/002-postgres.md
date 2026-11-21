# ADR-002: Use PostgreSQL as the primary database

**Status:** Accepted (a real choice: Mongo is more familiar, Postgres chosen for the relational data)

**Context:** The data is strongly relational: users, rooms (up to 5 per user), memberships, invite links, study sessions. We need uniqueness constraints, cascade rules, and transactions (e.g. room capacity race).

**Options considered**
1. MongoDB (familiar)
2. PostgreSQL

**Decision:** PostgreSQL.

**Why**
- Constraints do work for free: composite key on members, foreign keys, `ON DELETE CASCADE` / `SET NULL`
- Transactions are first-class (create user + room + timer atomically; enforce the 50-member cap)
- Stats and streaks are group-by-day queries in the user's timezone, which SQL handles well
- A different tool from the last project shows range

**Consequences**
- (+) Data integrity enforced by the database, not only by app code
- (-) Learning curve and schema migrations (pick a tool: Prisma, Drizzle or Knex)
- (-) Less flexible if the model changes a lot early on

**When I'd choose Mongo instead:** if the data were document-shaped and varied, or the schema were still unknown. Say this in interviews: it shows judgment, not preference.

**Be ready to answer:** "Why not Mongo, which you already know?"
