# Staged Rollout And Monitoring

## Rollout

- Stage 1: 5% of waitlist or 10 subscribers, whichever is smaller.
- Stage 2: 25% after 48 hours with clean metrics.
- Stage 3: 50% after one week with support load under target.
- Stage 4: 100% only after founder and ops approval.

## Monitors

- OTP start and verify success.
- Subscription creation.
- Assignment SLA.
- Visit check-in and check-out.
- Photo upload success.
- Payment charge, webhook, refund, and payout success.
- Push notification delivery.
- Core API unhandled errors.

## Alerts

- Payment success below 98% over 5 minutes.
- Visit completion below 95% over 1 hour.
- Worker payout failure above 2% over 1 day.
- Operator queue above 50 unmatched subscribers.
- Any Sev-1 incident.

## Rollback

- Pause new signups.
- Disable scheduled reconciliation or notification workers if they are causing harm.
- Move payouts to manual approval if provider results are inconsistent.
- Keep existing visits visible and support reachable.
