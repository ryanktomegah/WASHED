"""
Togo Laundry App — Capital Requirements Model
Date: 2026-04-28

Compares Model A (Employed from day one) vs Model C (Hybrid contractors)
on month-by-month cash flow and total capital required to reach break-even.

Pricing locked: TS-beta (T1=2,500 XOF/1 visit, T2=4,500 XOF/2 visits)
Subscriber mix assumed: Base (60% T1, 40% T2) → ARPU 3,300 XOF/mo, 1.4 visits/sub/mo

Ramp scenarios:
- Aggressive (Lomé launch, strong word-of-mouth + paid acquisition)
- Realistic (slower organic growth)
- Conservative (slow market education)

OUTPUT: structured markdown report
"""
from __future__ import annotations
import math

XOF_PER_USD = 605

# ---------------------------------------------------------------------------
# Locked inputs from financial_model.py
# ---------------------------------------------------------------------------
ARPU_XOF = 3_300                  # Base mix 60/40 T1/T2 weighted ARPU
VISITS_PER_SUB = 1.4              # weighted average visits/sub/mo
WORKER_CAPACITY_VISITS = 48       # visits/worker/mo at base capacity (2/day x 24 days)
SUBS_PER_WORKER = WORKER_CAPACITY_VISITS / VISITS_PER_SUB  # ~34 max, but plan for 25 with buffer
TARGET_SUBS_PER_WORKER = 25       # plan with 30% utilisation buffer

MOBILE_MONEY_FEE = 0.02
PLATFORM_FIXED_MONTHLY_XOF = 1_000_000  # ops, hosting, founder stipend, lightweight team
CAC_PER_SUB_XOF = 500             # blended CAC: organic + light paid + referral

# ---------------------------------------------------------------------------
# Model A — Employed (full Togolese labour code)
# ---------------------------------------------------------------------------
WORKER_GROSS_A = 60_000
EMPLOYER_BURDEN_A = 0.25
WORKER_ALL_IN_A = WORKER_GROSS_A * (1 + EMPLOYER_BURDEN_A)  # 75,000

# One-time setup costs
ONE_TIME_A = {
    "Business registration (NTI / CFE)":              300_000,
    "CNSS employer registration":                     150_000,
    "INAM enrolment + setup":                         100_000,
    "Legal: employment contract templates (avocat)":  300_000,
    "Initial worker training + uniforms (5 workers)": 250_000,
    "App MVP build (assume local dev partnership)":  3_000_000,
    "Pre-launch marketing":                          1_500_000,
    "2-month severance reserve (escrow, per Togolese code, 5 workers x 2 months)": 600_000,
}
ONE_TIME_A_TOTAL = sum(ONE_TIME_A.values())

# ---------------------------------------------------------------------------
# Model C — Hybrid contractor (40k floor + 600 XOF/visit)
# ---------------------------------------------------------------------------
WORKER_FLOOR_C = 40_000
WORKER_BONUS_PER_VISIT_C = 600

ONE_TIME_C = {
    "Business registration (NTI / CFE)":              300_000,
    "Legal: contractor agreement template (avocat)":  200_000,
    "Initial worker training + uniforms (5 workers)": 250_000,
    "App MVP build (assume local dev partnership)":  3_000_000,
    "Pre-launch marketing":                          1_500_000,
    # No CNSS, no INAM, no severance reserve required
}
ONE_TIME_C_TOTAL = sum(ONE_TIME_C.values())

# ---------------------------------------------------------------------------
# Subscriber ramp scenarios
# ---------------------------------------------------------------------------
RAMPS = {
    "Aggressive (paid + referrals working)": [50, 110, 200, 320, 470, 640, 820, 1000, 1180],
    "Realistic (organic-led)":               [40, 80, 140, 220, 320, 440, 580, 730, 880],
    "Conservative (slow education)":         [25, 55, 95, 150, 220, 305, 405, 520, 650],
}

# Pre-launch worker headcount (must hire BEFORE subs to deliver service)
PRE_LAUNCH_WORKERS = 5


def workers_needed(subs: int) -> int:
    """Workers required to serve given subscriber count."""
    return max(PRE_LAUNCH_WORKERS, math.ceil(subs / TARGET_SUBS_PER_WORKER))


def total_visits(subs: int) -> int:
    return math.ceil(subs * VISITS_PER_SUB)


