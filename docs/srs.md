# Mini SRS: Scene-Based Study Rooms (working title)

Version 0.3 · 21 Nov 2026 · Owner: Aaliyah
No deadlines: milestones are ordered, not dated. Each milestone ends in a working demo.

---

## 1. Overview

**Problem:** Studying alone at home is distracting and isolating. Existing "study with others" tools lean on atmosphere and video, and give little structure to the session itself.

**Solution:** A scene-based study space. Every user can create up to 5 rooms (each a full-screen scene with a timer and tools) and be active in one at a time. Clicking **Invite** in a room turns it into a group room: friends join by link, see who is there and what they are working on, and run a shared focus timer with shared breaks.

**Differentiator:** *Intent and accountability.* The host sets an agenda, members see each other's live status, and the room runs shared sprints. Presence means "someone is working on X", not just "someone is here".

**Core model:**
- **Room** = created by a user (up to 5 each), with a scene, a shared timer, an agenda, and members. A user can be a member of many rooms but active in only one at a time
- **Owner** = the room's creator, permanently
- **Host** = temporary role (see 4.2): owner if present, otherwise the longest-present member
- **Widget** = independent UI module (timer, agenda, notes) with persisted layout

**Target users:** College students who want structured, low-distraction study sessions, alone or with friends.

**Project goal:** a deployed, well-documented, real-time app that demonstrates sound engineering (real-time state, timer correctness, security), not feature count.

---

## 2. Scope

### v1 (build, in order)
1. Auth, dashboard (scene library, visible when logged out), create and switch between my rooms (max 5), scene switching
2. Timer (Pomodoro, short break, long break, custom durations), session logging, stats and streak
3. Invite link, presence, owner/host model, shared scene
4. Shared timer and breaks (host controls), agenda widget, personal notes
5. Chat (ephemeral), in-app notifications
6. Load test, tests, docs, deploy

### Stretch
- Video via managed SFU (LiveKit)
- Chess puzzle widget for breaks
- Browser push notifications

### Later versions
- Sound mixer (layers, per-user volumes, saved presets)
- Tab blocking / tab-leave detection (web apps cannot block tabs; detection via Page Visibility API, real blocking needs an extension)
- Tasks widget, guest join, custom scene uploads, public/overflow rooms

### Never (for this project)
- Calendar, fortune, desktop app, ads, building own WebRTC stack

---

## 3. Functional Requirements

### Auth
- [ ] A visitor can view the dashboard without an account
- [ ] A visitor must sign up or log in to open a scene or join a room
- [ ] A visitor who opens an invite link is returned to that room after signing up or logging in

### Room and scenes
- [ ] Every user gets one default room on signup
- [ ] A user can create up to 5 rooms (name + scene) and close or delete any of them
- [ ] Opening a scene from the dashboard lets me create a room with it or apply it to the room I am in
- [ ] I can switch between my rooms from the room top bar
- [ ] A user is active in only one room at a time: joining another room removes me from the first and tells me
- [ ] The owner (or current host) can change the scene; all members see it change live
- [ ] Each scene may play one optional ambient loop (volume control, off by default)

### Invite and membership
- [ ] The owner can generate, regenerate and revoke an invite link from inside the room
- [ ] A user can be a member of many rooms (their own plus invited ones), but active in only one
- [ ] A member can leave at any time
- [ ] The host can remove a member (removed members cannot rejoin via the old link)
- [ ] A user with no access sees a clear "no access" screen
- [ ] The owner can close the room: members are removed and the invite link is revoked, but the room, scene, durations and agenda stay; making a new link reopens it
- [ ] The owner can delete the room (with confirmation): everything in it is removed, study history is kept

### Presence and roles
- [ ] Members see who is in the room and each person's status (focusing / on break / away)
- [ ] Presence disappears automatically when a tab closes or the connection drops
- [ ] The owner is host while present; if absent, the longest-present member is host; when the owner returns, they resume as host

