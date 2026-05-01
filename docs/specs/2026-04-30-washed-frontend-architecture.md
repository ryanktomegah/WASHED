# Washed Frontend Product Design and Architecture

**Date:** 2026-04-30
**Status:** Implementation design, supersedes the subscriber-only mobile draft for frontend architecture
**Scope:** Subscriber app, worker app, and operator console
**Decision owner:** Founder, with CTO autonomy delegated for technical execution

## 1. Purpose

This document defines the production frontend direction for Washed v1. It replaces the narrow "subscriber iPhone prototype" framing with a full architecture and product design for all three user-facing surfaces:

- Subscriber app: household subscription, billing, visits, support, and privacy.
- Worker app: daily route, check-in/out, proof capture, earnings, support, and safety.
- Operator console: matching, live operations, support, payments, worker operations, and governance.

The backend is already comparatively mature. The frontend must now catch up without lowering the quality bar. The target is not a quick mockup; it is a production-quality frontend architecture that can ship closed beta, then public launch, without being rewritten.

## 2. Source Inputs

The spec is grounded in four inputs:

- Product/system design: `docs/specs/2026-04-28-washed-v1-design.md`
- UX flows and operations models: `docs/ux/low-fidelity-flows.md`, `docs/ux/operator-console-ia.md`, `docs/ux/service-blueprints.md`
- Current implementation: `packages/subscriber-web`, `packages/ops-web`, `packages/core-api`, and `docs/api/core-api.openapi.json`
- Claude design files: `/Users/tomegah/Downloads/WASHED/Washed - Subscriber App.html`, `/Users/tomegah/Downloads/WASHED/Washed - Worker & Ops.html`, and `/Users/tomegah/Downloads/WASHED/Washed Wireframes v2.html`

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

Use Approach 1: three applications plus shared frontend core packages.

```text
packages/
  core-api/                 Existing backend
  core-domain/              Existing domain logic
  shared/                   Existing shared primitives

  design-tokens/            New frontend tokens by audience
  ui/                       New shared React component library
  icons/                    New icon wrapper and app icon set
  api-client/               New typed client generated from OpenAPI
  auth/                     New OTP/session helpers
  i18n/                     New FR/EN message catalog and formatters
  frontend-config/          New shared TS/Vite/test config

  subscriber-app/           New React + Vite + Capacitor app
  worker-app/               New React + Vite + Capacitor app
  operator-console/         New React + Vite desktop web app
```

The current `subscriber-web` and `ops-web` packages remain useful as working prototypes and backend smoke clients. They are not the final app architecture. The implementation should replace them gradually, keeping the old shells alive until the new apps reach route parity.

### 4.2 Core Stack

- React 19
- TypeScript 5
- Vite per app
- Capacitor 8 for mobile shells
- TanStack Router for typed routing
- TanStack Query for server state
- Zustand only for local UI/session state that is not server-owned
- React Hook Form + Zod for forms
- React Intl for i18n
- Tailwind for styling tokens and layout utilities
- Radix primitives for accessible overlays, dialogs, sheets, menus, tabs, and selects
- Leaflet + OpenStreetMap for maps, avoiding Google Maps cost and account coupling in v1
- Dexie for worker offline queue
- Vitest, Testing Library, Playwright, and axe-core for verification

### 4.3 API Client

`@washed/api-client` is generated from `docs/api/core-api.openapi.json`. The frontend must not maintain three hand-written client layers. API contract drift should fail at build time.

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

V1 subscriber inventory is approximately 35 screens or distinct surfaces.

Core onboarding and active-use surfaces:

1. Splash
2. Phone number
3. OTP verification
4. Address and GPS/landmark
5. Tier selection
6. Schedule preference
7. Payment method / mobile-money link
8. Subscription confirmation
9. Home dashboard
10. En-route bounded live map
11. Visit completed and rating
12. Dispute / report problem
13. Voice call placeholder, disabled for beta unless research changes scope
14. Subscription management
15. Messages / operator-mediated support thread
16. Profile

