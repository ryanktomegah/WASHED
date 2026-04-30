# External Review Checklist

## Security

- External DAST against staging.
- Dependency and secret scan clean.
- Payment webhook replay and duplicate callback test.
- Provider credential rotation drill.
- Access review for operator accounts.

## Accessibility

- TalkBack pass on low-end Android.
- VoiceOver pass on iPhone.
- Dynamic text up to 200%.
- Color contrast and non-color status cues.
- End-to-end check for signup, visit visibility, support, worker route, photo capture, and ops dispute handling.

## Privacy

- Counsel-approved retention schedule.
- Evidence access limited to support/ops need.
- Phone-number masking verified in subscriber and worker surfaces.
- Photo/object-storage keys scoped by visit.

## Required Output

- Findings list with severity.
- Owner and due date for each issue.
- Explicit launch approval or launch block.
