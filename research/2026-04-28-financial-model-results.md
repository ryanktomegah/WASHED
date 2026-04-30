# Togo Laundry App — Financial Viability Model

**Date:** 2026-04-28
**FX assumption:** 1 USD ≈ 605 XOF


## 1. Validated inputs

- Togo SMIG (minimum wage, gross): **52,500 XOF/month** (~$87 USD)
- Founder's worker target salary (gross): **60,000 XOF/month** (~$99 USD)
- Employer payroll burden (CNSS + INAM + accident + training): **25%**
- Mobile money fee per transaction: **2%**
- Platform fixed monthly costs (MVP scale): **1,000,000 XOF (~$1653/mo)**


## 2. Tier-level economics (revenue per visit by tier)

This is the load-bearing number. The platform's gross revenue per *delivered visit* depends on which tier the subscriber bought.

### Founder's original (2k/2.5k/3k)

| Tier | Price/mo | Visits/mo | Revenue per visit |
|------|---------:|----------:|------------------:|
| T1 | 2,000 XOF | 1 | 2,000 XOF |
| T2 | 2,500 XOF | 2 | 1,250 XOF |
| T3 | 3,000 XOF | 4 | 750 XOF |

**Insight:** higher-engagement tiers have *lower* revenue per visit. T3 in floor pricing yields just 750 XOF/visit — that's the constraint to design around.

### Founder's ceiling (2.5k/3.5k/5k)

| Tier | Price/mo | Visits/mo | Revenue per visit |
|------|---------:|----------:|------------------:|
| T1 | 2,500 XOF | 1 | 2,500 XOF |
| T2 | 3,500 XOF | 2 | 1,750 XOF |
| T3 | 5,000 XOF | 4 | 1,250 XOF |

**Insight:** higher-engagement tiers have *lower* revenue per visit. T3 in floor pricing yields just 750 XOF/visit — that's the constraint to design around.

### TS-α: math-optimal (2.5k/4.5k/7.5k)

| Tier | Price/mo | Visits/mo | Revenue per visit |
|------|---------:|----------:|------------------:|
| T1 | 2,500 XOF | 1 | 2,500 XOF |
| T2 | 4,500 XOF | 2 | 2,250 XOF |
| T3 | 7,500 XOF | 4 | 1,875 XOF |

**Insight:** higher-engagement tiers have *lower* revenue per visit. T3 in floor pricing yields just 750 XOF/visit — that's the constraint to design around.

### TS-β: two-tier within 5k cap (2.5k/4.5k)

| Tier | Price/mo | Visits/mo | Revenue per visit |
|------|---------:|----------:|------------------:|
| T1 | 2,500 XOF | 1 | 2,500 XOF |
| T2 | 4,500 XOF | 2 | 2,250 XOF |
| T3 | 4,500 XOF | 2 | 2,250 XOF |

**Insight:** higher-engagement tiers have *lower* revenue per visit. T3 in floor pricing yields just 750 XOF/visit — that's the constraint to design around.

### TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits)

| Tier | Price/mo | Visits/mo | Revenue per visit |
|------|---------:|----------:|------------------:|
| T1 | 2,500 XOF | 1 | 2,500 XOF |
| T2 | 4,000 XOF | 2 | 2,000 XOF |
| T3 | 5,000 XOF | 3 | 1,667 XOF |

**Insight:** higher-engagement tiers have *lower* revenue per visit. T3 in floor pricing yields just 750 XOF/visit — that's the constraint to design around.


## 3. Subscriber-mix metrics by pricing scenario

Weighted ARPU and revenue per visit for each subscriber-mix × pricing combination.

