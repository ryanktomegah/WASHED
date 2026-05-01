# Washed Subscriber Mobile Design Spec

**Date:** 2026-04-30
**Status:** Superseded by `docs/specs/2026-04-30-washed-frontend-architecture.md`; retained as subscriber iOS prototype context
**Surface:** Subscriber iPhone app
**Source inputs:** `docs/specs/2026-04-28-washed-v1-design.md`, `docs/ux/low-fidelity-flows.md`, current `@washed/subscriber-web`, and Claude design files in `/Users/tomegah/Downloads/WASHED`.

## 1. Purpose

This spec defines the subscriber mobile experience before the next UI implementation pass. The goal is a high-quality iPhone simulator prototype that demonstrates the complete subscriber journey without pretending to be App Store ready.

The app must feel smartphone-first, local to Lomé, and trustworthy enough for founder-led prototype testing. It should not feel like a desktop web app placed inside a phone frame.

## 2. Product Position

Washed lets Lomé households subscribe to reliable in-home laundry visits. The subscriber app must make three ideas immediately clear:

- A regular washerwoman comes to the home on a chosen schedule.
- The price is fixed at 2,500 or 4,500 XOF per month.
- Support, billing, and visit issues are handled by Washed, not directly with the worker.

The subscriber app is French-first for the prototype. Copy should be simple, respectful, and direct. Avoid technical terms such as "worker assignment lifecycle" or "provider readiness" in user-facing UI.

## 3. Prototype Success Criteria

The prototype is successful when the founder can open the app in iOS Simulator and complete this path without guidance:

1. Start from splash.
2. Enter phone number.
3. Verify OTP using test code.
4. Enter neighborhood and landmark.
5. Choose T1 or T2.
6. Choose day and time window.
7. Create subscription.
8. Understand pending or active assignment status.
9. Find visit actions: reschedule, skip, dispute.
10. Find subscription, billing, support, and profile/privacy actions.

The prototype is not successful if it requires browser dev tools, external instructions, or manual route/state editing to understand the main journey.

## 4. Design Direction

Use the Claude subscriber design as the visual direction and the current app as the functional baseline.

### Native iPhone Rules

- In Capacitor/iOS mode, the app fills the real simulator screen.
- Do not render a fake phone device frame, black outer shell, or browser-centered mockup.
- Do not render a fake iOS status bar when native status chrome is visible.
- Respect safe areas at top and bottom.
- Primary actions sit near the bottom when the screen is a decision step.
- Long content uses internal scroll areas, not body-level awkward scrolling.

### Visual Language

- Palette: terracotta primary, warm cream background, espresso text, ochre accents, olive only for success.
- Typography: Space Grotesk direction where available, system fallback acceptable in native shell.
- Cards: warm white surfaces with subtle shadows and compact radius.
- Buttons: strong full-width primary buttons for main actions; bordered secondary buttons for lower-risk actions; red only for destructive or dispute actions.
- Icons: simple line or native-style pictograms. Do not overdecorate.

### Density

Onboarding screens can be spacious and emotional. Dashboard and management screens should be denser and scannable because users return to them repeatedly.

## 5. Screen Inventory

### Splash

Purpose: communicate brand, price range, geography, and in-home value.

Must show:

- Washed brand mark and name.
- "Votre laveuse à domicile" style value statement.
- Lomé/Togo and price range.
- Primary action: `Commencer`.
- Secondary sign-in text may exist later, but prototype can route all users through OTP.

Failure state: if app boot fails, show a visible loading error instead of blank white screen.

### Phone

Purpose: start OTP session.

Must show:

- Phone input with Togo country context.
- Explanation that a verification code will be sent.
- Primary action: send code.
- Loading and API error state.

Data dependency: `POST /v1/auth/otp/start`.

### OTP

Purpose: verify subscriber session and register prototype push device.

Must show:

- Code input.
- Test code when local backend returns one.
- Primary action: confirm.
- Error state for invalid or expired code.

Data dependencies:

- `POST /v1/auth/otp/verify`
- `POST /v1/devices/push-token`

