# ADR-008: Many rooms per user, one active room at a time

**Status:** Accepted

**Context:** Users may want separate rooms (solo study, a friends group, a project group), but a person can only study in one place at a time.

**Options considered**

1. One room per user
2. Many rooms, active in several at once
3. Many rooms (max 5 owned), active in only one at a time

**Decision:** Option 3. Membership in many rooms is allowed; the server tracks one `activeRoomId` per user in Redis presence. Joining a new room removes the user from the previous one.

**Consequences**

- (+) A focus block can only be credited in one room, so stats and streaks stay honest
- (+) Simpler presence and notifications than being in several rooms at once
- (+) The cap of 5 owned rooms limits storage and abuse
- (-) Needs a room switcher, a create-room flow and a "moved" notice in the UI
- (-) The limit check must run in a transaction (two simultaneous creates)
- (-) Edge cases to test: two tabs in different rooms, accepting an invite while active elsewhere