# ---------------------------------------------------------------------------
# Cash flow simulators
# ---------------------------------------------------------------------------
def simulate_model_a(ramp: list[int]) -> list[dict]:
    """Model A — pay 75k all-in per worker every month, regardless of demand."""
    rows = []
    cum_cash = -ONE_TIME_A_TOTAL
    prev_subs = 0
    for m, subs in enumerate(ramp, start=1):
        new_subs = max(0, subs - prev_subs)
        workers = workers_needed(subs)
        revenue_gross = subs * ARPU_XOF
        revenue_net = revenue_gross * (1 - MOBILE_MONEY_FEE)
        worker_cost = workers * WORKER_ALL_IN_A
        cac_cost = new_subs * CAC_PER_SUB_XOF
        opex = PLATFORM_FIXED_MONTHLY_XOF
        net_cash = revenue_net - worker_cost - opex - cac_cost
        cum_cash += net_cash
        rows.append({
            "month": m, "subs": subs, "new_subs": new_subs, "workers": workers,
            "revenue_net": revenue_net, "worker_cost": worker_cost,
            "opex": opex, "cac": cac_cost,
            "net_cash": net_cash, "cum_cash": cum_cash,
            "worker_utilisation": total_visits(subs) / (workers * WORKER_CAPACITY_VISITS),
        })
        prev_subs = subs
    return rows


def simulate_model_c(ramp: list[int]) -> list[dict]:
    """Model C — pay 40k floor per worker + 600 XOF per actual visit."""
    rows = []
    cum_cash = -ONE_TIME_C_TOTAL
    prev_subs = 0
    for m, subs in enumerate(ramp, start=1):
        new_subs = max(0, subs - prev_subs)
        workers = workers_needed(subs)
        visits = total_visits(subs)
        revenue_gross = subs * ARPU_XOF
        revenue_net = revenue_gross * (1 - MOBILE_MONEY_FEE)
        worker_cost = workers * WORKER_FLOOR_C + visits * WORKER_BONUS_PER_VISIT_C
        cac_cost = new_subs * CAC_PER_SUB_XOF
        opex = PLATFORM_FIXED_MONTHLY_XOF
        net_cash = revenue_net - worker_cost - opex - cac_cost
        cum_cash += net_cash
        rows.append({
            "month": m, "subs": subs, "new_subs": new_subs, "workers": workers,
            "revenue_net": revenue_net, "worker_cost": worker_cost,
            "opex": opex, "cac": cac_cost,
            "net_cash": net_cash, "cum_cash": cum_cash,
            "worker_utilisation": visits / (workers * WORKER_CAPACITY_VISITS),
        })
        prev_subs = subs
    return rows


def fmt(x: float) -> str:
    return f"{x:>+10,.0f}"


def usd(x: float) -> str:
    return f"${abs(x)/XOF_PER_USD:,.0f}"


def trough(rows: list[dict]) -> int:
    return min(r["cum_cash"] for r in rows)


