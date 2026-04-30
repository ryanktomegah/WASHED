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
| CI pipeline | Green and protected | GitHub Actions runs format, migration/OpenAPI checks, typecheck, tests, build, audit, beta load, beta dry-run; `main` requires `verify` |
| External sends/payments | Gated | SMS, payment, push, storage, observability real-send paths require explicit flags and credentials |

## Beta Blockers

| Blocker | Owner | Required evidence | Repo support |
|---|---|---|---|
| Founder validation | Founder | Founder-confirmed washer/customer conversations and validation memo | `docs/research/founder-validation-memo.md` |
| Payment provider selection | Founder/operator | CinetPay/PayDunya or alternative scored and selected, sandbox proof for collection/refund/payout/webhooks | Provider abstraction, readiness endpoint, reconciliation |
| Banking partner | Founder/operator | Account path, settlement/export workflow, transfer limits before real paid beta | Banking diligence checklist |
| Legal position | Founder + optional Togo counsel | Founder-approved drafts for internal testing; counsel or explicit founder risk acceptance before paid beta | Legal drafts, gate log, founder-approved legal status |
| Capital approval | Founder | Approved beta reserve and launch runway | Capital model v2 |
| Accessibility/security/privacy review | Founder + engineering | iPhone/internal device pass, retention review, sign-off log | Review checklist, iPhone test runbook, provider inventory, GitHub security settings |
| Real onboarding | Operations | 10 workers and 30 paid subscribers selected/onboarded | Local beta dry-run support |

## Go/No-Go Rule

Closed beta can start only when all beta blockers above have written evidence and the latest PR/main CI run is green. Public launch remains blocked until closed-beta exit criteria pass.

## Immediate Founder Actions

1. Run the iPhone prototype pass using `docs/runbooks/iphone-prototype-test.md`.
2. Contact CinetPay and PayDunya using `docs/ops/payment-provider-diligence.md`.
3. Contact Ecobank, Orabank, and UTB only when preparing real paid settlement.
4. Decide whether to get counsel sign-off or explicitly accept founder legal risk before paid beta.
5. Approve or adjust `research/2026-04-30-capital-model-v2.md`.

## Engineering Next Candidates

| Candidate | Why it matters | Blocked by external gate? |
|---|---|---|
| Add export/erasure runbook or endpoint plan | Needed for privacy/public launch | No |
| Add local Playwright/mobile screenshot checks | Helps accessibility review | No |
| Add provider sandbox contract tests once docs arrive | Needed for real payments/SMS/push | Yes |
| Add staging deployment workflow | Needed after GitHub baseline is stable | Depends on hosting/secrets |
