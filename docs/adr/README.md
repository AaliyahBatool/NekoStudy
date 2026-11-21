# Architecture Decision Records

One file per significant decision: context, options, decision, consequences. Numbered, never deleted; if a decision changes, add a new ADR that supersedes the old one.

| # | Decision | Status |
|---|---|---|
| 001 | Socket.IO for real-time | Accepted |
| 002 | PostgreSQL as primary database | Accepted |
| 003 | Timer state as server timestamps | Accepted |
| 004 | Presence, chat and rate limits in Redis | Accepted |
| 005 | Host derived from presence | Accepted |
| 006 | Ephemeral chat | Accepted |
| 007 | Close and delete room are separate actions | Accepted |
| 008 | Many rooms per user, one active at a time | Accepted |

Still to write: 009 TypeScript, 010 pnpm monorepo, 011 Prisma, 012 testing strategy (selective TDD), 013 deployment target.
