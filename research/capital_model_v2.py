"""
Washed capital model v2.

This model replaces the older broad MVP-build assumption with explicit beta and
public-launch budgets. Values are planning assumptions until provider quotes,
counsel guidance, insurance terms, and field research are collected.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

XOF_PER_USD = 605

ARPU_XOF = 3_300
VISITS_PER_SUB = 1.4
MOBILE_MONEY_FEE = 0.02
WORKER_FLOOR_XOF = 40_000
WORKER_BONUS_PER_VISIT_XOF = 600
TARGET_SUBS_PER_WORKER = 25


@dataclass(frozen=True)
class LineItem:
    category: str
    item: str
    amount_xof: int
    notes: str


@dataclass(frozen=True)
class Scenario:
    name: str
    months: int
    subscribers: int
    workers: int
    monthly_fixed_xof: int
    monthly_support_xof: int
    monthly_ops_transport_xof: int
    monthly_refund_liability_xof: int
    monthly_provider_minimum_xof: int
    contingency_rate: float


ONE_TIME_ITEMS = [
    LineItem("Legal", "Togo counsel review: ToS, privacy, liability, worker agreement", 900_000, "Required before paid beta."),
    LineItem("Legal", "Worker classification and insurance advice", 450_000, "Can change worker model and beta go/no-go."),
    LineItem("Brand", "Trademark/domain search and filing reserve", 500_000, "OAPI/Togo search, filing, and fallback-name advice."),
    LineItem("Research", "Subscriber and worker interview incentives", 140_000, "12 households at 5k, 8 workers at 10k."),
    LineItem("Operations", "Worker onboarding, uniforms, ID cards, training supplies", 650_000, "10 beta workers plus replacements."),
    LineItem("Operations", "Beta device/data support reserve", 600_000, "Low-end Android phones, data bundles, power banks."),
    LineItem("Payments", "Provider setup, KYC, sandbox/prod verification reserve", 300_000, "Exact amount pending provider quote."),
    LineItem("Infrastructure", "Domain, email, status/support tooling setup", 250_000, "Basic paid accounts only after gates clear."),
    LineItem("Security", "Pre-beta security/privacy/accessibility review reserve", 850_000, "External review sized for v1 risk."),
    LineItem("Travel/Ops", "Founder/operator field travel and launch logistics", 1_200_000, "Local transport, meetings, office/admin costs."),
]


SCENARIOS = [
    Scenario(
        name="Closed beta",
        months=3,
        subscribers=30,
        workers=10,
        monthly_fixed_xof=450_000,
        monthly_support_xof=350_000,
        monthly_ops_transport_xof=250_000,
        monthly_refund_liability_xof=150_000,
        monthly_provider_minimum_xof=75_000,
        contingency_rate=0.20,
    ),
    Scenario(
        name="Public launch runway",
        months=6,
        subscribers=200,
        workers=25,
        monthly_fixed_xof=1_150_000,
        monthly_support_xof=750_000,
        monthly_ops_transport_xof=650_000,
        monthly_refund_liability_xof=350_000,
        monthly_provider_minimum_xof=150_000,
        contingency_rate=0.25,
    ),
]


DOWNSIDE_CASES = [
    LineItem("Demand", "Acquisition is 50% slower than plan", 1_800_000, "Extra support, marketing, and runway while route density lags."),
    LineItem("Provider", "Payment provider outage or failed payout week", 900_000, "Manual reconciliation, callbacks, and temporary payout buffer."),
    LineItem("Liability", "Two material garment damage/theft claims", 750_000, "Settlement reserve until counsel-approved cap is final."),
    LineItem("Worker", "Transport/data support 40% above plan", 650_000, "Rain, route spread, device constraints, and replacement shifts."),
    LineItem("Security", "Remediation after external review", 700_000, "Fixes, retest, and additional monitoring."),
]


def money(amount_xof: float) -> str:
    return f"{amount_xof:,.0f} XOF"


def usd(amount_xof: float) -> str:
    return f"${amount_xof / XOF_PER_USD:,.0f}"


def monthly_worker_cost(subscribers: int, workers: int) -> int:
    visits = round(subscribers * VISITS_PER_SUB)
    return workers * WORKER_FLOOR_XOF + visits * WORKER_BONUS_PER_VISIT_XOF


def monthly_revenue_net(subscribers: int) -> int:
    return round(subscribers * ARPU_XOF * (1 - MOBILE_MONEY_FEE))


def monthly_cost_before_contingency(scenario: Scenario) -> int:
    return (
        scenario.monthly_fixed_xof
        + scenario.monthly_support_xof
        + scenario.monthly_ops_transport_xof
        + scenario.monthly_refund_liability_xof
        + scenario.monthly_provider_minimum_xof
        + monthly_worker_cost(scenario.subscribers, scenario.workers)
    )


def monthly_net_burn(scenario: Scenario) -> int:
    cost = monthly_cost_before_contingency(scenario)
    contingency = round(cost * scenario.contingency_rate)
    return cost + contingency - monthly_revenue_net(scenario.subscribers)


def total(items: Iterable[LineItem]) -> int:
    return sum(item.amount_xof for item in items)


def print_line_items(title: str, items: list[LineItem]) -> None:
    print(f"## {title}")
    print()
    print("| Category | Item | XOF | USD | Notes |")
    print("|---|---|---:|---:|---|")
    for item in items:
        print(f"| {item.category} | {item.item} | {money(item.amount_xof)} | {usd(item.amount_xof)} | {item.notes} |")
    print(f"| **Total** |  | **{money(total(items))}** | **{usd(total(items))}** |  |")
    print()


def print_scenario_table() -> int:
    print("## Runway Scenarios")
    print()
    print("| Scenario | Months | Subs | Workers | Net revenue/mo | Worker cost/mo | Fixed+ops/mo | Contingency | Net burn/mo | Runway reserve |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    reserve_total = 0
    for scenario in SCENARIOS:
        revenue = monthly_revenue_net(scenario.subscribers)
        worker = monthly_worker_cost(scenario.subscribers, scenario.workers)
        base = monthly_cost_before_contingency(scenario)
        contingency = round(base * scenario.contingency_rate)
        burn = monthly_net_burn(scenario)
        reserve = burn * scenario.months
        reserve_total += reserve
        print(
            f"| {scenario.name} | {scenario.months} | {scenario.subscribers} | {scenario.workers} | "
            f"{money(revenue)} | {money(worker)} | {money(base - worker)} | {money(contingency)} | "
            f"{money(burn)} | {money(reserve)} |"
        )
    print(f"| **Total runway reserve** |  |  |  |  |  |  |  |  | **{money(reserve_total)}** |")
    print()
    return reserve_total


def main() -> None:
    one_time_total = total(ONE_TIME_ITEMS)
    downside_total = total(DOWNSIDE_CASES)

    print("# Washed Capital Model v2")
    print()
    print("**Date:** 2026-04-30")
    print(f"**FX assumption:** 1 USD = {XOF_PER_USD} XOF")
    print()
    print("This model separates closed-beta capital from public-launch runway and keeps unverified provider/legal quotes as explicit assumptions.")
    print()
    print("## Core Assumptions")
    print()
    print(f"- Subscriber ARPU: {money(ARPU_XOF)} per month.")
    print(f"- Average visits: {VISITS_PER_SUB} per subscriber per month.")
    print(f"- Mobile-money fee placeholder: {MOBILE_MONEY_FEE:.0%} of subscriber revenue.")
    print(f"- Worker model placeholder: {money(WORKER_FLOOR_XOF)} floor plus {money(WORKER_BONUS_PER_VISIT_XOF)} per completed visit.")
    print(f"- Target steady-state capacity: about {TARGET_SUBS_PER_WORKER} subscribers per worker.")
    print("- App build is no longer modeled as one generic MVP line; it is replaced by hardening, review, tooling, and field operations reserves.")
    print()

    print_line_items("One-Time Readiness Budget", ONE_TIME_ITEMS)
    runway_total = print_scenario_table()
    print_line_items("Downside Reserve Cases", DOWNSIDE_CASES)

    grand_total = one_time_total + runway_total + downside_total
    beta_only = one_time_total + (monthly_net_burn(SCENARIOS[0]) * SCENARIOS[0].months) + downside_total
    print("## Funding Targets")
    print()
    print("| Target | XOF | USD | Meaning |")
    print("|---|---:|---:|---|")
    print(f"| Closed-beta ready reserve | {money(beta_only)} | {usd(beta_only)} | Covers one-time readiness, 3 beta months, and downside reserve. |")
    print(f"| Beta plus public-launch runway | {money(grand_total)} | {usd(grand_total)} | Covers beta, 6 launch months, and downside reserve. |")
    print()
    print("## Gate Notes")
    print()
    print("- Replace payment fees, provider minimums, webhook support cost, and settlement timing after CinetPay/PayDunya or a local alternative provides written terms.")
    print("- Replace legal and insurance reserves after counsel and insurer quotes are received.")
    print("- Public-launch budget remains blocked until closed-beta metrics prove demand, worker satisfaction, payment reliability, and route economics.")


if __name__ == "__main__":
    main()
