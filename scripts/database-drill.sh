#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/scripts/dev/compose.yml"
DATABASE_URL="${DATABASE_URL:-postgres://washed:washed@localhost:5432/washed}"
RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:-postgres://washed:washed@localhost:5432/washed_restore_drill}"
ARTIFACT_DIR="$ROOT_DIR/.tmp/database-drill"
BACKUP_FILE="$ARTIFACT_DIR/washed-local.dump"

mkdir -p "$ARTIFACT_DIR"

cd "$ROOT_DIR"

./scripts/dev/up.sh

pnpm --filter @washed/core-api build
DATABASE_URL="$DATABASE_URL" pnpm --filter @washed/core-api migrate
DATABASE_URL="$DATABASE_URL" pnpm --filter @washed/core-api exec vitest run src/migrations.integration.test.ts

docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
  --dbname washed \
  --format custom \
  --no-owner \
  --no-privileges \
  --username washed \
  > "$BACKUP_FILE"

docker compose -f "$COMPOSE_FILE" exec -T postgres dropdb \
  --force \
  --if-exists \
  --username washed \
  washed_restore_drill

docker compose -f "$COMPOSE_FILE" exec -T postgres createdb \
  --username washed \
  washed_restore_drill

docker compose -f "$COMPOSE_FILE" exec -T postgres pg_restore \
  --dbname washed_restore_drill \
  --no-owner \
  --no-privileges \
  --username washed \
  < "$BACKUP_FILE"

DATABASE_URL="$RESTORE_DATABASE_URL" pnpm --filter @washed/core-api migrate
DATABASE_URL="$RESTORE_DATABASE_URL" pnpm --filter @washed/core-api exec vitest run src/migrations.integration.test.ts

echo "Database drill complete: $BACKUP_FILE"
