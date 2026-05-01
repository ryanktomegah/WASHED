# Frontend Architecture Spec Self-Review

**Date:** 2026-04-30
**Reviewed spec commit:** `73bb1a8 Update frontend architecture spec baseline`
**Reviewed implementation commits:** `1f33e18`, `78a0b6d`, `8ab4158`
**Spec:** `docs/specs/2026-04-30-washed-frontend-architecture.md`
**Reviewer stance:** critical self-review after wireframe-aligned shell implementation

## Findings

### High: The apps are still fixture-driven shells, not production service clients

The spec now correctly says the three target apps exist and are wireframe-aligned. That is true visually, but the subscriber, worker, and operator flows still run primarily from local state and fixture data. The user can inspect believable surfaces, but real households, worker routes, visits, payments, push devices, privacy requests, and operator decisions are not yet backed by live API calls.

**Impact:** A demo can look finished while production behavior is still absent. This is the largest gap between "looks like the wireframe" and "closed-beta product."

**Required fix:** replace fixtures route-by-route with `@washed/api-client` calls, starting with auth/session, subscriber subscription state, worker today's route, visit lifecycle mutations, and operator matching/live-ops queues. Each replacement needs a test that proves the app handles loading, success, validation failure, network failure, and stale/offline state.

### High: The generated API-client plan still depends on incomplete OpenAPI coverage

The spec requires `@washed/api-client` to be generated from `docs/api/core-api.openapi.json` once the OpenAPI file covers the full backend route surface. That caveat is now explicit, but it remains a blocker. If we generate from the current partial contract, many frontend surfaces will be forced back into ad hoc fetch code.

**Impact:** API drift could return immediately, especially across worker operations, notifications, payment reconciliation, refunds, privacy queues, and safety flows.

**Required fix:** expand OpenAPI to cover every Fastify route needed by the three apps, then generate the client and forbid direct app-level `fetch` for backend calls except inside the generated client package.

### High: Bounded live tracking has UI agreement but no complete backend contract

The subscriber and worker shells now express bounded live tracking: worker taps en-route, subscriber sees the map, tracking stops at check-in. The missing piece is still the system contract for location samples, authorization, retention, subscriber read access, and operator override.

**Impact:** Implementing maps before the contract risks leaking worker location, retaining too much sensitive data, or showing stale/inaccurate tracking during a real visit.

**Required fix:** define and implement endpoints/events for `startEnRoute`, location sample ingestion, subscriber active tracking read, stop-at-check-in, manual stop, operator stop, retention/anonymization, and notification side effects. No production map should ship before that contract exists.

### High: Worker SOS exists visually but must become a first-class safety system

The worker app now has an SOS surface, and the operator console has safety-related queues. That is still not enough. SOS cannot be treated as a normal worker issue because the semantics are immediate safety escalation, active-visit pause/flag, operator attention, and auditability.

**Impact:** A worker could believe she requested urgent help while the backend merely stores a low-priority issue. That would be worse than not showing the button.

**Required fix:** add a dedicated safety incident contract or extend worker issues with `severity=sos`, priority queueing, active visit flagging, offline fallback instructions, notification fanout, and explicit operator resolution states.

### High: Native capabilities are declared but not field-proven

The spec lists native push, secure storage, camera, geolocation, offline queueing, and Android foreground-service behavior. The app packages include Capacitor dependencies and iOS simulator launch support, but physical-device behavior is not proven. The worker app in particular needs cheap Android testing because battery savers and weak networks are central risks.

**Impact:** The worker app could pass browser and iOS simulator checks while failing in the exact low-end Android environment it depends on.

**Required fix:** run the worker app on a low-end Android profile or physical Tecno/itel-class device with throttled 2G/3G, screen-off GPS, camera capture, offline queue persistence, app kill/restart, and sync replay. Add a foreground-service implementation only after this test proves the need and desired notification behavior.

