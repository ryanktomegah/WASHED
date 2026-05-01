# Washed Frontend Product Design and Architecture

**Date:** 2026-04-30
**Status:** Living implementation design; current frontend shell baseline is implemented and wireframe-aligned
**Scope:** Subscriber app, worker app, and operator console
**Decision owner:** Founder, with CTO autonomy delegated for technical execution

## 1. Purpose

This document defines the production frontend direction for Washed v1. It replaces the narrow "subscriber iPhone prototype" framing with a full architecture and product design for all three user-facing surfaces:

- Subscriber app: household subscription, billing, visits, support, and privacy.
- Worker app: daily route, check-in/out, proof capture, earnings, support, and safety.
- Operator console: matching, live operations, support, payments, worker operations, and governance.

The backend is already comparatively mature. The frontend must now catch up without lowering the quality bar. The target is not a quick mockup; it is a production-quality frontend architecture that can ship closed beta, then public launch, without being rewritten.

## 2. Source Inputs

The spec is grounded in five inputs:

- Product/system design: `docs/specs/2026-04-28-washed-v1-design.md`
- UX flows and operations models: `docs/ux/low-fidelity-flows.md`, `docs/ux/operator-console-ia.md`, `docs/ux/service-blueprints.md`
- Current implementation: `packages/subscriber-app`, `packages/worker-app`, `packages/operator-console`, `packages/ui`, `packages/i18n`, `packages/api-client`, `packages/auth`, `packages/design-tokens`, `packages/frontend-config`, `packages/core-api`, and `docs/api/core-api.openapi.json`
- Prototype shells retained only for reference/backward compatibility during transition: `packages/subscriber-web` and `packages/ops-web`
- Claude design files: `/Users/tomegah/Downloads/WASHED/Washed - Subscriber App.html`, `/Users/tomegah/Downloads/WASHED/Washed - Worker & Ops.html`, and `/Users/tomegah/Downloads/WASHED/Washed Wireframes v2.html`

## 2.1 Current Implementation Baseline

The architecture is no longer theoretical. The repository now contains the three target frontend apps and shared packages:

- `packages/subscriber-app`: React 19 + Vite + Capacitor subscriber shell, Savannah theme, FR/EN switcher, 35-surface inventory, bounded-tracking state, subscription/payment/privacy/support routes, and iOS/Android Capacitor scripts.
- `packages/worker-app`: React 19 + Vite + Capacitor worker shell, Forest theme, route/visit lifecycle, offline queue ledger, photo retry, planning, earnings, profile, inbox, and SOS surfaces.
- `packages/operator-console`: React 19 + Vite desktop console, Admin theme, dashboard, matching, live ops, route planning, profiles, disputes, payments, notifications, audit, reports, and settings surfaces.
- `packages/ui`: shared React component primitives backed by `@washed/design-tokens`.
- `packages/i18n`, `packages/auth`, `packages/api-client`, and `packages/frontend-config`: shared formatting, session, typed client, and config foundations.

The latest visual baseline commits are:

- `1f33e18 Align worker app with wireframes`
- `78a0b6d Align operator console with wireframes`
- `8ab4158 Align subscriber app with wireframes`

This document therefore describes both the implemented shell baseline and the remaining production hardening needed before paid beta.

## 3. Locked Product Decisions

### 3.1 Scope

One frontend spec covers all three surfaces. They are independent deployables, but they share brand foundations, API contracts, authentication patterns, i18n, telemetry, accessibility rules, and release discipline.

### 3.2 Distribution

- Subscriber app: iOS and Android through Capacitor, with PWA fallback for development and emergency access.
- Worker app: Android-first through Capacitor, APK side-load acceptable for closed beta, Play Store later, with PWA fallback only for recovery.
- Operator console: desktop web application only.

Capacitor is selected because Washed needs real mobile app distribution and native device access while preserving a shared TypeScript/React codebase across mobile and web. Flutter remains rejected for v1 because it would split the team into Dart mobile code plus TypeScript operator code, duplicating state, UI, i18n, and API contracts.

### 3.3 Launch Quality By Surface

- Subscriber app: production-quality before real subscriber launch.
- Worker app: production-reliable before closed beta; Play Store listing may follow after side-load beta.
- Operator console: internal-tool visual polish is acceptable for closed beta, but functional reliability, auditability, and coverage are not optional.

### 3.4 Live Tracking

Washed will use bounded live tracking. The subscriber sees a moving map only after the worker taps "Heading to subscriber" and before check-in. Tracking auto-stops at check-in. The app must never expose all-day worker movement, previous household locations, or off-shift location.

### 3.5 Languages

