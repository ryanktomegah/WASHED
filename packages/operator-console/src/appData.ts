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
  readonly availability: string;
  readonly cell: string;
  readonly distance: string;
  readonly id: string;
  readonly score: number;
  readonly subscriber: string;
  readonly top: boolean;
  readonly visits: number;
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

export interface OperatorNavItem {
  readonly badge?: string;
  readonly icon: string;
  readonly label: string;
  readonly route: OperatorRoute;
}

export const operatorFeedback = {
  auditFiltered: 'Audit filter applied to money, privacy, and SOS events.',
  blocklistAdded: 'Household relationship block added and audit logged.',
  disputeEscalated: 'Dispute escalated for senior operator review.',
  disputeResolved: 'Dispute resolved with audit event.',
  forcedUpdateToggled: 'Forced-update flag changed for beta clients.',
  loginOtpSent: 'OTP sent to the operator phone.',
  loginVerified: 'Operator session verified.',
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
  { icon: '⌂', label: 'Dashboard', route: 'dashboard' },
  { badge: '3', icon: '📋', label: translate('operator.nav.matching', 'fr'), route: 'matching' },
  { badge: '1', icon: '🗺', label: translate('operator.nav.liveOps', 'fr'), route: 'liveOps' },
  { icon: '🗓', label: 'Planning', route: 'routePlanning' },
  { icon: '👷', label: 'Profiles', route: 'profiles' },
  { badge: '2', icon: '⚖', label: 'Litiges', route: 'disputes' },
  { icon: '💳', label: translate('operator.nav.payments', 'fr'), route: 'payments' },
  { icon: '🔔', label: 'Notifications', route: 'notifications' },
  { icon: '🧾', label: 'Audit', route: 'audit' },
  { icon: '📊', label: 'Rapports', route: 'reports' },
  { icon: '⚙', label: 'Settings', route: 'settings' },
] as const satisfies readonly OperatorNavItem[];

export const queueMetrics = [
  { label: 'Matching pending', tone: 'primary', value: '7' },
  { label: 'Visits at risk', tone: 'danger', value: '2' },
  { label: 'Payment exceptions', tone: 'accent', value: '4' },
  { label: 'SOS incidents', tone: 'success', value: '0' },
] as const satisfies readonly QueueMetric[];

export const matchingCandidates = [
  {
    availability: 'Libre lundi matin',
    cell: 'Bè Kpota',
    distance: '1.2 km',
    id: 'match-afi',
    score: 94,
    subscriber: 'Essi Agbodzan',
    top: true,
    visits: 47,
    worker: 'Akouvi Koffi',
  },
  {
    availability: 'Libre lundi',
    cell: 'Tokoin Est',
    distance: '2.1 km',
    id: 'match-kossi',
    score: 87,
    subscriber: 'Essi Agbodzan',
    top: false,
    visits: 31,
    worker: 'Dédé Amétodji',
  },
  {
    availability: 'Sur disponibilité',
    cell: 'Adidogomé',
    distance: '3.4 km',
    id: 'match-ama',
    score: 71,
    subscriber: 'Essi Agbodzan',
    top: false,
    visits: 12,
    worker: 'Yawa Gbéa',
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