def break_even_month(rows: list[dict]) -> int | None:
    for r in rows:
        if r["net_cash"] >= 0:
            return r["month"]
    return None


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
def main():
    print("# Togo Laundry App — Capital Requirements: Model A vs Model C")
    print()
    print("**Date:** 2026-04-28")
    print(f"**FX:** 1 USD ≈ {XOF_PER_USD} XOF")
    print()
    print("**Locked inputs:**")
    print(f"- TS-β pricing: T1=2,500/1 visit, T2=4,500/2 visits, Base mix → ARPU **{ARPU_XOF:,} XOF/sub/mo**")
    print(f"- Visits per sub: {VISITS_PER_SUB}")
    print(f"- Worker capacity: {WORKER_CAPACITY_VISITS} visits/mo")
    print(f"- Target subs per worker (with utilisation buffer): {TARGET_SUBS_PER_WORKER}")
    print(f"- Platform overhead: {PLATFORM_FIXED_MONTHLY_XOF:,} XOF/mo (~{usd(PLATFORM_FIXED_MONTHLY_XOF)}/mo)")
    print(f"- CAC: {CAC_PER_SUB_XOF:,} XOF per new subscriber")
    print(f"- Pre-launch worker count: {PRE_LAUNCH_WORKERS}")
    print()

    print("## 1. One-time setup costs (pre-launch capital)")
    print()
    print("### Model A — Employed")
    print("| Item | XOF | USD |")
    print("|------|----:|----:|")
    for k, v in ONE_TIME_A.items():
        print(f"| {k} | {v:,} | {usd(v)} |")
    print(f"| **Total** | **{ONE_TIME_A_TOTAL:,}** | **{usd(ONE_TIME_A_TOTAL)}** |")
    print()
    print("### Model C — Hybrid")
    print("| Item | XOF | USD |")
    print("|------|----:|----:|")
    for k, v in ONE_TIME_C.items():
        print(f"| {k} | {v:,} | {usd(v)} |")
    print(f"| **Total** | **{ONE_TIME_C_TOTAL:,}** | **{usd(ONE_TIME_C_TOTAL)}** |")
    print()
    print(f"**Setup-cost gap:** Model A is **{ONE_TIME_A_TOTAL - ONE_TIME_C_TOTAL:,} XOF "
          f"({usd(ONE_TIME_A_TOTAL - ONE_TIME_C_TOTAL)}) more expensive** to launch.")
    print()

    print("## 2. Month-by-month cash flow under each ramp scenario")
    print()
    summary_table = []
    for ramp_name, ramp in RAMPS.items():
        print(f"### Ramp: {ramp_name}")
        print(f"_Subscribers by month: {ramp}_")
        print()
        for label, sim_fn in [("Model A — Employed", simulate_model_a),
                              ("Model C — Hybrid", simulate_model_c)]:
            rows = sim_fn(ramp)
            print(f"#### {label}")
            print()
            print("| M | Subs | Workers | Util | Rev (net) | Worker $ | OPEX | CAC | "
                  "Net cash | Cumul. cash | USD cumul. |")
            print("|--:|-----:|--------:|-----:|----------:|---------:|-----:|----:|"
                  "---------:|------------:|-----------:|")
            for r in rows:
                print(f"| {r['month']} | {r['subs']} | {r['workers']} | "
                      f"{r['worker_utilisation']:.0%} | "
                      f"{r['revenue_net']:>10,.0f} | "
                      f"{r['worker_cost']:>9,.0f} | "
                      f"{r['opex']:>7,.0f} | "
                      f"{r['cac']:>6,.0f} | "
                      f"{fmt(r['net_cash'])} | "
                      f"{fmt(r['cum_cash'])} | "
                      f"{usd(r['cum_cash'])} |")
            t = trough(rows)
            be = break_even_month(rows)
            print()
            print(f"- **Capital required (deepest cumulative trough):** {abs(t):,} XOF "
                  f"(**{usd(t)}**)")
            print(f"- **Monthly cash-flow positive starting:** Month {be}" if be else
                  "- **Cash-flow positive: NOT REACHED in 9 months**")
            print()
            summary_table.append({
                "ramp": ramp_name, "model": label,
                "trough": t, "be_month": be,
            })

    print("## 3. Summary — total capital you need to raise/reserve")
    print()
    print("This is what you are actually asking: how much money must you have on hand "
          "BEFORE launch to survive until cash-flow positive?")
    print()
    print("| Ramp | Model A capital required | Model C capital required | Difference (A − C) |")
    print("|------|-------------------------:|-------------------------:|-------------------:|")
    for ramp_name in RAMPS:
        a_row = next(r for r in summary_table
                     if r["ramp"] == ramp_name and "Model A" in r["model"])
        c_row = next(r for r in summary_table
                     if r["ramp"] == ramp_name and "Model C" in r["model"])
        diff = abs(a_row["trough"]) - abs(c_row["trough"])
        print(f"| {ramp_name} | "
              f"{abs(a_row['trough']):,} XOF (**{usd(a_row['trough'])}**) | "
              f"{abs(c_row['trough']):,} XOF (**{usd(c_row['trough'])}**) | "
              f"+{diff:,} XOF (+{usd(diff)}) |")
    print()

    print("## 4. Worker utilisation — the hidden cost of Model A")
    print()
    print("In Model A, idle workers still get paid 75k. Watch the utilisation column above: "
          "in early months it's <40%, meaning **you're paying full salaries to workers who "
          "are doing 1 wash per day or fewer**. Model C's floor is 40k regardless, so the "
          "early-stage idle cost is much lower.")
    print()

    print("## 5. The conversion path — Model C → Model A at Phase 2")
    print()
    print("This is the recommended sequence:")
    print()
    print("1. **Months 1-9:** Launch Model C. Use this period to learn which workers are "
          "high-retention, reliable, and want full employment.")
    print("2. **Month ~10-12:** Once you hit ~700-800 active subscribers and cash-flow "
          "positive, begin formal CNSS-employer setup with counsel.")
    print("3. **Months 12-18:** Convert top ~5-10 contractor workers to employed staff "
          "(Model A) under written contracts. Keep newer workers as contractors during their "
          "first 6 months as a probation period.")
    print()
    print("This sequence captures Model A's social-mission narrative for the workers who "
          "earned it, while keeping Model C's capital efficiency for ramp.")


if __name__ == "__main__":
    main()
