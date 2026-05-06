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
- Do not use `CREATE INDEX CONCURRENTLY` in repository migrations; the migration runner wraps each
  file in one transaction.
- New country-scoped tables must include `country_code`, an explicit country index for operator
  reads, and an RLS policy using `app.country_code`.
- Backfills must be in the same migration as the new nullable column, followed by `SET NOT NULL`
  only after the backfill.
- Production app roles must not own tables. The app role relies on RLS; schema ownership stays with
  the migration role.

## Commands

- `pnpm migrations:check` validates migration naming and ordering.
- `pnpm --filter @washed/core-api migrate` applies pending migrations using `DATABASE_URL`.

## Production Rollout

1. Run `pnpm migrations:check`.
2. Run a migration replay against an empty disposable Postgres schema.
3. Take a backup or confirm the latest PITR restore point before applying production migrations.
4. Apply migrations with the migration role.
5. Smoke `/health`, `/ready`, signup, assignment, billing history, audit replay, and operator
   support reads.

If a migration needs destructive data movement, ship it as expand/backfill/contract:

1. Add the new schema without dropping old columns.
2. Backfill and dual-write until reads use the new shape.
3. Verify export/erasure, audit, billing, and support flows.
4. Drop old columns only in a later migration with a written rollback note.
