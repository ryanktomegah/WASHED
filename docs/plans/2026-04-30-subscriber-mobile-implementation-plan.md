# Subscriber Mobile Implementation Plan

**Date:** 2026-04-30
**Status:** Ready for implementation
**Spec:** `docs/specs/2026-04-30-subscriber-mobile-design.md`

## 1. Objective

Implement the subscriber mobile spec as a polished iOS Simulator prototype. Keep the current static subscriber app and Capacitor wrapper, but make the native experience full-screen, reliable, and understandable enough for founder-led testing.

## 2. Implementation Phases

### Phase 1 - Native Shell Cleanup

- Add an explicit native-mode flag based on `window.location.protocol === 'capacitor:'`.
- Apply native-mode CSS to remove the fake phone frame, black mockup background, border, shadow, and desktop centering.
- Replace simulated status bar usage in native mode with safe-area spacing.
- Keep browser preview mode working with the current phone-frame presentation for local desktop review.
- Preserve relative asset paths and the lightweight launch screen.

Done when:

- iOS Simulator shows a full-screen app, not a framed web mockup.
- Browser preview still opens normally.
- No duplicated iOS clock/status elements appear.

### Phase 2 - Onboarding Polish

- Align splash, phone, OTP, address, tier, and schedule screens with the Claude visual direction.
- Keep all current API calls and route names unless the spec requires a copy/layout-only change.
- Improve bottom-fixed primary actions on onboarding screens while avoiding overlap with the iOS home indicator.
- Add clear empty/error copy for OTP failure, GPS failure, and unavailable API.

Done when:

- The full signup path can be completed in simulator.
- Each step has one obvious primary action.
- Error states render visibly.

### Phase 3 - Dashboard And Management Polish

- Make Home a native dashboard, not a long web card stack.
- Keep next visit, worker assignment, payment status, support credit, billing preview, and visit actions visible in a scannable hierarchy.
- Polish Subscription, Support, and Profile tabs around repeated-use tasks.
- Ensure cancellation, dispute, and erasure actions are visually serious and copy-safe.

Done when:

- A subscriber can identify next visit, worker, payment state, and support path within 10 seconds.
- Visit actions are reachable without hunting.
- Privacy actions are present but not accidentally triggered.

### Phase 4 - Simulator Verification

- Rebuild and sync Capacitor after each UI pass.
- Run the local iOS build against the booted simulator.
- Capture screenshots for Splash, Phone, Home, Subscription, Support, and Profile.
- Update the iPhone prototype runbook if any command or workflow changes.

Done when:

- `pnpm --filter @washed/subscriber-web test` passes.
- `pnpm --filter @washed/subscriber-web build` passes.
- `pnpm --filter @washed/subscriber-web ios:sync` passes.
- `xcodebuild` succeeds for the iPhone simulator.
- The installed simulator app opens to the visible Washed UI.

## 3. Technical Decisions

- Keep the UI in `packages/subscriber-web/public` for this phase.
- Do not introduce React/Vite/mobile-native dependencies yet.
- Do not copy the Claude React HTML directly; port the design decisions into the existing app.
- Do not alter backend endpoints in this pass.
- Keep native API base as `http://127.0.0.1:3000`.
- Keep generated iOS source project committed, but ignore DerivedData/build output.

## 4. Test Scenarios

### Local Static Checks

- Subscriber static asset check passes.
- Root formatting should pass, with generated iOS files ignored by Prettier.
- Root typecheck/test should remain green unless unrelated local changes exist.

### iOS Simulator Manual Scenarios

1. Fresh app opens to splash.
2. `Commencer` advances to phone input.
3. OTP start returns visible test code.
4. OTP verification advances to address.
5. Address form accepts manual landmark and GPS failure gracefully.
6. Tier selection toggles T1/T2 clearly.
7. Schedule creates a subscription.
8. Home shows pending/assigned visit state.
9. Reschedule, skip, and dispute actions show success/error feedback.
10. Subscription tab shows tier, price, schedule, cancellation, and worker swap.
11. Support tab explains available help.
12. Profile tab shows account, device, payment, and privacy controls.

## 5. Implementation Notes

- Use CSS classes for native mode instead of one-off inline styles where possible.
- Keep copy in French and avoid internal operational terminology.
- Prefer CSS safe-area variables:
  - `env(safe-area-inset-top)`
  - `env(safe-area-inset-bottom)`
- Keep primary buttons at least 44px high.
- Avoid viewport-scaled font sizes.
- Avoid a single-color theme; terracotta should be primary, not the only visual signal.
- Avoid UI cards nested inside other cards.

## 6. Risks And Mitigations

- **Capacitor WebView blank screen:** keep boot error fallback and verify asset paths after sync.
- **Simulator launch instability:** use direct `xcodebuild`, `simctl install`, and screenshot verification rather than relying only on `cap run`.
- **Design drift from product rules:** use the product spec as authority for pricing, tier count, schedule rules, cancellation, payment, and worker assignment.
- **Prototype overpromises production readiness:** label provider-dependent payment/push behavior as local or simulator-only where needed.
