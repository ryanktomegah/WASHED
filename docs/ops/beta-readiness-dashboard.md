# Closed Beta Readiness Dashboard

**Purpose:** Show what is ready in the repository, what is blocked by external decisions, and what must happen before Washed can invite real households/workers or collect money.

**Last updated:** 2026-04-30

## Current Build State

| Area | Status | Evidence |
|---|---|---|
| Core API and domain | Ready locally | Auth, subscriptions, assignments, visits, payments, disputes, audit, notifications, beta metrics |
| Subscriber app shell | Ready locally | Signup, profile, GPS/address, tier/schedule, payment sandbox, visits, support, billing |
| Worker app mode | Ready locally | Route cache, GPS check-in/out, photo evidence, issues, earnings, payout history |
| Operator console | Ready locally | Matching, live ops, support, payments, workers, notifications, service cells, beta metrics |
| CI pipeline | Green | GitHub Actions runs format, migration/OpenAPI checks, typecheck, tests, build, audit, beta load, beta dry-run |
| External sends/payments | Gated | SMS, payment, push, storage, observability real-send paths require explicit flags and credentials |

## Beta Blockers

| Blocker | Owner | Required evidence | Repo support |
|---|---|---|---|
| Field research | Founder/operator | 12 subscriber interviews, 8 worker interviews, synthesis decision log | Scripts, screener, consent, synthesis template |
| Payment provider selection | Founder/operator | CinetPay/PayDunya or alternative scored and selected, sandbox proof for collection/refund/payout/webhooks | Provider abstraction, readiness endpoint, reconciliation |
| Banking partner | Founder/operator | Account path, settlement/export workflow, transfer limits | Banking diligence checklist |
| Legal/counsel sign-off | Founder + Togo counsel | Worker classification, liability, privacy, retention, ToS, worker agreement | Counsel drafts and gate log |
| Capital approval | Founder | Approved beta reserve and launch runway | Capital model v2 |
| Accessibility/security/privacy review | Founder + engineering | Real-device pass, secret-scanning evidence, counsel-approved retention, sign-off log | Review checklist and provider inventory |
| Real onboarding | Operations | 10 workers and 30 paid subscribers selected/onboarded | Local beta dry-run support |

## Go/No-Go Rule

Closed beta can start only when all beta blockers above have written evidence and the latest PR/main CI run is green. Public launch remains blocked until closed-beta exit criteria pass.

## Immediate Founder Actions

1. Schedule counsel review using `docs/ops/worker-classification-counsel-brief.md` and `docs/legal/*.md`.
2. Contact CinetPay and PayDunya using `docs/ops/payment-provider-diligence.md`.
3. Contact Ecobank, Orabank, and UTB using `docs/ops/banking-partner-diligence.md`.
4. Run field interviews using `docs/research/recruitment-screener-consent-fr.md`, `docs/research/subscriber-interview-script-fr.md`, and `docs/research/worker-interview-script-fr.md`.
5. Approve or adjust `research/2026-04-30-capital-model-v2.md`.

## Engineering Next Candidates

| Candidate | Why it matters | Blocked by external gate? |
|---|---|---|
| Add export/erasure runbook or endpoint plan | Needed for privacy/public launch | No |
| Add local Playwright/mobile screenshot checks | Helps accessibility review | No |
| Add provider sandbox contract tests once docs arrive | Needed for real payments/SMS/push | Yes |
| Add staging deployment workflow | Needed after GitHub baseline is stable | Depends on hosting/secrets |
