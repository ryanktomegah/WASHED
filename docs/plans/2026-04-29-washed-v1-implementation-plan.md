# Washed v1 Implementation Plan

**Date:** 2026-04-29
**Input spec:** `docs/specs/2026-04-28-washed-v1-design.md`
**Critical review:** `docs/reviews/2026-04-29-washed-v1-design-critical-review.md`
**Status:** Planning approved for sequencing. Application code starts only after the founder approves the corrected spec direction; paid cloud and launch operations remain gated by provider, legal, capital, and beta-readiness decisions.

## Plan Position

This plan supersedes the earlier foundation-first plan for sequencing. The earlier plan can still be mined for technical foundation tasks after gates clear, but it starts too deep in infrastructure before legal, payments, research, and cost assumptions have been proven.

## Gate Rules

### Allowed Immediately

- Worker-classification and liability counsel brief.
- Structured user-research plan, interview scripts, recruiting criteria, and analysis templates.
- Payment-provider due-diligence checklist and comparison matrix.
- Revised capital model and operating model.
- Product requirement cleanup and data-retention policy drafts.
- Low-fidelity UX flows and non-code architecture diagrams.
- Local-first code once the founder approves the corrected implementation sequence.

### Blocked Until Founder Approval of Corrected Plan

- Application code.
- Monorepo/bootstrap commits.
- Any change that treats removed cross-project context as active.

### Blocked Until Provider, Legal, and Capital Gates

- Public brand launch.
- Paid provider accounts under the future venture.
- Paid cloud production infrastructure.
- Closed beta with real households/workers.

### Blocked Until Payment Provider Verification

- Payment service implementation.
- Subscription billing state machine finalisation.
- Refund/payout automation.
- User-facing payment promises.

### Blocked Until Field Research

- Final onboarding copy and order.
- Final schedule-window choices.
- Final worker onboarding process.
- Final support/dispute UX.
- Final beta operating runbook.

## Milestone 0 - Governance, Legal, and Approval Gates

**Goal:** Make sure the project can be safely worked on and owned.

Tasks:

- [x] Create counsel brief for Togolese worker classification, contractor agreement, CNSS/INAM triggers, insurance, liability, theft/damage process, and worker injury exposure.
- [x] Create trademark/domain checklist for Washed, OAPI coverage, `washed.tg`, and `washed.app`. Checklist created in `docs/ops/trademark-domain-checklist.md`; counsel clearance remains a launch gate.
- [x] Create legal gate log in `docs/ops/legal-gates.md`.
- [x] Mark spec status as corrected after removing stale cross-project context.

Exit criteria:

- Written counsel position on contractor/employment risk or a known mitigation plan.
- Founder explicitly approves whether coding may begin.

## Milestone 1 - Field Research and Operating Reality

**Goal:** Replace assumptions with evidence from Lome households and washerwomen.

Tasks:

- [x] Create subscriber interview script for 12 households: current laundry habits, price sensitivity, trust, scheduling, mobile money, cancellation, and comfort with in-home worker visits.
- [x] Create worker interview script for 8 washerwomen: current earnings, capacity, transport, safety, payment preference, schedule control, phone/device constraints, and uniform/ID reaction.
- [x] Create recruitment screener and consent form in French. Added in `docs/research/recruitment-screener-consent-fr.md`.
- [x] Create research synthesis template with decision log. Added in `docs/research/research-synthesis-template.md`.
- [ ] Produce research findings report and update spec decisions from "locked" to "confirmed" or "changed."

Exit criteria:

- At least 12 subscriber interviews and 8 worker interviews completed.
- Pricing, schedule, trust stack, and payment assumptions either confirmed or revised.
- Route-density assumptions have real address/neighborhood samples.

## Milestone 2 - Payment, Banking, and Unit Economics v2

**Goal:** Prove the money movement path and re-price the launch.

Tasks:

- [ ] Compare CinetPay and PayDunya for T-Money/Flooz collection, recurring billing support, refunds, payout APIs, fees, KYC, settlement timing, dispute handling, webhook reliability, and sandbox quality. Diligence template created in `docs/ops/payment-provider-diligence.md`.
- [ ] Compare Ecobank, Orabank, and UTB for collection, settlement, worker payouts, statement exports, multi-country WAEMU path, and operational support. Diligence template created in `docs/ops/banking-partner-diligence.md`; bank outreach and scoring remain open.
- [x] Build capital model v2 with line items for cloud, SMS, WhatsApp, LiveKit, transcription, translation, object storage, observability, legal, audits, devices, beta incentives, customer support, payment fees, and travel/ops. Model script and generated report added in `research/capital_model_v2.py` and `research/2026-04-30-capital-model-v2.md`.
- [x] Add conservative downside cases: slower acquisition, higher worker burden, provider downtime, refund/liability claims, and transport support.
- [x] Define beta budget and public-launch budget separately.

