#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

docker compose -f compose.yml exec -T postgres psql -U washed -d washed <<'SQL'
DO $$
BEGIN
  RAISE NOTICE 'Washed local seed is currently a no-op.';
END
$$;
SQL

echo "Seed complete."

