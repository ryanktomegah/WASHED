# Frontend Architecture Spec Self-Review

**Date:** 2026-04-30
**Reviewed commit:** `81ff01a Define frontend architecture`
**Spec:** `docs/specs/2026-04-30-washed-frontend-architecture.md`
**Reviewer stance:** critical self-review before implementation

## Findings

### High: Generated API client depends on an incomplete OpenAPI contract

The spec says `@washed/api-client` should be generated from `docs/api/core-api.openapi.json` and that contract drift should fail at build time. The repository currently exposes about 65 Fastify routes in `packages/core-api/src/app.ts`, while `pnpm openapi:check` validates only 19 operations in the checked-in OpenAPI file. That means the planned client would omit many routes the spec requires, including worker swap resolution, worker issues, worker onboarding, unavailability, service cells, notifications, refunds, reconciliation, push devices, and support context.

**Impact:** Phase 1 could produce a generated client that is technically valid but unusable for the actual frontend surface inventory.

**Required fix before serious UI build:** expand OpenAPI coverage to the full Fastify route surface, then generate `@washed/api-client` from that expanded contract. Treat missing OpenAPI paths as a build blocker for any screen that calls them.

### High: Bounded live tracking is product-approved but not contract-designed

The spec locks bounded tracking: worker taps "Heading to subscriber," subscriber sees the live map, tracking stops at check-in. Current backend routes cover visit check-in/out, but there is no explicit en-route transition, location sample ingestion, subscriber-readable tracking feed, retention policy, or operator intervention contract.

**Impact:** The frontend could build a map screen before the system has a safe way to start, stop, authorize, retain, and hide location data.

**Required fix:** add a bounded-tracking backend/API spec before implementing the map. Minimum endpoints/events: start en-route, ingest worker location sample, read active tracking state for subscriber, stop tracking, operator stop/override, retention/anonymization behavior, and notification side effects.

### High: Worker SOS is correctly required, but it lacks a dedicated backend and operator contract

The spec now requires Panic/SOS from every worker screen. Existing worker issue routes may cover ordinary reports, but SOS needs different semantics: immediate operator alert, active visit pause/flag, priority queue placement, audit event, and offline fallback behavior.

**Impact:** Treating SOS as a normal issue report would bury safety incidents in a general queue and fail the worker-safety promise from the v1 product design.

**Required fix:** define a dedicated safety incident contract or explicitly extend worker issues with `severity=sos`, queue priority, visit pause status, notification behavior, and operator resolution rules.

### High: Operator role model is more granular than current auth

The frontend spec defines Dispatcher, Support lead, Finance operator, Worker coordinator, Founder/admin, and Viewer. Current auth claims support only `operator | subscriber | worker`, and route guards only check those broad roles.

**Impact:** The console could hide restricted actions in the UI, but the backend would still treat all operators as equal unless a separate permission layer is added. That is dangerous for refunds, payout actions, safety closure, and worker termination.

**Required fix:** add backend permission claims or operator-role lookup before implementing restricted console actions. Frontend role gating must mirror backend authorization, not replace it.

### Medium: Screen inventory counts are inconsistent

The subscriber section says "approximately 35" but enumerates 36 surfaces. Worker says approximately 28 but enumerates 30. Operator says approximately 28 but enumerates 33. The counts are directionally useful but not stable enough for planning or test coverage.

**Impact:** Progress tracking, implementation slicing, and E2E coverage targets will drift.

**Required fix:** replace approximate counts with an authoritative route/surface table containing `id`, `surface`, `priority`, `backend dependency`, `v1/beta/deferred`, and `test journey`.

### Medium: FR/EN subscriber support needs legal-copy scope

The spec locks a French and English subscriber switcher, but existing legal drafts are French-only. Subscriber ToS, privacy policy, payment recovery, cancellation, refund, and account deletion copy will need English equivalents or a deliberate decision that legal surfaces remain French-only with English app UI.

**Impact:** English subscriber UX could ship with untranslated legal or privacy flows, which would weaken App Store review and user trust.

**Required fix:** add legal-copy language requirements to the frontend implementation plan. At minimum, mark legal strings as blocking content dependencies for the English subscriber switcher.

### Medium: Resource-level authorization is not called out strongly enough

The spec says role checks are enforced by backend, but worker routes are currently role-guarded broadly as `worker`. A worker app must not be able to fetch another worker's route, payouts, advance requests, or profile by changing an ID.

**Impact:** A polished worker app could still expose sensitive worker data if access checks stay role-only.

**Required fix:** add resource ownership checks to the backend gate list and block production worker UI until `/v1/workers/:workerId/*` and `/v1/visits/:visitId/*` are ownership-scoped.

### Low: Implementation phases need smaller first tickets

The five implementation phases are directionally correct, but Phase 1 is too large to execute as one PR. It mixes design tokens, UI library, i18n, generated API client, auth, app scaffolds, and test gates.

**Impact:** The first implementation PR could become too large to review safely.

**Required fix:** split Phase 1 into atomic tickets: workspace packages, tokens, UI primitives, Vite app shells, i18n catalog, OpenAPI expansion, generated client, auth adapter, and first subscriber route.

## Positive Findings

- The spec now reflects the actual strategic decision: React/TypeScript plus Capacitor, not Flutter.
- It correctly treats subscriber, worker, and operator as separate apps with shared foundations.
- It preserves the three audience palettes from the design files instead of flattening the brand into one color system.
- It catches the previously missed safety, legal, privacy, outage, payment recovery, and notification surfaces.
- It explicitly rejects all-day worker tracking and protects worker location outside the en-route window.

## Recommended Next Step

Before building UI screens, create a frontend implementation backlog document from this review. The first backend-adjacent task should be full OpenAPI coverage, because it unlocks the generated client and prevents the new frontend from hard-coding requests against undocumented routes.
