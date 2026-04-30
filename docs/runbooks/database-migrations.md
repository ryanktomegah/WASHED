# Database Migration Conventions

## Location

Core API migrations live in `packages/core-api/migrations`.

## Naming

Use sequential four-digit prefixes:

```text
0001_initial_schema.sql
0002_assignment_and_workers.sql
```

Do not renumber existing migrations. Add a new file with the next number.

## Rules

- Migrations must be deterministic SQL files.
- Each migration must be safe to run once and recorded in `schema_migrations`.
- Avoid destructive schema changes without a companion data migration and rollback note.
- Provider integrations must store provider references and idempotency keys before real sends are enabled.

## Commands

- `pnpm migrations:check` validates migration naming and ordering.
- `pnpm --filter @washed/core-api migrate` applies pending migrations using `DATABASE_URL`.