- Subscriber app: French and English switcher in v1.
- Worker app: French in v1.
- Operator console: French in v1; English developer/admin strings are acceptable behind internal flags.
- Ewe/Mina are explicitly deferred because production-quality localization would require field research, voice/audio patterns, and human review.

## 4. Architecture

### 4.1 Package Shape

Use Approach 1: three applications plus shared frontend core packages. This structure is now present in the repository.

```text
packages/
  core-api/                 Existing backend
  core-domain/              Existing domain logic
  shared/                   Existing shared primitives

  design-tokens/            Implemented audience themes
  ui/                       Implemented shared React component library
  api-client/               Implemented typed client facade; expand OpenAPI generation
  auth/                     Implemented OTP/session helpers
  i18n/                     Implemented FR/EN message catalog and formatters
  frontend-config/          Implemented shared TS/Vite/test config

  subscriber-app/           Implemented React + Vite + Capacitor app
  worker-app/               Implemented React + Vite + Capacitor app
  operator-console/         Implemented React + Vite desktop web app
```

The current `subscriber-web` and `ops-web` packages remain useful as older prototypes and backend smoke clients. They are not the final app architecture. Keep them alive only until the new apps reach API-backed parity, then remove them to avoid duplicated frontend behavior.

### 4.2 Core Stack

Implemented now:

- React 19
- TypeScript 5
- Vite per app
- Capacitor 8 for subscriber and worker mobile shells
- Shared workspace packages for UI, tokens, i18n, auth, API client, and frontend config
- Vitest, Testing Library, and Playwright smoke coverage

Production hardening still needed:

- TanStack Router or an equivalent typed routing layer before route count grows further.
- TanStack Query or an equivalent server-state layer before replacing fixtures with API calls.
- React Hook Form + Zod or an equivalent typed form layer for payment, cancellation, worker activation, and operator destructive actions.
- Radix primitives or equivalent accessible overlays for modals, sheets, menus, tabs, and selects.
- Leaflet + OpenStreetMap for bounded live maps unless a field-tested local map provider proves better.
- Dexie or equivalent typed IndexedDB persistence for the worker offline queue before real field use.
- axe-core and manual VoiceOver/TalkBack passes before paid beta.

### 4.3 API Client

`@washed/api-client` is the single client layer for all three apps. It must be generated from `docs/api/core-api.openapi.json` once the OpenAPI file covers the full backend route surface. The frontend must not maintain three hand-written client layers. API contract drift should fail at build time.

Current status: the package exists, but OpenAPI coverage still has to be expanded before every production screen can rely on generated endpoint types.

Every mutation must include idempotency support where the backend expects it. Transient failures use exponential backoff. User-facing retry copy must distinguish between offline, provider failure, validation error, and operator-required recovery.

### 4.4 Native Shells

Mobile apps must render as real apps, not browser pages inside fake phone frames.

Requirements:

- Respect iOS and Android safe areas.
- Use native status bar styling through Capacitor.
- Use native push registration where available.
- Use secure native storage for refresh/session material.
- Use native camera/photo capture for worker proof.
- Use native geolocation with explicit permission states.
- Detect offline and degraded network states.
- Keep web fallback functional but do not optimize the mobile UX around browser limitations.

## 5. Design System

### 5.1 Audience Themes

The design files establish three audience palettes. Keep them. The shared component library is neutral; each app injects its own theme.

```text
@washed/design-tokens
  subscriber.ts    Savannah: terracotta, ochre, espresso, warm cream
  worker.ts        Forest: green, amber, dark green, pale green
  operator.ts      Admin: purple, neutral surfaces, high-density controls
  shared.ts        spacing, type scale, radii, shadows, motion, z-index
```

Subscriber tokens from design files:

- Primary terracotta: `#C4622D`
- Primary light: `#F5DDD0`
- Primary background: `#FFF3EE`
- Ochre: `#B8870A`
- Espresso: `#1C1208`
- Warm cream: `#FAF6F0`
- Warm white: `#FFFDF8`
- Error red: `#C03020`
- Success olive: `#4A7C3F`

Worker tokens from design files:

- Forest green: `#1a5c34`
- Green mid: `#2a7a48`
- Green light: `#c8ecd5`
- Green background: `#eaf6ee`
- Amber: `#d4900e`
- Dark green: `#0e1a12`
- Worker surface: `#f5f8f6`
- Error red: `#be3030`
- Operator purple: `#3b1f7a`

### 5.2 Typography

Use Space Grotesk as the visible brand typeface where available, with `system-ui, sans-serif` fallback. Keep letter spacing at 0. Do not use viewport-scaled type. Dashboard and console headings must be compact; reserve hero-scale type for onboarding and confirmation moments.

