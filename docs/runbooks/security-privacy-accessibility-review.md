# Security, Privacy, And Accessibility Review

**Purpose:** Track the review evidence required before Washed moves from local implementation to closed beta or public launch.

**Status:** Repo-ready checklist. Not beta-approved until all beta-blocking rows are signed off.

## Security

| Check | Beta blocker | Evidence | Status | Owner |
|---|---:|---|---|---|
| Production entrypoint enables route guards | Yes | `packages/core-api/src/main.ts` uses guarded app creation | Ready for review | Engineering |
| Operator, worker, and subscriber role checks cover protected routes | Yes | Route-guard tests and manual API smoke test | Open | Engineering |
| Provider credentials stay server-side | Yes | Env-only providers; no browser credential use | Ready for review | Engineering |
| Real sends are gated by explicit flags | Yes | OTP, payment, push, storage, and observability providers require enable flags | Ready for review | Engineering |
| Payment webhook secret validation works | Yes | Webhook tests and provider-readiness docs | Ready for review | Engineering |
| Audit events are written for business-critical operator actions | Yes | `audit_events` + `outbox_events` persistence and audit replay endpoint | Ready for review | Engineering |
| Dependency audit has no high vulnerabilities | Yes | `pnpm audit --audit-level high` and GitHub Actions | Ready for review | Engineering |
| Secret scanning is enabled in GitHub repository settings | Yes | `docs/ops/github-security-settings.md` | Ready for review | Founder |
| External security review completed | Public launch blocker | Review report and remediation log | Open | Founder + Engineering |

## Privacy

| Check | Beta blocker | Evidence | Status | Owner |
|---|---:|---|---|---|
| Subscriber and worker phone numbers are not exposed to each other in product UI | Yes | UI review and API response review | Open | Engineering |
| Visit photos are scoped by visit object key | Yes | Object-storage provider tests and worker-photo flow | Ready for review | Engineering |
| Support/dispute evidence use is limited to service, safety, payment, and legal needs | Yes | Spec section 5.4 and legal drafts | Ready for counsel | Founder |
| Retention schedule covers IDs, references, police clearance, photos, GPS, calls, transcripts, payment data, audit events | Yes | Spec section 5.4 | Ready for counsel | Founder |
| Privacy policy matches actual data collection | Yes | `docs/legal/privacy-policy-fr.md` vs implementation review | Open | Founder + Counsel |
| Account deletion/export behavior is defined | Public launch blocker | `docs/runbooks/privacy-export-erasure.md` and `POST /v1/operator/subscriptions/{subscriptionId}/privacy-requests` | Ready for review | Engineering |
| Provider data sharing is documented | Yes | `docs/ops/provider-data-sharing-inventory.md` | Ready for counsel | Founder |
| Counsel approves retention and privacy language | Yes | Written counsel sign-off | Open | Counsel |

## Accessibility

| Check | Beta blocker | Evidence | Status | Owner |
|---|---:|---|---|---|
| Mobile tap targets are at least 44px on core flows | Yes | Screenshot/device pass on subscriber and worker surfaces | Open | Design/Engineering |
| Text remains readable on low-end Android screens | Yes | Android device or emulator profile pass | Open | Design/Engineering |
| Core flows do not rely on color alone | Yes | Manual screen review | Open | Design/Engineering |
| Forms have visible labels or accessible names | Yes | Manual review and static checks | Open | Engineering |
| Focus states are visible for web/operator flows | Yes | Keyboard navigation review | Open | Engineering |
| TalkBack pass for worker day-of-route | Yes | Real-device checklist | Open | Founder/QA |
| VoiceOver pass for subscriber support/payment flows | Public launch blocker | iOS device checklist | Open | Founder/QA |
| French copy fits without clipping | Yes | Mobile screenshots and native-speaker review | Open | Design |

## Beta Review Meeting

Hold this meeting before real households/workers or paid money movement.

Required attendees:

- Founder/product owner
- Engineering owner
- Operations/support owner
- Counsel or counsel delegate for privacy/liability
- Reviewer for French UX/accessibility

Review packet:

- Latest GitHub Actions run
- `pnpm load:beta` and `pnpm dry-run:beta` output
- Provider readiness screenshots or API responses
- Legal draft status
- Retention schedule and provider data-sharing list
- Android accessibility screenshots/video
- Open incidents, known defects, and accepted risks

## Sign-Off Log

| Date | Area | Decision | Evidence link | Sign-off |
|---|---|---|---|---|
|  | Security | Approved / Blocked |  |  |
|  | Privacy | Approved / Blocked |  |  |
|  | Accessibility | Approved / Blocked |  |  |
|  | Beta go/no-go | Approved / Blocked |  |  |
