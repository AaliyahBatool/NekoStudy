# ADR-011: Use Prisma as the Database ORM

- **Status:** Accepted
- **Decision:** Use Prisma for database access and schema migrations.
- Prisma provides a schema-first workflow that is approachable while the project is still taking shape.
- Its migration tooling makes schema changes explicit, repeatable, and reviewable.
- Generated TypeScript types provide useful compile-time feedback when querying the database.
- The Prisma schema gives the team one clear place to understand the data model.
- The trade-off is an additional schema and generated-client workflow compared with a lighter query builder such as Drizzle.
- For NekoStudy, the faster onboarding and migration workflow outweigh that extra abstraction for now.

## Options considered

### Prisma

- Schema-first approach.
- Generated, type-safe database client.
- Integrated migration workflow.
- Good developer productivity.

### Drizzle ORM

- More SQL-oriented and lightweight.
- Provides strong TypeScript integration.
- Gives developers more direct control over queries.

### Raw SQL

- Maximum control over queries.
- Requires more manual handling of types and migrations.
- More maintenance overhead for this project's needs.

## Decision

We chose Prisma because its schema-driven workflow, generated
client, and migration tooling provide a good balance of
type safety, maintainability, and development productivity.

## Consequences

- Database models will be defined in the Prisma schema.
- Migrations will be used to manage schema changes.
- Complex queries can still use raw SQL when appropriate.
