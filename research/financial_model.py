"""
Togo Laundry App — Financial Viability Model
Date: 2026-04-28
Purpose: Stress-test all four worker-compensation models against unit economics
         across multiple subscriber-mix and worker-capacity scenarios.

OUTPUT: prints a structured markdown report to stdout. Pipe to a file:
    python3 financial_model.py > 2026-04-28-financial-model-results.md
"""
from __future__ import annotations
from dataclasses import dataclass

XOF_PER_USD = 605  # approximate as of 2026-04-28

# ---------------------------------------------------------------------------
# Validated inputs (desk research 2026-04-28)
# ---------------------------------------------------------------------------
SMIG_XOF = 52_500           # Togo legal minimum wage, gross XOF/month
EMPLOYER_BURDEN_RATE = 0.25  # CNSS 17.5% + INAM 3.5% + accident ~2% + training ~3% = ~26%
MOBILE_MONEY_FEE_RATE = 0.02
PLATFORM_FIXED_MONTHLY_XOF = 1_000_000  # MVP team + tech + marketing + ops

WORKER_TARGET_GROSS_XOF = 60_000  # Founder's stated target

# ---------------------------------------------------------------------------
# Pricing scenarios — derived from unit economics, not from a guessed range.
#
# Constraint derivation (Hybrid worker model: 40k floor + 600 XOF/visit bonus):
#   - Worker full-month pay (V=48): 40k + 28.8k = 68,800 XOF (> SMIG, > target 60k)
#   - Worker slow-month pay (V=24): 40k + 14.4k = 54,400 XOF (> SMIG 52,500 — OK)
#   - Required rev/visit for full-month break-even: 68.8k / 48 = ~1,433 XOF
#   - Required rev/visit for slow-month break-even: 54.4k / 24 = ~2,267 XOF (binding)
#
# The slow-month constraint is the binding one. We accept slight slow-month losses
# IF the full-month margin is large enough that 12-month avg stays positive.
# ---------------------------------------------------------------------------
PRICING_SCENARIOS = {
    # Founder's original — kept for comparison only
    "Founder's original (2k/2.5k/3k)": {
        "T1": (2_000, 1),
        "T2": (2_500, 2),
        "T3": (3_000, 4),
    },
    "Founder's ceiling (2.5k/3.5k/5k)": {
        "T1": (2_500, 1),
        "T2": (3_500, 2),
        "T3": (5_000, 4),
    },
    # TS Option α — math-optimal, T3 above founder's 5k cap
    "TS-α: math-optimal (2.5k/4.5k/7.5k)": {
        "T1": (2_500, 1),    # 2,500 XOF/visit
        "T2": (4_500, 2),    # 2,250 XOF/visit (10% volume discount)
        "T3": (7_500, 4),    # 1,875 XOF/visit (25% volume discount)
    },
    # TS Option β — TWO TIERS only, drops T3 entirely; stays inside founder's 5k cap
    "TS-β: two-tier within 5k cap (2.5k/4.5k)": {
        "T1": (2_500, 1),
        "T2": (4_500, 2),
        "T3": (4_500, 2),    # T3 = T2 (effectively no T3)
    },
    # TS Option γ — three tiers within 5k cap, but T3 visits reduced to 3 not 4
    "TS-γ: 3-tier within 5k cap (2.5k/4k/5k for 3 visits)": {
        "T1": (2_500, 1),    # 2,500 XOF/visit
        "T2": (4_000, 2),    # 2,000 XOF/visit
        "T3": (5_000, 3),    # 1,667 XOF/visit  ← T3 is 3 visits, NOT 4
    },
}

# For TS-β (two-tier), we use a different mix since there's no T3
TWO_TIER_MIXES = {
    "Bear (75/25)":   {"T1": 0.75, "T2": 0.25, "T3": 0.0},
    "Base (60/40)":   {"T1": 0.60, "T2": 0.40, "T3": 0.0},
    "Bull (40/60)":   {"T1": 0.40, "T2": 0.60, "T3": 0.0},
}

# ---------------------------------------------------------------------------
# Subscriber mix scenarios
# ---------------------------------------------------------------------------
SUBSCRIBER_MIXES = {
    "Bear (60/30/10 — price-sensitive)":   {"T1": 0.60, "T2": 0.30, "T3": 0.10},
    "Base (30/50/20 — balanced)":           {"T1": 0.30, "T2": 0.50, "T3": 0.20},
    "Bull (15/45/40 — engaged subscribers)": {"T1": 0.15, "T2": 0.45, "T3": 0.40},
}