### 5.3 Components

V1 shared primitives:

- Button, icon button, ghost button
- Text field, phone input, OTP input, select, segmented control, checkbox, radio
- Card, list item, badge, pill, avatar
- Modal, alert dialog, bottom sheet, popover, menu
- Toast, inline alert, skeleton, empty state
- Bottom navigation, tabs, sidebar, breadcrumb
- Data table, filter bar, command palette
- Map, route marker, timeline, photo proof tile

Rules:

- Use real icons for tool actions, preferably lucide icons.
- Cards are for repeated items and framed tools, not page-section decoration.
- Destructive actions require confirmation, consequence preview, and audit reason where applicable.
- Every component supports loading, disabled, error, and empty states.

### 5.4 Accessibility

Minimum bar:

- WCAG 2.1 AA
- 44pt minimum tap targets on mobile
- Keyboard navigation for console
- VoiceOver and TalkBack manual pass per release
- axe-core in CI for web and component surfaces
- Dynamic type up to 200 percent without overlapping text
- No essential information conveyed by color alone

## 6. Subscriber App

### 6.1 Product Role

The subscriber app sells trust, then manages a recurring household service. It must make the value obvious: fixed monthly price, regular washerwoman, in-home wash, Washed handles support and billing.

### 6.2 Navigation

Onboarding is linear:

```text
Splash -> Phone -> OTP -> Address -> Tier -> Schedule -> Payment -> Confirm -> Home
```

Post-onboarding uses bottom navigation:

```text
Home | Subscription | Messages | Profile
```

### 6.3 Screen Inventory

V1 subscriber inventory is 35 tracked screens or distinct surfaces in `packages/subscriber-app/src/appData.ts`.

Core onboarding:

1. Splash
2. Phone
3. OTP
4. Address
5. Tier
6. Schedule
7. Payment
8. Confirm

Visit and communication:

9. Home
10. Visit detail
11. En-route map
12. Skip modal
13. Reschedule modal
14. Rating
15. Visit history
16. Dispute
17. Messages

Subscription and billing:

18. Subscription
19. Tier change
20. Worker swap
21. Billing history
22. Payment recovery
23. Cancel flow
24. Receipts
25. Support credits
26. Notification priming

Profile, legal, and recovery:

27. Profile
28. Terms
29. Privacy policy
30. Export request
31. Erasure request
32. Account deletion
33. Change number
34. Maintenance
35. Help / FAQ

If implementation pressure forces scoping, defer only non-critical informational polish, never payment recovery, privacy rights, cancellation, support, or visit issue flows.

### 6.4 Required States

Home must cover:

- First-time pending assignment
- Active subscription with next visit
- Worker assigned but no visit scheduled
- Visit en-route
- Visit in-progress
- Completed visit awaiting rating
- Overdue payment
- Paused/cancelled subscription
- Offline with stale data

En-route must cover:

- Worker heading to subscriber
- Location unavailable
- Worker arrived
- Worker delayed
- Tracking stopped at check-in

### 6.5 Communication Rules

Subscriber-worker direct free text is out of scope for v1. Messages are operator-mediated. Masked voice calling is post-beta by default and may remain a disabled placeholder route until research proves it is necessary.

## 7. Worker App

### 7.1 Product Role

The worker app is a work tool, not a consumer app. It must be fast, resilient on low-end Android devices, usable under weak connectivity, and visibly protective of worker safety.

### 7.2 Navigation

Worker tabs:

```text
Aujourd'hui | Planning | Gains | Profil
```

### 7.3 Screen Inventory

Current worker shell inventory is 14 tracked top-level surfaces in `packages/worker-app/src/appData.ts`, plus six visit lifecycle steps. The v1 production target adds legal, recovery, and policy sub-surfaces before field use.

Tracked top-level surfaces:

1. Aujourd'hui
2. Activation
3. Planning
4. Gains
5. Profil
6. Inbox
7. SOS
8. Offline queue
9. Advance request
10. Day summary
11. No-show
12. Photo retry
13. Privacy
14. Agreement

Visit lifecycle steps:

1. Heading
2. Check-in
3. Before photo
4. In-visit
5. After photo
6. Check-out

Production completion must add or harden:

- Phone + OTP first launch, if not fully handled by shared auth.
- Subscriber details bottom sheet with access notes and watchlist flags.
- Persistent offline queue indicator on every route/visit screen.
- Worker issue thread and operator response history.
- Forgot-phone recovery.
- App update required and maintenance/outage screens.
- Contractor agreement, privacy policy, export, and erasure copy with operator-review behavior.