| Pricing | Mix | ARPU (XOF/mo) | Visits/sub/mo | Rev/visit (XOF) |
|---------|-----|--------------:|--------------:|----------------:|
| Founder's original (2k/2.5k/3k) | Bear (60/30/10 — price-sensitive) | 2,250 | 1.60 | 1,406 |
| Founder's original (2k/2.5k/3k) | Base (30/50/20 — balanced) | 2,450 | 2.10 | 1,167 |
| Founder's original (2k/2.5k/3k) | Bull (15/45/40 — engaged subscribers) | 2,625 | 2.65 | 991 |
| Founder's ceiling (2.5k/3.5k/5k) | Bear (60/30/10 — price-sensitive) | 3,050 | 1.60 | 1,906 |
| Founder's ceiling (2.5k/3.5k/5k) | Base (30/50/20 — balanced) | 3,500 | 2.10 | 1,667 |
| Founder's ceiling (2.5k/3.5k/5k) | Bull (15/45/40 — engaged subscribers) | 3,950 | 2.65 | 1,491 |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Bear (60/30/10 — price-sensitive) | 3,600 | 1.60 | 2,250 |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Base (30/50/20 — balanced) | 4,500 | 2.10 | 2,143 |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Bull (15/45/40 — engaged subscribers) | 5,400 | 2.65 | 2,038 |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Bear (60/30/10 — price-sensitive) | 3,300 | 1.40 | 2,357 |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Base (30/50/20 — balanced) | 3,900 | 1.70 | 2,294 |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Bull (15/45/40 — engaged subscribers) | 4,200 | 1.85 | 2,270 |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Bear (60/30/10 — price-sensitive) | 3,200 | 1.50 | 2,133 |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Base (30/50/20 — balanced) | 3,750 | 1.90 | 1,974 |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Bull (15/45/40 — engaged subscribers) | 4,175 | 2.25 | 1,856 |


## 4. Worker-model viability matrix

For each (pricing × mix × capacity) combination, we compute whether each worker model produces a non-negative platform margin per worker AND keeps worker income at-or-above SMIG.

Legend: **OK** = viable (positive margin AND worker ≥ SMIG); **FAIL** = unviable on at least one axis.

### Founder's original (2k/2.5k/3k)

#### Mix: Bear (60/30/10 — price-sensitive)
_ARPU 2,250 XOF/mo · Visits/sub 1.60 · Rev/visit 1,406 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    50,625 |   -24,375 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    50,625 |   +14,625 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    50,625 |   -10,975 | FAIL (slow-month margin: -25,488) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    37,969 |    50,625 |   +12,656 | FAIL |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    67,500 |    -7,500 | FAIL |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    67,500 |   +19,500 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    67,500 |    -1,300 | FAIL (slow-month margin: -20,650) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    50,625 |    67,500 |   +16,875 | FAIL |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    84,375 |    +9,375 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |    84,375 |   +24,375 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |    84,375 |    +8,375 | OK (slow-month margin: -15,812) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    63,281 |    84,375 |   +21,094 | OK |

#### Mix: Base (30/50/20 — balanced)
_ARPU 2,450 XOF/mo · Visits/sub 2.10 · Rev/visit 1,167 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    42,000 |   -33,000 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    42,000 |    +6,000 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    42,000 |   -19,600 | FAIL (slow-month margin: -29,800) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    31,500 |    42,000 |   +10,500 | FAIL |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    56,000 |   -19,000 | FAIL |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    56,000 |    +8,000 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    56,000 |   -12,800 | FAIL (slow-month margin: -26,400) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    42,000 |    56,000 |   +14,000 | FAIL |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    70,000 |    -5,000 | FAIL |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |    70,000 |   +10,000 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |    70,000 |    -6,000 | FAIL (slow-month margin: -23,000) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    52,500 |    70,000 |   +17,500 | FAIL |

