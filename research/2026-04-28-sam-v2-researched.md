# SAM v2 — Researched (replaces v1)

**Date:** 2026-04-28

## Methodology

Each country's funnel is built from three named, sourced filters:

1. **TAM (smartphone-using urban households)** = (capital city pop / avg HH size) × min(0.95, internet penetration × urban skew factor)
2. **SAM (affordable households)** = TAM × (1 − urban poverty) × discretionary-spend factor (0.45-0.55)
3. **SOM (active paid-laundry buyers)** = SAM × 0.30 — anchored on Toofacil's $36M Abidjan-wide laundry-spend

**v1 vs v2 — what changed and why:**

| Filter | v1 (made up) | v2 (researched) | Why |
|--------|--------------|-----------------|-----|
| Smartphone | flat 85% all countries | per-country, derived from DataReportal internet % × urban skew (37% Togo→61% Lomé; 70% Ghana→91% Accra; 18% Niger→36% Niamey) | Internet penetration varies 4x across these markets; flat assumption was indefensible |
| Income | flat 70% | per-country `(1-urban_poverty) × discretionary_factor` | Lomé and Lagos have very different non-poverty income distributions |
| Service-buyer | flat 50% | flat 30% (lower, anchored on Toofacil claim) | 50% over-stated; informal-market data triangulates closer to 25-35% |

## Country-by-country funnel (v2)

