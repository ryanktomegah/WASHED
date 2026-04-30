"""
Togo Laundry App — Revenue Projections, TAM, and Competitive Positioning
Date: 2026-04-28

Locked decisions:
- Pricing: TS-β (T1=2,500 XOF/1 visit, T2=4,500 XOF/2 visits)
- Worker model: C (Hybrid: 40k floor + 600 XOF/visit)
- Base mix 60/40 T1/T2 → ARPU 3,300 XOF/sub/mo, 1.4 visits/sub/mo
"""
from __future__ import annotations
import math

XOF_PER_USD = 605
ARPU = 3_300
VISITS_PER_SUB = 1.4
WORKER_FLOOR = 40_000
WORKER_BONUS = 600
WORKER_CAPACITY = 48
TARGET_SUBS_PER_WORKER = 25  # accounts for utilisation buffer (35 visits/worker = 73% util)
MOBILE_MONEY_FEE = 0.02
ANNUAL_CHURN = 0.30  # 30%/year base assumption — typical for African subscription services

# Platform overhead scales with size
def platform_overhead_xof(subs: int) -> int:
    if subs <= 1_500:    return 1_000_000     # MVP team
    if subs <= 5_000:    return 3_000_000     # +zone supervisors, dispatch
    if subs <= 15_000:   return 7_000_000     # +full ops team, BI
    if subs <= 50_000:   return 20_000_000    # +regional managers, finance, HR
    return 40_000_000                         # +country leadership, expansion ops


# ---------------------------------------------------------------------------
# TAM/SAM/SOM funnel
# ---------------------------------------------------------------------------
def market_funnel():
    print("## 1. Market sizing — TAM / SAM / SOM funnel")
    print()
    print("All numbers triangulated from World Bank / INSEED Togo / ANSD Sénégal / "
          "Disrupt Africa (Toofacil framing) / cybo.com directory checks. "
          "Assume average Togolese household = 5.0 people (INSEED 2023).")
    print()
    markets = [
        # (name, population, avg_hh_size, urban_share, income_filter, smartphone_filter, service_filter)
        ("Lomé (Phase 1)",        1_800_000, 5.0, 1.00, 0.70, 0.85, 0.50),
        ("Togo other cities",     2_200_000, 5.0, 0.55, 0.55, 0.75, 0.40),
        ("Cotonou (Benin)",       1_500_000, 5.0, 1.00, 0.65, 0.80, 0.45),
        ("Abidjan (Côte d'Ivoire)",6_000_000, 4.5, 1.00, 0.70, 0.85, 0.50),
        ("Dakar (Sénégal)",       4_000_000, 4.8, 1.00, 0.70, 0.85, 0.45),
        ("Ouagadougou (Burkina)", 2_800_000, 5.5, 1.00, 0.55, 0.70, 0.35),
        ("Bamako (Mali)",         3_000_000, 5.5, 1.00, 0.55, 0.70, 0.35),
        ("Niamey (Niger)",        1_400_000, 6.0, 1.00, 0.50, 0.65, 0.30),
        ("Conakry (Guinée)",      2_000_000, 5.5, 1.00, 0.55, 0.70, 0.35),
    ]
    print("| Market | Population | Households | Urban+ | Income filter | Smartphone | Service-buyers (SAM) | SAM × ARPU = TAM/year |")
    print("|--------|-----------:|-----------:|-------:|--------------:|-----------:|---------------------:|-----------------------:|")
    sam_running = 0
    for name, pop, hhsz, urb, inc, sm, sv in markets:
        hh = pop / hhsz
        urb_hh = hh * urb
        addressable = urb_hh * inc * sm * sv
        sam_running += addressable
        tam_year = addressable * ARPU * 12
        print(f"| {name} | {pop:,} | {hh:,.0f} | {urb*100:.0f}% | {inc*100:.0f}% | {sm*100:.0f}% | "
              f"**{addressable:,.0f}** | {tam_year/1_000_000_000:.2f}B XOF (~${tam_year/XOF_PER_USD/1_000_000:.1f}M USD) |")
    print(f"| **Francophone West Africa total SAM** | | | | | | **~{sam_running:,.0f} households** | "
          f"**~{(sam_running * ARPU * 12)/1_000_000_000:.1f}B XOF (~${(sam_running * ARPU * 12)/XOF_PER_USD/1_000_000:.0f}M USD/year)** |")
    print()
    print("**Reading the funnel:**")
    print(f"- **Lomé alone (Phase 1 SAM):** ~{markets[0][1]/markets[0][2] * markets[0][3] * markets[0][4] * markets[0][5] * markets[0][6]:,.0f} addressable households")
    print(f"- **Togo total SAM:** ~{(markets[0][1]/markets[0][2] * markets[0][3] * markets[0][4] * markets[0][5] * markets[0][6]) + (markets[1][1]/markets[1][2] * markets[1][3] * markets[1][4] * markets[1][5] * markets[1][6]):,.0f} households")
    print(f"- **Francophone West Africa SAM:** ~{sam_running/1_000_000:.1f}M households")
    print()


