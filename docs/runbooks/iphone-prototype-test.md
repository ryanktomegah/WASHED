# iPhone Prototype Test Runbook

**Purpose:** Run a first internal prototype pass on the founder's iPhone before inviting outside subscribers or workers.

## Scope

This test is an internal usability and rendering pass. It does not replace real closed-beta testing, payment-provider verification, or legal review.

Automated browser smoke coverage runs through `pnpm ui:smoke`. That check uses Playwright's iPhone viewport for the subscriber flow and a desktop viewport for the operator console. The manual iPhone pass below is still useful because Safari chrome, touch behavior, and physical readability can differ from browser automation.

## Setup

1. Start the local web apps from the repo.
2. Open the subscriber app on iPhone Safari.
3. If testing on the same Wi-Fi network, use the Mac LAN IP address and the app port.
4. Keep the browser console/logs available on the Mac where possible.

## Subscriber Test Script

| Step | Expected result | Pass |
|---|---|---|
| Open app | Splash/home loads without broken layout |  |
| Start signup | Phone field is readable and tappable |  |
| Verify OTP | Test OTP flow completes |  |
| Add address | Neighborhood, landmark, and GPS fallback are understandable |  |
| Select tier | T1/T2 pricing is clear |  |
| Select schedule | Day/window choices fit screen |  |
| Create subscription | Pending assignment/home state is clear |  |
| Manage visit | Skip/reschedule/dispute actions are visible |  |
| Billing/support | Payment status and support path are understandable |  |
| Profile | Session/address/payment info fits screen |  |

## Worker-Mode Test Script

| Step | Expected result | Pass |
|---|---|---|
| Enter worker mode | Route loads or cached/offline state is clear |  |
| Check in | GPS/fallback behavior is understandable |  |
| Photo flow | Before/after controls are tappable |  |
| Report issue | Safety/support action is obvious |  |
| Earnings | Floor, bonuses, paid out, and net due are readable |  |

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
