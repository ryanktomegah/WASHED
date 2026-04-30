# Washed v1 Design Critical Review

**Date:** 2026-04-29
**Reviewed spec:** `docs/specs/2026-04-28-washed-v1-design.md`
**Review stance:** Product, operations, legal, financial, and system-risk review before implementation planning.

## Executive Read

Washed has a coherent wedge: formalise an existing in-home washerwoman pattern, remove client-worker cash leakage, give households predictable service, and give workers income stability.

The main risk is not whether the concept can be built. The main risk is that the current spec treats too many assumptions as locked before legal clearance, structured field research, payment-provider verification, and a revised cost model. The implementation plan should therefore start with gating work, not infrastructure or application code.

## Findings

### P0 - Legal and operating gates must be separated from engineering approval

The spec says open dependencies "do not block writing the implementation plan" (`docs/specs/2026-04-28-washed-v1-design.md:714`) and that no code is written until spec approval (`docs/specs/2026-04-28-washed-v1-design.md:750`). That is enough to sequence the work: product planning can continue, while legal and operating dependencies should be tracked as launch gates rather than mixed into engineering tasks.

The current `docs/plans/2026-04-28-washed-foundation.md` starts directly with monorepo, infrastructure, cloud, CI/CD, and code tasks (`docs/plans/2026-04-28-washed-foundation.md:5`). That is premature because provider, research, cost, liability, worker-classification, and privacy questions still shape what should be built first.

Recommendation: proceed with implementation planning and local-first engineering only after the founder approves the revised spec direction; keep provider contracts, worker classification, liability, insurance, and capital confirmation as explicit gates before beta/launch.

### P0 - The capital model underprices the architecture described in the spec

The capital model assumes 1,000,000 XOF/month fixed platform overhead and a one-time 3,000,000 XOF "App MVP build" (`research/2026-04-28-capital-requirements.md:11`, `research/2026-04-28-capital-requirements.md:36`). The spec simultaneously requires eight independently deployable services, Redpanda, ClickHouse, Vault, LiveKit, Coturn, Whisper GPU hosting, NLLB translation, Grafana/Sentry/PostHog/Better Stack/PagerDuty, mobile apps, and an operator console (`docs/specs/2026-04-28-washed-v1-design.md:267`, `docs/specs/2026-04-28-washed-v1-design.md:290`).

Those two positions are inconsistent. Even if AI compresses engineering hours, paid infrastructure, devices, design, translation, legal, payment integration, app-store accounts, SMS/WhatsApp traffic, storage, maps, observability, support tooling, and audits do not disappear.

Recommendation: produce a v2 capital model before build approval with line items for cloud, SMS/OTP, object storage, observability, legal, research, devices, provider onboarding, payment fees, beta incentives, security review, and founder travel/ops costs.

### P0 - Payment rails are a hard dependency but remain unverified

The spec hard-locks "NO cash from subscribers, ever" and mobile-money-only payment collection (`docs/specs/2026-04-28-washed-v1-design.md:79`). Monthly billing, retries, refunds, and worker payouts depend on CinetPay/PayDunya webhook and payout behavior (`docs/specs/2026-04-28-washed-v1-design.md:408`, `docs/specs/2026-04-28-washed-v1-design.md:424`). But primary provider selection is still open (`docs/specs/2026-04-28-washed-v1-design.md:719`).

If recurring billing, tokenised mobile-money authorization, payout APIs, refund mechanics, webhook reliability, settlement timing, or KYC requirements differ from the spec, the whole revenue and operations model changes.

Recommendation: before product build, get signed provider docs or sandbox access for T-Money/Flooz collection, recurring or invoice billing, refunds, reconciliation, and worker payouts. Build the payment domain only after those contracts are known.

### P1 - Contractor classification is legally fragile

The worker model is framed as independent contractor (`docs/specs/2026-04-28-washed-v1-design.md:56`) but the platform controls schedule, sticky routes, uniforms, ID badges, GPS-gated check-in/out, mandatory photos, dispute suspension, earnings floor, and potentially worker availability (`docs/specs/2026-04-28-washed-v1-design.md:90`, `docs/specs/2026-04-28-washed-v1-design.md:96`, `docs/specs/2026-04-28-washed-v1-design.md:337`).

That looks employment-like. The risk is not philosophical; it can affect CNSS/INAM obligations, worker injury liability, termination process, tax handling, and total cost per worker.

Recommendation: counsel should review the actual operating control model, not just the label "contractor." The financial model should include a downside case where Model C is reclassified or requires additional burden.

### P1 - "All of Lome as one zone" may break route economics and reliability