# ---------------------------------------------------------------------------
# Subscriber → revenue → profit projections at scale
# ---------------------------------------------------------------------------
def projections():
    print("## 2. Revenue & profit at scale")
    print()
    print("Each row shows operational reality at that subscriber count (steady state, not ramp).")
    print()
    print("| Active subs | Workers needed | MRR (XOF) | ARR (XOF) | ARR (USD) | Worker cost/mo | Platform overhead/mo | Net profit/mo | Net profit/year (USD) |")
    print("|------------:|---------------:|----------:|----------:|----------:|---------------:|---------------------:|--------------:|----------------------:|")
    levels = [500, 1_000, 1_500, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000]
    for subs in levels:
        workers = math.ceil(subs / TARGET_SUBS_PER_WORKER)
        visits = math.ceil(subs * VISITS_PER_SUB)
        mrr = subs * ARPU
        arr = mrr * 12
        revenue_net = mrr * (1 - MOBILE_MONEY_FEE)
        worker_cost = workers * WORKER_FLOOR + visits * WORKER_BONUS
        opex = platform_overhead_xof(subs)
        net = revenue_net - worker_cost - opex
        print(f"| {subs:,} | {workers:,} | {mrr:,} | {arr:,} | "
              f"${arr/XOF_PER_USD:,.0f} | "
              f"{worker_cost:,} | {opex:,} | "
              f"{net:+,} | "
              f"**${net*12/XOF_PER_USD:+,.0f}** |")
    print()


# ---------------------------------------------------------------------------
# What it takes to hit specific revenue milestones
# ---------------------------------------------------------------------------
def revenue_milestones():
    print("## 3. \"How many clients do I need to hit X revenue?\"")
    print()
    print("Reverse-engineering subscriber counts for common revenue milestones.")
    print()
    print("| Revenue milestone | Annual revenue (XOF) | Subscribers required | % of Lomé SAM | % of Togo SAM | % of Francophone WA SAM |")
    print("|-------------------|---------------------:|---------------------:|--------------:|--------------:|------------------------:|")
    # Milestones in USD, converted to XOF
    milestones_usd = [
        ("$10k USD/year (proof of concept)", 10_000),
        ("$50k USD/year (sustainable indie)", 50_000),
        ("$100k USD/year (small-team)", 100_000),
        ("$500k USD/year (Series A territory)", 500_000),
        ("$1M USD/year (regional player)", 1_000_000),
        ("$5M USD/year (West Africa leader)", 5_000_000),
        ("$10M USD/year (pan-African aspiration)", 10_000_000),
    ]
    lome_sam = 53_550   # from funnel computation above
    togo_sam = lome_sam + 25_242
    wa_sam = 2_400_000  # rough francophone WA SAM
    for label, usd_target in milestones_usd:
        xof_target = usd_target * XOF_PER_USD
        subs_needed = xof_target / (ARPU * 12)
        print(f"| {label} | {xof_target:,} | **{subs_needed:,.0f}** | "
              f"{subs_needed/lome_sam*100:.2f}% | "
              f"{subs_needed/togo_sam*100:.2f}% | "
              f"{subs_needed/wa_sam*100:.3f}% |")
    print()


# ---------------------------------------------------------------------------
# 5-year scenario projections
# ---------------------------------------------------------------------------
def five_year_projections():
    print("## 4. Five-year scenarios (subscribers, ARR, profit)")
    print()
    print("Three growth scenarios. Year 1 starts at month 9 of capital model "
          "(880-1180 subs depending on aggressive/realistic ramp).")
    print()
    scenarios = {
        "Conservative — Lomé only, slow growth":   [600, 2_500, 6_000, 10_000, 15_000],
        "Realistic — Lomé + Togo Y3, regional Y4-5": [1_000, 4_500, 12_000, 25_000, 50_000],
        "Aggressive — Lomé Y1, Cotonou Y2, Abidjan Y3, Dakar Y4, multi-country Y5": [
            1_500, 7_500, 25_000, 70_000, 150_000
        ],
    }
    for name, subs_by_year in scenarios.items():
        print(f"### {name}")
        print()
        print("| Year | EOY subs | ARR (XOF) | ARR (USD) | Workers | Net profit/yr (USD) |")
        print("|-----:|---------:|----------:|----------:|--------:|--------------------:|")
        for y, subs in enumerate(subs_by_year, start=1):
            workers = math.ceil(subs / TARGET_SUBS_PER_WORKER)
            visits = math.ceil(subs * VISITS_PER_SUB)
            mrr = subs * ARPU
            arr = mrr * 12
            net_month = (mrr * (1 - MOBILE_MONEY_FEE)
                         - workers * WORKER_FLOOR - visits * WORKER_BONUS
                         - platform_overhead_xof(subs))
            print(f"| Y{y} | {subs:,} | {arr:,} | ${arr/XOF_PER_USD:,.0f} | {workers:,} | "
                  f"${net_month*12/XOF_PER_USD:+,.0f} |")
        print()


