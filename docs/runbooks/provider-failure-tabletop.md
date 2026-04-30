# Provider Failure Tabletop

## Scenario 1: Mobile-Money Webhook Delay

- Inject delayed payment webhook.
- Confirm duplicate webhook does not double-charge.
- Run payment reconciliation.
- Verify operator can see mismatch and final status.

Expected outcome: subscriber status matches provider record and reconciliation run is stored.

## Scenario 2: OTP Provider Down

- Set `OTP_PROVIDER=sms_http` with missing credentials.
- Attempt OTP start.
- Confirm user-safe error and no session issued.
- Support advises retry window or manual beta onboarding if approved.

Expected outcome: no unauthorized login, incident owner decides fallback.

## Scenario 3: Push Provider Failure

- Set `PUSH_PROVIDER=fcm` without `PUSH_REAL_SEND_ENABLED=true`.
- Deliver due notification.
- Confirm failed delivery is retryable and visible to ops.

Expected outcome: visits continue; push failure does not block core lifecycle.

## Scenario 4: Object Storage Upload Failure

- Block signed upload PUT.
- Capture visit photos in worker app.
- Confirm photos queue locally and checkout remains blocked until required metadata is recorded.

Expected outcome: worker sees clear failure and can retry when online.

## Scenario 5: Sentry/Observability Failure

- Configure bad `SENTRY_DSN` with real send enabled.
- Trigger unhandled route error.
- Confirm API still returns safe 500 and writes local capture failure.

Expected outcome: observability outage does not break user flows.
