# Togo Laundry App — Capital Requirements: Model A vs Model C

**Date:** 2026-04-28
**FX:** 1 USD ≈ 605 XOF

**Locked inputs:**
- TS-β pricing: T1=2,500/1 visit, T2=4,500/2 visits, Base mix → ARPU **3,300 XOF/sub/mo**
- Visits per sub: 1.4
- Worker capacity: 48 visits/mo
- Target subs per worker (with utilisation buffer): 25
- Platform overhead: 1,000,000 XOF/mo (~$1,653/mo)
- CAC: 500 XOF per new subscriber
- Pre-launch worker count: 5

## 1. One-time setup costs (pre-launch capital)

### Model A — Employed
| Item | XOF | USD |
|------|----:|----:|
| Business registration (NTI / CFE) | 300,000 | $496 |
| CNSS employer registration | 150,000 | $248 |
| INAM enrolment + setup | 100,000 | $165 |
| Legal: employment contract templates (avocat) | 300,000 | $496 |
| Initial worker training + uniforms (5 workers) | 250,000 | $413 |
| App MVP build (assume local dev partnership) | 3,000,000 | $4,959 |
| Pre-launch marketing | 1,500,000 | $2,479 |
| 2-month severance reserve (escrow, per Togolese code, 5 workers x 2 months) | 600,000 | $992 |
| **Total** | **6,200,000** | **$10,248** |

### Model C — Hybrid
| Item | XOF | USD |
|------|----:|----:|
| Business registration (NTI / CFE) | 300,000 | $496 |
| Legal: contractor agreement template (avocat) | 200,000 | $331 |
| Initial worker training + uniforms (5 workers) | 250,000 | $413 |
| App MVP build (assume local dev partnership) | 3,000,000 | $4,959 |
| Pre-launch marketing | 1,500,000 | $2,479 |
| **Total** | **5,250,000** | **$8,678** |

**Setup-cost gap:** Model A is **950,000 XOF ($1,570) more expensive** to launch.

## 2. Month-by-month cash flow under each ramp scenario

### Ramp: Aggressive (paid + referrals working)
_Subscribers by month: [50, 110, 200, 320, 470, 640, 820, 1000, 1180]_

#### Model A — Employed

| M | Subs | Workers | Util | Rev (net) | Worker $ | OPEX | CAC | Net cash | Cumul. cash | USD cumul. |
|--:|-----:|--------:|-----:|----------:|---------:|-----:|----:|---------:|------------:|-----------:|
| 1 | 50 | 5 | 29% |    161,700 |   375,000 | 1,000,000 | 25,000 | -1,238,300 | -7,438,300 | $12,295 |
| 2 | 110 | 5 | 64% |    355,740 |   375,000 | 1,000,000 | 30,000 | -1,049,260 | -8,487,560 | $14,029 |
| 3 | 200 | 8 | 73% |    646,800 |   600,000 | 1,000,000 | 45,000 |   -998,200 | -9,485,760 | $15,679 |
| 4 | 320 | 13 | 72% |  1,034,880 |   975,000 | 1,000,000 | 60,000 | -1,000,120 | -10,485,880 | $17,332 |
| 5 | 470 | 19 | 72% |  1,519,980 | 1,425,000 | 1,000,000 | 75,000 |   -980,020 | -11,465,900 | $18,952 |
| 6 | 640 | 26 | 72% |  2,069,760 | 1,950,000 | 1,000,000 | 85,000 |   -965,240 | -12,431,140 | $20,547 |
| 7 | 820 | 33 | 72% |  2,651,880 | 2,475,000 | 1,000,000 | 90,000 |   -913,120 | -13,344,260 | $22,057 |
| 8 | 1000 | 40 | 73% |  3,234,000 | 3,000,000 | 1,000,000 | 90,000 |   -856,000 | -14,200,260 | $23,472 |
| 9 | 1180 | 48 | 72% |  3,816,120 | 3,600,000 | 1,000,000 | 90,000 |   -873,880 | -15,074,140 | $24,916 |

