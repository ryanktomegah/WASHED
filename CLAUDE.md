# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Washed is a scheduled in-home laundry-visit platform launching in Lomé, Togo. The repository is a pnpm/Turborepo TypeScript workspace with three product surfaces (subscriber, worker, operator) backed by a Fastify API. All money is XOF in integer minor units; every country-scoped record carries `countryCode`.

## Commands

Run from the repo root unless noted.

```bash
pnpm install                  # bootstrap workspaces
pnpm typecheck                # turbo run typecheck across packages
pnpm test                     # turbo run vitest across packages
pnpm build                    # turbo build (writes dist/**)
pnpm format                   # prettier --check (use format:write to fix)
pnpm lint                     # turbo lint (per-package tsc --noEmit)
pnpm migrations:check         # validate SQL migrations
pnpm openapi:check            # validate OpenAPI snapshot
pnpm ui:smoke                 # full Playwright suite (tests/ui/*.spec.ts)
```

Use package filters for focused work:

```bash
pnpm --filter @washed/subscriber-app test
pnpm --filter @washed/core-api test -- src/path/to/file.test.ts
pnpm --filter @washed/i18n run build      # recompile FR catalog from copy deck
```

Run a single Vitest file or test:

```bash
pnpm --filter @washed/subscriber-app exec vitest run path/to/file.test.tsx
pnpm --filter @washed/subscriber-app exec vitest run -t "test name pattern"
```

Run a single Playwright spec or project:

```bash
pnpm exec playwright test --project=subscriber-mobile
pnpm exec playwright test --project=subscriber-mobile -g "X-09 first-session tour"
pnpm exec playwright test tests/ui/subscriber-visit.spec.ts
```

Local dev servers:

```bash
./scripts/dev/up.sh                                                                         # Postgres, Redis, Redpanda, MinIO via docker compose
DATABASE_URL=postgres://washed:washed@localhost:5432/washed pnpm --filter @washed/core-api migrate
DATABASE_URL=postgres://washed:washed@localhost:5432/washed PORT=3000 node packages/core-api/dist/main.js

pnpm --filter @washed/subscriber-app dev      # http://127.0.0.1:5173 (Vite default)
pnpm --filter @washed/worker-app dev          # http://127.0.0.1:5174
pnpm --filter @washed/operator-console dev    # http://127.0.0.1:5175
```

Note: Playwright's `webServer` block boots the apps on **different ports** (6173/6174/6175) so UI tests do not collide with hand-run dev servers. Don't change those ports without updating `playwright.config.ts`.

iOS simulator helpers:

```bash
pnpm ios:sim:subscriber       # build + sync + open in iOS Simulator
pnpm ios:sim:worker
pnpm ios:sim:all
```

## Architecture overview

### Backend (`@washed/core-api` + `@washed/core-domain` + `@washed/shared`)

Fastify HTTP API. Two repository implementations swap at boot via `DATABASE_URL`: an in-memory store for fast tests + the Postgres-backed store for production. `@washed/core-domain` holds all pure logic (pricing, subscription state machine, visit lifecycle, scheduling, worker compensation); the API package wires HTTP, validation, repositories, migrations, notification delivery, and external provider integrations on top of it.

Domain events are first-class. Every state-change writes to **both** `audit_events` (append-only operator/legal trace) and `outbox_events` (unpublished integration stream) in the same transaction, and may also create `notification_messages` rows for push/SMS delivery. Events are registered in a contract catalog before they can be written; launch-critical events have strict payload validation. The full HTTP surface is enumerated in `README.md`.

Worker control flags worth knowing about:
- `NOTIFICATION_DELIVERY_WORKER_ENABLED` — drives push/SMS delivery
- `PAYMENT_RECONCILIATION_WORKER_ENABLED` — periodic payment reconciliation runs
- `OTP_PROVIDER` (`test`/`sms_http`) and `PAYMENT_PROVIDER` (`mock`/`mobile_money_http`) gate real I/O behind `*_REAL_*_ENABLED` flags so local dev never hits real providers by accident

### Frontend (`@washed/subscriber-app`, `@washed/worker-app`, `@washed/operator-console`)