### Address

Purpose: collect enough location detail for operations.

Must show:

- Neighborhood.
- Landmark/access notes.
- GPS action with fallback message.
- Clear note that manual landmark is acceptable.

Prototype default: Tokoin/Lomé values may remain prefilled for speed, but the UI must make them editable.

### Tier

Purpose: choose subscription package.

Must show:

- T1: 2,500 XOF/month, 1 visit/month.
- T2: 4,500 XOF/month, 2 visits/month.
- Difference between tiers in plain language.
- Primary action: continue or apply change.

Rule: no 4-visit tier in v1.

### Schedule

Purpose: choose regular visit preference.

Must show:

- Day of week.
- Morning/afternoon window.
- Explanation that operations route around this preference.
- Create subscription action for onboarding.
- Reschedule action when entered from active subscription.

Data dependencies:

- Create: `POST /v1/subscriptions`
- Reschedule: `POST /v1/subscriptions/:subscriptionId/visits/:visitId/reschedule`

### Home

Purpose: subscriber dashboard.

Must show:

- Current subscription status.
- Next visit date and time window.
- Assigned worker when available.
- Pending assignment when no worker is assigned.
- Visit actions: reschedule, skip, report issue.
- Payment state and support credit.
- Billing history preview.
- Recent visit actions when available.

Critical copy: pending assignment must feel operationally normal, not broken.

### Subscription

Purpose: manage plan and commitment.

Must show:

- Current tier, price, schedule, and status.
- Change tier.
- Change schedule.
- Request worker swap.
- Cancel subscription.
- Payment and billing context.

Destructive action: cancellation must be visually distinct and require clear copy. A later production pass should add confirmation.

### Support

Purpose: make recourse obvious.

Must show:

- Support path for visit issue, safety, billing, or general help.
- Recent visit context when available.
- Clear expectation that Washed operations will respond.

Prototype behavior can submit local/API issue events without full chat.

### Profile / Privacy

Purpose: account information and trust controls.

Must show:

- Phone/session state.
- Address summary.
- Payment method summary.
- Push device registration state.
- Privacy export and erasure request actions if available.

Privacy actions must sound serious and irreversible where appropriate.

## 6. Navigation

Onboarding uses linear steps:

`Splash -> Phone -> OTP -> Address -> Tier -> Schedule -> Home`

Post-subscription uses bottom navigation:

- Home
- Subscription
- Support
- Profile

The tab bar must not cover primary actions or iOS home indicator. Active state should be obvious without relying only on color.

## 7. State And Error Rules

- Loading states disable the current primary action.
- API errors appear as visible toast/banner copy.
- Empty states must explain what happens next.
- Native app boot failure must render visible diagnostic text.
- If local API is unavailable in simulator, the app should stay usable enough to explain the failure and allow retry.
- Local prototype state may persist in `localStorage`, but there must be a clear reset path.

## 8. Native Packaging Requirements

The iOS prototype uses Capacitor.

Required behavior:

- `capacitor://localhost` app shell loads bundled assets.
- Native mode API calls go to `http://127.0.0.1:3000`.
- Web browser mode keeps relative `/api` proxy behavior.
- Launch screen must stay lightweight and must not use the default oversized splash image.
- Xcode generated build artifacts stay ignored; source project files are committed.

## 9. Out Of Scope For This Spec

- Worker mobile app redesign.
- Operator console redesign.
- Android emulator polish.
- App Store signing, TestFlight, real APNs credentials, and production push.
- Real payment provider UI beyond the current local/sandbox payment representation.

## 10. Acceptance Checklist

- App opens on iPhone Simulator without blank screen.
- Splash screen fills the real device viewport.
- Onboarding path completes against the local API.
- Dashboard communicates assignment/payment/visit status.
- No fake browser or fake phone frame is visible in native mode.
- No duplicated iOS status bar appears.
- Primary buttons are reachable and tappable on iPhone 17 Pro simulator.
- All documented screens are reachable from the UI or an intentional prototype state.