### 7.4 Offline Model

The worker app is offline-first for the visit lifecycle.

Requirements:

- Cache today's route after login.
- Allow check-in, photos, issue reports, checkout, and day-end review to queue locally.
- Store queue entries in Dexie with typed schemas and replay order.
- Display "actions pending sync" persistently.
- Compress photos before upload and retry without losing evidence.
- Never mark a visit as fully settled locally until backend confirms sync.

### 7.5 Safety Model

Panic/SOS is a beta-critical surface. It must:

- Be reachable from every worker screen.
- Confirm intent quickly without burying the action.
- Notify operator immediately when online.
- Queue the incident when offline and show a clear fallback instruction.
- Pause or flag the active visit.
- Never penalize worker completion metrics without senior review.

### 7.6 Bounded Tracking

The worker starts location sharing only by tapping "Heading to subscriber." Android may require a foreground service notification during this window. Tracking stops automatically at check-in, manual cancellation, or operator intervention.

## 8. Operator Console

### 8.1 Product Role

The console is the operating system for closed beta. It is allowed to be visually denser than the apps, but it must prevent database access from becoming an operational requirement.

### 8.2 Layout

Use a desktop-first layout:

- Left sidebar navigation
- Main queue/list region
- Right detail pane where context matters
- Command palette for search and power actions
- Tables for dense records, timelines for evidence, maps only where spatial judgment matters

### 8.3 Surface Inventory

Current operator shell inventory is 18 tracked surfaces in `packages/operator-console/src/appData.ts`.

Tracked surfaces:

1. Dashboard
2. Login
3. Matching
4. Live Ops
5. Daily route planning
6. Worker profiles
7. Subscriber profiles
8. Visit detail
9. Disputes
10. Payments
11. Payouts
12. Refunds
13. Notifications
14. Audit
15. Reports
16. Settings
17. Privacy requests
18. Blocklist

Production completion must add or harden:

- Candidate detail and assignment decision history.
- Service cell management.
- Worker onboarding pipeline.
- Worker issue / safety queue with SOS priority behavior.
- Support context and operator-mediated message timeline.
- Theft/damage senior review path.
- Payment attempts, manual retry, reconciliation runs, and provider evidence.
- Failed payout retry and advance-request queue.
- Push device detail and notification failure queue.
- Provider readiness, feature flags, forced-update state, and maintenance notices.

Some items may share route shells, but the user journeys must be separately covered by tests.

### 8.4 Permissions

Initial roles:

- Dispatcher: matching, live ops, service cells
- Support lead: support, disputes, notifications
- Finance operator: payments, refunds, reconciliation, payouts
- Worker coordinator: workers, onboarding, route planning
- Founder/admin: all areas
- Viewer: read-only

Every destructive or money-moving action requires an audit reason, trace ID, and actor identity.

### 8.5 Live Operations

The operator console is the only v1 surface that should hold a persistent WebSocket connection. Mobile apps receive push notifications and refetch state. The console can afford live subscriptions because it runs on laptops and office networks.

## 9. Cross-Cutting Requirements

### 9.1 Authentication

All users authenticate with phone + OTP. Use short-lived access tokens and refresh sessions. Native mobile stores refresh material in secure native storage. Web stores use the safest available browser storage pattern with CSRF and XSS defenses reviewed before launch.

### 9.2 Privacy and Legal

Each surface must expose the privacy rights relevant to that user:

- Subscriber: export, erasure, account deletion, terms, privacy policy.
- Worker: contractor agreement, privacy policy, export, erasure.
- Operator: privacy request handling queues for subscriber and worker data.

Location, photos, messages, payment records, and audit events follow the retention model in the v1 product design. The frontend must not promise deletion where legal/audit retention still applies; copy must explain retained operational records plainly.

### 9.3 Notifications

Notification system surfaces must include:

- Soft prompt before native permission request
- Push token registration status
- Inbox/notification history in subscriber and worker apps
- Operator notification queue and failure inspection
- Quiet-hour handling where configured by backend

### 9.4 Error Taxonomy

Use four buckets:

- User-correctable: bad OTP, invalid form, declined payment, GPS too far.
- System-recoverable: provider timeout, network drop, sync retry, stale route.
- Operator-required: fallback code, unsafe access, serious dispute, payment exception.
- Catastrophic: outage, security incident, both payment providers down.

Every user-facing error must include what happened, what to do next, and how Washed will help if the user cannot fix it.

### 9.5 Payments

Subscriber cash payment to workers remains forbidden. Money screens must reinforce platform-controlled payment:

```text
subscriber -> Washed platform -> worker
```

