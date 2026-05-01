import { translate } from '@washed/i18n';
import type { OperatorFeedback } from './operatorState.js';

export type OperatorRoute =
  | 'audit'
  | 'dashboard'
  | 'disputes'
  | 'liveOps'
  | 'matching'
  | 'notifications'
  | 'payments'
  | 'profiles'
  | 'reports'
  | 'routePlanning'
  | 'settings';

export interface QueueMetric {
  readonly label: string;
  readonly tone: 'accent' | 'danger' | 'primary' | 'success';
  readonly value: string;
}

export interface MatchingCandidate {
  readonly cell: string;
  readonly id: string;
  readonly score: number;
  readonly subscriber: string;
  readonly worker: string;
}

export interface OpsVisit {
  readonly eta: string;
  readonly status: string;
  readonly subscriber: string;
  readonly worker: string;
}

export interface RoutePlanRow {
  readonly load: string;
  readonly risk: 'balanced' | 'overloaded' | 'unavailable';
  readonly worker: string;
}

export interface NotificationRow {
  readonly audience: string;
  readonly status: 'due' | 'failed' | 'sent';
  readonly title: string;
}

export interface ReportCard {
  readonly label: string;
  readonly value: string;
}

export const operatorFeedback = {
  auditFiltered: 'Audit filter applied to money, privacy, and SOS events.',
  blocklistAdded: 'Household relationship block added and audit logged.',
  disputeEscalated: 'Dispute escalated for senior operator review.',
  disputeResolved: 'Dispute resolved with audit event.',
  forcedUpdateToggled: 'Forced-update flag changed for beta clients.',
  matchAccepted: 'Matching decision accepted and audit logged.',
  matchRejected: 'Matching candidate rejected with operator reason required.',
  notificationsDelivered: 'Due notifications delivered through the operator queue.',
  paymentRetryQueued: 'Mobile-money recovery retry queued.',
  payoutBatchStarted: 'Worker payout batch started.',
  payoutRetryQueued: 'Failed worker payout retry queued.',
  providerReadinessChecked: 'Provider readiness check completed.',
  refundIssued: 'Refund issued with reason and audit event.',
  reportExported: 'Closed-beta report export prepared for review.',
  routePlanApproved: 'Daily route plan approved and audit logged.',
  routeRiskAcknowledged: 'Route overload risk acknowledged for manual intervention.',
  subscriberPrivacyHandled: 'Subscriber privacy request marked handled.',
  workerPrivacyHandled: 'Worker privacy request marked handled.',
} as const satisfies Record<OperatorFeedback, string>;

export const navItems = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: translate('operator.nav.matching', 'fr'), route: 'matching' },
  { label: translate('operator.nav.liveOps', 'fr'), route: 'liveOps' },
  { label: 'Planning', route: 'routePlanning' },
  { label: 'Profiles', route: 'profiles' },
  { label: 'Litiges', route: 'disputes' },
  { label: translate('operator.nav.payments', 'fr'), route: 'payments' },
  { label: 'Notifications', route: 'notifications' },
  { label: 'Audit', route: 'audit' },
  { label: 'Rapports', route: 'reports' },
  { label: 'Settings', route: 'settings' },
] as const satisfies readonly { readonly label: string; readonly route: OperatorRoute }[];

export const queueMetrics = [
  { label: 'Matching pending', tone: 'primary', value: '7' },
  { label: 'Visits at risk', tone: 'danger', value: '2' },
  { label: 'Payment exceptions', tone: 'accent', value: '4' },
  { label: 'SOS incidents', tone: 'success', value: '0' },
] as const satisfies readonly QueueMetric[];

export const matchingCandidates = [
  {
    cell: 'Adidogomé',
    id: 'match-afi',
    score: 94,
    subscriber: 'Afi Mensah',
    worker: 'Akouvi A.',
  },
  {
    cell: 'Tokoin',
    id: 'match-kossi',
    score: 88,
    subscriber: 'Kossi Family',
    worker: 'Esi K.',
  },
  {
    cell: 'Agoè',
    id: 'match-ama',
    score: 83,
    subscriber: 'Ama N.',
    worker: 'Mawuli D.',
  },
] as const satisfies readonly MatchingCandidate[];

export const liveVisits = [
  { eta: '09:12', status: 'En route', subscriber: 'Ama K.', worker: 'Akouvi A.' },
  { eta: '10:05', status: 'Check-in', subscriber: 'Esi A.', worker: 'Esi K.' },
  { eta: '11:20', status: 'At risk', subscriber: 'Mawuli B.', worker: 'Mawuli D.' },
] as const satisfies readonly OpsVisit[];

export const routePlanRows = [
  { load: '4 visits · 1 delayed', risk: 'overloaded', worker: 'Akouvi A.' },
  { load: '3 visits · balanced', risk: 'balanced', worker: 'Esi K.' },
  { load: 'Unavailable 2026-05-06', risk: 'unavailable', worker: 'Mawuli D.' },
] as const satisfies readonly RoutePlanRow[];

export const notificationRows = [
  { audience: 'Subscribers', status: 'due', title: 'T-24h visit reminders' },
  { audience: 'Workers', status: 'sent', title: 'Route assignment confirmations' },
  { audience: 'Push devices', status: 'failed', title: 'Missing token recovery' },
] as const satisfies readonly NotificationRow[];

export const reportCards = [
  { label: 'Active subscribers', value: '42' },
  { label: 'Visit completion', value: '94%' },
  { label: 'Worker payout readiness', value: 'May batch' },
  { label: 'Payment recovery SLA', value: '4 exceptions' },
] as const satisfies readonly ReportCard[];

export const operatorSurfaces = [
  'Dashboard',
  'Login',
  'Matching',
  'Live Ops',
  'Daily route planning',
  'Worker profiles',
  'Subscriber profiles',
  'Visit detail',
  'Disputes',
  'Payments',
  'Payouts',
  'Refunds',
  'Notifications',
  'Audit',
  'Reports',
  'Settings',
  'Privacy requests',
  'Blocklist',
] as const;
