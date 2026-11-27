# ADR-013: Selective test-first, real Postgres and Redis in tests

**Status:** Accepted
**Date:** 2026-11-27

**Context:** The risky parts of NekoStudy are logic, not screens: timer arithmetic, host derivation, presence moves, streaks across time zones, invite states, and races on the room and member limits. A real example: an unbalanced `if` in the Redis Lua script for `room:leave` made every leave fail. It was found by reading, not by a test. Mocks would not have found it either, because the bug lives inside Redis.

**Options considered**
1. Test everything test-first (strict TDD)
2. Test after the fact, where convenient
3. Test-first for the risky core, tests alongside for the rest, real dependencies for integration tests

**Decision:** Option 3.
- **Test-first** for: timer service (with an injected clock), host derivation, stats and streaks (time zones, DST), invite token states, the 5-rooms-per-owner limit and the 50-member cap under concurrency.
- **Tests alongside** the code for glue: routes, controllers, schemas, socket handlers.
- **Unit tests** (Vitest) for pure logic. Time is injected (a `Clock`, or Vitest fake timers), never read directly in logic under test.
- **Integration tests** run against **real Postgres and real Redis**, not mocks (a separate `nekostudy_test` database, migrations applied once, tables truncated between tests). HTTP tests use `supertest`; socket tests use `socket.io-client`.
- No snapshot tests for the UI. One end-to-end happy path (sign up, create room, start timer) is added later.
- CI runs everything on every push and PR with Postgres and Redis service containers. Coverage is reported, not a target.

**Consequences**
- (+) The tests cover the places bugs actually appear, including Lua scripts and race conditions
- (+) Injected clocks make timer and streak tests fast and deterministic
- (-) Integration tests are slower and need Docker locally and in CI
- (-) Test-first needs discipline on the core and judgement about what counts as "risky"

**Be ready to answer:** "What do you test, and what don't you?" (Rules and races: yes. Pixel layout: no.)
