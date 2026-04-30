# LiveKit Beta Decision

## Decision

LiveKit voice and real-time voice messages are **post-beta** unless closed-beta operations show that masked in-app calling is necessary for completion, safety, or support.

## Beta Fallback

- Subscriber and worker support start with in-app issue reporting, operator notes, push notifications, and callback requests.
- Operators may place manual phone calls during beta using documented support scripts.
- Real phone numbers must not be shown in subscriber or worker app surfaces.
- Any call outcome that affects a dispute, refund, worker warning, or safety decision must be logged in the operator console.

## Trigger To Reopen

Reopen LiveKit before public launch if any of these occur during closed beta:

- More than 10% of visits require live subscriber-worker coordination.
- Visit completion falls below 95% because worker/subscriber contact is too slow.
- Dispute resolution needs recorded voice evidence more than twice in a month.
- Manual operator callback volume exceeds one operator-hour per 30 active subscribers per week.

## Implementation Scope When Reopened

- Relationship check before room creation.
- Quiet-hours rule from 21:00 to 07:00 with urgent override.
- LiveKit room/token service with no direct phone-number exposure.
- Push notification to the callee and operator join/escalation path.
- Optional recording consent, encrypted object-storage upload, transcription queue, and dispute attachment.

## Cost Gate

Before implementation, price LiveKit hosting, Coturn bandwidth, storage, transcription, and operator review time. The feature only moves into beta if it reduces support load or materially improves completion/safety enough to offset the operational cost.
