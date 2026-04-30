# Closed Beta Iteration Runbook

## Weekly Inputs

- Ops Console Beta metrics.
- Subscriber interviews.
- Worker interviews.
- Support tickets, disputes, refunds, and no-shows.
- Payment reconciliation and provider incidents.

## Update Rules

- Pricing changes require founder approval and a written before/after hypothesis.
- Route capacity changes require checking worker earnings and visit completion.
- Support script changes must be reflected in `docs/runbooks/customer-support.md`.
- Worker training changes must be reflected in `docs/training/worker-onboarding.md`.
- Any legal, safety, or liability learning goes to counsel review before public launch.

## Weekly Output

Produce one concise weekly note:

- decision;
- evidence;
- shipped changes;
- unresolved risks;
- next week target.

## Stop Conditions

Pause new subscriber onboarding if any condition is true:

- visit completion below 95% for a week;
- payment success below 98% without provider remediation plan;
- unresolved Sev-1 incident;
- worker satisfaction below 4/5;
- support load exceeds planned operator coverage.