#### Mix: Bull (15/45/40 — engaged subscribers)
_ARPU 2,625 XOF/mo · Visits/sub 2.65 · Rev/visit 991 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    35,660 |   -39,340 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    35,660 |      -340 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    35,660 |   -25,940 | FAIL (slow-month margin: -32,970) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    26,745 |    35,660 |    +8,915 | FAIL |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    47,547 |   -27,453 | FAIL |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    47,547 |      -453 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    47,547 |   -21,253 | FAIL (slow-month margin: -30,626) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    35,660 |    47,547 |   +11,887 | FAIL |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    59,434 |   -15,566 | FAIL |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |    59,434 |      -566 | FAIL (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |    59,434 |   -16,566 | FAIL (slow-month margin: -28,283) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    44,575 |    59,434 |   +14,858 | FAIL |

### Founder's ceiling (2.5k/3.5k/5k)

#### Mix: Bear (60/30/10 — price-sensitive)
_ARPU 3,050 XOF/mo · Visits/sub 1.60 · Rev/visit 1,906 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    68,625 |    -6,375 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    68,625 |   +32,625 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    68,625 |    +7,025 | OK (slow-month margin: -16,488) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    51,469 |    68,625 |   +17,156 | FAIL |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    91,500 |   +16,500 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    91,500 |   +43,500 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    91,500 |   +22,700 | OK (slow-month margin: -8,650) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    68,625 |    91,500 |   +22,875 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   114,375 |   +39,375 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   114,375 |   +54,375 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   114,375 |   +38,375 | OK (slow-month margin: -812) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    85,781 |   114,375 |   +28,594 | OK |

#### Mix: Base (30/50/20 — balanced)
_ARPU 3,500 XOF/mo · Visits/sub 2.10 · Rev/visit 1,667 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    60,000 |   -15,000 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    60,000 |   +24,000 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    60,000 |    -1,600 | FAIL (slow-month margin: -20,800) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    45,000 |    60,000 |   +15,000 | FAIL |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    80,000 |    +5,000 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    80,000 |   +32,000 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    80,000 |   +11,200 | OK (slow-month margin: -14,400) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    60,000 |    80,000 |   +20,000 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   100,000 |   +25,000 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   100,000 |   +40,000 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   100,000 |   +24,000 | OK (slow-month margin: -8,000) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    75,000 |   100,000 |   +25,000 | OK |

#### Mix: Bull (15/45/40 — engaged subscribers)
_ARPU 3,950 XOF/mo · Visits/sub 2.65 · Rev/visit 1,491 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    53,660 |   -21,340 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    53,660 |   +17,660 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    53,660 |    -7,940 | FAIL (slow-month margin: -23,970) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    40,245 |    53,660 |   +13,415 | FAIL |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    71,547 |    -3,453 | FAIL |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    71,547 |   +23,547 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    71,547 |    +2,747 | OK (slow-month margin: -18,626) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    53,660 |    71,547 |   +17,887 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    89,434 |   +14,434 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |    89,434 |   +29,434 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |    89,434 |   +13,434 | OK (slow-month margin: -13,283) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    67,075 |    89,434 |   +22,358 | OK |

### TS-α: math-optimal (2.5k/4.5k/7.5k)

#### Mix: Bear (60/30/10 — price-sensitive)
_ARPU 3,600 XOF/mo · Visits/sub 1.60 · Rev/visit 2,250 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    81,000 |    +6,000 | OK |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    81,000 |   +45,000 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    81,000 |   +19,400 | OK (slow-month margin: -10,300) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    60,750 |    81,000 |   +20,250 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   108,000 |   +33,000 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |   108,000 |   +60,000 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |   108,000 |   +39,200 | OK (slow-month margin: -400) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    81,000 |   108,000 |   +27,000 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   135,000 |   +60,000 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   135,000 |   +75,000 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   135,000 |   +59,000 | OK (slow-month margin: +9,500) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |   101,250 |   135,000 |   +33,750 | OK |

#### Mix: Base (30/50/20 — balanced)
_ARPU 4,500 XOF/mo · Visits/sub 2.10 · Rev/visit 2,143 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    77,143 |    +2,143 | OK |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    77,143 |   +41,143 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    77,143 |   +15,543 | OK (slow-month margin: -12,229) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    57,857 |    77,143 |   +19,286 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   102,857 |   +27,857 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |   102,857 |   +54,857 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |   102,857 |   +34,057 | OK (slow-month margin: -2,971) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    77,143 |   102,857 |   +25,714 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   128,571 |   +53,571 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   128,571 |   +68,571 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   128,571 |   +52,571 | OK (slow-month margin: +6,286) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    96,429 |   128,571 |   +32,143 | OK |

#### Mix: Bull (15/45/40 — engaged subscribers)
_ARPU 5,400 XOF/mo · Visits/sub 2.65 · Rev/visit 2,038 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    73,358 |    -1,642 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    73,358 |   +37,358 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    73,358 |   +11,758 | OK (slow-month margin: -14,121) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    55,019 |    73,358 |   +18,340 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    97,811 |   +22,811 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    97,811 |   +49,811 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    97,811 |   +29,011 | OK (slow-month margin: -5,494) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    73,358 |    97,811 |   +24,453 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   122,264 |   +47,264 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   122,264 |   +62,264 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   122,264 |   +46,264 | OK (slow-month margin: +3,132) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    91,698 |   122,264 |   +30,566 | OK |

### TS-β: two-tier within 5k cap (2.5k/4.5k)

#### Mix: Bear (60/30/10 — price-sensitive)
_ARPU 3,300 XOF/mo · Visits/sub 1.40 · Rev/visit 2,357 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    84,857 |    +9,857 | OK |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    84,857 |   +48,857 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    84,857 |   +23,257 | OK (slow-month margin: -8,371) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    63,643 |    84,857 |   +21,214 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   113,143 |   +38,143 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |   113,143 |   +65,143 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |   113,143 |   +44,343 | OK (slow-month margin: +2,171) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    84,857 |   113,143 |   +28,286 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   141,429 |   +66,429 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   141,429 |   +81,429 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   141,429 |   +65,429 | OK (slow-month margin: +12,714) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |   106,071 |   141,429 |   +35,357 | OK |

#### Mix: Base (30/50/20 — balanced)
_ARPU 3,900 XOF/mo · Visits/sub 1.70 · Rev/visit 2,294 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    82,588 |    +7,588 | OK |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    82,588 |   +46,588 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    82,588 |   +20,988 | OK (slow-month margin: -9,506) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    61,941 |    82,588 |   +20,647 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   110,118 |   +35,118 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |   110,118 |   +62,118 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |   110,118 |   +41,318 | OK (slow-month margin: +659) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    82,588 |   110,118 |   +27,529 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   137,647 |   +62,647 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   137,647 |   +77,647 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   137,647 |   +61,647 | OK (slow-month margin: +10,824) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |   103,235 |   137,647 |   +34,412 | OK |

#### Mix: Bull (15/45/40 — engaged subscribers)
_ARPU 4,200 XOF/mo · Visits/sub 1.85 · Rev/visit 2,270 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    81,730 |    +6,730 | OK |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    81,730 |   +45,730 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    81,730 |   +20,130 | OK (slow-month margin: -9,935) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    61,297 |    81,730 |   +20,432 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   108,973 |   +33,973 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |   108,973 |   +60,973 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |   108,973 |   +40,173 | OK (slow-month margin: +86) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    81,730 |   108,973 |   +27,243 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   136,216 |   +61,216 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   136,216 |   +76,216 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   136,216 |   +60,216 | OK (slow-month margin: +10,108) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |   102,162 |   136,216 |   +34,054 | OK |

### TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits)

#### Mix: Bear (60/30/10 — price-sensitive)
_ARPU 3,200 XOF/mo · Visits/sub 1.50 · Rev/visit 2,133 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    76,800 |    +1,800 | OK |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    76,800 |   +40,800 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    76,800 |   +15,200 | OK (slow-month margin: -12,400) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    57,600 |    76,800 |   +19,200 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   102,400 |   +27,400 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |   102,400 |   +54,400 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |   102,400 |   +33,600 | OK (slow-month margin: -3,200) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    76,800 |   102,400 |   +25,600 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   128,000 |   +53,000 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   128,000 |   +68,000 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   128,000 |   +52,000 | OK (slow-month margin: +6,000) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    96,000 |   128,000 |   +32,000 | OK |

#### Mix: Base (30/50/20 — balanced)
_ARPU 3,750 XOF/mo · Visits/sub 1.90 · Rev/visit 1,974 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    71,053 |    -3,947 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    71,053 |   +35,053 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    71,053 |    +9,453 | OK (slow-month margin: -15,274) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    53,289 |    71,053 |   +17,763 | OK |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    94,737 |   +19,737 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    94,737 |   +46,737 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    94,737 |   +25,937 | OK (slow-month margin: -7,032) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    71,053 |    94,737 |   +23,684 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   118,421 |   +43,421 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   118,421 |   +58,421 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   118,421 |   +42,421 | OK (slow-month margin: +1,211) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    88,816 |   118,421 |   +29,605 | OK |

#### Mix: Bull (15/45/40 — engaged subscribers)
_ARPU 4,175 XOF/mo · Visits/sub 2.25 · Rev/visit 1,856 XOF_

| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |
|----------|-------|---------------------:|---------------:|--------------:|---------|
| Conservative (1.5/day = 36/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    66,800 |    -8,200 | FAIL |
| Conservative (1.5/day = 36/mo) | B — Gig @ 1000/visit |    36,000 |    66,800 |   +30,800 | FAIL (worker SMIG-OK: False) |
| Conservative (1.5/day = 36/mo) | C — Hybrid (40k + 600/visit) |    61,600 |    66,800 |    +5,200 | OK (slow-month margin: -17,400) |
| Conservative (1.5/day = 36/mo) | D — Coop (25% platform cut) |    50,100 |    66,800 |   +16,700 | FAIL |
| Base (2.0/day = 48/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |    89,067 |   +14,067 | OK |
| Base (2.0/day = 48/mo) | B — Gig @ 1000/visit |    48,000 |    89,067 |   +41,067 | FAIL (worker SMIG-OK: False) |
| Base (2.0/day = 48/mo) | C — Hybrid (40k + 600/visit) |    68,800 |    89,067 |   +20,267 | OK (slow-month margin: -9,867) |
| Base (2.0/day = 48/mo) | D — Coop (25% platform cut) |    66,800 |    89,067 |   +22,267 | OK |
| Aggressive (2.5/day = 60/mo) | A — Employed (60k gross, 25% burden) |    75,000 (incl. burden) |   111,333 |   +36,333 | OK |
| Aggressive (2.5/day = 60/mo) | B — Gig @ 1000/visit |    60,000 |   111,333 |   +51,333 | OK (worker SMIG-OK: True) |
| Aggressive (2.5/day = 60/mo) | C — Hybrid (40k + 600/visit) |    76,000 |   111,333 |   +35,333 | OK (slow-month margin: -2,333) |
| Aggressive (2.5/day = 60/mo) | D — Coop (25% platform cut) |    83,500 |   111,333 |   +27,833 | OK |


## 5. Edge cases & stress tests

### 5.1 Slow month (50% capacity) — worker income floor stress

Models B and D pay workers proportionally to demand — slow months hammer worker income. Model C absorbs slow-month risk into the platform via the floor.

Slow-month worker pay (Base mix, Base capacity = 24 visits actual):

| Model | Worker income (slow) | Above SMIG? |
|-------|---------------------:|-------------|
| Founder's original (2k/2.5k/3k) — B Gig | 24,000 | FAIL |
| Founder's original (2k/2.5k/3k) — C Hybrid | 54,400 | OK |
| Founder's original (2k/2.5k/3k) — D Coop | 21,000 | FAIL |
| Founder's ceiling (2.5k/3.5k/5k) — B Gig | 24,000 | FAIL |
| Founder's ceiling (2.5k/3.5k/5k) — C Hybrid | 54,400 | OK |
| Founder's ceiling (2.5k/3.5k/5k) — D Coop | 30,000 | FAIL |
| TS-α: math-optimal (2.5k/4.5k/7.5k) — B Gig | 24,000 | FAIL |
| TS-α: math-optimal (2.5k/4.5k/7.5k) — C Hybrid | 54,400 | OK |
| TS-α: math-optimal (2.5k/4.5k/7.5k) — D Coop | 38,571 | FAIL |
| TS-β: two-tier within 5k cap (2.5k/4.5k) — B Gig | 24,000 | FAIL |
| TS-β: two-tier within 5k cap (2.5k/4.5k) — C Hybrid | 54,400 | OK |
| TS-β: two-tier within 5k cap (2.5k/4.5k) — D Coop | 41,294 | FAIL |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) — B Gig | 24,000 | FAIL |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) — C Hybrid | 54,400 | OK |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) — D Coop | 35,526 | FAIL |

