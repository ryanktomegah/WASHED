# Operator Console Information Architecture

**Purpose:** Organize the closed-beta operator console so the team can run assignments, live visits, payments, support, worker onboarding, notifications, and beta metrics without database access.

## Primary Navigation

| Area | Primary job | Key data | Actions |
|---|---|---|---|
| Matching | Assign pending subscribers to workers | Subscriber address, tier, service cell, candidate score, capacity, declined candidates | Assign worker, reject candidate, log decision |
| Live Ops | Run today's visits | Visit status, worker route, check-in/out timing, exceptions | Mark no-show/cancelled, open support context |
| Service Cells | Protect capacity and route density | Active workers, subscriptions, remaining capacity, daily status | Inspect overloaded cells, plan onboarding |
| Support | Resolve subscriber issues | Subscription, visits, payments, comms, disputes, credits | Issue credit, file/resolve dispute, request callback |
| Payments | Reconcile money movement | Payment attempts, refunds, payouts, provider readiness, reconciliation snapshots | Refund, run reconciliation, inspect failures |
| Workers | Onboard and manage workers | Stage, notes, capacity, service cells, route history, issues | Advance case, activate worker, acknowledge/resolve issue |
| Notifications | Inspect outbound messages | Pending/failed messages, provider readiness, retry timing | Deliver due, review failures |
| Beta Metrics | Track readiness proof | Subscribers, workers, payment success, pending match, completion indicators | Refresh metrics, export meeting evidence |

## Support Context Layout

The support view should keep four columns of evidence close together:

| Section | Contents |
|---|---|
| Subscriber | Phone, profile, service cell, subscription status, tier, schedule |
| Visits | Upcoming visits, recent visits, GPS/photo status, no-show/cancel history |
| Money | Latest payment attempts, billing history, refunds, support credits |
| Comms and disputes | Notifications, callback requests, active/resolved disputes, worker statements |

## Beta Operator Permissions

| Role | Allowed areas | Restricted actions |
|---|---|---|
| Dispatcher | Matching, live ops, service cells | Refund approval, worker termination |
| Support lead | Support, live ops, notifications | Payment provider credentials |
| Finance operator | Payments, refunds, reconciliation | Worker safety closure |
| Worker coordinator | Workers, service cells, live ops | Subscriber refund approval |
| Founder/admin | All areas | Production secrets still stay outside console |

## Alerts and Queues

Prioritize queues in this order:

1. Safety incident or theft allegation.
2. Payment/payout provider failure.
3. Worker no-show or blocked checkout.
4. Pending assignment over SLA.
5. Failed notification with active visit impact.
6. Capacity overload in a service cell.

## Information Design Rules

- Show decision evidence before action buttons.
- Keep destructive actions behind confirmation and audit reason text.
- Prefer status badges over free-text interpretation.
- Link every operator action to an audit event and trace ID.
- Do not expose raw secrets, full provider credentials, or unnecessary personal data.
