# ADR-007: Rooms can be closed or deleted (two different actions)

**Status:** Accepted

## Context

Users can own up to 5 rooms. Owners need a way to end a group session without losing their room setup, and a way to remove a room entirely.

The database now includes a nullable `rooms.closed_at` column. This explicitly records whether a room is closed.

## Options considered

1. Delete only
2. Close only
3. Both, with distinct meanings

## Decision

Option 3.

- **Close room:** marks the room as closed using `closed_at`. Non-owners cannot join a closed room; the owner retains access. The intended close workflow also removes members, revokes invite links, and stops the timer. Scene, durations, and agenda are retained.
- **Reopen room:** clears `closed_at` through an explicit reopen operation. The exact invite-link and reopening workflow must be implemented and documented separately.
- **Delete room:** removes the room completely, including members, links, agenda, and timer. Study history is retained with `room_id = null`.

## Consequences

- (+) Closing is reversible without losing room configuration.
- (+) Deleting remains a deliberate, destructive action.
- (+) Closure is represented explicitly and can be checked consistently by the backend.
- (-) The close and reopen workflows must maintain `closed_at` correctly.
- (-) Two distinct flows must be built and tested.
- (-) Delete needs a confirmation step in the UI.

## Implementation status

The `closed_at` database column and the non-owner join restriction are implemented.

The REST close/reopen workflows and corresponding real-time notifications are not yet implemented.