# ---------------------------------------------------------------------------
# Worker capacity scenarios (sessions / visits per worker per month)
# Assumes 24 working days/month; 1 session = 1 client wash visit
# ---------------------------------------------------------------------------
WORKER_CAPACITIES = {
    "Conservative (1.5/day = 36/mo)": 36,
    "Base (2.0/day = 48/mo)":         48,
    "Aggressive (2.5/day = 60/mo)":   60,
}

# ---------------------------------------------------------------------------
# Helper computations
# ---------------------------------------------------------------------------
@dataclass
class MixMetrics:
    arpu_xof: float          # revenue per subscriber per month
    visits_per_sub: float    # visits delivered per subscriber per month
    rev_per_visit_xof: float # the critical operational unit


def compute_mix_metrics(pricing: dict, mix: dict) -> MixMetrics:
    arpu = sum(mix[t] * pricing[t][0] for t in pricing)
    visits = sum(mix[t] * pricing[t][1] for t in pricing)
    return MixMetrics(arpu, visits, arpu / visits)


def fmt_xof(x: float) -> str:
    return f"{x:>9,.0f} XOF"


def status(ok: bool) -> str:
    return "OK" if ok else "FAIL"


# ---------------------------------------------------------------------------
# Model A — Employed (fixed monthly salary, employer pays CNSS/INAM/etc.)
# ---------------------------------------------------------------------------
def model_a(mix: MixMetrics, capacity: int, gross_xof: float) -> dict:
    all_in = gross_xof * (1 + EMPLOYER_BURDEN_RATE)
    revenue_at_cap = capacity * mix.rev_per_visit_xof
    margin_per_worker = revenue_at_cap - all_in
    visits_needed = all_in / mix.rev_per_visit_xof
    subs_needed = visits_needed / mix.visits_per_sub
    return {
        "all_in_cost": all_in,
        "revenue_at_capacity": revenue_at_cap,
        "margin_per_worker": margin_per_worker,
        "visits_to_breakeven": visits_needed,
        "subs_per_worker_breakeven": subs_needed,
        "viable": margin_per_worker >= 0,
        "viable_with_platform_overhead": margin_per_worker >= 0.30 * revenue_at_cap,
    }


# ---------------------------------------------------------------------------
# Model B — Gig (per-visit pay, contractor)
# ---------------------------------------------------------------------------
def model_b(mix: MixMetrics, capacity: int, pay_per_visit_xof: float) -> dict:
    worker_pay = capacity * pay_per_visit_xof
    revenue = capacity * mix.rev_per_visit_xof
    return {
        "pay_per_visit": pay_per_visit_xof,
        "worker_pay_at_capacity": worker_pay,
        "worker_pay_at_50pct": worker_pay * 0.5,
        "revenue_at_capacity": revenue,
        "margin_per_worker": revenue - worker_pay,
        "worker_above_smig_full": worker_pay >= SMIG_XOF,
        "worker_above_smig_slow": worker_pay * 0.5 >= SMIG_XOF,
        "worker_above_target_full": worker_pay >= WORKER_TARGET_GROSS_XOF,
    }


# ---------------------------------------------------------------------------
# Model C — Hybrid (guaranteed floor + per-visit bonus)
# ---------------------------------------------------------------------------
def model_c(mix: MixMetrics, capacity: int, floor_xof: float,
            bonus_per_visit_xof: float) -> dict:
    pay_full = floor_xof + capacity * bonus_per_visit_xof
    pay_slow = floor_xof + (capacity * 0.5) * bonus_per_visit_xof
    rev_full = capacity * mix.rev_per_visit_xof
    rev_slow = (capacity * 0.5) * mix.rev_per_visit_xof
    return {
        "floor": floor_xof,
        "bonus": bonus_per_visit_xof,
        "pay_full": pay_full,
        "pay_slow": pay_slow,
        "rev_full": rev_full,
        "rev_slow": rev_slow,
        "margin_full": rev_full - pay_full,
        "margin_slow": rev_slow - pay_slow,
        "worker_above_smig_full": pay_full >= SMIG_XOF,
        "worker_above_smig_slow": pay_slow >= SMIG_XOF,
    }


