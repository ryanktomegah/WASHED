# Washed Service Blueprints

**Purpose:** Define how subscribers, workers, operators, backend systems, and external providers coordinate during beta-critical journeys.

## Signup to First Visit

| Stage | Subscriber | Operator | Worker | System | Evidence |
|---|---|---|---|---|---|
| Phone login | Enters phone, verifies OTP | Watches auth issues only if escalated |  | Creates OTP challenge, session, device record | Auth event, device token |
| Address and schedule | Adds neighborhood, landmark, GPS, preferred day/window | Reviews unusual addresses or service-cell gaps |  | Assigns service cell, stores schedule preference | Profile/address record |
| Tier and payment | Selects T1/T2, links sandbox/real wallet when enabled | Confirms provider readiness before paid beta |  | Creates pending subscription and payment attempt | Subscription/payment ledger |
| Matching | Sees pending assignment state | Reviews candidate list, capacity, distance, safety notes; selects worker | Receives assignment notification | Logs assignment decision, creates first visits | Assignment and audit event |
| Pre-visit reminder | Gets visit reminder | Monitors live board | Gets route and reminder | Sends push, suppresses quiet-hour messages | Notification message |
| First visit | Prepares water/soap/basin, receives worker | Watches check-in exceptions | Checks in, uploads before/after proof, checks out | Validates GPS, records visit lifecycle | GPS/photo/visit events |
| Follow-up | Rates or files issue | Reviews no rating/dispute signals | Sees bonus accrual | Keeps unrated as unrated; accrues bonus on completion | Rating/dispute/payout data |

## Worker Day-of-Route

| Stage | Worker | Operator | Subscriber | System | Exception path |
|---|---|---|---|---|---|
| Start day | Opens cached route | Reviews route health and no-shows | Receives reminder | Network-first route sync | Cached route shown if offline |
| Travel | Navigates to household | Watches late risk | Waits during time window | Tracks planned status | Operator callback if late |
| Arrival | GPS check-in or fallback code | Approves fallback when needed | Confirms worker identity | Records check-in | Incident if unsafe access |
| Work in progress | Uploads before proof, completes wash | Available for support | Provides supplies | Stores evidence | Issue report if missing supplies |
| Checkout | Uploads after proof, GPS checkout | Reviews blocked checkout | Can rate/file issue later | Completes visit, accrues bonus | Manual review if proof missing |
| End day | Reviews earnings and issue status | Resolves open worker issues |  | Updates route and payout history | Escalate unresolved safety case |

## Dispute, No-Show, Cancellation, Refund, Theft

| Scenario | Trigger | Operator action | System action | Resolution |
|---|---|---|---|---|
| Service dispute | Subscriber files issue on visit | Pull GPS, photos, payment, worker history; request worker statement | Holds dispute context and emits audit event | Resolve for subscriber, worker, or escalate |
| Worker no-show | No check-in after thresholds | Contact worker, decide replacement/credit | Flags live board, queues notification | Replacement within policy or visit credit |
| Late cancellation | Subscriber cancels inside policy window | Review if exceptional | Records cancellation and fee policy | Worker bonus protected where policy says |
| Refund request | Dispute or cancellation requires money movement | Approve refund/credit path | Creates refund ledger, calls gated provider or marks manual | Provider reference or manual reconciliation |
| Theft allegation | Subscriber alleges theft | Senior review, relationship suspension, statement collection, police-report path | Flags incident, preserves evidence, blocks reassignment | Counsel/policy decision and account action |

## Operating Principles

- Operators own beta decisions; automation provides context and audit trails.
- Safety stops never penalize a worker without senior review.
- Real payments, refunds, and payouts stay behind provider readiness gates.
- Evidence is collected only for defined retention windows.