- **Capital required (deepest cumulative trough):** 15,074,140.0 XOF (**$24,916**)
- **Cash-flow positive: NOT REACHED in 9 months**

#### Model C — Hybrid

| M | Subs | Workers | Util | Rev (net) | Worker $ | OPEX | CAC | Net cash | Cumul. cash | USD cumul. |
|--:|-----:|--------:|-----:|----------:|---------:|-----:|----:|---------:|------------:|-----------:|
| 1 | 50 | 5 | 29% |    161,700 |   242,000 | 1,000,000 | 25,000 | -1,105,300 | -6,355,300 | $10,505 |
| 2 | 110 | 5 | 64% |    355,740 |   292,400 | 1,000,000 | 30,000 |   -966,660 | -7,321,960 | $12,102 |
| 3 | 200 | 8 | 73% |    646,800 |   488,000 | 1,000,000 | 45,000 |   -886,200 | -8,208,160 | $13,567 |
| 4 | 320 | 13 | 72% |  1,034,880 |   788,800 | 1,000,000 | 60,000 |   -813,920 | -9,022,080 | $14,913 |
| 5 | 470 | 19 | 72% |  1,519,980 | 1,154,800 | 1,000,000 | 75,000 |   -709,820 | -9,731,900 | $16,086 |
| 6 | 640 | 26 | 72% |  2,069,760 | 1,577,600 | 1,000,000 | 85,000 |   -592,840 | -10,324,740 | $17,066 |
| 7 | 820 | 33 | 72% |  2,651,880 | 2,008,800 | 1,000,000 | 90,000 |   -446,920 | -10,771,660 | $17,804 |
| 8 | 1000 | 40 | 73% |  3,234,000 | 2,440,000 | 1,000,000 | 90,000 |   -296,000 | -11,067,660 | $18,294 |
| 9 | 1180 | 48 | 72% |  3,816,120 | 2,911,200 | 1,000,000 | 90,000 |   -185,080 | -11,252,740 | $18,600 |

- **Capital required (deepest cumulative trough):** 11,252,740.0 XOF (**$18,600**)
- **Cash-flow positive: NOT REACHED in 9 months**

### Ramp: Realistic (organic-led)
_Subscribers by month: [40, 80, 140, 220, 320, 440, 580, 730, 880]_

#### Model A — Employed

| M | Subs | Workers | Util | Rev (net) | Worker $ | OPEX | CAC | Net cash | Cumul. cash | USD cumul. |
|--:|-----:|--------:|-----:|----------:|---------:|-----:|----:|---------:|------------:|-----------:|
| 1 | 40 | 5 | 23% |    129,360 |   375,000 | 1,000,000 | 20,000 | -1,265,640 | -7,465,640 | $12,340 |
| 2 | 80 | 5 | 47% |    258,720 |   375,000 | 1,000,000 | 20,000 | -1,136,280 | -8,601,920 | $14,218 |
| 3 | 140 | 6 | 68% |    452,760 |   450,000 | 1,000,000 | 30,000 | -1,027,240 | -9,629,160 | $15,916 |
| 4 | 220 | 9 | 71% |    711,480 |   675,000 | 1,000,000 | 40,000 | -1,003,520 | -10,632,680 | $17,575 |
| 5 | 320 | 13 | 72% |  1,034,880 |   975,000 | 1,000,000 | 50,000 |   -990,120 | -11,622,800 | $19,211 |
| 6 | 440 | 18 | 71% |  1,422,960 | 1,350,000 | 1,000,000 | 60,000 |   -987,040 | -12,609,840 | $20,843 |
| 7 | 580 | 24 | 70% |  1,875,720 | 1,800,000 | 1,000,000 | 70,000 |   -994,280 | -13,604,120 | $22,486 |
| 8 | 730 | 30 | 71% |  2,360,820 | 2,250,000 | 1,000,000 | 75,000 |   -964,180 | -14,568,300 | $24,080 |
| 9 | 880 | 36 | 71% |  2,845,920 | 2,700,000 | 1,000,000 | 75,000 |   -929,080 | -15,497,380 | $25,616 |

