# Database Security Runbook

Washed treats Postgres as confidential production infrastructure, not a developer convenience.

## Production Controls

- The API must connect with a non-owner application role. The app role gets only the table
  privileges needed by `CoreRepository`; it must not own tables, create schema objects, or receive
  predefined roles such as `pg_read_all_data`, `pg_write_all_data`, `pg_read_server_files`, or
  `BYPASSRLS`.
- Migrations run with a separate migration role. That role may own schema objects, but application
  traffic must never use it.
- Country-scoped tables have row-level security enabled and forced. Every repository query runs
  inside a transaction that sets `app.country_code`.
- Direct database access is limited to the private network, admin bastion, or managed-provider
  equivalent. No public Postgres listener is acceptable for production.
- Backups must be encrypted by the provider/KMS, access-logged, retention-limited, and restorable
  without exposing credentials in shell history or committed files.
- Database dumps are confidential incidents by default. RLS does not protect a stolen dump; dump
  access is restricted to the smallest operations group and handled through encrypted storage only.

## Local Drill

Run the full local drill from the repository root:

```bash
pnpm database:drill
```

The drill starts local Postgres, applies migrations, replays the migration/RLS integration test,
creates a custom-format backup, restores it into `washed_restore_drill`, reruns migrations against
the restored database, and reruns the integration test on the restored copy.

## Evidence Required Before Launch

- `pnpm database:drill` passes on a clean local machine.
- A staging restore drill has been completed from a real managed backup.
- The production `DATABASE_URL` uses the non-owner app role.
- A manual check confirms the app role cannot create tables and cannot read rows without
  `app.country_code`.
- Provider backup encryption, PITR, retention, and access logs are enabled and captured in the
  launch evidence packet.

## DB Leak Reality

Least privilege and RLS limit live-query blast radius. They do not make a stolen logical dump safe.
For stronger dump-resilience, sensitive columns such as phone numbers, payment phone numbers,
precise GPS, landmarks, support free text, and photo object keys must move behind application-layer
encryption or tokenization with keys stored outside Postgres.
