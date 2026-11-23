# ADR-001: Choose Prisma as the database ORM

- **Status:** Accepted
- **Decision:** Use Prisma for database access and schema migrations.
- Prisma provides a schema-first workflow that is approachable while the project is still taking shape.
- Its migration tooling makes schema changes explicit, repeatable, and reviewable.
- Generated TypeScript types provide useful compile-time feedback when querying the database.
- The Prisma schema gives the team one clear place to understand the data model.
- The trade-off is an additional schema and generated-client workflow compared with a lighter query builder such as Drizzle.
- For NekoStudy, the faster onboarding and migration workflow outweigh that extra abstraction for now.