- **Capital required (deepest cumulative trough):** 15,497,380.0 XOF (**$25,616**)
- **Cash-flow positive: NOT REACHED in 9 months**

#### Model C — Hybrid

| M | Subs | Workers | Util | Rev (net) | Worker $ | OPEX | CAC | Net cash | Cumul. cash | USD cumul. |
|--:|-----:|--------:|-----:|----------:|---------:|-----:|----:|---------:|------------:|-----------:|
| 1 | 40 | 5 | 23% |    129,360 |   233,600 | 1,000,000 | 20,000 | -1,124,240 | -6,374,240 | $10,536 |
| 2 | 80 | 5 | 47% |    258,720 |   267,200 | 1,000,000 | 20,000 | -1,028,480 | -7,402,720 | $12,236 |
| 3 | 140 | 6 | 68% |    452,760 |   357,600 | 1,000,000 | 30,000 |   -934,840 | -8,337,560 | $13,781 |
| 4 | 220 | 9 | 71% |    711,480 |   544,800 | 1,000,000 | 40,000 |   -873,320 | -9,210,880 | $15,225 |
| 5 | 320 | 13 | 72% |  1,034,880 |   788,800 | 1,000,000 | 50,000 |   -803,920 | -10,014,800 | $16,553 |
| 6 | 440 | 18 | 71% |  1,422,960 | 1,089,600 | 1,000,000 | 60,000 |   -726,640 | -10,741,440 | $17,754 |
| 7 | 580 | 24 | 70% |  1,875,720 | 1,447,200 | 1,000,000 | 70,000 |   -641,480 | -11,382,920 | $18,815 |
| 8 | 730 | 30 | 71% |  2,360,820 | 1,813,200 | 1,000,000 | 75,000 |   -527,380 | -11,910,300 | $19,686 |
| 9 | 880 | 36 | 71% |  2,845,920 | 2,179,200 | 1,000,000 | 75,000 |   -408,280 | -12,318,580 | $20,361 |

- **Capital required (deepest cumulative trough):** 12,318,580.0 XOF (**$20,361**)
- **Cash-flow positive: NOT REACHED in 9 months**

### Ramp: Conservative (slow education)
_Subscribers by month: [25, 55, 95, 150, 220, 305, 405, 520, 650]_

#### Model A — Employed

| M | Subs | Workers | Util | Rev (net) | Worker $ | OPEX | CAC | Net cash | Cumul. cash | USD cumul. |
|--:|-----:|--------:|-----:|----------:|---------:|-----:|----:|---------:|------------:|-----------:|
| 1 | 25 | 5 | 15% |     80,850 |   375,000 | 1,000,000 | 12,500 | -1,306,650 | -7,506,650 | $12,408 |
| 2 | 55 | 5 | 32% |    177,870 |   375,000 | 1,000,000 | 15,000 | -1,212,130 | -8,718,780 | $14,411 |
| 3 | 95 | 5 | 55% |    307,230 |   375,000 | 1,000,000 | 20,000 | -1,087,770 | -9,806,550 | $16,209 |
| 4 | 150 | 6 | 73% |    485,100 |   450,000 | 1,000,000 | 27,500 |   -992,400 | -10,798,950 | $17,850 |
| 5 | 220 | 9 | 71% |    711,480 |   675,000 | 1,000,000 | 35,000 |   -998,520 | -11,797,470 | $19,500 |
| 6 | 305 | 13 | 68% |    986,370 |   975,000 | 1,000,000 | 42,500 | -1,031,130 | -12,828,600 | $21,204 |
| 7 | 405 | 17 | 69% |  1,309,770 | 1,275,000 | 1,000,000 | 50,000 | -1,015,230 | -13,843,830 | $22,882 |
| 8 | 520 | 21 | 72% |  1,681,680 | 1,575,000 | 1,000,000 | 57,500 |   -950,820 | -14,794,650 | $24,454 |
| 9 | 650 | 26 | 73% |  2,102,100 | 1,950,000 | 1,000,000 | 65,000 |   -912,900 | -15,707,550 | $25,963 |