| Capital | Capital pop | Avg HH | Households | Smartphone HH | TAM (sm-HH) | SAM | SOM |
|---------|------------:|-------:|-----------:|--------------:|------------:|----:|----:|
| Lomé (Togo) | 1,800,000 | 5.0 | 360,000 | 61% | **219,780** | 93,923 | 28,177 |
| Cotonou (Benin) | 780,000 | 5.0 | 156,000 | 53% | **82,883** | 31,910 | 9,573 |
| Abidjan (Côte d'Ivoire) | 6,000,000 | 4.5 | 1,333,333 | 61% | **818,400** | 360,096 | 108,029 |
| Dakar (Sénégal) | 4,000,000 | 4.8 | 833,333 | 91% | **757,500** | 312,469 | 93,741 |
| Ouagadougou (Burkina Faso) | 2,800,000 | 5.5 | 509,091 | 44% | **221,760** | 85,378 | 25,613 |
| Bamako (Mali) | 3,000,000 | 5.5 | 545,455 | 56% | **306,327** | 117,936 | 35,381 |
| Niamey (Niger) | 1,400,000 | 6.0 | 233,333 | 36% | **84,000** | 27,720 | 8,316 |
| Conakry (Guinée) | 2,000,000 | 5.5 | 363,636 | 51% | **185,455** | 71,400 | 21,420 |
| Accra (Ghana) | 2,790,000 | 4.0 | 697,500 | 91% | **633,818** | 278,880 | 83,664 |
| Lagos (Nigeria) | 22,000,000 | 4.4 | 5,000,000 | 68% | **3,405,000** | 919,350 | 275,805 |
| **TOTALS (capitals only)** | | | | | **6,714,923** | **2,299,061** | **689,718** |

## Annual revenue potential (at full SOM saturation, ARPU 3,300 XOF/sub/mo)

| Capital | SOM (subs) | Annual revenue (XOF) | Annual revenue (USD) |
|---------|-----------:|---------------------:|---------------------:|
| Lomé (Togo) | 28,177 | 1.12B XOF | $1.8M |
| Cotonou (Benin) | 9,573 | 0.38B XOF | $0.6M |
| Abidjan (Côte d'Ivoire) | 108,029 | 4.28B XOF | $7.1M |
| Dakar (Sénégal) | 93,741 | 3.71B XOF | $6.1M |
| Ouagadougou (Burkina Faso) | 25,613 | 1.01B XOF | $1.7M |
| Bamako (Mali) | 35,381 | 1.40B XOF | $2.3M |
| Niamey (Niger) | 8,316 | 0.33B XOF | $0.5M |
| Conakry (Guinée) | 21,420 | 0.85B XOF | $1.4M |
| Accra (Ghana) | 83,664 | 3.31B XOF | $5.5M |
| Lagos (Nigeria) | 275,805 | 10.92B XOF | $18.1M |
| **TOTAL West Africa SOM revenue at saturation** | **689,718** | **27.31B XOF** | **$45.1M** |

## Sensitivity — low/mid/high SOM bands

Each filter has uncertainty. Showing low/mid/high for each capital:

| Capital | Low SOM (50% of mid) | Mid SOM | High SOM (150% of mid) |
|---------|---------------------:|--------:|-----------------------:|
| Lomé | 14,088 | 28,177 | 42,265 |
| Cotonou | 4,786 | 9,573 | 14,359 |
| Abidjan | 54,014 | 108,029 | 162,043 |
| Dakar | 46,870 | 93,741 | 140,611 |
| Ouagadougou | 12,807 | 25,613 | 38,420 |
| Bamako | 17,690 | 35,381 | 53,071 |
| Niamey | 4,158 | 8,316 | 12,474 |
| Conakry | 10,710 | 21,420 | 32,130 |
| Accra | 41,832 | 83,664 | 125,496 |
| Lagos | 137,902 | 275,805 | 413,708 |

## Sources note (per-country)

- **Lomé (Togo):** DataReportal 2026: 37% internet, 45.8% urban. WB 2018/19: Lomé 22.3% poverty. Anker urban living wage 122,967 XOF (2023).
- **Cotonou (Benin):** DataReportal 2025: 32.2% internet, 51% urban. Cotonou metro 780k (2026 estimate).
- **Abidjan (Côte d'Ivoire):** DataReportal 2025: 39.6% internet, 53.9% urban, 91.2% mobile broadband. WB 2018/19: nat'l 39.5%, declining.
- **Dakar (Sénégal):** DataReportal 2025: 60.6% internet (highest in francophone WA). ANSD/ARTP ENTICS 2024: Dakar device penetration 97.2%, home internet 43.8%.
- **Ouagadougou (Burkina Faso):** DataReportal 2025: 24.2% internet, 33.5% urban. Mobile broadband cov 91%.
- **Bamako (Mali):** 2025: 35.1% internet (Mali). Internet almost exclusively mobile.
- **Niamey (Niger):** Lower digital readiness; significant infra gaps. Capital concentration.
- **Conakry (Guinée):** Estimated from regional sources; primary source for Conakry not surfaced.
- **Accra (Ghana):** DataReportal 2025: 69.9% internet (highest in WA). Accra metro 2.79M (2025). Note: Anglophone — strategic decision needed for app localisation.
- **Lagos (Nigeria):** DataReportal 2025: 45.4% internet, 55.4% urban. WB 2025: nat'l poverty 63% (rising). Lagos has competitive existing players (Washr, Laundrymann, etc.) — entry harder. Anglophone.

## How revenue milestones translate to penetration (v2 SOM)

This replaces the v1 milestone table — now using v2 SAM/SOM as the denominator.

| Revenue target (USD/yr) | Subs needed | % of Lomé SOM | % of Francophone WA SOM | % of all-WA SOM (incl Ghana+Nigeria) |
|------------------------:|------------:|--------------:|------------------------:|--------------------------------------:|
| $10,000 | 153 | 0.5% | 0.05% | 0.02% |
| $50,000 | 764 | 2.7% | 0.23% | 0.11% |
| $100,000 | 1,528 | 5.4% | 0.46% | 0.22% |
| $500,000 | 7,639 | 27.1% | 2.31% | 1.11% |
| $1,000,000 | 15,278 | 54.2% | 4.63% | 2.22% |
| $5,000,000 | 76,389 | 271.1% | 23.13% | 11.08% |
| $10,000,000 | 152,778 | 542.2% | 46.26% | 22.15% |

