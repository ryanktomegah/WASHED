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
- Subscriber names, phone numbers, payment phone numbers, email, exact GPS pins, landmarks, auth
  device IDs, visit photo object keys, operational free text, push device tokens, audit payloads,
  outbox payloads, notification payloads and delivery errors, and privacy export bundles are
  protected by application-layer encryption before they reach Postgres. Lookup use cases rely on
  keyed HMAC columns, not plaintext.
- Direct database access is limited to the private network, admin bastion, or managed-provider
  equivalent. No public Postgres listener is acceptable for production.
- Backups must be encrypted by the provider/KMS, access-logged, retention-limited, and restorable
  without exposing credentials in shell history or committed files.
- Database dumps are confidential incidents by default. App-layer encryption reduces dump exposure,
  but dump access is still restricted to the smallest operations group and handled through
  encrypted storage only.

## Data Protection Keys

- `WASHED_DATA_ENCRYPTION_KEY` is required for production and for any non-local `DATABASE_URL`.
  It must be 32 random bytes encoded as base64url or 64-character hex, stored outside Postgres.
- `WASHED_DATA_ENCRYPTION_KEY_ID` labels new ciphertext. Use a short stable id such as
  `prod-2026-05`.
- `WASHED_DATA_ENCRYPTION_PREVIOUS_KEYS` is the keyring for reads during rotation, formatted as
  comma-separated `keyId=base64urlOrHex` entries. Keep old keys until every row has been re-written
  or the rotation drill confirms no old key ids remain.
- `WASHED_ALLOW_INSECURE_DEV_DATA_KEY=true` is allowed only for disposable local drills. It must not
  appear in staging or production secrets.

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
- The production runtime has `WASHED_DATA_ENCRYPTION_KEY` and `WASHED_DATA_ENCRYPTION_KEY_ID` set in
  the secret manager, not in git, shell history, or Terraform state output.
- A manual check confirms the app role cannot create tables and cannot read rows without
  `app.country_code`.
- A dump sample confirms sensitive fields appear as `wdp:v1:` ciphertext or keyed hashes, not raw
  phone numbers, exact coordinates, support text, push tokens, or object keys.
- Provider backup encryption, PITR, retention, and access logs are enabled and captured in the
  launch evidence packet.