### 5.2 Worker:subscriber ratio — operational density

How many subscribers does each worker need to serve to cover their own all-in cost? And does that fit inside their physical capacity?

| Pricing | Mix | Model | Subs/worker (breakeven) | Visits required | Capacity room |
|---------|-----|-------|------------------------:|----------------:|---------------|
| Founder's original (2k/2.5k/3k) | Bear (60/30/10 — price-sensitive) | A | 33.3 | 53 | OVER capacity by 5 visits |
| Founder's original (2k/2.5k/3k) | Base (30/50/20 — balanced) | A | 30.6 | 64 | OVER capacity by 16 visits |
| Founder's original (2k/2.5k/3k) | Bull (15/45/40 — engaged subscribers) | A | 28.6 | 76 | OVER capacity by 28 visits |
| Founder's ceiling (2.5k/3.5k/5k) | Bear (60/30/10 — price-sensitive) | A | 24.6 | 39 | fits in 48/mo |
| Founder's ceiling (2.5k/3.5k/5k) | Base (30/50/20 — balanced) | A | 21.4 | 45 | fits in 48/mo |
| Founder's ceiling (2.5k/3.5k/5k) | Bull (15/45/40 — engaged subscribers) | A | 19.0 | 50 | OVER capacity by 2 visits |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Bear (60/30/10 — price-sensitive) | A | 20.8 | 33 | fits in 48/mo |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Base (30/50/20 — balanced) | A | 16.7 | 35 | fits in 48/mo |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Bull (15/45/40 — engaged subscribers) | A | 13.9 | 37 | fits in 48/mo |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Bear (60/30/10 — price-sensitive) | A | 22.7 | 32 | fits in 48/mo |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Base (30/50/20 — balanced) | A | 19.2 | 33 | fits in 48/mo |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Bull (15/45/40 — engaged subscribers) | A | 17.9 | 33 | fits in 48/mo |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Bear (60/30/10 — price-sensitive) | A | 23.4 | 35 | fits in 48/mo |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Base (30/50/20 — balanced) | A | 20.0 | 38 | fits in 48/mo |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Bull (15/45/40 — engaged subscribers) | A | 18.0 | 40 | fits in 48/mo |

