# Provider Data-Sharing Inventory

**Purpose:** List every external provider category that may receive Washed data before beta or launch. This supports privacy review, counsel review, and provider contract checks.

**Status:** Planning inventory. Exact vendor rows must be updated after provider selection and contract review.

## Inventory

| Provider category | Candidate vendors | Data shared | Purpose | Beta status | Contract/privacy requirement |
|---|---|---|---|---|---|
| SMS/OTP | Selected SMS gateway, possible Africa's Talking alternative | Phone number, OTP message metadata, delivery status | Account verification | Not selected | DPA or equivalent terms; no marketing reuse |
| Mobile-money payments | CinetPay, PayDunya, local alternative | Phone/account reference, amount, currency, provider reference, payment status | Subscription collection, refunds, payouts | Not selected | Settlement, webhook, refund, payout, retention, and dispute terms |
| Push notifications | APNs, FCM | Device token, app bundle/project, notification payload metadata | Subscriber/worker operational notifications | Implemented behind real-send gate | Platform terms reviewed; no unnecessary personal data in payload |
| Object storage | S3-compatible provider, local dev storage | Visit photo object keys, binary visit evidence, metadata | Visit proof and dispute evidence | Implemented behind provider gate | Encryption, deletion, access log, retention support |
| Observability/error reporting | Sentry-compatible endpoint, Grafana/Better Stack future options | Trace ID, route, error class, redacted context | Reliability and incident response | Implemented behind real-send gate | PII scrubbing and retention controls |
| Hosting/database | Selected cloud provider | App data, database backups, logs | Runtime infrastructure | Local only now | Region, backup, access-control, and incident terms |
| Banking partner | Ecobank, Orabank, UTB, alternative | Settlement deposits, business account data, transfer references | Fund custody and reconciliation | Not selected | Account terms, statement exports, access controls |
| Legal/insurance | Togo counsel, insurer | Incident summaries, worker classification facts, claim evidence as needed | Counsel review, claims, insurance | Not selected | Confidentiality and limited-purpose handling |
| Support tooling | Future helpdesk/callback tooling | Phone, support issue, visit/dispute context | Customer support | Not selected | Role-based access, deletion/export support |

## Data-Minimisation Rules

- Do not include full address, GPS coordinates, or visit photos in push/SMS payloads.
- Do not send provider credentials to browser apps.
- Do not share worker vetting documents outside counsel/insurance review unless required.
- Use provider references instead of raw payment details wherever possible.
- Keep support exports scoped to the specific ticket or incident.

## Selection Checklist

Before a provider is approved for beta, record:

- Legal entity contracting path.
- Data location/hosting region.
- Retention and deletion support.
- Breach notification commitment.
- Support SLA.
- Export/reconciliation support.
- Whether data may be used for advertising, analytics, or model training.

## Evidence Log

| Date | Provider | Document reviewed | Risk | Decision | Owner |
|---|---|---|---|---|---|
|  |  |  | Low / Medium / High | Approved / Blocked / Needs counsel |  |