React + Vite + Capacitor (iOS wrapper for the two mobile apps). Each app uses HashRouter (Capacitor-compatible) and pulls strings via `translate()` from `@washed/i18n`. Shared frontend foundations:

- `@washed/design-tokens` — TS + CSS tokens, with `[data-theme="subscriber"|"worker"|"operator"]` palette switching driven by `WashedThemeProvider` setting `data-theme` on `document.body`
- `@washed/ui` — shared components and the theme provider
- `@washed/i18n` — `translate(key, locale, params)`, `formatXof(amountMinor)` (returns `"2 500 XOF"` with NBSPs), `formatVisitDate`, plus a `MessageKey` union derived from the compiled `fr.json`
- `@washed/api-client`, `@washed/auth`, `@washed/frontend-config` — HTTP client, OTP/session helpers, and config plumbing

Subscriber screens are organised by slice under `packages/subscriber-app/src/screens/{onboarding,hub,history,plan,profile,support,visits,worker-profile}/`. Each slice has a `*.tsx` component file, a co-located `*Demo*.ts` data file (Sprint-2 will swap demo data for API calls), a `*.css`, and a `*.test.tsx`. The shared `useSafeBack` hook in `screens/navigation/` powers all "Retour" headers — it falls back to a default route when there's no in-app history (e.g. cold deep-link). When tests target sub-screens directly, use `Retour` to navigate back, not bottom-nav `Accueil`/`Visites`.

The four-tab bottom nav (`hub-nav` class shared across hub/history/plan/profile) is the single source of truth for `aria-current="page"` on the active tab. Sub-screens (X-11..X-18, X-25..X-28, X-30..X-32) use back headers, not bottom nav.

### Copy deck pipeline (load-bearing)

**`design/09-copy-deck/copy.html`** is the locked source of truth for every user-facing FR string. `packages/i18n/scripts/compile-fr.mjs` parses every `<tbody>` for `<span class="key">…</span> … <span class="fr">…</span>` pairs and emits sorted `packages/i18n/src/fr.json` (currently ~430 keys). **Always add a key to the deck before code uses it**, then run `pnpm --filter @washed/i18n run build` to recompile. The build step also runs as part of `pnpm build`, but tests against newly-added keys need the explicit recompile first.

`design/index.html` is a separate, human-only navigation page for the design system — no build script reads it.

### Tests

Vitest (`*.test.ts`/`*.test.tsx`) is colocated next to source. Playwright UI tests live in `tests/ui/` and run against the apps' production Vite builds on ports 6173/6174/6175 via the `webServer` block in `playwright.config.ts`. The subscriber spec runs at **two viewports**:
- `subscriber-mobile` — iPhone 15 Pro (393×852), the design target
- `subscriber-iphone-se` — iPhone SE 3rd gen (375×667), the layout floor (Playwright's named `iPhone SE` device is the 2016 1st-gen at 320×568, **so the viewport is overridden explicitly**)

When a test needs to bypass the X-09 first-session tour overlay, pre-set `washed.x09.completed=1` in `localStorage` via `page.addInitScript` (the parent describe in `subscriber-visit.spec.ts` does this). The X-09 spec lives in its own describe so it does **not** inherit that pre-set.

`formatXof` inserts non-breaking spaces (U+00A0) between digit groups and before `XOF`. Test assertions on amounts must use regex with `\s+` (which matches NBSPs) — string-literal matches like `"2 500 XOF"` will fail.

## Conventions

- TypeScript ES modules everywhere. Prettier: 2-space indent, single quotes, semicolons, trailing commas, LF, 100-char width.
- Money is integer minor units only — no floats anywhere in money paths.
- Every country-scoped record carries `countryCode`; future RLS work will enforce this at the database.
- Domain events emit through the shared audit primitives; events must be registered in the contract catalog before write paths use them.
- Subscriber app is FR-only with vouvoiement (no tutoiement). The English button on X-01 splash is intentionally disabled per design decision D-06; flipping it on requires the `en.json` compile path.
- 44pt minimum tap targets, WCAG AA, mobile-money only (no cards), GPS-gated visit check-in/out.
- Edit `src/` and `public/` only; never hand-edit `dist/` output.
- Don't commit secrets. Push provider readiness endpoints expose key **names** but never values.