### 5.3 Platform-level break-even (subscribers needed to cover fixed costs)

Fixed platform overhead: 1,000,000 XOF/month (~$1653/mo). Variable margin per subscriber depends on worker model and tier mix.

Using Model C (hybrid, 40k floor + 600/visit), platform contribution per subscriber = (ARPU − pro-rated worker pay − mobile-money fee).

| Pricing | Mix | Contribution/sub/mo | Subs needed for break-even |
|---------|-----|--------------------:|---------------------------:|
| Founder's original (2k/2.5k/3k) | Bear (60/30/10 — price-sensitive) | -88 XOF | INFEASIBLE (negative contribution) |
| Founder's original (2k/2.5k/3k) | Base (30/50/20 — balanced) | -609 XOF | INFEASIBLE (negative contribution) |
| Founder's original (2k/2.5k/3k) | Bull (15/45/40 — engaged subscribers) | -1,226 XOF | INFEASIBLE (negative contribution) |
| Founder's ceiling (2.5k/3.5k/5k) | Bear (60/30/10 — price-sensitive) | +696 XOF | 1,437 |
| Founder's ceiling (2.5k/3.5k/5k) | Base (30/50/20 — balanced) | +420 XOF | 2,381 |
| Founder's ceiling (2.5k/3.5k/5k) | Bull (15/45/40 — engaged subscribers) | +73 XOF | 13,761 |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Bear (60/30/10 — price-sensitive) | +1,235 XOF | 810 |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Base (30/50/20 — balanced) | +1,400 XOF | 714 |
| TS-α: math-optimal (2.5k/4.5k/7.5k) | Bull (15/45/40 — engaged subscribers) | +1,494 XOF | 669 |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Bear (60/30/10 — price-sensitive) | +1,227 XOF | 815 |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Base (30/50/20 — balanced) | +1,385 XOF | 722 |
| TS-β: two-tier within 5k cap (2.5k/4.5k) | Bull (15/45/40 — engaged subscribers) | +1,464 XOF | 683 |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Bear (60/30/10 — price-sensitive) | +986 XOF | 1,014 |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Base (30/50/20 — balanced) | +952 XOF | 1,051 |
| TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits) | Bull (15/45/40 — engaged subscribers) | +866 XOF | 1,154 |


