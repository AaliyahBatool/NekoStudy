# ADR-012: One error type, one error handler, one response shape

**Status:** Accepted
**Date:** 2026-11-27

**Context:** The API has many endpoints and a socket layer. If every handler formats its own errors, clients can't rely on a shape, internal details leak, and unexpected failures look different from expected ones.

**Options considered**
1. Each route catches errors and sends its own response
2. Return result objects (`{ ok, error }`) from services and branch on them everywhere
3. Services throw typed errors; one middleware turns them into responses

**Decision:** Option 3.
- `AppError(code, httpStatus, message, details?)` in `lib/errors.ts`, with stable codes from the REST spec (`NOT_FOUND`, `VALIDATION_ERROR`, `ROOM_FULL`, ...).
- Services throw `AppError`. Controllers do not catch; Express 5 forwards errors from async handlers automatically.
- One error-handling middleware, registered last, always responds with `{ "error": { "code", "message", "details" } }`.
- `ZodError` becomes `VALIDATION_ERROR` (422). Body-parser errors (for example malformed JSON) keep their 4xx status. Anything else is logged in full with the request ID and returned as a generic `INTERNAL` 500. **Stack traces and database errors never reach the client.**
- Unknown routes become a standard `NOT_FOUND`.
- Health endpoints are exempt: monitors expect a simple status body.
- Sockets use the same code vocabulary, returned in acks as `{ ok: false, error: { code, message } }` (the shared `SocketErrorCode` type), not thrown.

**Consequences**
- (+) Clients write one error parser; every failure is predictable
- (+) Business rules throw where they are checked, so services stay readable
- (+) Internal details are not exposed, and every 500 is traceable by request ID in the logs
- (-) Everything must go through `AppError`, otherwise it degrades to a generic 500
- (-) The code list must be kept in sync between REST and socket docs

**Be ready to answer:** "How do you avoid leaking internals in production?"
