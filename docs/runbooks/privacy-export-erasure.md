# Privacy Export And Erasure Runbook

**Purpose:** Define the operator flow for subscriber data export and erasure requests before paid beta. This is not a counsel substitute; payment, safety, and audit retention rules must be reviewed before launch.

## Scope

The first supported surface is subscriber subscriptions. Operators can record an export or erasure request through:

`POST /v1/operator/subscriptions/{subscriptionId}/privacy-requests`

The endpoint returns an export bundle and an erasure plan, then emits `SubscriberPrivacyRequestRecorded` into the immutable audit trail.

## Export Flow

1. Verify the requester controls the subscriber phone number.
2. Search the subscriber in the operator console.
3. Create an `export` privacy request with the operator ID, timestamp, and reason.
4. Review the returned bundle: profile, address, schedule, billing history, disputes, notifications, and audit evidence.
5. Deliver the export only through an operator-approved support channel.

## Erasure Flow

1. Verify identity and confirm the request is not a support misunderstanding.
2. Confirm there are no active visits, open disputes, unresolved refunds, or safety holds.
3. Create an `erasure` privacy request.
4. Follow the returned plan: revoke sessions/devices, anonymize subscriber-facing profile data when eligible, queue expired photo deletion, and preserve required payment, audit, and safety records.
5. Record completion notes in the support/dispute system until a dedicated destructive erasure worker is added.

## Retained Records

Do not delete records needed for accounting, fraud prevention, safety investigations, dispute defense, or immutable operator accountability. These remain governed by the retention schedule in `docs/specs/2026-04-28-washed-v1-design.md`.

## Open Before Launch

- Counsel must approve final retention windows.
- A destructive anonymization worker should be added before public launch.
- Provider-specific deletion/export APIs must be verified after payment, storage, and support vendors are selected.
