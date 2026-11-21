# ADR-007: Rooms can be closed or deleted (two different actions)

**Status:** Accepted

**Context:** Users can own up to 5 rooms. Owners need a way to end a group session without losing their setup, and a way to remove the room entirely.

**Options considered**
1. Delete only
2. Close only
3. Both, with distinct meanings

**Decision:** Option 3.
- **Close room:** removes all members, revokes the invite link, stops the timer. Scene, durations and agenda stay. Making a new link reopens the room.
- **Delete room:** removes the room completely (members, links, agenda, timer). Study history is kept with no room attached. The user can create a new room later (up to the limit of 5).

**Consequences**
- (+) Closing is cheap and reversible; deleting is a deliberate, confirmed action
- (+) "Closed" needs no extra column: it is just "no members and no active link"
- (-) A user can end up with zero rooms, so clients must handle having none
- (-) Two socket events and two flows to build and test (`room:closed`, `room:deleted`)
- (-) Delete needs a confirmation step in the UI
