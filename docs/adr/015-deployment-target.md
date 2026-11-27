# ADR-015: Deployment target for the walking skeleton

**Status:** Proposed (limits checked 2026-11-27; re-check before deploying, free tiers change)
**Date:** 2026-11-27

**Context:** The API needs a **long-running server** (WebSockets, in-process timers, per-user locks), plus Postgres, Redis, a static frontend and large video assets. Budget is zero or close to it, and this is a portfolio project, not a production service.

**What the free tiers allow (from each provider's own docs, 2026-11-27)**
- **Render, web service:** 750 free instance hours per month. It spins down after 15 minutes with no inbound traffic; HTTP requests and WebSocket messages from existing connections count as traffic. Waking takes about a minute. Free services have an ephemeral filesystem. ([docs](https://render.com/docs/free))
- **Render, Postgres:** 1 GB, but the database **expires 30 days after creation** and is deleted after a 14-day grace period. Not usable for a long-lived demo. ([docs](https://render.com/docs/free))
- **Render, Key Value (Redis):** free, in-memory only; a restart deletes the data. ([docs](https://render.com/docs/free))
- **Neon, Postgres:** 1 GB per project, 100 compute-hours per month, compute suspends after 5 minutes of inactivity (it cannot be disabled), and there is no overage billing. ([docs](https://neon.com/faqs/free-plan-limits-and-quotas))
- **Cloudflare R2, object storage:** 10 GB-month storage, 1M Class A and 10M Class B operations per month, and **no egress fee**. ([docs](https://developers.cloudflare.com/r2/pricing))
- Not checked: Fly.io, Railway, Upstash and static-hosting limits.

**Decision (proposed):**
- **API:** Render free web service (long-running Node process, WebSockets supported)
- **Postgres:** Neon free (avoids Render's 30-day expiry)
- **Redis:** Render Key Value free. This is acceptable because presence is rebuilt from scratch on every start (`clearStalePresence`) and chat is ephemeral by design (ADR-006)
- **Scene videos and posters:** Cloudflare R2, served through `ASSET_BASE_URL` (ADR-014)
- **Frontend:** any static host. Pick one when deploying

**Consequences**
- (+) $0, and every part is replaceable by changing environment variables
- (+) Video traffic never touches the API server, and R2 egress is free
- (-) **Cold starts:** an idle API takes about a minute to wake, and Neon's first query after idle is slow. Wake both before a demo. Keep the Prisma connection settings tolerant of the first slow connection
- (-) Free instance hours are enough for one always-on service per month, but not for two
- (-) Single instance only, consistent with the known limit in the WebSocket doc (rule 7)
- (-) **Cookies and domains:** the API and web app must be the *same site*, or the `SameSite=Lax` auth cookie is not sent on API calls and the WebSocket handshake. Provider subdomains (`*.onrender.com`, `*.pages.dev`) are different sites. Plan for a custom domain with `app.` and `api.` subdomains, or fall back to `SameSite=None; Secure`, which some browsers restrict
- (-) Free tiers change. Record the check date here and re-verify before the deploy

**Be ready to answer:** "How would this change if you needed more than one API instance?" (Redis adapter for Socket.IO, and a single owner for each room's timer schedule.)
