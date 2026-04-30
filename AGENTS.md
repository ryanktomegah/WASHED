# Repository Guidelines

## Project Structure & Module Organization

Washed is a pnpm/Turborepo TypeScript workspace. Source packages live under `packages/*`:

- `packages/shared/src`: shared money, tenancy, idempotency, errors, and audit primitives.
- `packages/core-domain/src`: pure domain logic for pricing, subscriptions, visit lifecycle, scheduling, and compensation.
- `packages/core-api/src`: Fastify API, repositories, validation, migrations runner, notification logic, and Postgres integration. SQL migrations are in `packages/core-api/migrations`.
- `packages/subscriber-web/public` and `packages/ops-web/public`: local static app shells. Their dev servers live in each package’s `src/dev-server.mjs`.
- Planning, reviews, and operating notes live in `docs/`.

Tests are colocated as `*.test.ts` beside the code they cover.

## Build, Test, and Development Commands

Use pnpm from the repo root:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

Local services:

```bash
./scripts/dev/up.sh
DATABASE_URL=postgres://washed:washed@localhost:5432/washed pnpm --filter @washed/core-api migrate
DATABASE_URL=postgres://washed:washed@localhost:5432/washed PORT=3000 node packages/core-api/dist/main.js
PORT=5173 pnpm --filter @washed/subscriber-web dev
PORT=5174 pnpm --filter @washed/ops-web dev
```

Use package filters for focused work, for example `pnpm --filter @washed/core-api test`.

## Coding Style & Naming Conventions

Use TypeScript ES modules for code packages. Prettier is configured with 2-space indentation, single quotes, semicolons, trailing commas, LF endings, and 100-character print width. Prefer explicit domain names (`subscriptionId`, `workerId`, `countryCode`) over abbreviations. Keep generated `dist/` output out of manual edits; edit `src/` or `public/` sources instead.

## Testing Guidelines

Vitest covers TypeScript packages. Web packages use `scripts/check.mjs` for static checks. Add focused tests for repository behavior, API routes, validation, and domain-event contracts when changing backend flows. Run at least `pnpm typecheck` and `pnpm test` before handing off substantial changes.

## Commit & Pull Request Guidelines

The repository currently has minimal history, so no strict commit convention is established. Use concise, imperative messages such as `Add push provider readiness endpoint`. PRs should describe behavior changes, list verification commands, note migrations or environment variables, and include screenshots for UI changes.

## Security & Configuration Tips

Never commit secrets, APNs `.p8` keys, FCM private keys, or production credentials. Prefer environment variables such as `DATABASE_URL`, `PUSH_PROVIDER`, `APNS_*`, and `FCM_*`. Readiness endpoints may expose missing key names, but must not expose credential values.
