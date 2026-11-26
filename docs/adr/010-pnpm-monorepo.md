# ADR-010: pnpm workspaces monorepo

**Status:** Accepted

**Context:** The project has three parts that change together: the web app, the API and the shared types package. They need to share code and be versioned, tested and deployed as one project by one developer.

**Options considered**
1. Separate repositories for web, API and shared types
2. One repository with npm workspaces
3. One repository with pnpm workspaces
4. A monorepo build tool on top (Nx, Turborepo)

**Decision:** Option 3. `apps/web`, `apps/api` and `packages/shared` are workspace packages. Internal dependencies use the `workspace:*` protocol. The package manager version is pinned with the `packageManager` field and Node is pinned to 22 (`.nvmrc` and `engines`).

**Consequences**
- (+) One pull request can change an event type, the server handler and the client call together
- (+) pnpm's strict `node_modules` layout stops a package importing a dependency it never declared
- (+) A single lockfile and fast, disk-efficient installs; `pnpm -r` and `--filter` run scripts across packages in dependency order
- (+) Simple enough for one developer, with no extra build orchestration
- (-) Contributors need pnpm (via corepack), not plain npm
- (-) No build caching across packages; if builds get slow, Turborepo can be added later without restructuring

**Be ready to answer:** "Why a monorepo for a solo project?" (Shared types change in lockstep with both sides, so one atomic commit beats three versioned releases.)
