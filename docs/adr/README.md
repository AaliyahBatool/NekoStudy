# Architecture Decision Records

One file per significant decision: context, options, decision, consequences. Numbered, never deleted; if a decision changes, add a new ADR that supersedes the old one.

| #   | Decision                                   | Status   |
| --- | ------------------------------------------ | -------- |
| 001 | Socket.IO for real-time                    | Accepted |
| 002 | PostgreSQL as primary database             | Accepted |
| 003 | Timer state as server timestamps           | Accepted |
| 004 | Presence, chat and rate limits in Redis    | Accepted |
| 005 | Host derived from presence                 | Accepted |
| 006 | Ephemeral chat                             | Accepted |
| 007 | Close and delete room are separate actions | Accepted |
| 008 | Many rooms per user, one active at a time  | Accepted |
| 009 | TypeScript everywhere                      | Accepted |
| 010 | pnpm workspaces monorepo                   | Accepted |
| 011 | Prisma as the ORM                          | Accepted |

Still to write: 012 error handling and error codes, 013 testing strategy (selective TDD), 014 scene backgrounds as looping video served from storage, 015 deployment target.
