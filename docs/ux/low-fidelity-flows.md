# Low-Fidelity Product Flows

**Purpose:** Describe the first usable beta flows for Subscriber App, Worker App, and Operator Console before high-fidelity UI polish or real participant prototype testing.

## Subscriber App

### Onboarding

1. Splash with start action.
2. Phone number entry.
3. OTP verification.
4. Address screen: neighborhood, landmark, optional GPS.
5. Tier selection: T1 or T2.
6. Schedule preference: day and morning/afternoon.
7. Payment method link when provider gate is open; sandbox/local link during development.
8. Pending assignment home state.

### Active Subscription

1. Home shows next visit, assigned worker, payment status, and support credit.
2. Subscriber can reschedule, skip, file a dispute, or request support.
3. Subscription tab manages tier, schedule, worker swap request, cancellation, billing history.
4. Support tab shows callback/dispute messages and recent visit context.
5. Profile tab shows phone/session, address summary, payment method, and push-device state.

### Error States

- Payment overdue: show recovery action and what happens to visits.
- No assigned worker yet: show assignment status and support path.
- GPS unavailable: allow landmark/manual address.
- Cancelled subscription: keep billing/support history visible.

## Worker App

### Start of Day

1. Login with OTP.
2. Route tab loads today's visits from cache first, then refreshes.
3. Worker sees stale/offline state when network fails.
4. Each visit card shows time window, address notes, status, and action.

### Visit Execution

1. Check in with GPS or fallback code.
2. Upload before photo.
3. Report issue when supplies/access/safety is wrong.
4. Upload after photo.
5. Check out with GPS validation.
6. Route updates status and earnings preview.

### Worker Support

1. Issue thread shows acknowledgement and resolution.
2. Earnings tab shows floor, bonuses, paid out, failed payout reasons, and advance request.
3. Profile tab shows capacity, service cells, worker status, and push registration.

## Operator Console

### Matching Flow

1. Open matching queue.
2. Select pending subscriber.
3. Review address, schedule, service cell, and candidate rankings.
4. Pick worker or reject/decline candidate with reason.
5. Assignment creates visits and notifies both sides.

### Live Ops Flow

1. Open today's board.
2. Filter by service cell, status, or exception.
3. Inspect visit timeline and evidence.
4. Mark no-show/cancelled only with reason.
5. Open support context for disputes or safety incidents.

### Payment Flow

1. Review provider readiness.
2. Inspect payment attempts and reconciliation snapshots.
3. Trigger refund only from dispute/support context.
4. Record failed provider attempt without hiding subscriber/worker impact.

## Prototype Test Goals

Before closed beta, test with 8 to 10 subscribers and 5 workers:

- Can subscribers understand pending assignment and payment status?
- Can workers complete a route while offline or on weak network?
- Can operators resolve a dispute without database access?
- Do French labels feel natural and respectful?
- Are safety and support actions obvious under stress?