Payment method setup, receipt views, recovery flows, refunds, support credits, reconciliation evidence, payout batches, payout failures, and worker advances all need UI coverage.

### 9.6 Security

Minimum bar:

- No secrets in frontend bundles.
- No provider credentials in operator UI.
- CSP for web deploys.
- Sentry or equivalent frontend error telemetry.
- Secret scanning in GitHub.
- Role checks enforced by backend, mirrored only for UI affordances.
- Privacy-sensitive fields hidden unless the operator role needs them.

## 10. Implementation Phases

### Phase 1: Frontend Foundation (implemented shell, hardening remaining)

- Implemented: shared packages for design tokens, UI, i18n, api client, auth, and config.
- Implemented: Vite/React app scaffolds for subscriber, worker, and operator.
- Implemented: Vitest and Playwright smoke gates.
- Remaining: expand OpenAPI coverage and generate the full typed client.
- Remaining: add typed routing, server-state, form-validation, accessibility, and telemetry hardening.

### Phase 2: Subscriber Parity Plus Native Shell (wireframe baseline implemented)

- Implemented: Savannah visual language, wireframe-aligned Home, subscription, messages/support, profile, billing, legal/privacy, recovery, and bounded-tracking shell states.
- Implemented: Capacitor iOS/Android scripts in `packages/subscriber-app`.
- Remaining: replace fixture state with API-backed data, implement real OTP/payment/push/device flows, and complete App Store legal/privacy copy.
- Remaining: verify Android emulator and physical low-end Android behavior.

### Phase 3: Worker App (wireframe baseline implemented)

- Implemented: Forest visual language, route, visit lifecycle, photo retry, offline queue ledger, planning, earnings, profile, inbox, and SOS shell states.
- Remaining: replace fixture state with API-backed route/visit/photo data.
- Remaining: implement real camera capture, Dexie persistence, background sync, GPS fallback code, bounded tracking, and Android foreground-service support.
- Remaining: test on low-end Android profile and network throttling.

### Phase 4: Operator Console (wireframe baseline implemented)

- Implemented: Admin visual language, dashboard, matching, live ops, route planning, profiles, disputes, payments, notifications, audit, reports, and settings shell states.
- Remaining: wire all queues to backend APIs, add WebSocket live ops, implement role-aware permission gating, and add destructive-action audit reason modals.
- Remaining: add support context, worker onboarding, safety queue depth, payment evidence, reconciliation evidence, and provider-readiness drill-downs.

### Phase 5: Production Readiness

- App Store / Play Store packaging.
- TestFlight and internal Android tracks.
- Playwright journey suite expanded from smoke coverage to top production journeys.
- Accessibility pass.
- Privacy/legal copy pass.
- Closed-beta operational rehearsal.

## 11. Acceptance Criteria

The frontend architecture is ready to replace the prototype shells when:

- Subscriber can complete signup through payment/confirmation and manage visits/subscription without dev tools.
- Worker can complete a full route offline and sync later.
- Operator can assign subscribers, monitor visits, resolve disputes, issue credits/refunds, inspect notifications, and manage worker cases without database access.
- FR/EN subscriber strings are key-backed.
- French worker/operator strings are key-backed.
- App Store legal/privacy surfaces are present.
- Bounded tracking is implemented with worker-visible consent.
- Panic/SOS is reachable from every worker screen.
- Top 30 journeys have Playwright or equivalent E2E coverage.
- Accessibility, security, and privacy gates are explicitly reviewed before paid beta.

## 11.1 Current Verification

The current shell baseline has been verified with:

- `pnpm --filter @washed/subscriber-app typecheck`
- `pnpm --filter @washed/subscriber-app test`
- `pnpm --filter @washed/worker-app typecheck`
- `pnpm --filter @washed/worker-app test`
- `pnpm --filter @washed/operator-console typecheck`
- `pnpm --filter @washed/operator-console test`
- `pnpm ui:smoke`
- `pnpm ios:sim:all` for separate subscriber and worker iOS simulator launches

This proves route coverage, visual shell stability, and simulator launch viability. It does not yet prove production API integration, payment provider behavior, push delivery, camera/GPS capture on physical devices, accessibility compliance, or App Store readiness.

## 12. Explicit Deferrals

Deferred from v1:

- Ewe/Mina localization
- Direct subscriber-worker free-text chat
- Masked in-app voice calling, unless research changes the beta scope
- Worker self-service onboarding beyond first-login activation
- Referral/share flows
- Tips
- Operator team management UI beyond initial roles
- Bulk operator actions
- System health dashboard separate from provider readiness
- All-day live worker tracking

These are deferred to protect v1 quality, not because they are unimportant.
