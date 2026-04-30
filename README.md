# Washed

Washed is a local-services platform for scheduled in-home laundry visits, starting in Lome, Togo.

## Current Implementation

The repo is now a pnpm/Turborepo TypeScript workspace.

Packages:

- `@washed/shared` - cross-cutting primitives for money, currency, country/locale context, domain errors, audit events, and idempotency keys.
- `@washed/core-domain` - product domain logic for launch pricing, subscription state transitions, and worker compensation.
- `@washed/core-api` - Fastify API for launch pricing, OTP auth, subscriptions, assignment, visits, payments, worker routes/earnings, and support disputes.
- `@washed/subscriber-web` - local mobile-web subscriber app shell adapted from the Claude design files, with a built-in `/api` proxy to Core API.
- `@washed/ops-web` - local worker app and operator console shell adapted from the Claude Worker/Ops wireframes, with a built-in `/api` proxy to Core API.

Local services:

- `scripts/dev/compose.yml` - Postgres, Redis, Redpanda, and MinIO for local development.

## Commands

```bash
pnpm install
pnpm format
pnpm typecheck
pnpm test
pnpm build
```

Local dependencies:

```bash
./scripts/dev/up.sh
./scripts/dev/seed.sh
./scripts/dev/down.sh
```

Run the Core API after building:

```bash
pnpm build
node packages/core-api/dist/main.js
```

Use Postgres instead of the in-memory repository:

```bash
DATABASE_URL=postgres://washed:washed@localhost:5432/washed pnpm --filter @washed/core-api migrate
DATABASE_URL=postgres://washed:washed@localhost:5432/washed node packages/core-api/dist/main.js
```

Run the subscriber web app against the local Core API:

```bash
pnpm --filter @washed/subscriber-web dev
```

Run the worker/operator web app against the local Core API:

```bash
PORT=5174 pnpm --filter @washed/ops-web dev
```

Current API surface:

- `GET /health`
- `GET /ready`
- `POST /v1/auth/otp/start`
- `POST /v1/auth/otp/verify`
- `POST /v1/auth/refresh`
- `POST /v1/devices/push-token`
- `GET /v1/pricing/lome`
- `POST /v1/payments/webhooks`
- `GET /v1/operator/matching-queue?countryCode=TG&limit=50`
- `GET /v1/operator/disputes?status=open&limit=50`
- `POST /v1/operator/disputes/:disputeId/resolve`
- `GET /v1/operator/worker-advance-requests?status=open&limit=50`
- `POST /v1/operator/worker-advance-requests/:requestId/resolve`
- `POST /v1/operator/worker-onboarding-cases`
- `GET /v1/operator/worker-onboarding-cases?stage=application_received&limit=50`
- `POST /v1/operator/worker-onboarding-cases/:caseId/advance`
- `POST /v1/operator/workers/:workerId/monthly-payouts`
- `GET /v1/operator/worker-swap-requests?status=open&limit=50`
- `POST /v1/operator/worker-swap-requests/:requestId/resolve`
- `GET /v1/operator/service-cells?date=YYYY-MM-DD&limit=50`
- `GET /v1/operator/notifications?countryCode=TG&status=pending&limit=50`
- `POST /v1/operator/notifications/deliver-due`
- `GET /v1/operator/payment-attempts?countryCode=TG&provider=mobile_money_http&status=failed&limit=50`
- `POST /v1/operator/payment-attempts/:paymentAttemptId/refunds`
- `POST /v1/operator/payment-reconciliation-runs`
- `GET /v1/operator/payment-provider-readiness`
- `GET /v1/operator/push-devices?countryCode=TG&role=subscriber&status=active&limit=50`
- `GET /v1/operator/push-provider-readiness`
- `GET /v1/operator/audit-events?countryCode=TG&eventType=AssignmentDecisionRecorded&limit=50`
- `PUT /v1/operator/workers/:workerId/profile`
- `GET /v1/operator/subscriptions/:subscriptionId/matching-candidates?limit=10`
- `POST /v1/subscriptions`
- `GET /v1/subscriptions/:subscriptionId`
- `POST /v1/subscriptions/:subscriptionId/assignment`
- `POST /v1/subscriptions/:subscriptionId/cancel`
- `POST /v1/subscriptions/:subscriptionId/mock-charge`
- `POST /v1/subscriptions/:subscriptionId/tier`
- `POST /v1/subscriptions/:subscriptionId/worker-swap-requests`
- `POST /v1/subscriptions/:subscriptionId/visits/:visitId/reschedule`
- `POST /v1/subscriptions/:subscriptionId/visits/:visitId/skip`
- `POST /v1/subscriptions/:subscriptionId/visits/:visitId/disputes`
- `POST /v1/subscriptions/:subscriptionId/visits/:visitId/rating`
- `POST /v1/visits/:visitId/check-in`
- `POST /v1/visits/:visitId/check-out`
- `POST /v1/visits/:visitId/photos`
- `POST /v1/visits/:visitId/worker-issues`
- `POST /v1/workers/:workerId/advance-requests`
- `GET /v1/workers/:workerId/advance-requests?month=YYYY-MM`
- `GET /v1/workers/:workerId/payouts?month=YYYY-MM`
- `GET /v1/workers/:workerId/route?date=YYYY-MM-DD`
- `GET /v1/workers/:workerId/earnings?month=YYYY-MM`
- `POST /v1/workers/:workerId/unavailability`
- `GET /v1/workers/:workerId/unavailability?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

Notification worker controls:

```bash
NOTIFICATION_DELIVERY_WORKER_ENABLED=true
NOTIFICATION_DELIVERY_WORKER_INTERVAL_MS=30000
NOTIFICATION_DELIVERY_WORKER_LIMIT=25
NOTIFICATION_DELIVERY_COUNTRY_CODE=TG
```

Payment reconciliation worker controls:

```bash
PAYMENT_RECONCILIATION_WORKER_ENABLED=true
PAYMENT_RECONCILIATION_WORKER_INTERVAL_MS=3600000
PAYMENT_RECONCILIATION_COUNTRY_CODE=TG
PAYMENT_RECONCILIATION_PROVIDER=mobile_money_http
PAYMENT_RECONCILIATION_OPERATOR_USER_ID=11111111-1111-4111-8111-111111111111
```

OTP provider controls:

```bash
OTP_PROVIDER=test
OTP_PROVIDER=sms_http
OTP_REAL_SEND_ENABLED=true
SMS_OTP_ENDPOINT=https://sms-provider.example/send
SMS_OTP_API_KEY=...
SMS_OTP_SENDER_ID=WASHED
```

Payment provider controls:

```bash
PAYMENT_PROVIDER=mock
PAYMENT_PROVIDER=mobile_money_http
PAYMENT_REAL_CHARGE_ENABLED=true
PAYMENT_REAL_REFUND_ENABLED=true
PAYMENT_REAL_PAYOUT_ENABLED=true
PAYMENT_WEBHOOK_SECRET=...
MOBILE_MONEY_ENDPOINT=https://payment-provider.example/charges
MOBILE_MONEY_PAYOUT_ENDPOINT=https://payment-provider.example/payouts
MOBILE_MONEY_REFUND_ENDPOINT=https://payment-provider.example/refunds
MOBILE_MONEY_API_KEY=...
MOBILE_MONEY_MERCHANT_ID=washed-lome
```

## Notes

- Money is represented only in integer minor units. No floats in money paths.
- Every country-scoped record should carry `countryCode`; future database work will enforce this with RLS.
- Product state changes should emit typed domain events through the shared audit primitives.
- `DATABASE_URL` switches Core API from the in-memory repository to the Postgres repository.
- Postgres writes each domain event to both `audit_events` and `outbox_events` in the same transaction. `audit_events` is append-only for operator/legal traceability; `outbox_events` remains the unpublished integration stream.
- Operators can replay audit events through `GET /v1/operator/audit-events` with country, event type, aggregate type, aggregate ID, and limit filters.
- Core events are registered in the contract catalog before audit/outbox writes. Launch-critical events get strict payload validation, and every current support, worker, visit, subscription, payment, and dispatch event must at least match its registered aggregate, actor role, and required payload keys.
- Domain events with local communication templates create `notification_messages` rows in the same transaction as audit/outbox writes. Assignment notifications are push-first. App clients and local simulators can register iOS/Android-style device tokens through `POST /v1/devices/push-token`, and operators can inspect active tokens through `GET /v1/operator/push-devices`. `GET /v1/operator/push-provider-readiness` reports selected push provider readiness without exposing credential values. Supported push provider settings are `PUSH_PROVIDER=local_push_simulator|apns|fcm` and `PUSH_ENVIRONMENT=simulator|development|production`; real APNs/FCM sending also requires `PUSH_REAL_SEND_ENABLED=true`. APNs readiness requires `APNS_BUNDLE_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`, and `APNS_TEAM_ID`; FCM readiness requires `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, and `FCM_PRIVATE_KEY`. Operators can inspect pending/failed notifications through `GET /v1/operator/notifications`, trigger local due delivery through `POST /v1/operator/notifications/deliver-due`, or enable the interval worker with `NOTIFICATION_DELIVERY_WORKER_ENABLED=true`. Delivery resolves active push device tokens from the recipient user or, for subscription notifications, from the subscriber phone-to-auth-user link. The local delivery path records attempts, marks push sends with provider `local_push_simulator`, schedules retryable push failures with backoff through `availableAt`, localizes launch push copy in French/English, and suppresses subscriber/worker outbound messages during 20:00-08:00 Togo quiet hours. APNs HTTP/2 and FCM HTTP v1 sending are implemented behind the real-send gate.
- Auth defaults to a local test OTP provider that returns `testCode` in the OTP start response. A gated `sms_http` OTP provider can send real codes through a configured HTTP SMS gateway only when `OTP_REAL_SEND_ENABLED=true`. OTP codes and refresh tokens are stored hashed; refresh rotates sessions; access tokens are short-lived signed tokens.
- The production entrypoint enables route guards: operator routes require operator access tokens, worker route/visit-action routes require worker tokens, and subscriber subscription action routes require subscriber tokens. The local subscriber and ops web shells automatically create demo OTP sessions for protected local flows.
- The operator matching queue lists pending-match subscriptions oldest first with subscriber phone, neighborhood, schedule preference, tier, queued time, and the 4-hour assignment SLA deadline.
- Worker dispatch profiles store service neighborhoods and capacity. Matching candidates rank active workers for a pending subscription by service-neighborhood match and available capacity, with deterministic tie-breaking. Assignment rejects profiled workers who are inactive, outside the subscriber service cell, unavailable, or at capacity, accepted/rejected/declined operator picks persist in `assignment_decisions`, each decision emits `AssignmentDecisionRecorded`, and declined workers are removed from that subscription's active candidate list.
- Operator service-cell reads summarize active workers, total capacity, active subscriptions, remaining capacity, and daily visit status by neighborhood.
- Worker onboarding cases track application, CNI, references, casier judiciaire, training, uniform issue, and activation before workers become active matching candidates.
- Assigning a worker activates the subscription, generates the first four weekly visits, and writes a `SubscriberAssigned` outbox event in the same transaction.
- Subscribers can request up to 2 worker swaps per quarter. Operators can approve a replacement worker, which updates the subscription assignment and future scheduled visits.
- Subscriber detail reads return subscription status, address, schedule preference, assigned worker, and the next scheduled/in-progress visits for the home screen.
- Subscriber detail reads also return recent completed/disputed/cancelled/no-show visits so the app can show activity history and rating/reporting actions.
- Subscription cancellation moves the subscription to `cancelled`, cancels remaining scheduled visits, and writes a `SubscriptionCancelled` outbox event.
- Tier changes update the subscription tier, monthly price, and visits-per-cycle allowance, then write a `SubscriptionTierChanged` outbox event.
- Subscribers can reschedule scheduled visits or skip them to `cancelled`; both actions write visit outbox events.
- Payment charges and provider webhooks are idempotent by `idempotencyKey`; webhooks are also deduplicated by provider reference. Failed charges move active subscriptions to `payment_overdue`, and successful charges recover overdue subscriptions to `active`. Operators can inspect payment attempts by country, provider, and status for reconciliation, record one refund per successful payment attempt in the refund ledger, create reconciliation run snapshots that flag overdue failed payments and refund-over-payment mismatches, and use the Ops UI Payments tab to refresh attempts or trigger reconciliation. A disabled-by-default interval worker can create reconciliation runs automatically. Payment provider readiness is exposed without secret values so ops can see whether charge/refund/payout paths are configured and enabled. Local development defaults to the mock/manual providers. The gated `mobile_money_http` provider calls configured HTTP charge, refund, and worker payout gateways only when `PAYMENT_REAL_CHARGE_ENABLED=true`, `PAYMENT_REAL_REFUND_ENABLED=true`, or `PAYMENT_REAL_PAYOUT_ENABLED=true`; inbound webhooks can require `x-payment-webhook-secret` via `PAYMENT_WEBHOOK_SECRET`.
- Check-in/check-out are GPS gated within 100m of the subscriber pin, with the visit fallback code accepted when GPS is wrong.
- Visit checkout requires both before and after photo evidence in `visit_photos`, then writes a `VisitCompleted` outbox event and accrues the 600 XOF completed-visit bonus in `worker_earning_ledger`.
- Workers can report visit issues from the route app; reports persist in `worker_issue_reports`, write `WorkerIssueReported`, and are visible in the operator Live Ops queue for acknowledge/resolve handling.
- Worker daily route reads return scheduled visits with subscriber phone and address context for the requested date.
- Workers can mark full-date unavailability; matching candidates exclude unavailable workers when `anchorDate` is provided, and assignment rejects unavailable workers for that anchor date.
- Worker monthly earnings read from completed-visit ledger rows and return the 40,000 XOF floor, visit bonus total, and total due for the requested month.
- Workers can request one mid-month advance per month, capped at 20,000 XOF (50% of the 40,000 XOF floor). Requests persist in `worker_advance_requests`, write `WorkerAdvanceRequested`, and operators can approve or decline with audited outbox events.
- Approved advances and monthly settlements persist in `worker_payouts`, write `WorkerPayoutRecorded`, and appear in worker earnings as payout history, paid-out total, and remaining net due. Failed monthly payout provider attempts are stored with `status=failed` and `failureReason` without reducing the worker's net due.
- Subscribers can file support disputes against visits; filing marks the visit `disputed` and writes `VisitDisputed`. Operators can list disputes and resolve or escalate them with audited outbox events.
- Operator subscriber-favor dispute resolution can issue a real XOF support credit in `support_credits`, writes `SubscriberCreditIssued`, and appears in subscriber detail reads.
- Subscribers can rate completed or disputed visits from 1-5; ratings persist in `visit_ratings` and write `VisitRated` outbox events.
