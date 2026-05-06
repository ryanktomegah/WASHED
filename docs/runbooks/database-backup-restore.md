# Database Backup And Restore Runbook

## Purpose

Protect Washed's Postgres system of record before closed beta and every production migration.

## Local Restore Drill

Preferred full drill:

```bash
pnpm database:drill
```

The script applies migrations, runs the real Postgres RLS test, takes a custom-format backup,
restores it into `washed_restore_drill`, and repeats migration/RLS verification against the
restored copy.

Manual equivalent:

1. Start local services:

```bash
./scripts/dev/up.sh
```

2. Apply migrations:

```bash
DATABASE_URL=postgres://washed:washed@localhost:5432/washed pnpm --filter @washed/core-api migrate
```

3. Create a plain backup:

```bash
PGPASSWORD=washed pg_dump \
  --host localhost \
  --port 5432 \
  --username washed \
  --dbname washed \
  --format custom \
  --file artifacts/washed-local.dump
```

4. Restore into a disposable database and replay a smoke check:

```bash
createdb postgres://washed:washed@localhost:5432/washed_restore
PGPASSWORD=washed pg_restore \
  --host localhost \
  --port 5432 \
  --username washed \
  --dbname washed_restore \
  --clean \
  --if-exists \
  artifacts/washed-local.dump
DATABASE_URL=postgres://washed:washed@localhost:5432/washed_restore pnpm --filter @washed/core-api migrate
```

Expected result: migrations report no pending failures and `schema_migrations` contains every
numbered file in `packages/core-api/migrations`.

## Production Standard

- Enable continuous WAL archiving and PITR before paid beta.
- Confirm the latest restore point before every production migration.
- Keep migration role and app role separate; app role must not own tables.
- Test restore into an isolated database at least once per release sprint.
- Record restore drill date, operator, source backup timestamp, and smoke-check result in the
  launch readiness log.
