# Subscriber Product Completion Backlog

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Bring the Washed subscriber mobile prototype from route coverage to a production-shaped subscriber experience: no dead-end CTAs, no blank/unknown states, and explicit handling for support, tickets, offline, maintenance, update, payment, visit disruption, account, and permission edge cases.

**Architecture:** Keep the existing React/HashRouter prototype structure and add missing surfaces in small vertical slices: copy deck first, generated i18n second, demo data/components/routes/tests third, iPhone Simulator verification last. Human-authored design/copy files remain the source of truth; generated `fr.json` must always be regenerated and checked.

**Tech Stack:** React, React Router, Vite/Vitest, `@washed/i18n`, Capacitor/iOS Simulator.

---

## Verified baseline

- Latest checkpoint: `8b7e33f [verified] Fix subscriber back navigation`.
- Subscriber base routes implemented before this sprint: X-01 through X-28.
- Confirmed missing subscriber design surfaces: X-29 through X-35.
- Source design references:
  - `design/02-flows/flows.html`: subscriber app is specified as X-01 → X-35.
  - `design/05-subscriber/subscriber.html:2862-3448`: X-29 → X-35 high-fidelity screens.
  - `design/05-subscriber/subscriber.html:4382-4544`: X-29.O FAQ-open and X-30.S submitted variants.
  - `design/09-copy-deck/copy.html`: currently lacks full subscriber support/system copy keys for X-29 → X-35.

## P0 — finish current subscriber design target

### Task 1: Add support/system copy keys

**Objective:** Extend the FR copy deck for X-29 → X-35 and regenerate i18n.

**Files:**
- Modify: `design/09-copy-deck/copy.html`
- Generated: `packages/i18n/src/fr.json`

**Required surfaces:**
- X-29 Centre d'aide and FAQ accordion
- X-30 Contacter le bureau
- X-30.S Message envoyé
- X-31 Mes tickets
- X-32 Détail ticket
- X-33 Hors-ligne/cache
- X-34 Maintenance prévue
- X-35 Mise à jour requise

**Verification:**
- `pnpm --filter @washed/i18n build`
- source/deck key count must match generated `fr.json`.

### Task 2: Implement support and system screens

**Objective:** Add React screens, demo data, styles, routes, and tests for X-29 → X-35.

**Files:**
- Create: `packages/subscriber-app/src/screens/support/supportDemoData.ts`
- Create: `packages/subscriber-app/src/screens/support/SupportScreens.tsx`
- Create: `packages/subscriber-app/src/screens/support/support.css`
- Create: `packages/subscriber-app/src/screens/support/support.test.tsx`
- Modify: `packages/subscriber-app/src/AppShell.tsx`
- Modify: `packages/subscriber-app/src/screens/profile/ProfileScreens.tsx`
- Modify: `packages/subscriber-app/src/screens/visits/VisitScreens.tsx`
- Modify tests for profile/visit route integration.

**Routes:**
- `/support` → X-29
- `/support/contact` → X-30
- `/support/contact/submitted` → X-30.S
- `/support/tickets` → X-31
- `/support/tickets/:ticketId` → X-32
- `/offline` → X-33
- `/maintenance` → X-34
- `/update-required` → X-35

**CTA wiring:**
- Profile “Aide & support” → `/support`
- X-29 call card → `tel:+22890000000`
- X-29 tickets CTA → `/support/tickets`
- X-29 write/contact CTA → `/support/contact`
- X-30 submit → `/support/contact/submitted`
- X-30.S tickets CTA → `/support/tickets`
- X-30.S home CTA → `/hub`
- X-31 open ticket → `/support/tickets/0421`
- X-31 open request → `/support/contact`
- X-32 back → `/support/tickets`
- Visit issue submitted “Voir mon ticket” → `/support/tickets/0421`

**Verification:**
- strict TDD: tests fail before screens/routes exist, then pass after implementation.
- `pnpm --filter @washed/subscriber-app test -- --run src/screens/support/support.test.tsx src/screens/profile/profile.test.tsx src/screens/visits/visit.test.tsx`
- `pnpm --filter @washed/subscriber-app typecheck`

## P1 — production hardening backlog after X-35

1. Global startup and routing states
   - X-36 app loading/session restore
   - X-37 generic recoverable error
   - X-38 route not found/stale deep link instead of wildcard-to-welcome
   - X-39 session expired/re-verify phone

2. Address validation lifecycle
   - X-40 address validation pending
   - X-41 address needs correction
   - X-42 outside service area/waitlist

3. Mobile Money authorization lifecycle
   - X-43 payment authorization pending
   - X-44 authorization timed out/declined
   - X-45 retry processing
   - X-46 success receipt
   - X-47 add-provider verification result

4. Visit disruption lifecycle
   - X-48 delayed visit/new ETA
   - X-49 worker cannot come/replacement search
   - X-50 bureau-cancelled visit
   - X-51 subscriber no-show/access blocked
   - X-52 reschedule submitted/awaiting bureau confirmation
   - X-53 replacement worker assigned

5. Support/ticket production variants
   - Empty ticket list
   - resolved ticket detail
   - reopen resolved ticket
   - reply sending/failed/retry
   - attachment upload pending/failed/too large
   - out-of-hours fallback
   - SLA breach/escalation
   - ticket not found/no access

6. Offline queue/cache variants
   - X-54 action queued offline
   - X-55 cache expired
   - X-56 sync complete/queued action sent
   - X-57 sync conflict/action needs bureau call

## P2 — product polish backlog

1. Account/legal lifecycle
   - sign-out confirmation
   - signed out/phone re-entry
   - data export requested/ready/download failed
   - delete submitted
   - delete blocked by active visit/payment/ticket
   - account closed/restore window

2. Notification permission lifecycle
   - OS permission denied
   - enable-notifications instructions
   - SMS-only fallback
   - email verification for monthly recap

3. Empty/end-of-list states for core data
   - no visits yet
   - no completed visits
   - no payments yet
   - no tickets yet
   - end of history
   - no worker assigned

4. Receipts, credits, refunds, adjustments
   - payment receipt detail
   - download receipt failed
   - credit applied after missed/cancelled visit
   - refund pending/completed/failed

5. Worker assignment lifecycle
   - worker assignment pending
   - worker reassigned by bureau
   - change-worker request submitted/already open
   - worker unavailable for next visit

## Final verification gate for every subscriber completion slice

Run all of the following before commit:

```bash
git diff --check
pnpm prettier --check <changed-files>
pnpm --filter @washed/i18n build
pnpm --filter @washed/subscriber-app typecheck
pnpm --filter @washed/subscriber-app test -- --run <focused-tests>
pnpm --filter @washed/subscriber-app test
pnpm ios:sim:subscriber
```

Then verify iPhone Simulator install/render with `simctl get_app_container`, screenshot capture, and visual inspection.