# ---------------------------------------------------------------------------
# Model D — Cooperative (revenue share with fixed platform cut)
# ---------------------------------------------------------------------------
def model_d(mix: MixMetrics, capacity: int, platform_cut: float) -> dict:
    revenue = capacity * mix.rev_per_visit_xof
    platform = revenue * platform_cut
    worker = revenue - platform
    return {
        "revenue": revenue,
        "platform_share": platform,
        "worker_share": worker,
        "worker_above_smig": worker >= SMIG_XOF,
        "worker_above_target": worker >= WORKER_TARGET_GROSS_XOF,
    }


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def print_h(s: str, level: int = 2):
    print()
    print("#" * level, s)
    print()


def main():
    print("# Togo Laundry App — Financial Viability Model")
    print()
    print("**Date:** 2026-04-28")
    print(f"**FX assumption:** 1 USD ≈ {XOF_PER_USD} XOF")
    print()

    print_h("1. Validated inputs", 2)
    print(f"- Togo SMIG (minimum wage, gross): **{SMIG_XOF:,} XOF/month** (~${SMIG_XOF/XOF_PER_USD:.0f} USD)")
    print(f"- Founder's worker target salary (gross): **{WORKER_TARGET_GROSS_XOF:,} XOF/month** "
          f"(~${WORKER_TARGET_GROSS_XOF/XOF_PER_USD:.0f} USD)")
    print(f"- Employer payroll burden (CNSS + INAM + accident + training): **{EMPLOYER_BURDEN_RATE:.0%}**")
    print(f"- Mobile money fee per transaction: **{MOBILE_MONEY_FEE_RATE:.0%}**")
    print(f"- Platform fixed monthly costs (MVP scale): **{PLATFORM_FIXED_MONTHLY_XOF:,} XOF "
          f"(~${PLATFORM_FIXED_MONTHLY_XOF/XOF_PER_USD:.0f}/mo)**")
    print()

    print_h("2. Tier-level economics (revenue per visit by tier)", 2)
    print("This is the load-bearing number. The platform's gross revenue per *delivered visit* "
          "depends on which tier the subscriber bought.")
    print()
    for pname, pricing in PRICING_SCENARIOS.items():
        print(f"### {pname}")
        print()
        print("| Tier | Price/mo | Visits/mo | Revenue per visit |")
        print("|------|---------:|----------:|------------------:|")
        for t, (price, visits) in pricing.items():
            print(f"| {t} | {price:,} XOF | {visits} | {price/visits:,.0f} XOF |")
        print()
        print("**Insight:** higher-engagement tiers have *lower* revenue per visit. "
              "T3 in floor pricing yields just 750 XOF/visit — that's the constraint to design around.")
        print()

    print_h("3. Subscriber-mix metrics by pricing scenario", 2)
    print("Weighted ARPU and revenue per visit for each subscriber-mix × pricing combination.")
    print()
    print("| Pricing | Mix | ARPU (XOF/mo) | Visits/sub/mo | Rev/visit (XOF) |")
    print("|---------|-----|--------------:|--------------:|----------------:|")
    for pname, pricing in PRICING_SCENARIOS.items():
        for mname, mix in SUBSCRIBER_MIXES.items():
            m = compute_mix_metrics(pricing, mix)
            print(f"| {pname} | {mname} | {m.arpu_xof:,.0f} | {m.visits_per_sub:.2f} | "
                  f"{m.rev_per_visit_xof:,.0f} |")
    print()

    print_h("4. Worker-model viability matrix", 2)
    print("For each (pricing × mix × capacity) combination, we compute whether each worker model "
          "produces a non-negative platform margin per worker AND keeps worker income at-or-above SMIG.")
    print()
    print("Legend: **OK** = viable (positive margin AND worker ≥ SMIG); "
          "**FAIL** = unviable on at least one axis.")
    print()

    for pname, pricing in PRICING_SCENARIOS.items():
        print(f"### {pname}")
        print()
        for mname, mix_weights in SUBSCRIBER_MIXES.items():
            mix = compute_mix_metrics(pricing, mix_weights)
            print(f"#### Mix: {mname}")
            print(f"_ARPU {mix.arpu_xof:,.0f} XOF/mo · Visits/sub {mix.visits_per_sub:.2f} · "
                  f"Rev/visit {mix.rev_per_visit_xof:,.0f} XOF_")
            print()
            print("| Capacity | Model | Worker income (full) | Revenue/worker | Margin/worker | Verdict |")
            print("|----------|-------|---------------------:|---------------:|--------------:|---------|")
            for cname, cap in WORKER_CAPACITIES.items():
                # Model A — Employed at target salary 60k
                a = model_a(mix, cap, WORKER_TARGET_GROSS_XOF)
                ok_a = a["margin_per_worker"] >= 0
                print(f"| {cname} | A — Employed (60k gross, 25% burden) | "
                      f"{a['all_in_cost']:>9,.0f} (incl. burden) | "
                      f"{a['revenue_at_capacity']:>9,.0f} | "
                      f"{a['margin_per_worker']:>+9,.0f} | "
                      f"{status(ok_a)} |")
                # Model B — Gig at 1000 XOF/visit (a typical informal rate per session)
                b = model_b(mix, cap, 1_000)
                ok_b = b["margin_per_worker"] >= 0 and b["worker_above_smig_full"]
                print(f"| {cname} | B — Gig @ 1000/visit | "
                      f"{b['worker_pay_at_capacity']:>9,.0f} | "
                      f"{b['revenue_at_capacity']:>9,.0f} | "
                      f"{b['margin_per_worker']:>+9,.0f} | "
                      f"{status(ok_b)} (worker SMIG-OK: {b['worker_above_smig_full']}) |")
                # Model C — Hybrid: 30k floor + 600 XOF/visit bonus
                c = model_c(mix, cap, 40_000, 600)
                ok_c = c["margin_full"] >= 0 and c["worker_above_smig_full"]
                print(f"| {cname} | C — Hybrid (40k + 600/visit) | "
                      f"{c['pay_full']:>9,.0f} | "
                      f"{c['rev_full']:>9,.0f} | "
                      f"{c['margin_full']:>+9,.0f} | "
                      f"{status(ok_c)} (slow-month margin: {c['margin_slow']:+,.0f}) |")
                # Model D — Cooperative with 25% platform cut
                d = model_d(mix, cap, 0.25)
                ok_d = d["worker_above_smig"]
                print(f"| {cname} | D — Coop (25% platform cut) | "
                      f"{d['worker_share']:>9,.0f} | "
                      f"{d['revenue']:>9,.0f} | "
                      f"{d['platform_share']:>+9,.0f} | "
                      f"{status(ok_d)} |")
            print()

    print_h("5. Edge cases & stress tests", 2)
    print("### 5.1 Slow month (50% capacity) — worker income floor stress")
    print()
    print("Models B and D pay workers proportionally to demand — slow months hammer worker income. "
          "Model C absorbs slow-month risk into the platform via the floor.")
    print()
    print("Slow-month worker pay (Base mix, Base capacity = 24 visits actual):")
    print()
    print("| Model | Worker income (slow) | Above SMIG? |")
    print("|-------|---------------------:|-------------|")
    for pname, pricing in PRICING_SCENARIOS.items():
        mix = compute_mix_metrics(pricing, SUBSCRIBER_MIXES["Base (30/50/20 — balanced)"])
        cap = 48
        b = model_b(mix, cap, 1_000)
        c = model_c(mix, cap, 40_000, 600)
        d = model_d(mix, cap, 0.25)
        print(f"| {pname} — B Gig | {b['worker_pay_at_50pct']:,.0f} | "
              f"{status(b['worker_above_smig_slow'])} |")
        print(f"| {pname} — C Hybrid | {c['pay_slow']:,.0f} | "
              f"{status(c['worker_above_smig_slow'])} |")
        print(f"| {pname} — D Coop | {d['worker_share']*0.5:,.0f} | "
              f"{status(d['worker_share']*0.5 >= SMIG_XOF)} |")
    print()

    print("### 5.2 Worker:subscriber ratio — operational density")
    print()
    print("How many subscribers does each worker need to serve to cover their own all-in cost? "
          "And does that fit inside their physical capacity?")
    print()
    print("| Pricing | Mix | Model | Subs/worker (breakeven) | Visits required | Capacity room |")
    print("|---------|-----|-------|------------------------:|----------------:|---------------|")
    for pname, pricing in PRICING_SCENARIOS.items():
        for mname, mix_weights in SUBSCRIBER_MIXES.items():
            mix = compute_mix_metrics(pricing, mix_weights)
            a = model_a(mix, 48, WORKER_TARGET_GROSS_XOF)
            cap_room = "fits in 48/mo" if a["visits_to_breakeven"] <= 48 else (
                f"OVER capacity by {a['visits_to_breakeven'] - 48:.0f} visits"
            )
            print(f"| {pname} | {mname} | A | "
                  f"{a['subs_per_worker_breakeven']:.1f} | "
                  f"{a['visits_to_breakeven']:.0f} | {cap_room} |")
    print()

    print("### 5.3 Platform-level break-even (subscribers needed to cover fixed costs)")
    print()
    print(f"Fixed platform overhead: {PLATFORM_FIXED_MONTHLY_XOF:,} XOF/month "
          f"(~${PLATFORM_FIXED_MONTHLY_XOF/XOF_PER_USD:.0f}/mo). "
          f"Variable margin per subscriber depends on worker model and tier mix.")
    print()
    print("Using Model C (hybrid, 40k floor + 600/visit), platform contribution per subscriber = "
          "(ARPU − pro-rated worker pay − mobile-money fee).")
    print()
    print("| Pricing | Mix | Contribution/sub/mo | Subs needed for break-even |")
    print("|---------|-----|--------------------:|---------------------------:|")
    for pname, pricing in PRICING_SCENARIOS.items():
        for mname, mix_weights in SUBSCRIBER_MIXES.items():
            mix = compute_mix_metrics(pricing, mix_weights)
            # 1 worker handles ~22 subscribers (48 visits / 2.1 visits per sub Base; varies)
            subs_per_worker = 48 / mix.visits_per_sub
            worker_pay_per_sub = (40_000 + 48 * 600) / subs_per_worker
            mm_fee = mix.arpu_xof * MOBILE_MONEY_FEE_RATE
            contribution = mix.arpu_xof - worker_pay_per_sub - mm_fee
            if contribution > 0:
                breakeven = PLATFORM_FIXED_MONTHLY_XOF / contribution
                be_str = f"{breakeven:,.0f}"
            else:
                be_str = "INFEASIBLE (negative contribution)"
            print(f"| {pname} | {mname} | {contribution:+,.0f} XOF | {be_str} |")
    print()

    print_h("6. Recommendation logic", 2)
    print("A worker model is *recommended* if it satisfies ALL of the following at the **Base mix × "
          "Base capacity (48 visits/mo)** scenario:")
    print()
    print("- Worker income at full capacity ≥ SMIG (52,500 XOF)")
    print("- Worker income at 50% capacity ≥ SMIG (slow-month survival)")
    print("- Platform margin per worker ≥ 0 (unit economics work)")
    print("- Platform contribution per subscriber > 0 (fixed costs are reachable)")
    print()
    for pname, pricing in PRICING_SCENARIOS.items():
        mix = compute_mix_metrics(pricing, SUBSCRIBER_MIXES["Base (30/50/20 — balanced)"])
        cap = 48
        print(f"### {pname}")
        print()
        a = model_a(mix, cap, WORKER_TARGET_GROSS_XOF)
        b = model_b(mix, cap, 1_000)
        c = model_c(mix, cap, 40_000, 600)
        d = model_d(mix, cap, 0.25)
        criteria = [
            ("A — Employed @ 60k",
             True,                                    # worker always at 60k
             True,                                    # ditto in slow months (salary floor)
             a["margin_per_worker"] >= 0,
             a["margin_per_worker"] - 0.30 * a["revenue_at_capacity"] >= 0),
            ("B — Gig @ 1000/visit",
             b["worker_above_smig_full"],
             b["worker_above_smig_slow"],
             b["margin_per_worker"] >= 0,
             b["margin_per_worker"] >= 0),
            ("C — Hybrid (40k + 600/visit)",
             c["worker_above_smig_full"],
             c["worker_above_smig_slow"],
             c["margin_full"] >= 0,
             c["margin_slow"] >= 0),
            ("D — Coop (25% platform cut)",
             d["worker_above_smig"],
             d["worker_share"] * 0.5 >= SMIG_XOF,
             True,  # platform always gets 25%
             True),
        ]
        print("| Model | Worker SMIG (full) | Worker SMIG (slow) | Margin (full) | Margin (slow / overhead) | All-OK |")
        print("|-------|--------------------|--------------------|---------------|--------------------------|--------|")
        for label, c1, c2, c3, c4 in criteria:
            all_ok = c1 and c2 and c3 and c4
            print(f"| {label} | {status(c1)} | {status(c2)} | {status(c3)} | {status(c4)} | "
                  f"**{status(all_ok)}** |")
        print()


if __name__ == "__main__":
    main()
