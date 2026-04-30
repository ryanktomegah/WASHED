# Security, Privacy, And Accessibility Review

## Security

- Route guards enabled in production entrypoint.
- Provider credentials only in environment or secret manager, never browser code.
- Payment webhooks require secret validation.
- Push, payment, OTP, storage, and Sentry real sends require explicit enable flags.
- Operator actions write audit events where business-critical.

## Privacy

- Subscriber and worker phone numbers are not exposed to each other in product UI.
- Visit photos are scoped by visit object key.
- Support and dispute evidence is used only for service, safety, payment, and legal needs.
- Retention schedule for IDs, photos, GPS, calls, payment data, and audit events must be counsel-approved.

## Accessibility

- Mobile tap targets should be at least 44px.
- Text must remain readable on low-end Android screens.
- Core flows must not rely on color alone.
- Forms need visible labels.
- Manual TalkBack and VoiceOver checks remain required before beta.

## Open Gate

This review is code-ready but not beta-approved until a real-device accessibility pass and counsel-approved data retention schedule are complete.