## 6. Recommendation logic

A worker model is *recommended* if it satisfies ALL of the following at the **Base mix × Base capacity (48 visits/mo)** scenario:

- Worker income at full capacity ≥ SMIG (52,500 XOF)
- Worker income at 50% capacity ≥ SMIG (slow-month survival)
- Platform margin per worker ≥ 0 (unit economics work)
- Platform contribution per subscriber > 0 (fixed costs are reachable)

### Founder's original (2k/2.5k/3k)

| Model | Worker SMIG (full) | Worker SMIG (slow) | Margin (full) | Margin (slow / overhead) | All-OK |
|-------|--------------------|--------------------|---------------|--------------------------|--------|
| A — Employed @ 60k | OK | OK | FAIL | FAIL | **FAIL** |
| B — Gig @ 1000/visit | FAIL | FAIL | OK | OK | **FAIL** |
| C — Hybrid (40k + 600/visit) | OK | OK | FAIL | FAIL | **FAIL** |
| D — Coop (25% platform cut) | FAIL | FAIL | OK | OK | **FAIL** |

### Founder's ceiling (2.5k/3.5k/5k)

| Model | Worker SMIG (full) | Worker SMIG (slow) | Margin (full) | Margin (slow / overhead) | All-OK |
|-------|--------------------|--------------------|---------------|--------------------------|--------|
| A — Employed @ 60k | OK | OK | OK | FAIL | **FAIL** |
| B — Gig @ 1000/visit | FAIL | FAIL | OK | OK | **FAIL** |
| C — Hybrid (40k + 600/visit) | OK | OK | OK | FAIL | **FAIL** |
| D — Coop (25% platform cut) | OK | FAIL | OK | OK | **FAIL** |