Backend-driven additions:

17. Skip visit modal
18. Reschedule visit modal
19. Worker swap request, reason -> confirm -> submitted
20. Tier change confirmation
21. Cancel subscription, reason -> refund preview -> final confirm
22. Visit history list
23. Visit history detail with photos/rating/dispute entry
24. Billing history
25. Billing receipt/refund detail
26. Notification priming before native prompt

Cross-cutting production surfaces:

27. Terms of service
28. Privacy policy
29. Privacy export request
30. Privacy erasure request
31. Account deletion
32. Payment recovery / overdue payment
33. Forgot phone / change number recovery
34. App update required
35. Maintenance / outage / Help and FAQ
36. Inbox / notification center

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

V1 worker inventory is approximately 28 surfaces.

Core flow:

1. Splash
2. Phone number
3. OTP verification
4. First-login agreement and profile completion
5. Today's route
6. Subscriber details bottom sheet
7. Heading to subscriber
8. Check-in GPS/fallback code
9. Before photo capture and quality check
10. Visit in progress with timer
11. Issue/safety report bottom sheet
12. After photo capture and quality check
13. Check-out GPS/fallback code
14. Day-end summary
15. Planning weekly view
16. Mark unavailability
17. Earnings dashboard
18. Advance request modal
19. Payout history / failed payout reason
20. Profile
21. Push/device status

Safety and recovery:

22. Panic / SOS full-screen action, reachable from any screen
23. Worker issue thread / operator response
24. Inbox / notification center
25. Persistent offline queue indicator
26. Forgot phone recovery
27. App update required
28. Maintenance / outage / Help and FAQ
29. Contractor agreement
30. Privacy policy / export / erasure

The final count may compress legal surfaces into profile sub-routes, but each must exist and be testable.

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

V1 operator inventory is approximately 28 surfaces.

Primary areas:

1. Login
2. Dashboard / home
3. Matching queue
4. Candidate detail and assignment decision
5. Live Ops board
6. Visit detail
7. Daily route planning
8. Service cells
9. Worker list
10. Worker profile detail
11. Worker onboarding pipeline
12. Worker issue / safety queue
13. Worker privacy request handling
14. Blocklist management
15. Subscriber list / customer support
16. Subscriber profile detail
17. Support context
18. Dispute desk
19. Theft/damage senior review path
20. Payments overview
21. Payment attempts
22. Refund issuance modal
23. Manual payment retry
24. Reconciliation runs
25. Worker payout batch initiation
26. Failed payout retry
27. Advance request queue
28. Push devices and notifications
29. Notification failure queue
30. Audit log search/filter
31. Reports / KPI dashboard
32. Settings / provider readiness / feature flags
33. Maintenance/update notice surface

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

### Phase 1: Frontend Foundation

- Create shared packages: design tokens, UI, i18n, api client, auth, config.
- Add Vite/React base app scaffolds.
- Generate OpenAPI client and wire typed API calls.
- Establish test and lint gates.

### Phase 2: Subscriber Parity Plus Native Shell

- Build subscriber onboarding, home, subscription, messages, profile.
- Port the Savannah visual language from design files.
- Repoint existing iOS Capacitor wrapper to the new subscriber app.
- Verify iOS simulator and Android emulator.

### Phase 3: Worker App

- Build route, check-in/out, photo capture, offline queue, earnings, profile.
- Add bounded tracking and Android foreground-service support.
- Add Panic/SOS and safety reporting.
- Test on low-end Android profile and network throttling.

### Phase 4: Operator Console

- Build matching, live ops, support/disputes, workers, payments, notifications, audit, reports.
- Add role-aware navigation and destructive action confirmations.
- Use dense layouts optimized for repeated daily operation.

### Phase 5: Production Readiness

- App Store / Play Store packaging
- TestFlight and internal Android tracks
- Playwright journey suite
- Accessibility pass
- Privacy/legal copy pass
- Closed-beta operational rehearsal

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