- **Capital required (deepest cumulative trough):** 15,707,550.0 XOF (**$25,963**)
- **Cash-flow positive: NOT REACHED in 9 months**

#### Model C — Hybrid

| M | Subs | Workers | Util | Rev (net) | Worker $ | OPEX | CAC | Net cash | Cumul. cash | USD cumul. |
|--:|-----:|--------:|-----:|----------:|---------:|-----:|----:|---------:|------------:|-----------:|
| 1 | 25 | 5 | 15% |     80,850 |   221,000 | 1,000,000 | 12,500 | -1,152,650 | -6,402,650 | $10,583 |
| 2 | 55 | 5 | 32% |    177,870 |   246,200 | 1,000,000 | 15,000 | -1,083,330 | -7,485,980 | $12,374 |
| 3 | 95 | 5 | 55% |    307,230 |   279,800 | 1,000,000 | 20,000 |   -992,570 | -8,478,550 | $14,014 |
| 4 | 150 | 6 | 73% |    485,100 |   366,000 | 1,000,000 | 27,500 |   -908,400 | -9,386,950 | $15,516 |
| 5 | 220 | 9 | 71% |    711,480 |   544,800 | 1,000,000 | 35,000 |   -868,320 | -10,255,270 | $16,951 |
| 6 | 305 | 13 | 68% |    986,370 |   776,200 | 1,000,000 | 42,500 |   -832,330 | -11,087,600 | $18,327 |
| 7 | 405 | 17 | 69% |  1,309,770 | 1,020,200 | 1,000,000 | 50,000 |   -760,430 | -11,848,030 | $19,584 |
| 8 | 520 | 21 | 72% |  1,681,680 | 1,276,800 | 1,000,000 | 57,500 |   -652,620 | -12,500,650 | $20,662 |
| 9 | 650 | 26 | 73% |  2,102,100 | 1,586,000 | 1,000,000 | 65,000 |   -548,900 | -13,049,550 | $21,570 |

- **Capital required (deepest cumulative trough):** 13,049,550.0 XOF (**$21,570**)
- **Cash-flow positive: NOT REACHED in 9 months**

## 3. Summary — total capital you need to raise/reserve

This is what you are actually asking: how much money must you have on hand BEFORE launch to survive until cash-flow positive?

| Ramp | Model A capital required | Model C capital required | Difference (A − C) |
|------|-------------------------:|-------------------------:|-------------------:|
| Aggressive (paid + referrals working) | 15,074,140.0 XOF (**$24,916**) | 11,252,740.0 XOF (**$18,600**) | +3,821,400.0 XOF (+$6,316) |
| Realistic (organic-led) | 15,497,380.0 XOF (**$25,616**) | 12,318,580.0 XOF (**$20,361**) | +3,178,800.0 XOF (+$5,254) |
| Conservative (slow education) | 15,707,550.0 XOF (**$25,963**) | 13,049,550.0 XOF (**$21,570**) | +2,658,000.0 XOF (+$4,393) |

## 4. Worker utilisation — the hidden cost of Model A

In Model A, idle workers still get paid 75k. Watch the utilisation column above: in early months it's <40%, meaning **you're paying full salaries to workers who are doing 1 wash per day or fewer**. Model C's floor is 40k regardless, so the early-stage idle cost is much lower.

## 5. The conversion path — Model C → Model A at Phase 2

This is the recommended sequence:

1. **Months 1-9:** Launch Model C. Use this period to learn which workers are high-retention, reliable, and want full employment.
2. **Month ~10-12:** Once you hit ~700-800 active subscribers and cash-flow positive, begin formal CNSS-employer setup with counsel.
3. **Months 12-18:** Convert top ~5-10 contractor workers to employed staff (Model A) under written contracts. Keep newer workers as contractors during their first 6 months as a probation period.

This sequence captures Model A's social-mission narrative for the workers who earned it, while keeping Model C's capital efficiency for ramp.
