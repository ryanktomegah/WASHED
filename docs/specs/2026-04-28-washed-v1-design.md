# Washed — v1 Product & System Design

**Date:** 2026-04-28
**Status:** Design — reviewed; implementation planning active
**Working name:** Washed (subject to legal/trademark check before launch)
**Authors:** Founder + Claude (CTO autonomy mode)

---

## 0. Executive summary

**Washed** is a smartphone-first subscription marketplace pairing washerwomen ("laveuses") with subscriber households in Togo, starting with Lomé. Subscribers pay a flat monthly fee for 1 or 2 in-home laundry visits per month; washerwomen visit on a sticky weekly schedule and wash clothes in the client's home using the client's water, soap, and basin. Workers earn a guaranteed monthly income floor plus per-visit bonuses, paid by the platform — not by clients.

The product is built to **European/American quality standards** from day one. No "MVP" framing — production-quality v1, scope down not quality down. Engineering velocity is bounded by design correctness, not human-team capacity, because AI-assisted development compresses time-to-quality enough that the old MVP/iterate playbook is obsolete.

**Phased rollout (geographic):** Lomé (Phase 1) → Cotonou → Dakar → Accra → Abidjan → Lagos → broader Africa.

**Strategic moat:** in-home wash via the client's existing soap/water/basin reaches a price point (~$4-7 USD/month) that pickup-and-delivery laundromat competitors cannot match without abandoning their physical infrastructure. The model fits the existing Togolese cultural pattern of "your washerwoman" rather than requiring behaviour change.

---

## 1. Context & motivation

The founder lived in Togo and used the informal washerwoman service personally. Today in Lomé, households call a washerwoman ad-hoc; she comes, washes, gets paid, leaves. The model has two deep problems:

1. **For washerwomen:** income volatility. In the current Togolese economy, a washerwoman can go days or weeks finding only one client. There is no income floor.
2. **For households:** unreliability and price unpredictability. No fixed schedule, no quality guarantee, no recourse if she doesn't show up.

Washed formalises the existing informal pattern into a subscription marketplace that gives both sides what they lack: workers get income stability; households get reliable scheduled service at a predictable monthly price.

### Validation status (2026-04-28)
- Founder has personally used the informal service
- Informal validation with family, friends, and one washerwoman in Lomé — friendly signal, treated as permission to proceed, not as proof of demand
- No structured user interviews yet (planned in T8 research program)

---

## 2. Decisions locked (with reasoning)

### 2.1 Target segment (Phase 1)
- **Lower-middle-income + middle-income Lomé households**
- Smartphone-first by default — assume all target users have Android smartphones (corrected against the prior development-economics stereotype that African low-income segments require feature-phone fallback)
- B2B (small businesses, wholesales) is a separate product, not in v1

### 2.2 Pricing — TS-β (math-derived, not founder-guessed)

| Tier | Price/month | Visits/month | Revenue per visit |
|---|---:|---:|---:|
| **T1** | 2,500 XOF | 1 | 2,500 XOF |
| **T2** | 4,500 XOF | 2 | 2,250 XOF (10% volume discount) |

**No 4-visit tier in v1.** Mathematical analysis (`/Users/tomegah/washed/research/financial_model.py`) showed that any 4-visit tier within the founder's stated 5,000 XOF cap produces revenue-per-visit below slow-month break-even. Adding it would have made every 4-visit subscriber a net loss. Defer until route density brings per-visit operational cost down.

### 2.3 Worker compensation — Model C (Hybrid)

- **40,000 XOF guaranteed monthly floor + 600 XOF per completed visit**
- Independent contractor structure (Uber-like surface, with floor income guarantee — distinct from pure gig)

| Scenario | Worker income | vs SMIG (52,500) | vs founder target (60,000) |
|---|---:|---|---|
| Full month (48 visits) | 68,800 XOF | +31% | +15% above target |
| Slow month (24 visits, 50%) | 54,400 XOF | +4% (just above) | -9% |
| Catastrophic (12 visits, 25%) | 47,200 XOF | -10% (below SMIG — platform subsidises) | -21% |

Workers as contractors at launch. Phase 2 conversion to employed (Model A) for top performers at month 12-18, once scale + retention proven and CNSS/INAM employer registration arranged with counsel. Capital required for Model C from day one: ~$20-28k USD for 12-month runway (vs ~$32-35k for Model A).

### 2.4 Pricing-to-worker arithmetic — why TS-β + Model C is the only viable combination

Of all (pricing × worker model × subscriber mix × capacity) combinations tested, only TS-β with Model C satisfies all four constraints simultaneously at Base mix × Base capacity:
- Worker income (full month) ≥ SMIG
- Worker income (slow month, 50% capacity) ≥ SMIG
- Platform margin per worker ≥ 0
- Platform contribution per subscriber > 0

Full results in `/Users/tomegah/washed/research/2026-04-28-financial-model-results.md`.

### 2.5 Operating rules (LOCKED)

- **Launch geography:** all of Lomé as a single zone. City small enough; no neighbourhood phasing.
- **Payment rule (HARD):** **NO cash from subscribers, ever.** All client→platform payments via T-Money + Flooz mobile money in-app. Workers paid by the platform only — never by clients directly. This prevents revenue leakage, ensures revenue capture, protects workers from disputes.
- **Build philosophy:** No "MVP" framing — production-quality v1 from day one, scope down not quality down.
- **Quality bar:** European/American quality. No tradeoffs lowered because the market is African.

### 2.6 Subscription mechanics