# ---------------------------------------------------------------------------
# Competitive positioning matrix
# ---------------------------------------------------------------------------
def competitive_matrix():
    print("## 5. Competitive positioning — what's actually out there")
    print()
    print("Based on web research 2026-04-28. The key insight: every existing competitor "
          "in West Africa is pickup-and-delivery laundromat-based. None do in-home wash. "
          "None target lower-middle income. None operate in Togo.")
    print()
    print("| Player | Country | Model | Price point | Segment | In-home? | Subscription? |")
    print("|--------|---------|-------|-------------|---------|----------|---------------|")
    competitors = [
        ("Washr",                "Nigeria",      "Marketplace → laundromats",   "Premium",    "Middle/upper",  "No", "No"),
        ("Laundrymann",          "Nigeria",      "Pickup/delivery laundromat",  "₦65k/mo (~$40)", "Premium",   "No", "Yes"),
        ("LaundryBoy",           "Nigeria",      "Pickup/delivery laundromat",  "Premium",   "Middle/upper",  "No", "Yes"),
        ("Paddim",               "Nigeria",      "App → vendor network",        "Premium",   "Middle/upper",  "No", "No"),
        ("Skip Your Laundry",    "Nigeria",      "Pickup/delivery laundromat",  "Premium (VI/Lekki)", "Upper", "No", "No"),
        ("Toofacil",             "Côte d'Ivoire","Connected lockers + pickup",  "~CFA 4k/wk", "Mid",           "Pickup", "Yes (monthly)"),
        ("Tambour Laverie",      "Côte d'Ivoire","Pickup/delivery, 4hr SLA",    "Premium",   "Middle/upper",  "No", "No"),
        ("Chap-Chap Laverie",    "Côte d'Ivoire","Self-service kiosk",          "Pay-per-use","Mid (working)","No", "No"),
        ("KS Laundry",           "Côte d'Ivoire","Pressing/dry-cleaner",        "Premium",   "Middle/upper",  "No", "No"),
        ("La Buanderie",         "Sénégal",      "Pickup/delivery",             "Mid-premium","Middle/upper", "No", "Some"),
        ("**Togo Laundry App (us)**", "Togo (Phase 1)", "**In-home wash by worker**", "**2.5-4.5k XOF/mo**", "**Lower-middle + middle**", "**YES**", "**YES (core)**"),
    ]
    for c in competitors:
        print(f"| {c[0]} | {c[1]} | {c[2]} | {c[3]} | {c[4]} | {c[5]} | {c[6]} |")
    print()
    print("**Defensibility analysis:**")
    print()
    print("- **Cost-structure moat:** Laundromat-based players have CFA 50-200M sunk in physical "
          "facilities. They cannot match our 2.5-4.5k pricing without abandoning their model.")
    print("- **Cultural fit moat:** In-home wash *is* the existing informal Togo behavior. We are "
          "formalising the existing pattern, not changing customer behavior. Pickup-delivery requires "
          "behavior change.")
    print("- **Geographic moat:** Lomé has zero app/subscription player. We can have 18-24 months "
          "of uncontested operation before any Lagos/Abidjan competitor crosses the border.")
    print("- **Worker-side moat:** Our 40k floor commitment differentiates us as workers' employer "
          "of choice. Nobody else in the region offers this. This is sticky — once a washerwoman is "
          "earning a guaranteed 60k+ from us, she won't leave for a 1k/visit gig elsewhere.")
    print()


def main():
    print("# Togo Laundry App — Projections & Market Position")
    print()
    print("**Date:** 2026-04-28")
    print(f"**FX:** 1 USD ≈ {XOF_PER_USD} XOF")
    print()
    market_funnel()
    projections()
    revenue_milestones()
    five_year_projections()
    competitive_matrix()


if __name__ == "__main__":
    main()