### TS-α: math-optimal (2.5k/4.5k/7.5k)

| Model | Worker SMIG (full) | Worker SMIG (slow) | Margin (full) | Margin (slow / overhead) | All-OK |
|-------|--------------------|--------------------|---------------|--------------------------|--------|
| A — Employed @ 60k | OK | OK | OK | FAIL | **FAIL** |
| B — Gig @ 1000/visit | FAIL | FAIL | OK | OK | **FAIL** |
| C — Hybrid (40k + 600/visit) | OK | OK | OK | FAIL | **FAIL** |
| D — Coop (25% platform cut) | OK | FAIL | OK | OK | **FAIL** |

### TS-β: two-tier within 5k cap (2.5k/4.5k)

| Model | Worker SMIG (full) | Worker SMIG (slow) | Margin (full) | Margin (slow / overhead) | All-OK |
|-------|--------------------|--------------------|---------------|--------------------------|--------|
| A — Employed @ 60k | OK | OK | OK | OK | **OK** |
| B — Gig @ 1000/visit | FAIL | FAIL | OK | OK | **FAIL** |
| C — Hybrid (40k + 600/visit) | OK | OK | OK | OK | **OK** |
| D — Coop (25% platform cut) | OK | FAIL | OK | OK | **FAIL** |

### TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits)

| Model | Worker SMIG (full) | Worker SMIG (slow) | Margin (full) | Margin (slow / overhead) | All-OK |
|-------|--------------------|--------------------|---------------|--------------------------|--------|
| A — Employed @ 60k | OK | OK | OK | FAIL | **FAIL** |
| B — Gig @ 1000/visit | FAIL | FAIL | OK | OK | **FAIL** |
| C — Hybrid (40k + 600/visit) | OK | OK | OK | FAIL | **FAIL** |
| D — Coop (25% platform cut) | OK | FAIL | OK | OK | **FAIL** |

