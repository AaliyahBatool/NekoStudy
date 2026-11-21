# ADR-001: Use Socket.IO for the real-time layer

**Status:** Accepted

**Context:** The app needs presence, a shared timer, scene sync, agenda sync and chat between people in the same room, with automatic reconnection.

**Options considered**
1. Raw WebSockets (`ws` library)
2. Socket.IO
3. Server-Sent Events + REST for commands

**Decision:** Socket.IO.

**Why**
- Built-in rooms map directly to our "room channel" model
- Acknowledgements (ack callbacks) fit our command/ack design
- Automatic reconnection, heartbeats and middleware (auth at handshake)
- Redis adapter available if we ever run more than one server

**Consequences**
- (+) Much less plumbing than raw WebSockets, so more time on product logic
- (-) Not a plain WebSocket protocol; clients must use `socket.io-client`
- (-) Extra bundle size; with multiple servers you need sticky sessions or WebSocket-only transport
- (-) Hides some low-level details, so learn what it does under the hood (heartbeats, reconnect)

**Be ready to answer:** "Why not plain WebSockets?" / "How would you scale this to multiple servers?"
