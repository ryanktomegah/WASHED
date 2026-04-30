# Washed Payment Provider Diligence

**Date opened:** 2026-04-29
**Providers to compare:** CinetPay, PayDunya, and any local Togo/WAEMU alternative surfaced by counsel or banking partners.
**Scope:** T-Money/Flooz subscriber collection, refunds/credits, reconciliation, and worker payouts.

## Decision Needed

Select a primary and fallback provider before implementing the Payments service or promising subscription billing behavior to users.

## Required Capabilities

| Capability | Required for v1 | Notes |
|---|---:|---|
| T-Money collection in Togo | Yes | Must support the actual target subscriber wallet behavior |
| Flooz collection in Togo | Yes | Needed as fallback and for market coverage |
| Recurring or repeat monthly billing | Yes | If true recurring is unavailable, define invoice/request-to-pay flow |
| Webhooks | Yes | Webhook must be source of truth for payment success/failure |
| Idempotency support | Yes | Required to prevent double charge/refund/payout |
| Refunds | Yes | Needed for prorated cancellations and visit credits |
| Worker payouts | Yes or approved manual beta workaround | Must support mobile-money payout or reliable manual process |
| Settlement reports | Yes | Needed for reconciliation and audit |
| Sandbox/test mode | Yes | Needed before production integration |
| Dispute/reversal process | Yes | Needed for operations and ToS |
| WAEMU expansion path | Preferred | Important for Benin/Cote d'Ivoire/Senegal |

## Questions for Each Provider

### Commercial

- What are collection fees for T-Money and Flooz?
- What are payout fees?
- Are there setup fees, monthly minimums, rolling reserves, or settlement holds?
- What is the settlement delay to the merchant bank account?
- Are refunds charged separately?
- Are chargebacks/reversals possible for mobile money, and how are they handled?

### Product/API

- Is true recurring billing supported for T-Money and Flooz?
- If recurring billing is not supported, is request-to-pay supported with a reusable customer reference?
- Are payment links, USSD flows, QR flows, or in-app SDK flows supported?
- What is the exact webhook retry policy?
- Are webhook events signed? Which algorithm?
- Are idempotency keys accepted on charge, refund, and payout creation?
- Are partial refunds supported?
- Can payouts be batched?
- Can reconciliation exports be pulled by API?

### Operations

- What KYC documents are required?
- Can a pre-incorporation founder test in sandbox before company registration?
- What support SLA exists for failed payments and failed payouts?
- Is there a dedicated account manager in Togo or WAEMU?
- What happens if T-Money or Flooz is down?
- How are duplicate callbacks or delayed callbacks handled?

### Compliance and Data

- Where is payment data stored?
- What user data is shared with mobile-money providers?
- What retention period applies to transaction records?
- What audit exports are available?

## Provider Scorecard

Use 1 to 5 scoring. A score below 3 on any "must have" capability blocks selection.

| Category | Weight | CinetPay | PayDunya | Alternative |
|---|---:|---:|---:|---:|
| Togo T-Money/Flooz coverage | 5 |  |  |  |
| Recurring or repeat billing fit | 5 |  |  |  |
| Refund support | 5 |  |  |  |
| Payout support | 5 |  |  |  |
| Webhook/idempotency quality | 5 |  |  |  |
| Settlement/reconciliation | 4 |  |  |  |
| Sandbox/dev experience | 4 |  |  |  |
| WAEMU expansion path | 3 |  |  |  |
| Fees | 3 |  |  |  |
| Support reliability | 4 |  |  |  |

## Decision Record

| Date | Decision | Rationale | Evidence |
|---|---|---|---|
| 2026-04-29 | Open | Provider capabilities not yet verified | Pending outreach/sandbox docs |

