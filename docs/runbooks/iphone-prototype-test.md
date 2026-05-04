# iPhone Prototype Test Runbook

**Purpose:** Run a first internal prototype pass on the founder's iPhone before inviting outside subscribers or workers.

## Scope

This test is an internal usability and rendering pass. It does not replace real closed-beta testing, payment-provider verification, legal review, or the native iOS Simulator runbook in `docs/runbooks/ios-simulator.md`.

Automated browser smoke coverage runs through `pnpm ui:smoke`. That check starts the current target apps on Playwright ports: subscriber app on 6173, worker app on 6174, and operator console on 6175. The manual iPhone pass below is still useful because Safari chrome, touch behavior, and physical readability can differ from browser automation.

## Setup

1. Start the current local apps from the repo root in separate terminals:

```bash
# terminal 1
pnpm --filter @washed/subscriber-app dev      # http://127.0.0.1:5173
# terminal 2
pnpm --filter @washed/worker-app dev          # http://127.0.0.1:5174
# terminal 3
pnpm --filter @washed/operator-console dev    # http://127.0.0.1:5175
```

2. Open the subscriber app on iPhone Safari using the Mac LAN IP and port 5173.
3. Open the worker app on iPhone Safari using the Mac LAN IP and port 5174.
4. Keep the browser console/logs available on the Mac where possible.
5. Use `docs/runbooks/ios-simulator.md` when validating installed Capacitor apps instead of Safari browser rendering.

## Subscriber App Test Script

| Step | Expected result | Pass |
|---|---|---|
| Open app | Splash/home loads without broken layout |  |
| Start signup | Phone field is readable and tappable |  |
| Verify OTP | Test OTP flow completes |  |
| Add address | Neighborhood, landmark, and GPS fallback are understandable |  |
| Select tier | T1/T2 pricing is clear |  |
| Confirm payment/review | Mobile Money copy and consent are clear |  |
| Reach hub | Next visit, worker card, and tour are understandable |  |
| Manage visit | Detail, tracking, feedback, issue, and history paths are visible |  |
| Worker profile | Relationship and change-request flow are clear |  |
| Account/payment/profile surfaces | Exercise X-19, X-19.U, X-19.R, X-20, X-21, X-22, X-22.A, X-23, and X-24 → X-28; note X-21.M is still a documented add-provider modal variant, not a separate route |  |

## Worker App Test Script

| Step | Expected result | Pass |
|---|---|---|
| Open app | Worker/laveuse app loads without broken layout |  |
| Route view | Route loads or cached/offline state is clear |  |
| Check in | GPS/fallback behavior is understandable |  |
| Photo flow | Before/after controls are tappable |  |
| Report issue/SOS | Safety/support action is obvious |  |
| Earnings | Floor, bonuses, paid out, and net due are readable |  |

## Operator Console Check

Use the desktop operator console at port 5175 for a parallel internal pass. The iPhone Safari pass does not replace desktop ops verification.

## Accessibility Checks

- Text is readable at normal and larger iOS text sizes.
- Buttons can be tapped with one hand.
- No important action relies only on color.
- Forms have visible labels.
- Nothing overlaps the iPhone notch, bottom bar, or Safari controls.

## Findings Log

| Date | Device | Flow | Finding | Severity | Fix |
|---|---|---|---|---|---|
|  | iPhone |  |  | P0 / P1 / P2 |  |
