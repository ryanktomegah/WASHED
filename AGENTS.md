# Repository Guidelines

## Product & Design Source of Truth

Washed uses `design/index.html` as the product/design-system source of truth and
`design/09-copy-deck/copy.html` as the human source of truth for French copy and i18n.
`packages/i18n/src/fr.json` is the implementation catalog and must stay aligned with the
copy deck. New production strings should be added to the copy deck before code uses them.

## Project Structure & Module Organization

Washed is a pnpm/Turborepo TypeScript workspace. Source packages live under `packages/*`:

- `packages/shared/src`: shared money, tenancy, idempotency, errors, and audit primitives.
- `packages/core-domain/src`: pure domain logic for pricing, subscriptions, visit lifecycle, scheduling, and compensation.
- `packages/core-api/src`: Fastify API, repositories, validation, migrations runner, notification logic, provider integrations, and Postgres integration. SQL migrations are in `packages/core-api/migrations`.
- `packages/subscriber-app/src`: React/Vite/Capacitor subscriber app. This is the current target subscriber surface.
- `packages/worker-app/src`: React/Vite/Capacitor worker/laveuse app. This is the current target worker surface.
- `packages/operator-console/src`: React/Vite desktop operator console. This is the current target ops surface.
- `packages/ui/src`, `packages/design-tokens/src`, `packages/i18n/src`, `packages/api-client/src`, `packages/auth/src`, and `packages/frontend-config/src`: shared frontend foundations.
- `packages/subscriber-web/public` and `packages/ops-web/public`: legacy/reference smoke clients retained during the transition only.
- Planning, reviews, runbooks, and operating notes live in `docs/`.

Tests are colocated as `*.test.ts` or `*.test.tsx` beside the code they cover.

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
# run long-lived dev servers in separate terminals
pnpm --filter @washed/subscriber-app dev      # http://127.0.0.1:5173
pnpm --filter @washed/worker-app dev          # http://127.0.0.1:5174
pnpm --filter @washed/operator-console dev    # http://127.0.0.1:5175
```

Mobile simulator helpers:

```bash
pnpm ios:sim:subscriber
pnpm ios:sim:worker
pnpm ios:sim:all
```

Use package filters for focused work, for example `pnpm --filter @washed/core-api test`.

## Coding Style & Naming Conventions

Use TypeScript ES modules for code packages. Prettier is configured with 2-space indentation, single quotes, semicolons, trailing commas, LF endings, and 100-character print width. Prefer explicit domain names (`subscriptionId`, `workerId`, `countryCode`) over abbreviations. Keep generated `dist/` output out of manual edits; edit `src/` or `public/` sources instead.

## Testing Guidelines

Vitest covers TypeScript packages, including the current React/Vite apps. Current frontend apps use `tsc` for type checks and Vitest/Testing Library for unit/component tests. Legacy static shells use `scripts/check.mjs` for static checks. Add focused tests for repository behavior, API routes, validation, domain-event contracts, and screen behavior when changing backend or frontend flows. Run at least `pnpm typecheck` and `pnpm test` before handing off substantial changes.

## Commit & Pull Request Guidelines

The repository currently has minimal history, so no strict commit convention is established. Use concise, imperative messages such as `Add push provider readiness endpoint`. PRs should describe behavior changes, list verification commands, note migrations or environment variables, and include screenshots for UI changes.

## Security & Configuration Tips

Never commit secrets, APNs `.p8` keys, FCM private keys, or production credentials. Prefer environment variables such as `DATABASE_URL`, `PUSH_PROVIDER`, `APNS_*`, and `FCM_*`. Readiness endpoints may expose missing key names, but must not expose credential values.
