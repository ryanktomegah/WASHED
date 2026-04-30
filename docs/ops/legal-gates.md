# Washed Legal and Approval Gates

**Date opened:** 2026-04-29
**Purpose:** Track the legal, ownership, payment, and operating gates that must clear before Washed moves from planning into application code, company setup, fundraising, or launch activity.

## Current Decision

Application code is paused only until the founder approves the corrected implementation sequence. Paid cloud, beta, and launch operations remain blocked until the specific provider, legal, capital, and readiness gates below clear.

Planning artifacts are allowed: counsel briefs, research scripts, diligence checklists, cost models, operating runbooks, and spec revisions.

## Gate Summary

| Gate | Status | Blocks | Owner | Evidence Required |
|---|---|---|---|---|
| Togolese worker classification | Open | Worker agreement, compensation launch model, beta onboarding | Founder + Togo counsel | Written guidance on contractor vs employee risk and required registrations |
| Liability terms | Open | ToS, dispute process, reimbursement limits, insurance purchase | Founder + Togo counsel | Counsel-reviewed liability policy and claims escalation path |
| Group accident insurance | Open | Worker onboarding and beta start | Founder/operator | Quote and policy terms from selected insurer |
| Trademark/name | Open | Public brand launch, domain/marketing spend | Founder + counsel | OAPI/Togo trademark search and filing recommendation |
| Payment provider | Open | Payment service implementation, billing promises, closed beta payments | Founder/operator | Provider contract or sandbox docs proving collection, refunds, webhooks, and payouts |
| Banking partner | Open | Subscriber fund custody, worker payouts, reconciliation | Founder/operator | Account-opening path and settlement/export workflow |
| Capital approval | Open | Paid build, beta launch, provider accounts, device procurement | Founder | Approved runway with revised v2 capital model |

## Allowed Work While Gates Are Open

- Product/spec review and implementation planning.
- Field research scripts and synthesis templates.
- Counsel briefs and diligence checklists.
- Provider comparison matrices.
- Privacy, safety, support, and dispute runbook drafts.
- Low-fidelity service blueprints and architecture diagrams.
- Revised financial/capital models.

## Blocked Work Until Founder Approves Corrected Plan

- Source code for apps, backend services, operator console, infrastructure, or deployment.
- Any work that assumes removed cross-project context is active.

## Blocked Work Until Provider, Legal, and Capital Gates Clear

- Paid cloud infrastructure provisioning.
- Public product launch.
- Paid provider accounts under the future venture entity.
- Closed beta with real households/workers.

## Counsel Brief Inputs

Prepare these before legal review:

- Proposed worker agreement structure.
- Proposed worker compensation model.
- Proposed operating controls: routes, schedule, uniform, ID badge, GPS check-in/out, photos, dispute suspension.
- Proposed liability terms for theft, damage, worker injury, and late cancellation.
- Proposed insurance options.

## Decision Log

| Date | Gate | Decision | Evidence Link | Notes |
|---|---|---|---|---|
| 2026-04-29 | Initial gate log corrected | Removed stale cross-project context; coding awaits founder approval of corrected plan | `docs/reviews/2026-04-29-washed-v1-design-critical-review.md` | Provider/legal/capital gates still block beta and launch |