The spec locks all of Lome as a single launch zone (`docs/specs/2026-04-28-washed-v1-design.md:79`) and sets a 4-hour assignment SLA (`docs/specs/2026-04-28-washed-v1-design.md:402`). Route density is the core cost lever, but the spec does not yet show geospatial validation, travel-time assumptions, worker transport costs, neighborhood safety constraints, rainy-season effects, or backup-worker coverage.

Recommendation: keep "all of Lome" as a brand promise only if dispatch can still internally cluster by service cells. The research phase should map 30 to 50 target households, candidate worker home bases, realistic travel modes, and route duration.

### P1 - ML dispatch should be logged from day one, not built as a launch dependency

The spec says the ML matcher exists from day one and may outperform humans by month 3-4 (`docs/specs/2026-04-28-washed-v1-design.md:197`). With only 30 paid beta subscribers and 10 workers initially (`docs/specs/2026-04-28-washed-v1-design.md:694`), the dataset will be too small and biased for reliable automatic dispatch.

Recommendation: build the dispatch service with deterministic scoring, operator decision logging, feature capture, and evaluation reports. Defer auto-assignment until there is enough data and a measured offline win over operator decisions.

### P1 - Privacy retention conflicts with GDPR-equivalent rights

The spec promises GDPR-equivalent rights and erasure/anonymisation (`docs/specs/2026-04-28-washed-v1-design.md:385`) while voice transcripts are kept indefinitely (`docs/specs/2026-04-28-washed-v1-design.md:447`). It also requires before/after photos in client homes (`docs/specs/2026-04-28-washed-v1-design.md:339`), call metadata, possible call recordings, GPS trails, ID documents, police clearances, references, payment data, and dispute evidence.

Recommendation: add a data-retention schedule before implementation. It should define purpose, lawful basis, default retention, deletion/anonymisation behavior, access controls, encryption, and operator visibility for every sensitive artifact.

### P1 - Worker safety and household safety need operational runbooks before app flows

The trust stack focuses on protecting households from workers (`docs/specs/2026-04-28-washed-v1-design.md:94`). The reverse risk is under-specified: worker harassment, unsafe homes, aggressive clients, dog/child hazards, sexual harassment, locked gates, accusations without evidence, transport at dusk, and emergency escalation.

Recommendation: add a worker-safety policy, emergency flow, unsafe-client blocklist, operator escalation runbook, and incident taxonomy before closed beta.

### P2 - Auto-rating 4 stars will corrupt quality metrics

The visit lifecycle auto-rates subscribers as 4 stars after 48 hours (`docs/specs/2026-04-28-washed-v1-design.md:421`). That will bias worker quality, ML labels, and service reporting. Silence is not the same as satisfaction.

Recommendation: store unrated visits as `rating_status=expired_unrated`; use completion, complaints, rebook rate, swaps, no-shows, and explicit ratings as separate signals.

### P2 - EWE/MINA voice transcription and translation should be validated as a capability

The spec requires EWE/MINA translation and voice transcription support (`docs/specs/2026-04-28-washed-v1-design.md:331`, `docs/specs/2026-04-28-washed-v1-design.md:446`) but does not include a validation plan for accuracy, dialect coverage, latency, or user trust.

Recommendation: treat FR text/voice as v1 launch-critical, and run an EWE/MINA benchmark with real user samples before promising automatic translation/transcription in production.

### P2 - Locked product decisions should be renamed as hypotheses until field research completes

The spec acknowledges no structured user interviews yet (`docs/specs/2026-04-28-washed-v1-design.md:31`) while locking target segment, schedule mechanics, pricing, no-cash rule, swap limits, cancellation/refund rules, and trust stack (`docs/specs/2026-04-28-washed-v1-design.md:38`).

Recommendation: keep the financial constraints locked, but mark user-facing details as "provisionally locked pending T8 research." Research findings should be allowed to change pricing presentation, schedule windows, cancellation flow, onboarding order, and worker acceptance criteria.

## Required Spec Revisions Before Build Approval

1. Resolve the contradiction between "dependencies do not block implementation planning" and "no code is written until this spec is approved."
2. Add a build-gate table: what can happen before legal clearance, what requires legal clearance, what requires provider contracts, and what requires capital confirmation.
3. Replace the current capital assumption with a v2 cost model that matches the architecture and beta plan.
4. Add payment-provider due-diligence output as a prerequisite for Payments service implementation.
5. Add worker-classification counsel review and downside economics.
6. Add geospatial route validation and operating cell design for Lome.
7. Add privacy/data-retention schedule.
8. Change auto-rating to unrated status.
9. Re-scope ML dispatch as operator-first with training-data capture.
10. Add worker-safety runbooks and unsafe-client procedures.

## Go/No-Go Recommendation

Proceed to implementation planning. Start with research, provider due diligence, revised unit economics, spec cleanup, and local-first engineering once the founder approves the corrected plan.