### Timer (shared, room-owned)
- [ ] The host starts, pauses, resets and skips the room timer
- [ ] All members see the same remaining time; breaks are shared
- [ ] The timer survives refresh, tab close and a second device
- [ ] Someone joining mid-block sees the correct remaining time
- [ ] Host can set focus / short break / long break durations and cycles before long break
- [ ] A completed focus block is logged as a study session for each member who was present

### Agenda and notes
- [ ] The host can add, edit, reorder and tick off agenda items; all members see them live
- [ ] Each user has personal notes that persist (not visible to others)

### Chat (ephemeral)
- [ ] Members send and receive messages in real time
- [ ] Recent messages (last 50) load on join; messages expire after a few hours
- [ ] Members can mute another member locally

### Notifications (in-app)
- [ ] Notice when a block or break ends, and when someone joins or leaves

### Stats
- [ ] Focus time today / week and a daily streak

---

## 4. Rules and Design Constraints

### 4.1 Room lifecycle
- A user can own up to 5 rooms; signup creates a first default room; a user may have zero after deleting them
- A user can be a member of many rooms but active in only one at a time (enforced server-side through presence)
- Closing a room removes members and revokes the link but keeps the room
- Deleting a room deletes members, links, timer and agenda; study sessions are kept with `room_id` set to null
- Chat is not stored in the database

### 4.2 Host handoff
- Owner always keeps ownership
- Host is **derived from presence**, not stored: owner if present, otherwise the earliest-joined present member
- Host powers: scene control, timer control, agenda, kick. Owner-only powers: close room, delete room, manage invite link
- Edge cases to specify before coding: owner returns mid-block; two members join at the same moment; host disconnects during a sprint

---

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Capacity | Max 50 members per room (configurable; realistic target is much smaller) |
| Rooms per user | Max 5 owned rooms; active in one room at a time |
| Chat | Last 100 messages per room, 500 chars max, expires after ~3 h, stored in Redis |
| Latency | Presence, scene, timer and chat updates visible to others within ~1-2 s |
| Timer correctness | Server-authoritative timestamps; clients derive remaining time and correct for clock offset; drift under ~1 s |
| Resilience | Client auto-reconnects and re-syncs presence, timer, agenda and chat after a dropped connection |
| Security | Invite tokens are long, random, stored hashed, revocable; every socket event is authenticated and authorized per room and role |
| Abuse control | Rate limits on chat, joins, invite generation |
| Privacy | Rooms are invite-only; chat is ephemeral; passwords hashed; minimal personal data |
| Streak logic | Based on the user's timezone; a day counts if focus time >= a threshold (decide) |
| Accessibility | Keyboard-usable controls; audio off by default; respects reduced-motion |
| Performance | Load test with 50 concurrent users in one room and several rooms; record the results |
| Licensing | All scenes, audio and fonts are original or licensed (CC0 / royalty-free); keep a LICENSES note |

---

## 6. Constraints and Assumptions

- Solo developer, no fixed deadline, working alongside placements
- Stack baseline: React, Node/Express, Socket.IO, Redis (presence, timers cache, chat), Postgres (decide via ADR)
- Modular monolith; no microservices
- Scene library is curated by the developer; users choose from it
- Video is a stretch goal and must not be blocked by the architecture

---

## 7. ADRs to Write

- [ ] ADR-001: Socket.IO vs raw WebSockets
- [ ] ADR-002: Postgres vs MongoDB
- [ ] ADR-003: Timer state as server timestamps
- [ ] ADR-004: Presence and chat in Redis
- [ ] ADR-005: Derived host role vs stored host
- [ ] ADR-006: Ephemeral chat
- [ ] ADR-007: Close vs delete room
- [ ] ADR-008: Many rooms per user, one active room at a time
- [ ] Later: modular monolith, ORM, deployment, managed SFU for video (stretch)

---

## 8. Open Questions

- [ ] Minimum focus time for a day to count toward the streak?
- [ ] What does a late joiner see mid-break vs mid-focus?
- [ ] Can members leave a shared sprint without ending their session log?
- [ ] App name and visual identity
- [ ] Deployment target and cost
- [ ] Zero audio in v1, or one ambient loop per scene?