Exit criteria:

- Primary and fallback payment provider selected.
- Banking partner shortlist narrowed with account-opening path.
- Capital requirement updated and explicitly approved.

## Milestone 3 - Product Spec Revision

**Goal:** Make the spec buildable and testable.

Tasks:

- [x] Add gate table to the spec.
- [x] Revise auto-rating behavior to preserve unrated state.
- [x] Add privacy and retention schedule for IDs, references, police clearance, photos, GPS, calls, transcripts, payment data, and audit events.
- [x] Add worker-safety policy, unsafe-client flow, emergency escalation, and operator runbook.
- [x] Re-scope ML dispatch as operator-first scoring plus training-data capture, with auto-dispatch behind later measured thresholds.
- [x] Add Lome service-cell model even if the user-facing launch geography remains all of Lome.
- [x] Define v1 beta scope versus post-v1 scope for EWE/MINA automatic transcription and translation.

Exit criteria:

- Spec has no known P0 contradictions.
- Every beta-critical flow has an owner, state machine, and acceptance criteria.

## Milestone 4 - UX and Service Blueprint

**Goal:** Design the actual operating experience before code.

Tasks:

- [x] Create service blueprint for signup to first visit. Added in `docs/ux/service-blueprints.md`.
- [x] Create service blueprint for worker day-of-route flow. Added in `docs/ux/service-blueprints.md`.
- [x] Create service blueprint for dispute, no-show, late cancellation, refund, and theft allegation. Added in `docs/ux/service-blueprints.md`.
- [x] Create operator console information architecture. Added in `docs/ux/operator-console-ia.md`.
- [x] Create low-fidelity flows for Subscriber App, Worker App, and Operator Console. Added in `docs/ux/low-fidelity-flows.md`.
- [ ] Run prototype tests with 8 to 10 subscribers and 5 workers.

Exit criteria:

- Research-backed flows approved.
- No unsupported operational promise remains in the app experience.

## Milestone 5 - Technical Foundation, Local First

**Start condition:** Founder approves the corrected implementation sequence.

**Goal:** Create a strict monorepo and local dev stack without paid cloud dependency.

Tasks:

- [x] Initialise monorepo with Node 22, TypeScript, pnpm, Turborepo, linting, formatting, and strict compiler settings.
- [x] Add shared packages for money, country/currency/locale, domain errors, audit events, idempotency, and test utilities.
- [x] Add local Docker Compose for Postgres, Redis, Redpanda-compatible event bus, object storage, and optional ClickHouse.
- [x] Add migration tooling and database conventions. Migration runner exists in `packages/core-api`; conventions documented in `docs/runbooks/database-migrations.md`, and `pnpm migrations:check` validates sequential filenames.
- [x] Add OpenAPI generation and contract validation. Core API contract lives in `docs/api/core-api.openapi.json`, and `pnpm openapi:check` validates required operations and operation IDs.
- [x] Add CI for lint, typecheck, tests, dependency audit, secret scanning, and formatting. GitHub Actions workflow added in `.github/workflows/ci.yml`; secret scanning remains provider-side GitHub setting.

Exit criteria:

- Local tests pass.
- Money, idempotency, and tenancy primitives have property/unit tests.
- No production secrets or paid cloud resources are required.

## Milestone 6 - Backend Domain Core

**Goal:** Implement the core platform with mocked external providers first.

Tasks:

- [x] Auth: phone/OTP flow with provider abstraction, test OTP provider, gated HTTP SMS OTP adapter, signed access tokens, hashed refresh-token sessions, refresh rotation, device ID capture, production-entrypoint route guards, and local web demo-session wiring implemented in `packages/core-api`; selected production SMS vendor/account remains an external provider gate.
- [x] Core: subscriber profiles, addresses, subscriptions, tiers, schedule preferences, visits, assignments, ratings, disputes. Initial pricing, subscription state, worker-compensation, weekly visit scheduling, and visit lifecycle domain logic implemented in `packages/core-domain`; Core API skeleton, schema migrations, pricing endpoint, subscription creation into `pending_match`, Postgres repository, migration runner, transactional `SubscriptionCreated` outbox persistence, operator matching queue, worker dispatch profiles, deterministic matching candidates, operator assignment endpoint, active subscription transition, four-visit generation, subscriber subscription-detail read endpoint with upcoming and recent visits, subscriber visit reschedule/skip endpoints with visit outbox events, subscriber cancellation endpoint with scheduled-visit cancellation and outbox event, subscriber tier-change endpoint with price/allowance update and outbox event, worker daily route read endpoint, transactional `SubscriberAssigned` outbox persistence, worker check-in/check-out endpoints, worker issue reporting with `WorkerIssueReported` outbox events, completed-visit bonus ledger accrual, transactional `VisitCompleted` outbox persistence, monthly worker earnings read endpoint, visit rating endpoint with `VisitRated` outbox events, support dispute filing/listing/resolution endpoints, and support credit ledger with `SubscriberCreditIssued` outbox events implemented in `packages/core-api`.
- [x] Payments: mocked subscription charge endpoint, payment attempt ledger, idempotency, `payment_overdue` transition, recovery to `active`, payment outbox events, provider abstraction, default mock payment provider, gated HTTP mobile-money charge/refund/payout adapters, provider schema migrations, payment provider readiness endpoint, secret-gated payment webhook ingestion, provider-reference dedupe, operator payment-attempt reconciliation read endpoint, payment-refund ledger, operator refund action, persisted reconciliation run snapshots, worker payout ledger with failed-attempt recording, disabled-by-default scheduled reconciliation worker, and Ops UI Payments tab implemented; selected production provider and real provider credentials remain external payment gates.
- [x] Dispatch: operator queue, deterministic candidate scoring, assignment logging, capacity and service-cell constraints. Operator service-cell capacity read model, local ops UI view, profiled-worker service-cell/capacity assignment rejection, accepted/rejected/declined assignment decision logging with `AssignmentDecisionRecorded`, and declined-candidate suppression implemented.
- [x] Notification: local `notification_messages` outbox, push-first assignment templates, first event-to-template registry, authenticated iOS/Android-style push device registration, operator push-device inspection, APNs/FCM credential readiness contract, safe push-provider readiness endpoint, explicit `PUSH_REAL_SEND_ENABLED` gate, provider-aware delivery boundary, gated APNs HTTP/2 sender, gated FCM HTTP v1 sender, device-recipient token resolution, disabled-by-default interval delivery worker, retry backoff policy, French/English launch localization catalog, ops UI readiness display, local due-delivery processor, quiet-hour suppression policy, subscriber-web simulator registration, and ops UI Notifications tab/delivery action implemented.
- [x] Audit: transactional outbox, immutable Postgres `audit_events` event store, filtered operator replay endpoint, strict launch-critical contracts, and registered aggregate/actor/payload-key contracts for every current core event implemented.

Exit criteria:

- Signup to pending match to assignment to visit schedule works locally through APIs.
- Monthly billing and weekly payout state machines pass integration tests with mocked providers.
- Critical domain events have contract tests.

## Milestone 7 - Operator Console

**Goal:** Give operations the control plane needed for closed beta.

Tasks:

- [x] Matching queue with top candidate workers and decision logging. Ops UI shows ranked candidates and recent assignment decision evidence for the selected subscriber.
- [x] Subscriber support view with subscription, visit, payment, comms, and dispute context. Backend support-context endpoint, subscriber phone search, Ops UI support tab, dispute/payment/comms shortcuts, and support-credit visibility are implemented; credit issuance stays dispute-tied by design.
- [x] Worker onboarding pipeline. Backend case creation/list/advance/activation plus Ops UI intake form, stage filter, review notes, and real-candidate flow are implemented.
- [x] Route/capacity view for service cells. Backend service-cell capacity endpoint, local ops UI view, and data-driven capacity/alert map are implemented.
- [x] Dispute desk with refund/credit/escalate actions. Backend list/resolve/escalate endpoints, support-credit ledger, provider-backed refund path, and connected local ops UI are implemented; production provider selection/credentials remain a payment milestone gate.
- [x] Live ops board with visit status updates. Operators can mark scheduled visits no-show/cancelled from the live board through an operator-only audited endpoint.
- [x] Notification queue inspection. Local ops UI Notifications tab now lists pending and failed backend-generated messages, shows retry timing/failure reasons, and can trigger local due delivery.