### High: Operator permissions are more detailed in the frontend than in auth

The spec defines Dispatcher, Support lead, Finance operator, Worker coordinator, Founder/admin, and Viewer. Current broad app roles are not enough for refunds, payouts, privacy handling, worker safety closure, blocklists, and destructive subscription actions.

**Impact:** UI hiding would be cosmetic if the backend still treats every operator as equally privileged.

**Required fix:** implement backend permission claims or operator role lookup, then mirror those permissions in the console. Every money-moving, privacy-affecting, or safety-closing action needs backend authorization plus audit reason capture.

### Medium: Surface inventory is now more honest but still needs testable IDs

The updated spec corrected the earlier inconsistent counts: subscriber has 35 tracked surfaces, worker has 14 tracked top-level surfaces plus six visit steps, and operator has 18 tracked surfaces. That is better, but the lists are still prose-first rather than a testable route matrix.

**Impact:** Implementation progress can drift because a "surface" may be a route, modal, state variant, bottom sheet, or legal content page.

**Required fix:** add a route/surface matrix with `id`, `app`, `route`, `type`, `priority`, `backend dependency`, `data state`, `legal/safety/payment flag`, and `test owner`.

### Medium: English subscriber UX needs matching legal and payment copy

The subscriber app supports FR/EN, but existing legal drafts are French-first. If English is available in the subscriber UI, legal, payment recovery, cancellation, refund, privacy, and account deletion copy cannot silently fall back to French without a deliberate product decision.

**Impact:** The English switcher could look complete while the highest-trust flows are untranslated or legally mismatched.

**Required fix:** either translate and review English legal/payment copy for subscriber v1 or explicitly keep legal/payment surfaces French-only while explaining that decision in-product.

### Medium: Prototype shell retirement is now a real cleanup item

The spec says `subscriber-web` and `ops-web` are old prototypes. They still exist beside the new app packages.

**Impact:** Engineers and future agents may accidentally fix or test the wrong frontend, causing visual and behavior drift.

**Required fix:** mark old packages deprecated in their README/package scripts, remove them from default workflows once parity is reached, and delete them after the API-backed apps are validated.

### Low: The implementation phase language is improved but the next backlog still needs slicing

The updated spec separates "implemented" from "remaining," but the remaining work is still too large for one implementation push.

**Impact:** The next PR could sprawl across API contracts, app state, native plugins, and UI polish.

**Required fix:** slice the next backlog by critical production dependency: OpenAPI expansion, generated client, auth/session, subscriber API state, worker route/offline persistence, operator queues, native device proofs, then accessibility/legal gates.

## Positive Findings

- The spec now matches the actual repo shape: three React/Vite apps plus shared packages, not a hypothetical future stack.
- The three audience themes from the design files are preserved instead of flattening subscriber, worker, and operator into one visual language.
- The recent app commits materially improve wireframe fidelity for subscriber, worker, and operator.
- Subscriber bottom navigation now follows the wireframe vocabulary: Home, Subscription, Messages, Profile.
- Worker SOS, offline queue, planning, earnings, and profile surfaces are visible and test-covered at shell level.
- Operator now has a denser desktop shell with dashboard, matching, live ops, route planning, profiles, disputes, payments, notifications, audit, reports, settings, privacy, and blocklist coverage.
- `pnpm ui:smoke` covers all three app surfaces, which is the right baseline before deeper production E2E journeys.

## Recommended Next Step

Do not add more visual surfaces next. The product now needs live data. The next implementation slice should be:

1. Expand OpenAPI for the routes already needed by the three shells.
2. Generate and enforce `@washed/api-client`.
3. Replace subscriber fixture state with API-backed subscription, visit, billing, privacy, and support data.
4. Repeat for worker route/offline visit lifecycle.
5. Repeat for operator matching/live-ops/payment/safety queues.

Visual fidelity is now good enough to move the bottleneck to real production behavior.