- Skip month: free, up to 2× per 12 months; subscription stays active
- Switch tier (T1↔T2): takes effect next billing cycle
- Cancel anytime: prorated refund of unused visits
- Choose specific worker: sticky by default; up to 2 swap requests per quarter
- Schedule: subscriber picks day-of-week + time window at signup; routes built around it
- Reschedule a single visit: up to 24h before
- Annual prepay discount: deferred to post-v1

### 2.7 Worker trust & vetting

Five-layer trust stack required before first visit:
1. National ID (CNI) verification + name/DOB validation
2. Two community references (contacted by phone)
3. Police clearance (Casier judiciaire), ~5-10k XOF, processed pre-onboarding
4. Branded uniform + photo ID badge issued at training
5. In-app rating + 2-strike rule (theft/damage allegations = immediate suspension pending investigation)

Sticky worker assignment: same worker every visit by default; auto-swap if assigned worker is unavailable.

### 2.8 Liability (pending counsel review)

- **Damaged clothing:** capped at 10× per-visit price per incident, photo evidence required
- **Theft (substantiated):** platform reimburses up to 50,000 XOF with police report; worker terminated
- **Theft (unsubstantiated):** worker reinstated with notification to subscriber including worker statement
- **Worker injury at client home:** group accident insurance via NSIA Togo or Sanlam Togo (~15-25k XOF/worker/year)
- **Late client cancellation (<2h):** 50% of visit price held; client no-show: 100% held; worker still earns full bonus
- **Worker no-show:** replacement within 24h OR full visit credit refunded
- **Subscriber's water/soap/basin quality:** subscriber's responsibility per the model design

---

## 3. Market context

### 3.1 SAM v2 (researched, sourced)

Three-stage funnel per country: TAM (smartphone-using urban households) → SAM (affordable) → SOM (active paid-laundry buyers). Sources: DataReportal Digital 2025/2026, World Bank Poverty & Equity briefs, Anker Living Wage benchmarks, ANSD/INS national stats.