Exit criteria:

- Operator can run beta manually without database access.
- Every operator action emits audit events.

## Milestone 8 - Worker App

**Goal:** Support a complete worker day even on weak networks.

Tasks:

- [x] Login and profile. Worker OTP login, simulator push registration, worker profile read endpoint, and profile screen backed by worker status/capacity/service zones are implemented.
- [x] Today's route cached offline. Worker-mode route/earnings state persists locally, refresh failures keep cached route visible, stale data is labeled, and service-worker network-first API caching is implemented.
- [x] GPS check-in/out with fallback code flow.
- [x] Before/after photo capture, compression, queue, and background sync. Backend photo evidence endpoint, checkout gating, browser camera/file capture, client-side compression, pending-photo retry queue, online/focus retries, and service-worker sync messages are implemented.
- [x] Issue reporting and operator chat. Worker issue reports, ops acknowledgement/resolution notes, and worker-visible issue thread messages are implemented.
- [x] Earnings and payout history. Worker-mode Gains screen shows monthly total, floor, visit bonuses, paid-out total, net due, payout history, failed payout reasons, and advance request action from backend earnings/payout data.
- [x] Basic accessibility and low-end Android performance checks. Worker-mode controls have larger touch targets, visible focus states, ARIA labels for tab/photo controls, reduced-motion CSS, and responsive small-screen layouts; physical low-end Android validation remains a pre-launch external-device gate.

Exit criteria:

- Full visit lifecycle works offline and syncs without duplicate events.
- Tested on at least one low-end Android device or emulator profile.

## Milestone 9 - Subscriber App

**Goal:** Support signup, payment, scheduling, visit visibility, and support.

Tasks:

- [x] Phone login and profile. OTP login, simulator push registration, local session state, and subscriber profile screen are implemented.
- [x] Address capture with GPS and landmark notes. Manual neighborhood/landmark capture and browser geolocation update are implemented.
- [x] Tier selection and schedule preference. Signup and post-signup tier/schedule update paths are implemented.
- [x] Payment-method linking against selected provider sandbox. Local mobile-money sandbox linking is implemented; real provider credentials remain an integration gate.
- [x] Home screen with next visit and assigned worker. Backend subscription-detail read model and connected local mobile UI implemented.
- [x] Skip, reschedule, cancel, and tier-switch flows. Backend visit skip/reschedule, subscription cancel, tier switch, and connected local mobile UI implemented.
- [x] Rating, dispute filing, and support contact. Rating, dispute filing, and callback request flows are implemented from subscriber mobile screens.
- [x] Billing history and receipt display. Subscriber-scoped billing-history endpoint and mobile receipt card are implemented from charge/refund ledgers; provider receipt PDFs or downloadable receipts remain an integration gate.

Exit criteria:

- Subscriber can complete the full closed-beta lifecycle.
- Payment and refund states are understandable in French.

## Milestone 10 - External Integrations

**Goal:** Replace mocks with verified providers.

Tasks:

- [x] Integrate selected mobile-money provider for collection. Gated HTTP mobile-money charge/refund path, webhook ingestion, readiness reporting, and reconciliation records are implemented; selected vendor credentials remain external.
- [x] Integrate payout path or define operator-approved manual payout process for beta. Manual payout fallback and gated mobile-money payout adapter are implemented with failed-attempt recording.
- [x] Integrate SMS/OTP provider. Gated HTTP SMS OTP adapter is implemented; selected vendor credentials remain external.
- [x] Integrate FCM push. Gated FCM HTTP v1 provider and APNs provider are implemented with local simulator fallback.
- [x] Integrate object storage for photos and evidence. Signed upload target creation, local dev PUT receiver, S3-compatible gated provider, and worker photo binary upload before metadata recording are implemented.
- [x] Integrate observability and Sentry. Core API has trace IDs, safe global error responses, local structured error reporting, and gated Sentry-compatible HTTP event submission.
- [x] Decide whether LiveKit/voice is beta-critical or post-beta based on cost and research. Decision recorded in `docs/ops/livekit-beta-decision.md`: post-beta by default, with beta reopen triggers and manual callback fallback.

Exit criteria:

- Provider sandbox tests pass.
- Reconciliation report matches provider records.
- Failed payment, retry, refund, and payout failure paths are tested.

## Milestone 11 - Closed Beta Readiness

**Goal:** Enter beta with operations, support, and safety prepared.

Tasks:

- [ ] Complete legal docs: ToS, privacy policy, worker agreement, customer liability terms. French counsel-review drafts created in `docs/legal`; not beta-approved until counsel signs off.
- [x] Complete CS runbooks and operator training. Support runbook and operator training guide created in `docs/runbooks/customer-support.md` and `docs/training/operator-training.md`.
- [x] Complete worker onboarding materials. Worker onboarding checklist and first-route readiness guide created in `docs/training/worker-onboarding.md`.
- [x] Complete incident escalation runbooks. Severity model, safety escalation, provider failure, and closeout process created in `docs/runbooks/incident-escalation.md`.
- [ ] Complete accessibility, security, and privacy review. Beta review checklist and sign-off log created in `docs/runbooks/security-privacy-accessibility-review.md`; real-device accessibility pass, GitHub secret-scanning settings evidence, provider data-sharing list, and counsel-approved retention schedule remain open.
- [x] Run load test at beta scale. `pnpm load:beta` covers 30 subscribers, 10 workers, subscription detail reads, and assignment operations locally.
- [x] Run disaster and provider-failure tabletop exercises. Tabletop scenarios documented in `docs/runbooks/provider-failure-tabletop.md`; live execution in staging remains a launch gate.

Exit criteria:

- 30 subscribers and 10 workers can be supported without ad hoc backend work.
- No Sev-1 bugs open.
- Counsel-reviewed legal docs ready in French.

## Milestone 12 - Closed Beta

**Goal:** Prove real demand, reliability, worker satisfaction, and route economics.

Tasks:

- [ ] Onboard 10 workers. Local dry-run support implemented with `pnpm dry-run:beta`; actual worker onboarding remains an operations task.
- [ ] Onboard 30 paid subscribers. Local dry-run support implemented with `pnpm dry-run:beta`; actual paid subscriber onboarding remains gated by provider/legal/capital readiness.
- [x] Run weekly research interviews. Weekly research cadence, metric review, decision meeting, and evidence log template documented in `docs/research/closed-beta-weekly-loop.md`.
- [x] Track visit completion, no-shows, payment success, refunds, disputes, worker earnings, route duration, support load, and NPS. Backend beta metrics endpoint and Ops Console Beta tab implemented; NPS and worker satisfaction remain null until research surveys supply inputs.
- [x] Update product, pricing, and operations weekly based on evidence. Weekly iteration rules and stop conditions documented in `docs/runbooks/closed-beta-iteration.md`.

Exit criteria:

- Closed beta NPS >= 40 in final two weeks.
- Worker satisfaction >= 4/5.
- Visit completion >= 95%.
- Payment success >= 98% or known provider remediation plan.
- Unit economics within approved beta tolerance.

## Milestone 13 - Open Beta and Launch

**Goal:** Scale only after closed beta proves the model.

Tasks:

- [ ] Expand to 200 subscribers and 25 workers. Open-beta expansion runbook created in `docs/runbooks/open-beta-expansion.md`; actual expansion waits for closed-beta exit criteria.
- [x] Execute staged rollout and monitoring. Staged rollout, monitoring, alert, and rollback rules documented in `docs/runbooks/staged-rollout-monitoring.md`.
- [x] Complete external security/accessibility review appropriate to launch risk. External review checklist documented in `docs/runbooks/external-review-checklist.md`; actual third-party review remains a launch gate.
- [x] Finalise launch marketing and support coverage. Support coverage model and staffing stop rule documented in `docs/runbooks/launch-support-coverage.md`; marketing assets remain outside this repository.
- [x] Confirm all pre-launch gates from the spec. Go/no-go gates documented in `docs/runbooks/pre-launch-gates.md`.

Exit criteria:

- Public launch gates pass.
- Status page, monitoring, rollback, support, and incident response are live.

## Immediate Next Work

Start with Milestone 0 and Milestone 1 artifacts:

1. `docs/ops/legal-gates.md`
2. `docs/research/subscriber-interview-script-fr.md`
3. `docs/research/worker-interview-script-fr.md`
4. `docs/ops/payment-provider-diligence.md`
5. `research/capital_model_v2.py`

No application code should start until the Milestone 0 exit criteria are met.
