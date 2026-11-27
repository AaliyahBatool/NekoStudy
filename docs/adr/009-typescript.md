# ADR-009: Use TypeScript for the whole codebase

**Status:** Accepted

**Context:** NekoStudy has a React client, a Node API and a real-time protocol between them. The risk is the two sides drifting apart: an event renamed on the server but not on the client, or a payload field that changes shape. A solo developer won't catch that by memory.

**Options considered**

1. JavaScript everywhere, with JSDoc or runtime checks only
2. TypeScript on the server only
3. TypeScript everywhere, with shared types in one package

**Decision:** Option 3. Every package uses TypeScript with `strict` turned on (one `tsconfig.base.json`). The Socket.IO event names, payloads and error codes live in `packages/shared` and are imported by both the API and the web app.

**Consequences**

- (+) Changing an event payload fails the typecheck on both sides, so client and server cannot drift
- (+) Prisma's generated client and zod schemas give end-to-end types from database to UI
- (+) Refactors are safer, and the compiler catches many bugs before tests do
- (-) A build/typecheck step is needed, and `shared` must be built before the apps (`pnpm typecheck` handles this)
- (-) Types are erased at runtime, so every external input (HTTP bodies, socket payloads, env vars) still needs zod validation

**Be ready to answer:** "If TypeScript checks types, why do you also use zod?" (Types disappear at runtime; zod checks the data that actually arrives.)