| Capital | TAM | SAM | SOM | Annual revenue at SOM |
|---|---:|---:|---:|---:|
| **Lomé (Togo)** | 219,780 | 93,923 | **28,177** | $1.8M USD |
| Cotonou (Benin) | 82,883 | 31,910 | 9,573 | $0.6M USD |
| Abidjan (Côte d'Ivoire) | 818,400 | 360,096 | 108,029 | $7.1M USD |
| Dakar (Sénégal) | 757,500 | 312,469 | 93,741 | $6.1M USD |
| Ouagadougou (Burkina) | 221,760 | 85,378 | 25,613 | $1.7M USD |
| Bamako (Mali) | 306,327 | 117,936 | 35,381 | $2.3M USD |
| Niamey (Niger) | 84,000 | 27,720 | 8,316 | $0.5M USD |
| Conakry (Guinée) | 185,455 | 71,400 | 21,420 | $1.4M USD |
| Accra (Ghana) | 633,818 | 278,880 | **83,664** | $5.5M USD |
| Lagos (Nigeria) | 3,405,000 | 919,350 | **275,805** | $18.1M USD |
| **TOTAL West Africa** | **6.7M** | **2.3M** | **689,718** | **$45.1M USD/yr** |

Full methodology in `/Users/tomegah/washed/research/2026-04-28-sam-v2-researched.md`.

### 3.2 Phasing (geographic)

| Phase | Market | SOM | Rationale |
|---|---|---:|---|
| 1 | Lomé | 28k | Open field, founder lives there, no competitor, francophone home |
| 2 | Cotonou | 10k | Adjacent (1hr from Lomé), francophone, no app competitor, easy logistics extension |
| 3 | Dakar | 94k | 91% effective smartphone penetration (highest francophone WA), francophone, only La Buanderie as mid-competitor, big ticket |
| 4 | Accra | 84k | 91% smartphone, low poverty, no in-home-wash competitor — Anglophone (translation + GHS payment rails) |
| 5 | Abidjan | 108k | Biggest francophone SOM, but Toofacil/Tambour/Chap-Chap/KS established — must differentiate hard |
| 6+ | Lagos | 276k | Largest SOM, but mature competition (Washr/Laundrymann/Paddim) and Naira inflation — late entry, defensive |

**Strategic implication:** $5M+ ARR is mathematically impossible on Lomé alone (271% of Lomé SOM). Regional expansion is existential, not optional, for venture-scale outcomes.

### 3.3 Competitive positioning

Every existing West African laundry-app competitor is **pickup-and-delivery laundromat-based** targeting the premium segment. None do in-home wash. None operate in Togo.

| Player | Country | Model | Segment | In-home? |
|---|---|---|---|---|
| Washr, Laundrymann, LaundryBoy, Paddim, Skip Your Laundry | Nigeria | Pickup laundromat | Premium | No |
| Toofacil, Tambour, Chap-Chap, KS, Les Laveries d'Abidjan | Côte d'Ivoire | Pickup + lockers + kiosks | Mid-premium | No |
| La Buanderie | Sénégal | Pickup/delivery | Mid-premium | No |
| **Washed** | **Togo** | **In-home wash by worker** | **Lower-middle + middle** | **YES** |

**Defensibility:**
1. **Cost-structure moat** — competitors have CFA 50-200M sunk in physical laundromat infrastructure; cannot match 2.5-4.5k pricing without abandoning the model
2. **Cultural fit moat** — in-home wash IS the existing informal Togolese pattern; no behaviour change required
3. **Geographic moat** — Lomé has zero competitor; ~18-24 months of uncontested operation likely
4. **Worker-side moat** — 40k floor commitment makes Washed the employer of choice for washerwomen

### 3.4 Capital requirements (Model C, realistic ramp)

- One-time setup: ~5,250,000 XOF (~$8,680 USD)
- 9-month operating burn: ~7,000,000 XOF (~$11,600 USD)
- **Total capital required at trough: ~12,300,000 XOF (~$20,400 USD)**
- Add ~3-month safety buffer: **plan for ~$25-28k USD runway**
- Cash-flow positive: month 10-12 under realistic ramp

### 3.5 Five-year revenue projection (realistic ramp scenario)

| Year | EOY subs | ARR | Annual profit |
|---|---:|---:|---:|
| Y1 | 1,000 | $65k | -$4k |
| Y2 | 4,500 | $295k | +$11k |
| Y3 | 12,000 | $785k | +$50k |
| Y4 | 25,000 | $1.6M | -$3k (regional ramp dip) |
| Y5 | 50,000 | $3.3M | +$391k |

Full projections in `/Users/tomegah/washed/research/2026-04-28-projections-and-market.md`.

---

## 4. System architecture

### 4.1 Approach: Sticky Routes (operator-mediated cold start, ML-mediated steady state)

A new subscriber's first match is made by a human dispatcher in the operator console. Once matched, the assignment is sticky for 12 months unless the subscriber requests a swap. New subscribers are added to existing worker routes when geographically close; new workers are hired when route density exceeds capacity.

The dispatch service supports two execution modes from day one — operator-mediated and ML-auto — with a confidence-gated handoff. The ML model trains nightly on operator decisions + visit outcomes; mode switches per country are config flags. There is no "v2 algorithm rewrite later" — the algorithm is built now and switched on the moment it outperforms humans (likely month 3-4 in Lomé), not deferred to year 2.

### 4.2 High-level architecture

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│   SUBSCRIBER APP     │  │     WORKER APP       │  │  OPERATOR CONSOLE    │
│  Flutter (iOS+Android│  │ Flutter (Android-first│  │ Custom React/Next.js │
│  +PWA), French i18n  │  │  +iOS), French i18n   │  │  + Tailwind, custom   │
│   from day 1         │  │   from day 1          │  │  data-grid components │
└──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
           │                         │                          │
           └─────────────────────────┼──────────────────────────┘
                                     │
                          HTTPS REST + WebSockets (real-time)
                                     │
                            ┌────────▼────────┐
                            │  EDGE / GATEWAY │  Cloudflare → Caddy
                            │  TLS, rate-limit│  edge cache (static)
                            │  WAF, audit log │  trace IDs (OTel)
                            └────────┬────────┘
                                     │
   ┌─────────────────────────────────┼─────────────────────────────────┐
   │                                 │                                  │
   │   ┌────────────┐    ┌──────────▼──────────┐   ┌────────────────┐  │
   │   │ AUTH SVC   │    │   CORE DOMAIN SVCS   │   │ PAYMENT SVC    │  │
   │   │ phone+OTP  │    │  - Subscriptions     │   │  CinetPay +    │  │
   │   │ JWT issuer │    │  - Visits / Schedule │   │  PayDunya      │  │
   │   │ session    │    │  - Workers / Routes  │   │  T-Money/Flooz │  │
   │   │ refresh    │    │  - Ratings/Disputes  │   │  PCI-out, idem-│  │
   │   │            │    │  - Localisation/i18n │   │  potent retries│  │
   │   └────────────┘    └─────────────────────┘   └────────────────┘  │
   │                                 │                                  │
   │   ┌────────────┐    ┌──────────▼──────────┐   ┌────────────────┐  │
   │   │ DISPATCH   │    │  EVENT BUS (Redpanda)│   │ NOTIFICATION   │  │
   │   │ ENGINE     │    │  domain events,      │   │  FCM push +    │  │
   │   │ - operator │    │  ordered per-aggregate│   │  Africa's      │  │
   │   │   matching │    │  retention 7 days    │   │  Talking SMS   │  │
   │   │   API      │    │                      │   │  WhatsApp BSP  │  │
   │   │ - ML matcher│   └─────────────────────┘   │  outbound       │  │
   │   │   (auto-on  │              │               └────────────────┘  │
   │   │    when     │              │                                   │
   │   │    confident)│             │              ┌────────────────┐   │
   │   └────────────┘              │               │ REALTIME COMMS │   │
   │                               │               │ S8: voice msgs │   │
   │   ┌────────────┐              │               │ + LiveKit calls│   │
   │   │ AUDIT LOG  │              │               │ + Whisper STT  │   │
   │   │ append-only│              │               │ + NLLB-200 i18n│   │
   │   │ event store│              │               └────────────────┘   │
   │   └────────────┘              │                                    │
   │                               │              ┌────────────────┐   │
   │                               │              │ ANALYTICS /    │   │
   │                               │              │ ML PIPELINE    │   │
   │                               │              │ PostHog +      │   │
   │                               │              │ ClickHouse +   │   │
   │                               │              │ MLflow         │   │
   │                               │              └────────────────┘   │
   └─────────────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┴─────────────────────┐
              │                                          │
       ┌──────▼─────┐    ┌──────────┐    ┌──────▼──────┐ ┌─────────┐
       │ POSTGRESQL │    │  REDIS   │    │  REDPANDA   │ │CLICKHOUSE│
       │  primary,  │    │  jobs +  │    │  event log  │ │ analytics│
       │  multi-    │    │  cache + │    │  + CDC sink │ │  OLAP    │
       │  tenant,   │    │  pubsub  │    └─────────────┘ └─────────┘
       │  RLS, PITR │    └──────────┘
       └────────────┘
```

### 4.3 Service decomposition

Independent deployables from day one. Splits chosen based on differing reliability SLOs and scaling profiles, not team size.

| Service | Responsibility | Why split |
|---|---|---|
| **Auth (S1)** | Phone+OTP, JWT, refresh, session, device trust | Different scaling profile (login spikes), different security perimeter |
| **Core API (S2)** | Subscriptions, Visits, Workers, Routes, Ratings, Disputes | Product domain — clear boundaries |
| **Payments (S3)** | CinetPay/PayDunya, idempotent retries, settlement, payouts | PCI surface, distinct reliability SLO, must isolate failures |
| **Dispatch (S4)** | Operator matching API + ML matcher + zone health | CPU-heavy when ML on; scales independently |
| **Notification (S5)** | FCM + SMS + WhatsApp BSP | High-volume fan-out; failures must not block core flows |
| **Audit / Event Store (S6)** | Append-only log of every domain event | Regulatory + dispute resolution + ML training requirements |
| **Analytics / ML (S7)** | ClickHouse + PostHog + MLflow training pipeline | OLAP workload distinct from OLTP; cannot steal IO from primary |
| **Realtime Communication (S8)** | Voice messages, LiveKit voice calls, Whisper transcription, NLLB translation | Real-time media has fundamentally different scaling/reliability needs |

### 4.4 Multi-tenancy / multi-country from day 1

- Every record carries `country_code` + `currency_code` + `locale`
- Postgres Row-Level Security enforces per-country isolation
- Pricing, payment provider, regulatory rules, language are country-scoped configuration
- Adding Cotonou (Phase 2) is config + Benin payment provider onboarding, not a code rewrite
- Currency stored as integer minor-units (XOF=0 decimals; GHS, NGN, EUR=2 decimals); no float math in money paths

### 4.5 Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Backend** | Node.js 22 + TypeScript + Fastify; NestJS modules per domain | Mature ecosystem; DI + clear boundaries |
| **Mobile** | Flutter 3 (single codebase iOS+Android+web); Riverpod; Freezed | One codebase, native compilation, offline-tolerant |
| **Operator console** | Next.js 15 + React 19 + TypeScript + Tailwind + shadcn/ui + TanStack Table | Real product, not Retool scaffold |
| **Real-time media** | LiveKit (self-hosted) + Coturn + Opus codec | Industry-standard WebRTC, full data sovereignty |
| **Voice transcription** | Whisper-v3-large (self-hosted on GPU) | Multi-language, French native; Ewe/Mina viable |
| **Translation** | NLLB-200-distilled (self-hosted CPU) | FR↔EWE↔MINA support |
| **Event bus** | Redpanda | Kafka-compatible, single-binary, simpler ops |
| **Analytics warehouse** | ClickHouse | Sub-second OLAP queries on 100M+ rows |
| **ML platform** | scikit-learn + LightGBM ranker; MLflow | Industry standard, sufficient for ranking task |
| **Observability** | OpenTelemetry → Grafana Cloud | Unified traces/metrics/logs |
| **Hosting** | Hetzner Cloud Frankfurt (primary); Helsinki (DR) | Best EU latency to Lomé; ~5× cheaper than AWS |
| **Infra-as-code** | Terraform + Ansible | Reproducible infra; hosting-portable |
| **Secrets** | HashiCorp Vault (or Doppler at lower scale) | No hardcoded credentials anywhere |
| **CI/CD** | GitHub Actions; Kamal for container deploys | Zero-downtime deploys without K8s overhead |

---

## 5. Components

### 5.1 Client components (3)

#### C1 — Subscriber App (Flutter)

Mobile app for signup, subscription management, payment, schedule visibility, ratings, dispute filing, voice messaging, and voice calling.

**Surfaces:**
- **Onboarding** — phone+OTP, address (GPS + landmark notes — Lomé addresses are descriptive), tier selection, schedule preference, payment-method linking
- **Home** — next visit (date/time/worker name+photo), skip-month, reschedule
- **Subscription** — tier switch, pause, cancel, billing history
- **Worker profile** — assigned worker's photo/name/rating, request swap (rate-limited 2/quarter)
- **Visit screen** — real-time worker ETA, completion confirmation with worker-uploaded photos, rating + tip
- **Disputes** — structured complaint form with photo capture, status tracking
- **Messaging** — in-app chat with assigned worker (templated FR↔EWE auto-translation; free-text supported)
- **Voice messages** — long-press to record, tap to play, auto-transcribed below bubble
- **Voice calls** — one-tap call to assigned worker, full-screen WhatsApp-style UI; phone numbers masked (caller sees "Akouvi (votre laveuse)" never real number)
- **Wallet/Billing** — monthly statement, mobile-money receipt, refund history

**Tech:** Flutter 3, Riverpod, Freezed, Dio, FlutterSecureStorage, Firebase Cloud Messaging, sentry_flutter, easy_localization (FR/EN/EWE/MINA), `livekit_client` for calls, drift for offline storage.

#### C2 — Worker App (Flutter, Android-first)

Mobile app for daily route, visit check-in/out, earnings, payouts, operator messaging, and voice/call communication with subscribers.

**Surfaces:**
- **Today's route** — ordered list of subscribers, addresses, GPS navigation handoff, time windows
- **Visit flow** — GPS-validated check-in (within 100m), in-progress timer, GPS-validated check-out, mandatory before+after photo upload, one-tap "report issue"
- **Schedule** — weekly view, mark unavailability (operator notified)
- **Earnings** — running monthly total (floor + bonuses), payout history, mid-month advance request
- **Profile** — rating trend, completion rate, dispute history, payout method
- **Operator chat** — WhatsApp-style direct line to operations
- **Voice messages + calls with subscribers** — same surfaces as C1; numbers masked
- **Offline mode** — today's route cached; check-ins queued; photos compressed and queued for sync

**Tech:** Same Flutter stack as C1, plus drift for offline-first sqlite, image compression, geolocator, background_fetch.

#### C3 — Operator Console (Next.js + React)

Operations workspace for matching, monitoring live ops, dispute handling, worker onboarding, and customer support.

**Surfaces:**
- **Matching queue** — every new subscriber needing assignment, pre-computed top-5 candidate workers with feature scores; operator picks; decision logged for ML training
- **Live ops board** — real-time map of today's visits, color-coded by status; WebSocket-driven sub-second updates
- **Dispute desk** — every open dispute with full context (GPS, photos, transaction trail, call history); refund/credit/escalate actions
- **Worker onboarding pipeline** — application → CNI uploaded → references called → casier judiciaire received → training scheduled → uniform issued → first route assigned
- **Subscriber CS** — search, full subscription/visit/payment/comms history, issue credits, log calls
- **Routes** — zone view of all workers + assigned subscribers, capacity utilisation heatmap, identifies "this worker is at 95%, hire next worker"
- **Live calls** — active calls (anonymised), one-click join-as-operator
- **Reporting** — daily/weekly/monthly KPIs, exports

**Tech:** Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn/ui, TanStack Table, TanStack Query, react-leaflet, deck.gl for heatmaps, WebSocket client. Built as a real product, not a CRUD scaffold.

### 5.2 Backend services (8)

Specifications in section 4.3. Each service:
- Has its own deployable, test suite, version
- Exposes intentional, documented, versioned endpoints (OpenAPI 3.1)
- Emits domain events to S6 via transactional outbox pattern
- Is OpenTelemetry-instrumented from day one
- Carries `country_code` on every record (multi-tenant from day one)

### 5.3 Cross-cutting concerns

| Concern | Implementation |
|---|---|
| **i18n** | Every user-visible string is a key; FR + EN at launch; EWE + MINA in Lomé v1.1; TWI for Ghana phase |
| **Multi-currency** | `(amount_minor BIGINT, currency_code CHAR(3))`; locale-aware formatting |
| **Multi-country** | RLS-enforced isolation; multi-country operator access opt-in |
| **Observability** | OTel SDK in every service; traces + metrics + logs unified in Grafana Cloud; every request traced; every error → Sentry |
| **Audit** | Every state-changing action emits domain event with `actor_user_id`, `actor_role`, `timestamp`, `trace_id` |
| **Security** | TLS everywhere; mTLS between services in private VPC; secrets in Vault; OWASP-ASVS Level 2 baseline |
| **Rate limiting** | Cloudflare + per-service Redis sliding-window |
| **GDPR-equivalent rights** | Export endpoint per user; right-to-erasure with anonymisation where audit retention required; applies to all users regardless of jurisdiction |

---

## 6. Data flows

### 6.1 F1 — Subscriber signup → first visit booked

1. App → Auth: OTP request → SMS via Notification → user enters code → JWT issued
2. App → Core: profile + subscription + payment-method linkage
3. Core: subscription enters `pending_match`; emits `SubscriptionCreated`
4. Core → Dispatch: queue for matching
5. Operator console: matching queue refreshes; operator picks worker
6. Dispatch → Core: assignment recorded; emits `SubscriberAssigned`
7. Core: generates first 4 visits; emits `VisitsScheduled`
8. Notification → push to subscriber: "Your worker is Akouvi, first visit Tuesday 9am"

**SLA:** assignment within 4 hours of subscription creation.

### 6.2 F2 — Monthly billing → visit lifecycle → worker payout

Three independent, idempotent pipelines stitched together by domain events.

#### F2a — Monthly billing (cron, 02:00 Lomé time on subscriber's billing day)
- Idempotency key = `sub_id + YYYY-MM-DD`; retries never double-charge
- CinetPay webhook is source of truth (sync response only confirms "submitted")
- Failed payment: 3 retries at T+6h, T+24h, T+72h
- Day 4 of failure: visits in current cycle continue (already paid); next cycle's visits paused
- Day 7: subscription auto-pauses; subscriber can resume by updating payment
- Day 30: cancelled

#### F2b — Visit lifecycle
- T-24h: push to subscriber + worker
- Worker check-in: GPS within 100m of subscriber pin (gating, not advisory)
- Worker uploads before+after photo (mandatory; checkout cannot complete without)
- Worker check-out: GPS proximity + ≥30 min after check-in
- Subscriber rating prompted; auto-rated 4★ after 48h
- Worker bonus accrues on `VisitCompleted` event

#### F2c — Weekly worker payout (cron, Sunday 23:00 Lomé)
- Idempotency key = `worker_id + ISO_week`; never double-pay
- Failed payouts: 3 retries over 24h, then ops alert; ops calls worker within 4h
- Mid-month advance: separate flow, max 50% of accrued floor, 1× per month

### 6.3 F3 — Dispute lifecycle

Subscriber files dispute → worker bonus held + visit state `disputed` → operator console queue → operator pulls full context (GPS + photos + comms history + prior disputes) → requests worker statement → makes decision (resolved-for-subscriber / resolved-for-worker / escalate) → all tracked in audit log. Theft allegations bypass standard queue → senior ops paged + worker auto-suspended within 60 seconds.

### 6.4 F4 — Voice messages and calls

#### F4a — Voice call (subscriber → worker)
- Subscriber app → Realtime Comms: initiate call
- S8: verifies relationship active, quiet-hours rule (21:00-07:00 requires `urgent` flag), no concurrent call
- S8 creates LiveKit room; issues caller token; pushes notify to worker
- Worker accepts → joins room; encrypted Opus media flows via LiveKit (Frankfurt)
- Either party hangs up → `CallEnded` event with duration; if both opt-in to recording, encrypted blob stored 90 days
- "Demander de l'aide" button → operator joins as 3-way audio

#### F4b — Voice message
- Record locally → upload encrypted to object store → enqueue Whisper transcription
- Audio playable immediately; transcript async (1-5s typical)
- Translation on demand (FR↔EWE↔MINA via NLLB-200)
- 30-day audio retention; transcripts kept indefinitely

### 6.5 F5 — Cross-cutting: transactional outbox for audit

Every state-changing operation:
1. Apply state change in DB transaction
2. Emit domain event to outbox table (same transaction)
3. Commit
4. Outbox worker (per service) polls table, publishes to Redpanda, marks row published
5. Audit Service consumes from Redpanda, persists immutable event row, projects to ClickHouse for analytics

Guarantees event eventually published whenever DB write succeeded; no distributed transactions.

### 6.6 SLO targets (v1 scale: ~1k subscribers, ~40 workers)

| Flow | p50 | p95 | p99 |
|---|---:|---:|---:|
| OTP delivery | 5s | 15s | 30s |
| Subscription create→pending | 800ms | 1.5s | 3s |
| Visit check-in API | 100ms | 300ms | 800ms |
| Photo upload (1.5MB) | 3s | 8s | 15s |
| Voice-call connect | 1.5s | 3s | 6s |
| Voice-message transcription | 2s | 5s | 10s |
| Operator console live update | 200ms | 500ms | 1.2s |
| Webhook → PaymentSucceeded | 500ms | 2s | 8s |
| Worker payout webhook → completed | 800ms | 3s | 10s |

Instrumented from day one; alerted on breach; regression bar for every release.

---

## 7. Error handling

### 7.1 Categorisation

| Category | Examples | Response |
|---|---|---|
| **User-correctable** | Wrong OTP, declined payment, GPS too far, photo rejected | Friendly inline message in user's language, clear next action |
| **System-recoverable** | Provider timeout, network error, race conditions | Auto-retry, idempotent ops, circuit breakers, graceful degradation |
| **Operator-required** | Webhook never arrives, payout fails 3×, reconciliation mismatch | Ops console alert with full context, SLA-tracked queue |
| **Catastrophic** | DB down, region offline, both payment providers fail, security incident | Maintenance page in user's language, status page, runbook executed, SMS broadcast if extended |

### 7.2 Selected critical handlers

- **Charge declined:** subscription enters `payment_overdue`, NOT cancelled; 3 retries over 72h; current-cycle visits continue; next-cycle visits paused if still unpaid; auto-pause day 7; auto-cancel day 30
- **GPS check-in rejected:** worker shown clear message; one-tap "address is wrong" flagged to ops; one-tap "GPS is wrong" falls back to 4-digit code shared verbally with subscriber
- **Worker no-show:** automated detection at T+15/30/60 min; ops alerted; replacement dispatched if available within 30 min; subscriber gets credit + apology
- **Photo upload fails:** queued in local sqlite; visit completable with photos pending; background sync; ops alerted if pending >6h
- **Theft/damage allegations:** bypass standard dispute queue; senior ops paged; worker auto-suspended within 60s
- **Voice call connect fails:** auto-fallback to async voice message in same screen; no context loss
- **Both payment providers down:** status page updated <60s; new signups disabled; existing subscribers unaffected; SMS broadcast on resolution
- **Postgres primary fails:** Patroni-orchestrated failover to streaming replica in second AZ; <60s; reads continue from replica during failover
- **Region-wide Hetzner outage:** cold-standby in Helsinki; RPO 15 min; RTO 4 hours; DNS failover via Cloudflare

### 7.3 Localisation & cultural-fit error UX

Every error message: respectful tone (formal "vous"), specificity (what + next action + escalation), native-speaker translation (not Google Translate), one-tap "Nous contacter" → WhatsApp Business or in-app voice call to operator.

Examples:
- ❌ "Payment failed (status: 402)"
- ✅ « Le paiement n'a pas abouti. Vérifiez votre solde T-Money ou essayez Flooz. Besoin d'aide ? Contactez-nous. »

### 7.4 Observability of errors

Sentry for unhandled exceptions; OpenTelemetry traces for distributed root-cause analysis; structured JSON logs in Better Stack; PagerDuty alerts on:
- Payment success rate <98% over 5 min
- Visit completion rate <95% over 1 hour
- Worker payout failure rate >2% over 1 day
- Voice-call connect rate <95% over 15 min
- Operator queue depth >50 unmatched subscribers
- SLO breach on any p95 latency target

Each SLO has a monthly error budget; >50% consumption triggers eng-team review.

---

## 8. Testing & quality

### 8.1 Automated test pyramid

| Layer | Coverage | Framework |
|---|---:|---|
| Unit tests | ≥ 90% of business logic | Vitest, Dart `test`, Jest |
| Component tests | ≥ 80% of public surfaces | Supertest + Testcontainers, Flutter widget tests, RTL |
| Integration tests | All critical flows | Testcontainers + Pactum, MockServer |
| Contract tests | 100% of public events + endpoints | Pact + OpenAPI Validator |
| E2E tests | Top 30 user journeys | Playwright (web), Maestro (mobile) |

**Money math:** every monetary calculation has property-based tests (fast-check). Examples: charge + refund = net revenue; sum(bonuses) + sum(payouts) = sum(worker pay) over any window; currency conversions reversible within rounding tolerance.

### 8.2 Mobile-specific testing

Reference device lab (in-office, real devices used for every release):

| Tier | Device | Why |
|---|---|---|
| Floor | Tecno Spark 10 (Android Go, 2GB) | Most common low-end phone in target segment |
| Mid | itel S23 (Android 14, 4GB) | Common entry-level smartphone |
| Mid | Samsung Galaxy A05 | Popular brand in West Africa |
| High | iPhone 12 (iOS 17) | Diaspora + middle-class iPhone users |
| High | Pixel 7 (Android 15) | Google reference |
| Worker-side | Tecno Camon 20 (8GB, decent camera) | Worker app needs photo quality |

Network condition matrix: Lomé 4G typical, 4G congested, 3G, 2G fallback, offline. All releases verified to support full Worker app visit lifecycle in offline mode with sync on reconnect.

Cloud testing: Firebase Test Lab (Android matrix) + BrowserStack (iOS) on every PR.

### 8.3 Load & performance testing

k6 nightly against staging mirror:
- Steady state: 1k subs, 40 workers, 200 operator users
- Morning peak: 80% workers checking in within 1 hour
- Billing day: 1k charges in 5 min via cron
- Weekly payout: 40 payouts in 2 min
- Voice-call surge: 50 concurrent calls
- Operator console live ops: 5 operators, 200 active visits

Pass criteria: all p95 SLOs met; zero double-charges; reconciliation clean.

### 8.4 Chaos engineering

Monthly exercises in staging (later in production with feature flags):
- Kill Postgres primary → measure failover
- Block CinetPay outbound → verify reconciliation, no double-charges
- Inject 10% packet loss to LiveKit → verify call-quality indicator
- Kill 50% of Notification workers → verify queue drain
- Rotate JWT signing key → verify hot-rotation
- Fill ClickHouse disk → verify alerts, projections pause cleanly

Findings go into runbooks; runbooks tested quarterly via game days.

### 8.5 Security testing

Continuous (every PR): SAST (Semgrep + CodeQL), dependency scanning (Dependabot + Snyk, CVSS≥7 blocks merge), secret scanning (gitleaks), container scanning (Trivy), IaC scanning (Checkov).

Periodic: DAST (OWASP ZAP nightly against staging); pen-test (quarterly external CREST-certified firm); bug bounty (Intigriti or HackerOne private from launch); pen-test before each major regional expansion.

Compliance baseline: OWASP ASVS Level 2 (annual); GDPR-equivalent rights for all users; Sénégal Loi 2008-12 pre-validated for Phase 3; Nigeria NDPR pre-validated for Phase 6.

### 8.6 Accessibility

WCAG 2.1 Level AA from launch. Automated (axe-core + Pa11y in CI; Flutter accessibility-checker); manual (TalkBack + VoiceOver every release); external audit pre-launch and annually (Deque or Level Access).

Specific: tap targets ≥44pt; contrast ≥4.5:1; screen-reader navigation tested; voice messages have transcripts; high-contrast mode toggle; dynamic-type up to 200% scale without breakage.

### 8.7 Localisation & cultural-fit

Native-speaker translators (FR formal Togolese register, EWE, MINA, EN — paid professionals, no Google Translate); translation memory in Lokalise; in-context review by Togolese team member; pseudo-localisation testing for layout breakage; cultural-fit visual review by Togolese designer; focus-group illustration testing (8-10 users).

### 8.8 Usability research with real Togolese users

Continuous program:

| Phase | Format | Participants | Cadence |
|---|---|---|---|
| Pre-spec (NOW) | 1:1 in-person interviews in Lomé | 12 prospective subscribers + 8 prospective workers | One-time before build |
| Mid-build | Clickable prototype tests | 8-10 subscribers + 5 workers | Every 2 weeks during build |
| Closed beta | Live app, paid users | 30 subscribers + 10 workers | 6-8 weeks before launch |
| Open beta | Live app, free first month | 200 subscribers + 25 workers | 4 weeks before full launch |
| Post-launch | Monthly diary studies + quarterly interviews | Rolling 12 + 5 | Always-on |

Lomé-based research coordinator (part-time, paid). Compensation: 5,000 XOF + free month for subscribers; 10,000 XOF for workers. Sessions in user's language. Findings rewrite the spec, not just the bug list.

### 8.9 Pre-launch QA gates

All required, no exceptions:
- Automated test coverage ≥ targets (CI green)
- Performance SLOs met under steady-state load
- Pen-test report — no high/critical findings
- Accessibility audit — WCAG AA verified externally
- Localisation review — all FR/EN strings approved by native reviewer
- Closed beta NPS ≥ 40 (final 2 weeks)
- Closed beta worker satisfaction ≥ 4/5
- Zero open Sev-1 bugs
- DR drill executed successfully
- Privacy policy + ToS in FR + EN reviewed by counsel
- CS runbooks complete; team trained
- Status page live; alerts wired to PagerDuty (test alert fired and acked)

### 8.10 Production as continuous testing

Synthetic monitoring every 60s from Frankfurt/Paris/Accra: OTP, signup, visit lifecycle, payment, voice call.

Real-user monitoring: every session reports performance + errors + network conditions to ClickHouse; weekly eng review.

Canary releases: 5% traffic for 30 min on every backend deploy; staged 5% Flutter rollouts; auto-rollback on error spike.

Feature flags (Unleash self-hosted) on every new feature.

Blameless post-mortem within 5 days for every Sev-1/Sev-2; corrective actions tracked to closure.

---

## 9. Build philosophy & non-negotiables

These are quality bars that apply to every feature, every release, every market expansion.

### 9.1 No "MVP" framing
Production-quality v1 from day one. Scope down (which features are in v1) — never quality down (how well we build the features we choose). AI-assisted dev compresses time-to-quality; the old MVP/iterate playbook is obsolete.

### 9.2 European/American quality standards
The market being African is not a justification to ship anything less than what we'd ship for European or American users. UX polish (Stripe/Linear/Revolut tier), performance (60fps, sub-second perceived latency), accessibility (WCAG AA), security (OWASP ASVS L2), reliability (instrumented SLOs), privacy (GDPR-equivalent rights regardless of jurisdiction), customer support (trained humans in user's languages).

### 9.3 No human-team velocity sandbagging
Architecture decisions are made on **system correctness**, never on "this would take a human team too long." No modular-monolith-because-team-size; no Retool-as-permanent; no defer-to-year-2 for features that should exist now. Build the right system; AI velocity makes engineering hours not the binding constraint.

### 9.4 Workers paid by platform only, never by clients
Subscribers cannot pay workers cash directly. All money flows: subscriber → platform (mobile money) → worker (mobile money). No exceptions. Prevents leakage; ensures revenue capture; protects workers from disputes.

### 9.5 Multi-country / multi-currency / multi-language from day one
Adding Cotonou, Dakar, Accra, Abidjan, Lagos is configuration + payment-provider onboarding, not code rewrites. Every record carries country + currency + locale.

### 9.6 Immutable audit log
Every state-changing operation across every service emits a domain event. Append-only. Replayable. Compliance-grade. Foundation for disputes, ML training, regulatory inquiries.

### 9.7 Smartphone-first across all income segments
No feature-phone fallback by default. Lomé low-income and middle-income users have Android smartphones. Designing around assumptions otherwise reproduces development-economics stereotypes that are outdated for urban West Africa.

### 9.8 Payment-provider abstraction
CinetPay and PayDunya both supported. Failover from one to the other is config + retry, not code. Pattern extends to Phase 4-6 anglophone payment rails (Paystack/Flutterwave for Ghana/Nigeria).

### 9.9 Number masking for all client-worker communication
The worker entering a stranger's home should never see the subscriber's real phone number, and vice versa. All voice calls and SMS route through the platform via LiveKit + Africa's Talking shortcodes. Channel auto-closes when relationship ends.

### 9.10 First-class voice messaging and VoIP calling
WhatsApp-style voice messages and in-app voice calls between matched subscriber-worker pairs. Real-time, transcribed, translation-on-demand, operator-escalation-capable, recording-opt-in for safety.

---

## 10. Phasing & milestones

### 10.1 Pre-build (weeks 1-3)

- Lomé in-person research: 12 subscribers + 8 workers
- Legal: company registration, contractor agreement template, payment provider onboarding (CinetPay + PayDunya)
- Brand identity + name validation (Washed trademark check)
- Hire research coordinator in Lomé (part-time)
- Reference device procurement
- Design system (Figma) — Subscriber + Worker + Operator
- Translator engagement (FR formal + EWE + MINA)

### 10.2 v1 build (weeks 4-N — duration determined in implementation plan)

Built to all 9.x quality bars; all 8.x testing must pass before launch.

### 10.3 Closed beta (weeks N+1 to N+8)

30 subscribers + 10 workers in Lomé; paid; weekly cadence interviews; findings rewrite spec where needed.

### 10.4 Open beta (weeks N+9 to N+12)

200 subscribers + 25 workers; free first month; full operational stack live.

### 10.5 Public launch (week N+13)

All pre-launch QA gates passed (8.9). Marketing launch. Status page public. Bug bounty program live.

### 10.6 Phase 2 Cotonou (month 12-15 post-launch)

Configuration-only addition: country code, currency (still XOF — WAEMU), Benin payment-provider activation, local research coordinator, Cotonou device lab subset. Operator-mode dispatch with eventual ML transition.

### 10.7 Subsequent phases per market sequence in 3.2

Each phase: country-specific pen-test, regulatory pre-validation, native research program, payment-rail integration, language addition, operator hiring.

---

## 11. Open questions / dependencies before implementation planning

These do not block writing the implementation plan but must be resolved during build:

1. **Counsel review of liability terms** (section 2.8) — specifically: Togolese small claims process for damaged-clothing escalation; group accident insurance carrier selection (NSIA Togo vs Sanlam Togo)
2. **CinetPay vs PayDunya as primary** — quote both, choose primary based on settlement reliability + integration quality + WAEMU coverage
3. **LiveKit self-hosted GPU sizing for Whisper** — quote Hetzner GPU options (RTX A4000 vs A5000); decide based on per-user transcription cost target
4. **Trademark check on "Washed"** — counsel to file in OAPI member states (Togo + WAEMU coverage)
5. **Banking partner for collecting subscriber money + paying out workers** — Ecobank Togo vs Orabank vs UTB; decide based on WAEMU multi-country future support
6. **Domain + brand assets** — washed.tg, washed.app, etc.
7. **Capital plan** — confirm $25-28k USD runway available before starting build
8. **Founder time commitment** — how is product ownership shared during build, beta operations, provider onboarding, research, and launch preparation?

---

## 12. Files referenced

All in `/Users/tomegah/washed/`:

- `research/financial_model.py` + `2026-04-28-financial-model-results.md` — pricing/worker-model viability matrix
- `research/capital_model.py` + `2026-04-28-capital-requirements.md` — month-by-month cash flow
- `research/projections_model.py` + `2026-04-28-projections-and-market.md` — 5-year projections, competitive scan
- `research/sam_v2_researched.py` + `2026-04-28-sam-v2-researched.md` — researched SAM with sources
- `docs/specs/2026-04-28-washed-v1-design.md` — this document

---

## 13. Approval & next steps

This design represents the complete v1 product and system specification. Once approved by the founder:

1. Founder reviews this document and signals approval or requests revisions
2. On approval, transition to **writing-plans** skill to produce the implementation plan
3. Implementation plan will sequence: research → legal/setup → infra → backend services → mobile apps → operator console → integration testing → closed beta → open beta → public launch

**No code is written and no implementation skill is invoked until this spec is approved.**
