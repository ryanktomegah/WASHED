# Incident Escalation Runbook

## Severity

- Sev-1: safety incident, theft allegation, data exposure, provider outage blocking visits/payments, database unavailable.
- Sev-2: repeated payment failures, notification outage, route disruption, high dispute spike, object-storage upload failures.
- Sev-3: isolated support case, single worker no-show, minor UI issue, delayed reconciliation.

## Immediate Actions

1. Assign incident owner.
2. Record start time, trace IDs, impacted users, country, service cell, and provider.
3. Stop risky automation if needed: matching, payout worker, notification worker, or payment retries.
4. Communicate status to operators and support.

## Safety Incident

- Suspend involved assignment or worker if there is credible immediate risk.
- Preserve visit photos, GPS, audit events, support notes, and payment records.
- Escalate to founder/senior ops.
- Do not delete evidence.

## Provider Failure

- Check readiness endpoints and provider dashboards.
- Switch to local/manual fallback only if approved by incident owner.
- Run reconciliation after recovery.
- Record provider references for every manual correction.

## Closeout

- Confirm user-visible issue is resolved.
- Add timeline, root cause, corrective action, and owner.
- Update runbooks if a step was missing.
