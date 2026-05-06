import { randomUUID } from 'node:crypto';

import {
  assertVisitCompletionAllowed,
  calculateWorkerMonthlyCompensation,
  completedVisitBonus,
  getLomeV1Tier,
  transitionSubscription,
  transitionVisit,
  type DayOfWeek,
  type SubscriptionStatus,
  type SubscriptionTierCode,
  type TimeWindow,
  type VisitStatus,
} from '@washed/core-domain';
import {
  createDomainEvent,
  money,
  type CountryCode,
  type DomainEvent,
  type Money,
} from '@washed/shared';

import { hashOtpCode, hashRefreshToken, safeHashEqual } from './auth-crypto.js';
import { type AuthRole, issueAuthTokens } from './auth-tokens.js';
import { assertCoreDomainEventContract } from './domain-event-contracts.js';
import { deliverNotificationMessageLocally } from './notification-delivery.js';
import { buildNotificationMessagesForEvent } from './notification-templates.js';
import { createOtpProvider, type OtpProvider } from './otp-provider.js';
import {
  createPaymentProvider,
  type PaymentProvider,
  type WorkerPayoutProviderResult,
} from './payment-provider.js';
import { buildAssignedSubscriptionRecord } from './subscription-assignment.js';
import { buildCreatedSubscriptionRecord } from './subscription-record.js';

export interface SubscriptionSchedulePreference {
  readonly dayOfWeek: DayOfWeek;
  readonly timeWindow: TimeWindow;
}

export type SubscriptionPaymentProvider = 'flooz' | 'mixx';

export interface SubscriptionPaymentMethod {
  readonly phoneNumber: string;
  readonly provider: SubscriptionPaymentProvider;
}

export interface CreateSubscriptionInput {
  readonly address: {
    readonly gpsLatitude: number;
    readonly gpsLongitude: number;
    readonly landmark: string;
    readonly neighborhood: string;
  };
  readonly countryCode: CountryCode;
  readonly paymentMethod?: SubscriptionPaymentMethod;
  readonly phoneNumber: string;
  readonly schedulePreference?: SubscriptionSchedulePreference;
  readonly subscriberUserId?: string;
  readonly tierCode: SubscriptionTierCode;
  readonly traceId: string;
}

export interface StartOtpChallengeInput {
  readonly countryCode: CountryCode;
  readonly phoneNumber: string;
  readonly traceId: string;
}

export interface StartedOtpChallengeRecord {
  readonly challengeId: string;
  readonly expiresAt: Date;
  readonly phoneNumber: string;
  readonly provider: string;
  readonly testCode: string | null;
}

export interface VerifyOtpChallengeInput {
  readonly challengeId: string;
  readonly code: string;
  readonly deviceId: string;
  readonly role: AuthRole;
  readonly traceId: string;
}

export interface AuthSessionRecord {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Date;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly role: AuthRole;
  readonly sessionId: string;
  readonly userId: string;
}

export interface RefreshAuthSessionInput {
  readonly refreshToken: string;
  readonly traceId: string;
}

export interface GetSubscriberProfileInput {
  readonly countryCode: CountryCode;
  readonly phoneNumber: string;
  readonly subscriberUserId: string;
}

export interface UpsertSubscriberProfileInput extends GetSubscriberProfileInput {
  readonly avatarObjectKey?: string;
  readonly email?: string;
  readonly firstName: string;
  readonly isAdultConfirmed: boolean;
  readonly lastName: string;
  readonly traceId: string;
}

export interface SubscriberProfileRecord {
  readonly avatarObjectKey: string | null;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly isAdultConfirmed: boolean;
  readonly lastName: string | null;
  readonly phoneNumber: string;
  readonly subscriberId: string;
  readonly updatedAt: Date;
}

export type MockPaymentOutcome = 'failed' | 'succeeded';

export interface ChargeSubscriptionInput {
  readonly chargedAt: Date;
  readonly idempotencyKey: string;
  readonly mockOutcome: MockPaymentOutcome;
  readonly operatorUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface IngestPaymentWebhookInput {
  readonly idempotencyKey: string;
  readonly provider: string;
  readonly providerReference: string;
  readonly receivedAt: Date;
  readonly status: MockPaymentOutcome;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface CancelSubscriptionInput {
  readonly cancelledAt: Date;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface ChangeSubscriptionTierInput {
  readonly effectiveAt: Date;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly tierCode: SubscriptionTierCode;
  readonly traceId: string;
}

export interface PauseSubscriptionInput {
  readonly pausedAt: Date;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface ResumeSubscriptionInput {
  readonly resumedAt: Date;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface UpdateSubscriptionPaymentMethodInput {
  readonly paymentMethod: SubscriptionPaymentMethod;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly updatedAt: Date;
}

export interface GetSubscriptionDetailInput {
  readonly countryCode: CountryCode;
  readonly subscriptionId: string;
}

export interface GetCurrentSubscriberSubscriptionInput {
  readonly countryCode: CountryCode;
  readonly phoneNumber: string;
  readonly subscriberUserId: string;
}

export interface RequestFirstVisitInput extends GetCurrentSubscriberSubscriptionInput {
  readonly requestedAt: Date;
  readonly schedulePreference: SubscriptionSchedulePreference;
  readonly traceId: string;
}

export interface CreateSubscriberAddressChangeRequestInput {
  readonly address: CreateSubscriptionInput['address'];
  readonly requestedAt: Date;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface SubscriberAddressChangeRequestRecord {
  readonly address: CreateSubscriptionInput['address'];
  readonly countryCode: CountryCode;
  readonly events: readonly DomainEvent[];
  readonly requestId: string;
  readonly requestedAt: Date;
  readonly requestedByUserId: string;
  readonly status: 'pending_review';
  readonly subscriptionId: string;
}

export interface SubscriberNotificationPreferencesRecord {
  readonly countryCode: CountryCode;
  readonly emailRecap: boolean;
  readonly events: readonly DomainEvent[];
  readonly pushReveal: boolean;
  readonly pushRoute: boolean;
  readonly smsReminder: boolean;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly updatedAt: Date;
  readonly updatedByUserId: string;
}

export interface GetSubscriberNotificationPreferencesInput {
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
}

export interface UpdateSubscriberNotificationPreferencesInput extends GetSubscriberNotificationPreferencesInput {
  readonly emailRecap: boolean;
  readonly pushReveal: boolean;
  readonly pushRoute: boolean;
  readonly smsReminder: boolean;
  readonly traceId: string;
  readonly updatedAt: Date;
}

export interface PaymentAttemptRecord {
  readonly amount: Money;
  readonly chargedAt: Date;
  readonly events: readonly DomainEvent[];
  readonly idempotencyKey: string;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string;
  readonly status: MockPaymentOutcome;
  readonly subscriptionId: string;
  readonly subscriptionStatus: SubscriptionStatus;
}

export interface ListPaymentAttemptsInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly provider?: string;
  readonly status?: MockPaymentOutcome;
}

export interface ListSubscriberSupportMatchesInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly phoneNumber?: string;
}

export interface SubscriberSupportMatchRecord {
  readonly countryCode: CountryCode;
  readonly phoneNumber: string;
  readonly status: SubscriptionStatus;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly tierCode: SubscriptionTierCode;
}

export interface PaymentAttemptSummaryRecord extends PaymentAttemptRecord {
  readonly countryCode: CountryCode;
}

export interface IssuePaymentRefundInput {
  readonly amountMinor: bigint;
  readonly issuedAt: Date;
  readonly operatorUserId: string;
  readonly paymentAttemptId: string;
  readonly reason: string;
  readonly traceId: string;
}

export interface PaymentRefundRecord {
  readonly amount: Money;
  readonly countryCode: CountryCode;
  readonly events: readonly DomainEvent[];
  readonly issuedAt: Date;
  readonly operatorUserId: string;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly reason: string;
  readonly refundId: string;
  readonly status: 'issued';
  readonly subscriptionId: string;
}

export interface ListSubscriptionBillingInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly subscriptionId: string;
}

export type SubscriptionBillingItemType = 'charge' | 'refund';

export interface SubscriptionBillingItemRecord {
  readonly amount: Money;
  readonly itemId: string;
  readonly itemType: SubscriptionBillingItemType;
  readonly occurredAt: Date;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly reason: string | null;
  readonly refundId: string | null;
  readonly status: string;
  readonly subscriptionId: string;
}

export type PaymentReconciliationIssueType =
  | 'overdue_failed_payment'
  | 'refund_exceeds_payment_amount';

export interface PaymentReconciliationIssue {
  readonly amount: Money;
  readonly issueType: PaymentReconciliationIssueType;
  readonly paymentAttemptId: string;
  readonly refundedAmount: Money;
  readonly severity: 'critical' | 'warning';
  readonly subscriptionId: string;
}

export interface RunPaymentReconciliationInput {
  readonly checkedAt: Date;
  readonly countryCode: CountryCode;
  readonly operatorUserId: string;
  readonly provider?: string;
  readonly traceId: string;
}

export interface PaymentReconciliationRunRecord {
  readonly checkedAt: Date;
  readonly countryCode: CountryCode;
  readonly events: readonly DomainEvent[];
  readonly issues: readonly PaymentReconciliationIssue[];
  readonly operatorUserId: string;
  readonly provider: string | null;
  readonly reconciliationRunId: string;
  readonly status: 'clean' | 'issues_found';
  readonly totalCollected: Money;
  readonly totalFailedAttempts: number;
  readonly totalRefunded: Money;
  readonly totalSucceededAttempts: number;
}

export interface CancelledSubscriptionRecord {
  readonly cancelledAt: Date;
  readonly cancelledScheduledVisits: number;
  readonly events: readonly DomainEvent[];
  readonly status: 'cancelled';
  readonly subscriptionId: string;
}

export interface ChangedSubscriptionTierRecord {
  readonly effectiveAt: Date;
  readonly events: readonly DomainEvent[];
  readonly monthlyPriceMinor: bigint;
  readonly previousTierCode: SubscriptionTierCode;
  readonly status: SubscriptionStatus;
  readonly subscriptionId: string;
  readonly tierCode: SubscriptionTierCode;
  readonly visitsPerCycle: 1 | 2;
}

export interface PausedSubscriptionRecord {
  readonly events: readonly DomainEvent[];
  readonly pausedAt: Date;
  readonly pausedScheduledVisits: number;
  readonly status: 'paused';
  readonly subscriptionId: string;
}

export interface ResumedSubscriptionRecord {
  readonly events: readonly DomainEvent[];
  readonly resumedAt: Date;
  readonly status: 'active';
  readonly subscriptionId: string;
}

export interface UpdatedSubscriptionPaymentMethodRecord {
  readonly events: readonly DomainEvent[];
  readonly paymentMethod: SubscriptionPaymentMethod;
  readonly subscriptionId: string;
  readonly updatedAt: Date;
}

export interface CreatedSubscriptionRecord {
  readonly addressId: string;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly currencyCode: string;
  readonly events: readonly DomainEvent[];
  readonly monthlyPriceMinor: bigint;
  readonly paymentMethod: SubscriptionPaymentMethod | null;
  readonly status: 'pending_match' | 'ready_no_visit';
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly tierCode: SubscriptionTierCode;
  readonly visitsPerCycle: 1 | 2;
}

export interface FirstVisitRequestRecord {
  readonly countryCode: CountryCode;
  readonly events: readonly DomainEvent[];
  readonly requestedAt: Date;
  readonly schedulePreference: SubscriptionSchedulePreference;
  readonly status: 'pending_match';
  readonly subscriberId: string;
  readonly subscriptionId: string;
}

export interface AssignWorkerInput {
  readonly anchorDate: string;
  readonly operatorUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly workerId: string;
}

export interface DeclineAssignmentCandidateInput {
  readonly anchorDate: string;
  readonly operatorUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly workerId: string;
}

export interface VisitLocationInput {
  readonly latitude: number;
  readonly longitude: number;
}

export interface CheckInVisitInput {
  readonly checkedInAt: Date;
  readonly fallbackCode?: string;
  readonly location: VisitLocationInput;
  readonly traceId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export interface CheckOutVisitInput {
  readonly checkedOutAt: Date;
  readonly fallbackCode?: string;
  readonly location: VisitLocationInput;
  readonly traceId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export type VisitPhotoType = 'after' | 'before';
export type VisitPhotoContentType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface UploadVisitPhotoInput {
  readonly byteSize: number;
  readonly capturedAt: Date;
  readonly contentType: VisitPhotoContentType;
  readonly objectKey: string;
  readonly photoType: VisitPhotoType;
  readonly traceId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export interface RescheduleVisitInput {
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly visitId: string;
}

export interface SkipVisitInput {
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly visitId: string;
}

export type OperatorVisitCloseoutStatus = 'cancelled' | 'no_show';

export interface UpdateOperatorVisitStatusInput {
  readonly note: string;
  readonly operatorUserId: string;
  readonly status: OperatorVisitCloseoutStatus;
  readonly traceId: string;
  readonly updatedAt: Date;
  readonly visitId: string;
}

export type DisputeIssueType = 'damaged_item' | 'missing_item' | 'other' | 'worker_no_show';

export type DisputeStatus =
  | 'escalated'
  | 'open'
  | 'resolved_for_subscriber'
  | 'resolved_for_worker';

export interface CreateDisputeInput {
  readonly createdAt: Date;
  readonly description: string;
  readonly issueType: DisputeIssueType;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly visitId: string;
}

export interface RateVisitInput {
  readonly comment?: string;
  readonly createdAt: Date;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly visitId: string;
}

export type WorkerIssueType =
  | 'access_issue'
  | 'client_unavailable'
  | 'other'
  | 'safety_concern'
  | 'supplies_missing';
export type WorkerIssueStatus = 'acknowledged' | 'open' | 'resolved';

export interface ReportWorkerIssueInput {
  readonly createdAt: Date;
  readonly description: string;
  readonly issueType: WorkerIssueType;
  readonly traceId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export type WorkerSwapRequestStatus = 'approved' | 'declined' | 'open';

export interface CreateWorkerSwapRequestInput {
  readonly reason: string;
  readonly requestedAt: Date;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface ListWorkerSwapRequestsInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly status?: WorkerSwapRequestStatus;
}

export interface ResolveWorkerSwapRequestInput {
  readonly countryCode: CountryCode;
  readonly operatorUserId: string;
  readonly replacementWorkerId?: string;
  readonly requestId: string;
  readonly resolution: Exclude<WorkerSwapRequestStatus, 'open'>;
  readonly resolutionNote: string;
  readonly resolvedAt: Date;
  readonly traceId: string;
}

export interface ListWorkerIssuesInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly status?: WorkerIssueStatus;
}

export interface ResolveWorkerIssueInput {
  readonly countryCode: CountryCode;
  readonly issueId: string;
  readonly operatorUserId: string;
  readonly resolutionNote: string;
  readonly resolvedAt: Date;
  readonly status: Exclude<WorkerIssueStatus, 'open'>;
  readonly traceId: string;
}

export interface ListOperatorDisputesInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly status?: DisputeStatus;
  readonly subscriptionId?: string;
}

export interface ResolveDisputeInput {
  readonly countryCode: CountryCode;
  readonly disputeId: string;
  readonly operatorUserId: string;
  readonly resolution: Exclude<DisputeStatus, 'open'>;
  readonly resolutionNote: string;
  readonly resolvedAt: Date;
  readonly subscriberCreditAmountMinor?: bigint;
  readonly traceId: string;
}

export interface GetWorkerMonthlyEarningsInput {
  readonly countryCode: CountryCode;
  readonly month: string;
  readonly workerId: string;
}

export interface CreateWorkerMonthlyPayoutInput {
  readonly countryCode: CountryCode;
  readonly month: string;
  readonly note: string;
  readonly operatorUserId: string;
  readonly paidAt: Date;
  readonly providerReference?: string;
  readonly traceId: string;
  readonly workerId: string;
}

export interface ListWorkerPayoutsInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly month?: string;
  readonly workerId?: string;
}

export type WorkerAdvanceRequestStatus = 'approved' | 'declined' | 'open';

export interface CreateWorkerAdvanceRequestInput {
  readonly amountMinor: bigint;
  readonly countryCode: CountryCode;
  readonly month: string;
  readonly reason: string;
  readonly requestedAt: Date;
  readonly traceId: string;
  readonly workerId: string;
}

export interface ListWorkerAdvanceRequestsInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly month?: string;
  readonly status?: WorkerAdvanceRequestStatus;
  readonly workerId?: string;
}

export interface ResolveWorkerAdvanceRequestInput {
  readonly countryCode: CountryCode;
  readonly operatorUserId: string;
  readonly requestId: string;
  readonly resolution: Exclude<WorkerAdvanceRequestStatus, 'open'>;
  readonly resolutionNote: string;
  readonly resolvedAt: Date;
  readonly traceId: string;
}

export interface GetWorkerRouteInput {
  readonly countryCode: CountryCode;
  readonly date: string;
  readonly workerId: string;
}

export interface ListMatchingQueueInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
}

export interface UpsertWorkerProfileInput {
  readonly countryCode: CountryCode;
  readonly displayName: string;
  readonly maxActiveSubscriptions: number;
  readonly serviceNeighborhoods: readonly string[];
  readonly status: 'active' | 'applicant' | 'inactive' | 'onboarding' | 'suspended';
  readonly workerId: string;
}

export type WorkerOnboardingStage =
  | 'activated'
  | 'application_received'
  | 'casier_received'
  | 'cni_uploaded'
  | 'references_called'
  | 'rejected'
  | 'training_scheduled'
  | 'uniform_issued';

export interface CreateWorkerOnboardingCaseInput {
  readonly appliedAt: Date;
  readonly countryCode: CountryCode;
  readonly displayName: string;
  readonly maxActiveSubscriptions: number;
  readonly operatorUserId: string;
  readonly phoneNumber: string;
  readonly serviceNeighborhoods: readonly string[];
  readonly traceId: string;
  readonly workerId: string;
}

export interface ListWorkerOnboardingCasesInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly stage?: WorkerOnboardingStage;
}

export interface AdvanceWorkerOnboardingCaseInput {
  readonly caseId: string;
  readonly countryCode: CountryCode;
  readonly note: string;
  readonly occurredAt: Date;
  readonly operatorUserId: string;
  readonly stage: Exclude<WorkerOnboardingStage, 'application_received'>;
  readonly traceId: string;
}

export interface ListMatchingCandidatesInput {
  readonly anchorDate?: string;
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly subscriptionId: string;
}

export interface CreateWorkerUnavailabilityInput {
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly date: string;
  readonly reason: string;
  readonly traceId: string;
  readonly workerId: string;
}

export interface ListWorkerUnavailabilityInput {
  readonly countryCode: CountryCode;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly limit: number;
  readonly workerId: string;
}

export interface ListServiceCellsInput {
  readonly countryCode: CountryCode;
  readonly date: string;
  readonly limit: number;
}

export interface ListAuditEventsInput {
  readonly aggregateId?: string;
  readonly aggregateType?: string;
  readonly countryCode: CountryCode;
  readonly eventType?: string;
  readonly limit: number;
}

export interface AuditEventRecord {
  readonly actor: DomainEvent['actor'];
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly countryCode: CountryCode;
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
  readonly recordedAt: Date;
  readonly traceId: string;
}

export type SubscriberPrivacyRequestType = 'erasure' | 'export';

export interface CreateSubscriberPrivacyRequestInput {
  readonly countryCode: CountryCode;
  readonly operatorUserId: string;
  readonly reason: string;
  readonly requestedAt: Date;
  readonly requestType: SubscriberPrivacyRequestType;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface SubscriberPrivacyExportBundle {
  readonly auditEvents: readonly AuditEventRecord[];
  readonly billingHistory: readonly SubscriptionBillingItemRecord[];
  readonly disputes: readonly DisputeRecord[];
  readonly notifications: readonly NotificationMessageRecord[];
  readonly subscription: SubscriptionDetailRecord;
}

export interface SubscriberPrivacyErasurePlan {
  readonly immediateActions: readonly string[];
  readonly retainedRecords: readonly {
    readonly reason: string;
    readonly recordType: string;
    readonly retention: string;
  }[];
}

export interface SubscriberPrivacyRequestRecord {
  readonly erasurePlan: SubscriberPrivacyErasurePlan;
  readonly events: readonly DomainEvent[];
  readonly exportBundle: SubscriberPrivacyExportBundle;
  readonly operatorUserId: string;
  readonly reason: string;
  readonly requestedAt: Date;
  readonly requestId: string;
  readonly requestType: SubscriberPrivacyRequestType;
  readonly subscriptionId: string;
}

export type NotificationChannel = 'in_app' | 'push' | 'sms' | 'whatsapp';
export type NotificationRecipientRole = 'operator' | 'subscriber' | 'worker';
export type NotificationStatus = 'failed' | 'pending' | 'sent' | 'suppressed_quiet_hours';
export type PushDeviceEnvironment = 'development' | 'production' | 'simulator';
export type PushDevicePlatform = 'android' | 'ios';
export type PushDeviceStatus = 'active' | 'revoked';

export interface RegisterPushDeviceInput {
  readonly app: AuthRole;
  readonly countryCode: CountryCode;
  readonly deviceId: string;
  readonly environment: PushDeviceEnvironment;
  readonly platform: PushDevicePlatform;
  readonly registeredAt: Date;
  readonly role: AuthRole;
  readonly token: string;
  readonly userId: string;
}

export interface ListPushDevicesInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly role?: AuthRole;
  readonly status?: PushDeviceStatus;
}

export interface PushDeviceRecord {
  readonly app: AuthRole;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly deviceId: string;
  readonly environment: PushDeviceEnvironment;
  readonly lastRegisteredAt: Date;
  readonly platform: PushDevicePlatform;
  readonly pushDeviceId: string;
  readonly role: AuthRole;
  readonly status: PushDeviceStatus;
  readonly token: string;
  readonly updatedAt: Date;
  readonly userId: string;
}

export interface ListNotificationMessagesInput {
  readonly aggregateId?: string;
  readonly aggregateType?: string;
  readonly channel?: NotificationChannel;
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly status?: NotificationStatus;
  readonly templateKey?: string;
}

export interface DeliverDueNotificationMessagesInput {
  readonly countryCode: CountryCode;
  readonly deliveredAt: Date;
  readonly limit: number;
}

export interface NotificationMessageRecord {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly attemptCount: number;
  readonly availableAt: Date;
  readonly channel: NotificationChannel;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly eventId: string;
  readonly failureReason: string | null;
  readonly lastAttemptAt: Date | null;
  readonly messageId: string;
  readonly payload: Record<string, unknown>;
  readonly provider: string | null;
  readonly providerReference: string | null;
  readonly recipientRole: NotificationRecipientRole;
  readonly recipientUserId: string | null;
  readonly sentAt: Date | null;
  readonly status: NotificationStatus;
  readonly templateKey: string;
}

export interface ScheduledVisitRecord {
  readonly fallbackCode: string;
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: 'scheduled';
  readonly visitId: string;
  readonly workerId: string;
}

export interface CheckedInVisitRecord {
  readonly checkedInAt: Date;
  readonly status: 'in_progress';
  readonly visitId: string;
  readonly workerId: string;
}

export interface CompletedVisitRecord {
  readonly bonus: Money;
  readonly checkedInAt: Date;
  readonly checkedOutAt: Date;
  readonly durationMinutes: number;
  readonly events: readonly DomainEvent[];
  readonly status: 'completed';
  readonly visitId: string;
  readonly workerId: string;
}

export interface VisitPhotoRecord {
  readonly byteSize: number;
  readonly capturedAt: Date;
  readonly contentType: VisitPhotoContentType;
  readonly countryCode: CountryCode;
  readonly events: readonly DomainEvent[];
  readonly objectKey: string;
  readonly photoId: string;
  readonly photoType: VisitPhotoType;
  readonly uploadedAt: Date;
  readonly visitId: string;
  readonly workerId: string;
}

export interface RescheduledVisitRecord {
  readonly events: readonly DomainEvent[];
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: 'scheduled';
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export interface SkippedVisitRecord {
  readonly events: readonly DomainEvent[];
  readonly status: 'cancelled';
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export interface OperatorVisitStatusRecord {
  readonly events: readonly DomainEvent[];
  readonly note: string;
  readonly previousStatus: VisitStatus;
  readonly status: OperatorVisitCloseoutStatus;
  readonly subscriptionId: string;
  readonly updatedAt: Date;
  readonly visitId: string;
  readonly workerId: string;
}

export interface DisputeRecord {
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly description: string;
  readonly disputeId: string;
  readonly events: readonly DomainEvent[];
  readonly issueType: DisputeIssueType;
  readonly openedByUserId: string;
  readonly resolvedAt: Date | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly status: DisputeStatus;
  readonly subscriberCredit: Money | null;
  readonly subscriberCreditId: string | null;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string | null;
}

export type SupportContactCategory = 'other' | 'payment' | 'plan' | 'visit' | 'worker';
export type SupportContactStatus = 'open' | 'resolved';

export interface SupportContactRecord {
  readonly body: string;
  readonly category: SupportContactCategory;
  readonly contactId: string;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly events: readonly DomainEvent[];
  readonly openedByUserId: string;
  readonly resolutionNote: string | null;
  readonly resolvedAt: Date | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly status: SupportContactStatus;
  readonly subject: string;
  readonly subscriptionId: string;
}

export interface CreateSupportContactInput {
  readonly body: string;
  readonly category: SupportContactCategory;
  readonly createdAt: Date;
  readonly subject: string;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface CreateSupportContactMessageInput {
  readonly body: string;
  readonly contactId: string;
  readonly createdAt: Date;
  readonly subscriberUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface SupportContactMessageRecord {
  readonly authorRole: 'operator' | 'subscriber';
  readonly authorUserId: string;
  readonly body: string;
  readonly contactId: string;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly events: readonly DomainEvent[];
  readonly messageId: string;
  readonly subscriptionId: string;
}

export interface ListSupportContactsInput {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly status?: SupportContactStatus;
  readonly subscriptionId: string;
}

export interface GetSupportContactInput {
  readonly countryCode: CountryCode;
  readonly contactId: string;
  readonly subscriptionId: string;
}

export interface ResolveSupportContactInput {
  readonly countryCode: CountryCode;
  readonly contactId: string;
  readonly operatorUserId: string;
  readonly resolutionNote: string;
  readonly resolvedAt: Date;
  readonly traceId: string;
}

export interface SupportCreditRecord {
  readonly amount: Money;
  readonly createdAt: Date;
  readonly creditId: string;
  readonly disputeId: string;
  readonly issuedByOperatorUserId: string;
  readonly reason: string;
  readonly subscriptionId: string;
}

export interface VisitRatingRecord {
  readonly comment: string | null;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly events: readonly DomainEvent[];
  readonly ratedByUserId: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly ratingId: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string | null;
}

export interface SubscriberVisitDetailRecord {
  readonly address: CreateSubscriptionInput['address'];
  readonly countryCode: CountryCode;
  readonly dispute: DisputeRecord | null;
  readonly photos: readonly VisitPhotoRecord[];
  readonly rating: VisitRatingRecord | null;
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: VisitStatus;
  readonly subscriptionId: string;
  readonly timeline: {
    readonly checkedInAt: Date | null;
    readonly checkedOutAt: Date | null;
    readonly durationMinutes: number | null;
  };
  readonly visitId: string;
  readonly worker: {
    readonly displayName: string;
    readonly workerId: string;
  } | null;
}

export interface WorkerIssueReportRecord {
  readonly address?: {
    readonly gpsLatitude: number;
    readonly gpsLongitude: number;
    readonly landmark: string;
    readonly neighborhood: string;
  };
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly description: string;
  readonly events: readonly DomainEvent[];
  readonly handledByOperatorUserId: string | null;
  readonly issueId: string;
  readonly issueType: WorkerIssueType;
  readonly resolutionNote: string | null;
  readonly resolvedAt: Date | null;
  readonly scheduledDate?: string;
  readonly scheduledTimeWindow?: TimeWindow;
  readonly status: WorkerIssueStatus;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export interface WorkerSwapRequestRecord {
  readonly countryCode: CountryCode;
  readonly currentWorkerId: string;
  readonly currentWorkerName?: string;
  readonly events: readonly DomainEvent[];
  readonly reason: string;
  readonly replacementWorkerId: string | null;
  readonly replacementWorkerName?: string;
  readonly requestedAt: Date;
  readonly requestId: string;
  readonly resolvedAt: Date | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly status: WorkerSwapRequestStatus;
  readonly subscriberId: string;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
}

export interface WorkerMonthlyEarningsRecord {
  readonly completedVisits: number;
  readonly floor: Money;
  readonly month: string;
  readonly netDue: Money;
  readonly payoutHistory: readonly WorkerPayoutRecord[];
  readonly paidOutTotal: Money;
  readonly total: Money;
  readonly visitBonusTotal: Money;
  readonly workerId: string;
}

export type WorkerPayoutType = 'advance' | 'monthly_settlement';
export type WorkerPayoutStatus = 'failed' | 'paid';

export interface WorkerPayoutRecord {
  readonly advanceRequestId: string | null;
  readonly amount: Money;
  readonly countryCode: CountryCode;
  readonly createdByOperatorUserId: string;
  readonly events: readonly DomainEvent[];
  readonly failureReason: string | null;
  readonly note: string;
  readonly paidAt: Date;
  readonly payoutId: string;
  readonly payoutType: WorkerPayoutType;
  readonly periodMonth: string;
  readonly provider: 'manual' | 'mobile_money_http';
  readonly providerReference: string | null;
  readonly status: WorkerPayoutStatus;
  readonly workerId: string;
  readonly workerName?: string;
}

export interface WorkerAdvanceRequestRecord {
  readonly amount: Money;
  readonly countryCode: CountryCode;
  readonly events: readonly DomainEvent[];
  readonly month: string;
  readonly reason: string;
  readonly requestedAt: Date;
  readonly requestId: string;
  readonly resolvedAt: Date | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly status: WorkerAdvanceRequestStatus;
  readonly workerId: string;
  readonly workerName?: string;
}

export interface WorkerRouteVisitRecord {
  readonly address: {
    readonly gpsLatitude: number;
    readonly gpsLongitude: number;
    readonly landmark: string;
    readonly neighborhood: string;
  };
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: VisitStatus;
  readonly subscriberPhoneNumber: string;
  readonly subscriptionId: string;
  readonly visitId: string;
}

export interface WorkerRouteRecord {
  readonly date: string;
  readonly visits: readonly WorkerRouteVisitRecord[];
  readonly workerId: string;
}

export interface SubscriptionDetailVisitRecord {
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: VisitStatus;
  readonly visitId: string;
  readonly workerId: string | null;
}

export interface SubscriptionDetailSupportCreditRecord {
  readonly amount: Money;
  readonly createdAt: Date;
  readonly creditId: string;
  readonly reason: string;
}

export interface SubscriptionDetailRecord {
  readonly address: {
    readonly gpsLatitude: number;
    readonly gpsLongitude: number;
    readonly landmark: string;
    readonly neighborhood: string;
  };
  readonly assignedWorker: {
    readonly averageRating: number | null;
    readonly completedVisitCount: number;
    readonly displayName: string;
    readonly disputeCount: number;
    readonly workerId: string;
  } | null;
  readonly billingStatus: {
    readonly nextChargeAt: Date | null;
    readonly overdueSince: Date | null;
    readonly paymentAuthorizationStatus:
      | 'authorization_failed'
      | 'authorization_pending'
      | 'ready'
      | 'unavailable';
  };
  readonly countryCode: CountryCode;
  readonly monthlyPriceMinor: bigint;
  readonly pendingAddressChange: SubscriberAddressChangeRequestRecord | null;
  readonly paymentMethod: SubscriptionPaymentMethod | null;
  readonly phoneNumber: string;
  readonly schedulePreference: SubscriptionSchedulePreference | null;
  readonly status: SubscriptionStatus;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly recentVisits: readonly SubscriptionDetailVisitRecord[];
  readonly tierCode: SubscriptionTierCode;
  readonly supportCredits: readonly SubscriptionDetailSupportCreditRecord[];
  readonly upcomingVisits: readonly SubscriptionDetailVisitRecord[];
  readonly visitsPerCycle: 1 | 2;
}

export interface MatchingQueueItemRecord {
  readonly address: {
    readonly gpsLatitude: number;
    readonly gpsLongitude: number;
    readonly landmark: string;
    readonly neighborhood: string;
  };
  readonly assignmentDueAt: Date;
  readonly countryCode: CountryCode;
  readonly monthlyPriceMinor: bigint;
  readonly phoneNumber: string;
  readonly queuedAt: Date;
  readonly schedulePreference: {
    readonly dayOfWeek: DayOfWeek;
    readonly timeWindow: TimeWindow;
  };
  readonly status: 'pending_match';
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly tierCode: SubscriptionTierCode;
  readonly visitsPerCycle: 1 | 2;
}

export interface WorkerProfileRecord {
  readonly countryCode: CountryCode;
  readonly displayName: string;
  readonly maxActiveSubscriptions: number;
  readonly serviceNeighborhoods: readonly string[];
  readonly status: 'active' | 'applicant' | 'inactive' | 'onboarding' | 'suspended';
  readonly workerId: string;
}

export interface WorkerOnboardingCaseRecord {
  readonly appliedAt: Date;
  readonly caseId: string;
  readonly countryCode: CountryCode;
  readonly displayName: string;
  readonly events: readonly DomainEvent[];
  readonly maxActiveSubscriptions: number;
  readonly notes: readonly WorkerOnboardingNoteRecord[];
  readonly phoneNumber: string;
  readonly serviceNeighborhoods: readonly string[];
  readonly stage: WorkerOnboardingStage;
  readonly updatedAt: Date;
  readonly workerId: string;
}

export interface WorkerOnboardingNoteRecord {
  readonly createdAt: Date;
  readonly note: string;
  readonly operatorUserId: string;
  readonly stage: WorkerOnboardingStage;
}

export interface WorkerUnavailabilityRecord {
  readonly createdAt: Date;
  readonly date: string;
  readonly events: readonly DomainEvent[];
  readonly reason: string;
  readonly unavailabilityId: string;
  readonly workerId: string;
}

export interface MatchingCandidateRecord {
  readonly activeSubscriptionCount: number;
  readonly capacityRemaining: number;
  readonly displayName: string;
  readonly maxActiveSubscriptions: number;
  readonly score: number;
  readonly scoreReasons: readonly string[];
  readonly serviceNeighborhoods: readonly string[];
  readonly workerId: string;
}

export interface ServiceCellCapacityRecord {
  readonly activeSubscriptions: number;
  readonly activeWorkers: number;
  readonly capacityRemaining: number;
  readonly completedVisits: number;
  readonly inProgressVisits: number;
  readonly scheduledVisits: number;
  readonly serviceCell: string;
  readonly totalCapacity: number;
  readonly utilizationPercent: number;
}

export interface AssignedSubscriptionRecord {
  readonly events: readonly DomainEvent[];
  readonly status: 'active';
  readonly subscriptionId: string;
  readonly visits: readonly ScheduledVisitRecord[];
  readonly workerId: string;
}

interface InMemoryAssignmentDecisionState {
  readonly anchorDate: string;
  readonly countryCode: CountryCode;
  readonly decision: AssignmentDecision;
  readonly operatorUserId: string;
  readonly reason: AssignmentDecisionReason;
  readonly subscriptionId: string;
  readonly workerId: string;
}

export interface AssignmentDecisionRecord extends InMemoryAssignmentDecisionState {
  readonly createdAt: Date;
  readonly decisionId: string;
  readonly events: readonly DomainEvent[];
}

type AssignmentDecision = 'assigned' | 'declined' | 'rejected';
type AssignmentDecisionReason =
  | 'capacity_exhausted'
  | 'operator_selected_worker'
  | 'operator_declined_candidate'
  | 'service_cell_mismatch'
  | 'worker_not_active'
  | 'worker_unavailable';

export interface CoreRepository {
  assignWorker(input: AssignWorkerInput): Promise<AssignedSubscriptionRecord>;
  cancelSubscription(input: CancelSubscriptionInput): Promise<CancelledSubscriptionRecord>;
  changeSubscriptionTier(
    input: ChangeSubscriptionTierInput,
  ): Promise<ChangedSubscriptionTierRecord>;
  pauseSubscription(input: PauseSubscriptionInput): Promise<PausedSubscriptionRecord>;
  resumeSubscription(input: ResumeSubscriptionInput): Promise<ResumedSubscriptionRecord>;
  updateSubscriptionPaymentMethod(
    input: UpdateSubscriptionPaymentMethodInput,
  ): Promise<UpdatedSubscriptionPaymentMethodRecord>;
  checkInVisit(input: CheckInVisitInput): Promise<CheckedInVisitRecord>;
  checkOutVisit(input: CheckOutVisitInput): Promise<CompletedVisitRecord>;
  chargeSubscription(input: ChargeSubscriptionInput): Promise<PaymentAttemptRecord>;
  ingestPaymentWebhook(input: IngestPaymentWebhookInput): Promise<PaymentAttemptRecord>;
  issuePaymentRefund(input: IssuePaymentRefundInput): Promise<PaymentRefundRecord>;
  createDispute(input: CreateDisputeInput): Promise<DisputeRecord>;
  createSubscription(input: CreateSubscriptionInput): Promise<CreatedSubscriptionRecord>;
  createWorkerMonthlyPayout(input: CreateWorkerMonthlyPayoutInput): Promise<WorkerPayoutRecord>;
  createWorkerOnboardingCase(
    input: CreateWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord>;
  createWorkerUnavailability(
    input: CreateWorkerUnavailabilityInput,
  ): Promise<WorkerUnavailabilityRecord>;
  declineAssignmentCandidate(
    input: DeclineAssignmentCandidateInput,
  ): Promise<AssignmentDecisionRecord>;
  deliverDueNotificationMessages(
    input: DeliverDueNotificationMessagesInput,
  ): Promise<readonly NotificationMessageRecord[]>;
  createWorkerAdvanceRequest(
    input: CreateWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord>;
  createWorkerSwapRequest(input: CreateWorkerSwapRequestInput): Promise<WorkerSwapRequestRecord>;
  createSubscriberAddressChangeRequest(
    input: CreateSubscriberAddressChangeRequestInput,
  ): Promise<SubscriberAddressChangeRequestRecord>;
  rateVisit(input: RateVisitInput): Promise<VisitRatingRecord>;
  refreshAuthSession(input: RefreshAuthSessionInput): Promise<AuthSessionRecord>;
  registerPushDevice(input: RegisterPushDeviceInput): Promise<PushDeviceRecord>;
  reportWorkerIssue(input: ReportWorkerIssueInput): Promise<WorkerIssueReportRecord>;
  resolveDispute(input: ResolveDisputeInput): Promise<DisputeRecord>;
  createSupportContact(input: CreateSupportContactInput): Promise<SupportContactRecord>;
  createSupportContactMessage(
    input: CreateSupportContactMessageInput,
  ): Promise<SupportContactMessageRecord>;
  listSupportContactsForSubscription(
    input: ListSupportContactsInput,
  ): Promise<readonly SupportContactRecord[]>;
  getSupportContact(input: GetSupportContactInput): Promise<SupportContactRecord | null>;
  listSupportContactMessages(
    input: GetSupportContactInput,
  ): Promise<readonly SupportContactMessageRecord[]>;
  resolveSupportContact(input: ResolveSupportContactInput): Promise<SupportContactRecord>;
  rescheduleVisit(input: RescheduleVisitInput): Promise<RescheduledVisitRecord>;
  skipVisit(input: SkipVisitInput): Promise<SkippedVisitRecord>;
  getSubscriberVisitDetail(input: {
    readonly countryCode: CountryCode;
    readonly subscriberUserId: string;
    readonly subscriptionId: string;
    readonly visitId: string;
  }): Promise<SubscriberVisitDetailRecord>;
  updateOperatorVisitStatus(
    input: UpdateOperatorVisitStatusInput,
  ): Promise<OperatorVisitStatusRecord>;
  startOtpChallenge(input: StartOtpChallengeInput): Promise<StartedOtpChallengeRecord>;
  uploadVisitPhoto(input: UploadVisitPhotoInput): Promise<VisitPhotoRecord>;
  verifyOtpChallenge(input: VerifyOtpChallengeInput): Promise<AuthSessionRecord>;
  getWorkerMonthlyEarnings(
    input: GetWorkerMonthlyEarningsInput,
  ): Promise<WorkerMonthlyEarningsRecord>;
  getWorkerProfile(workerId: string): Promise<WorkerProfileRecord>;
  getWorkerRoute(input: GetWorkerRouteInput): Promise<WorkerRouteRecord>;
  getSubscriberProfile(input: GetSubscriberProfileInput): Promise<SubscriberProfileRecord>;
  getCurrentSubscriberSubscription(
    input: GetCurrentSubscriberSubscriptionInput,
  ): Promise<SubscriptionDetailRecord | null>;
  getSubscriberNotificationPreferences(
    input: GetSubscriberNotificationPreferencesInput,
  ): Promise<SubscriberNotificationPreferencesRecord>;
  getSubscriptionDetail(input: GetSubscriptionDetailInput): Promise<SubscriptionDetailRecord>;
  health(): Promise<'ok'>;
  listMatchingCandidates(
    input: ListMatchingCandidatesInput,
  ): Promise<readonly MatchingCandidateRecord[]>;
  listMatchingQueue(input: ListMatchingQueueInput): Promise<readonly MatchingQueueItemRecord[]>;
  listOperatorDisputes(input: ListOperatorDisputesInput): Promise<readonly DisputeRecord[]>;
  listAuditEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]>;
  createSubscriberPrivacyRequest(
    input: CreateSubscriberPrivacyRequestInput,
  ): Promise<SubscriberPrivacyRequestRecord>;
  listPaymentAttempts(
    input: ListPaymentAttemptsInput,
  ): Promise<readonly PaymentAttemptSummaryRecord[]>;
  listSubscriberSupportMatches(
    input: ListSubscriberSupportMatchesInput,
  ): Promise<readonly SubscriberSupportMatchRecord[]>;
  listSubscriptionBilling(
    input: ListSubscriptionBillingInput,
  ): Promise<readonly SubscriptionBillingItemRecord[]>;
  listNotificationMessages(
    input: ListNotificationMessagesInput,
  ): Promise<readonly NotificationMessageRecord[]>;
  listPushDevices(input: ListPushDevicesInput): Promise<readonly PushDeviceRecord[]>;
  listServiceCells(input: ListServiceCellsInput): Promise<readonly ServiceCellCapacityRecord[]>;
  listWorkerPayouts(input: ListWorkerPayoutsInput): Promise<readonly WorkerPayoutRecord[]>;
  listWorkerOnboardingCases(
    input: ListWorkerOnboardingCasesInput,
  ): Promise<readonly WorkerOnboardingCaseRecord[]>;
  listWorkerUnavailability(
    input: ListWorkerUnavailabilityInput,
  ): Promise<readonly WorkerUnavailabilityRecord[]>;
  listWorkerAdvanceRequests(
    input: ListWorkerAdvanceRequestsInput,
  ): Promise<readonly WorkerAdvanceRequestRecord[]>;
  listWorkerIssues(input: ListWorkerIssuesInput): Promise<readonly WorkerIssueReportRecord[]>;
  listWorkerSwapRequests(
    input: ListWorkerSwapRequestsInput,
  ): Promise<readonly WorkerSwapRequestRecord[]>;
  upsertWorkerProfile(input: UpsertWorkerProfileInput): Promise<WorkerProfileRecord>;
  upsertSubscriberProfile(input: UpsertSubscriberProfileInput): Promise<SubscriberProfileRecord>;
  updateSubscriberNotificationPreferences(
    input: UpdateSubscriberNotificationPreferencesInput,
  ): Promise<SubscriberNotificationPreferencesRecord>;
  requestFirstVisit(input: RequestFirstVisitInput): Promise<SubscriptionDetailRecord>;
  advanceWorkerOnboardingCase(
    input: AdvanceWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord>;
  resolveWorkerAdvanceRequest(
    input: ResolveWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord>;
  runPaymentReconciliation(
    input: RunPaymentReconciliationInput,
  ): Promise<PaymentReconciliationRunRecord>;
  resolveWorkerIssue(input: ResolveWorkerIssueInput): Promise<WorkerIssueReportRecord>;
  resolveWorkerSwapRequest(input: ResolveWorkerSwapRequestInput): Promise<WorkerSwapRequestRecord>;
}

interface InMemorySubscriptionState {
  readonly address: CreateSubscriptionInput['address'];
  monthlyPriceMinor: bigint;
  paymentMethod: SubscriptionPaymentMethod | null;
  readonly phoneNumber: string;
  readonly record: CreatedSubscriptionRecord;
  schedulePreference: SubscriptionSchedulePreference | null;
  status: SubscriptionStatus;
  tierCode: SubscriptionTierCode;
  visitsPerCycle: 1 | 2;
}

interface InMemoryOtpChallengeState {
  attempts: number;
  consumedAt?: Date;
  readonly countryCode: CountryCode;
  readonly expiresAt: Date;
  readonly phoneNumber: string;
  readonly codeHash: string;
}

interface InMemoryAuthUserState {
  readonly countryCode: CountryCode;
  readonly phoneNumber: string;
  readonly role: AuthRole;
  readonly userId: string;
}

interface InMemoryAuthSessionState {
  readonly deviceId: string;
  readonly expiresAt: Date;
  readonly phoneNumber: string;
  readonly refreshTokenHash: string;
  readonly role: AuthRole;
  readonly sessionId: string;
  readonly userId: string;
}

interface InMemoryVisitState {
  readonly address: CreateSubscriptionInput['address'];
  checkedInAt?: Date;
  readonly countryCode: CountryCode;
  readonly fallbackCode: string;
  scheduledDate: string;
  scheduledTimeWindow: TimeWindow;
  status: VisitStatus;
  readonly subscriberPhoneNumber: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  workerId: string;
}

export class InMemoryCoreRepository implements CoreRepository {
  public constructor(
    private readonly otpProvider: OtpProvider = createOtpProvider(),
    private readonly paymentProvider: PaymentProvider = createPaymentProvider(),
  ) {}

  public readonly assignments: AssignedSubscriptionRecord[] = [];
  public readonly assignmentDecisions: AssignmentDecisionRecord[] = [];
  public readonly completedVisits: CompletedVisitRecord[] = [];
  public readonly operatorVisitStatusUpdates: OperatorVisitStatusRecord[] = [];
  public readonly paymentAttempts: PaymentAttemptRecord[] = [];
  public readonly paymentRefunds: PaymentRefundRecord[] = [];
  public readonly paymentReconciliationRuns: PaymentReconciliationRunRecord[] = [];
  public readonly subscriberAddressChangeRequests: SubscriberAddressChangeRequestRecord[] = [];
  public readonly subscriberNotificationPreferences: SubscriberNotificationPreferencesRecord[] = [];
  public readonly supportContacts: SupportContactRecord[] = [];
  public readonly supportContactMessages: SupportContactMessageRecord[] = [];
  public readonly supportCredits: SupportCreditRecord[] = [];
  public readonly firstVisitRequests: FirstVisitRequestRecord[] = [];
  public readonly supportDisputes: DisputeRecord[] = [];
  public readonly visitRatings: VisitRatingRecord[] = [];
  public readonly workerAdvanceRequests: WorkerAdvanceRequestRecord[] = [];
  public readonly workerIssueReports: WorkerIssueReportRecord[] = [];
  public readonly workerOnboardingCases: WorkerOnboardingCaseRecord[] = [];
  public readonly workerPayouts: WorkerPayoutRecord[] = [];
  public readonly workerUnavailability: WorkerUnavailabilityRecord[] = [];
  public readonly workerSwapRequests: WorkerSwapRequestRecord[] = [];
  public readonly visitPhotos: VisitPhotoRecord[] = [];
  public readonly subscriptions: CreatedSubscriptionRecord[] = [];
  public readonly notificationMessages: NotificationMessageRecord[] = [];
  public readonly subscriberPrivacyRequests: SubscriberPrivacyRequestRecord[] = [];
  public readonly pushDevices: PushDeviceRecord[] = [];
  private readonly assignedSubscriptionIds = new Set<string>();
  private readonly subscriptionState = new Map<string, InMemorySubscriptionState>();
  private readonly visitState = new Map<string, InMemoryVisitState>();
  private readonly workerProfiles = new Map<string, WorkerProfileRecord>();
  private readonly authSessionsByRefreshHash = new Map<string, InMemoryAuthSessionState>();
  private readonly authUsersByPhone = new Map<string, InMemoryAuthUserState>();
  private readonly otpChallenges = new Map<string, InMemoryOtpChallengeState>();
  private readonly subscriberIdsByPhone = new Map<string, string>();
  private readonly subscriberProfilesByPhone = new Map<string, SubscriberProfileRecord>();

  public async health(): Promise<'ok'> {
    return 'ok';
  }

  private getOwnedSubscriptionState(
    subscriptionId: string,
    subscriberUserId: string,
  ): InMemorySubscriptionState {
    const state = this.subscriptionState.get(subscriptionId);

    if (state === undefined || state.record.subscriberId !== subscriberUserId) {
      throw new Error('Subscription was not found.');
    }

    return state;
  }

  public async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreatedSubscriptionRecord> {
    const record = buildCreatedSubscriptionRecord(
      input,
      this.resolveSubscriberId(input.countryCode, input.phoneNumber, input.subscriberUserId),
    );
    this.subscriptions.push(record);
    this.subscriptionState.set(record.subscriptionId, {
      address: input.address,
      monthlyPriceMinor: record.monthlyPriceMinor,
      paymentMethod: record.paymentMethod,
      phoneNumber: input.phoneNumber,
      record,
      schedulePreference: input.schedulePreference ?? null,
      status: record.status,
      tierCode: record.tierCode,
      visitsPerCycle: record.visitsPerCycle,
    });
    return record;
  }

  public async getSubscriberProfile(
    input: GetSubscriberProfileInput,
  ): Promise<SubscriberProfileRecord> {
    const profileKey = subscriberPhoneKey(input.countryCode, input.phoneNumber);
    const profile = this.subscriberProfilesByPhone.get(profileKey);

    if (profile !== undefined) {
      return profile;
    }

    const now = new Date();
    const blankProfile: SubscriberProfileRecord = {
      avatarObjectKey: null,
      countryCode: input.countryCode,
      createdAt: now,
      email: null,
      firstName: null,
      isAdultConfirmed: false,
      lastName: null,
      phoneNumber: input.phoneNumber,
      subscriberId: this.resolveSubscriberId(
        input.countryCode,
        input.phoneNumber,
        input.subscriberUserId,
      ),
      updatedAt: now,
    };
    this.subscriberProfilesByPhone.set(profileKey, blankProfile);
    return blankProfile;
  }

  public async upsertSubscriberProfile(
    input: UpsertSubscriberProfileInput,
  ): Promise<SubscriberProfileRecord> {
    const profileKey = subscriberPhoneKey(input.countryCode, input.phoneNumber);
    const existing = this.subscriberProfilesByPhone.get(profileKey);
    const now = new Date();
    const profile: SubscriberProfileRecord = {
      avatarObjectKey: input.avatarObjectKey ?? existing?.avatarObjectKey ?? null,
      countryCode: input.countryCode,
      createdAt: existing?.createdAt ?? now,
      email: input.email ?? null,
      firstName: input.firstName,
      isAdultConfirmed: input.isAdultConfirmed,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      subscriberId: this.resolveSubscriberId(
        input.countryCode,
        input.phoneNumber,
        input.subscriberUserId,
      ),
      updatedAt: now,
    };
    this.subscriberProfilesByPhone.set(profileKey, profile);
    return profile;
  }

  public async getCurrentSubscriberSubscription(
    input: GetCurrentSubscriberSubscriptionInput,
  ): Promise<SubscriptionDetailRecord | null> {
    const state = this.findCurrentSubscriberSubscription(input);

    if (state === undefined) {
      return null;
    }

    return this.getSubscriptionDetail({
      countryCode: state.record.countryCode,
      subscriptionId: state.record.subscriptionId,
    });
  }

  public async requestFirstVisit(input: RequestFirstVisitInput): Promise<SubscriptionDetailRecord> {
    const state = this.findCurrentSubscriberSubscription(input);

    if (state === undefined) {
      throw new Error('Subscription was not found.');
    }

    const status = transitionSubscription(state.status, 'request_first_visit');
    if (status !== 'pending_match') {
      throw new Error(`Expected pending first visit status, received ${status}.`);
    }
    const event = createDomainEvent({
      actor: { role: 'subscriber', userId: state.record.subscriberId },
      aggregateId: state.record.subscriptionId,
      aggregateType: 'subscription',
      countryCode: state.record.countryCode,
      eventType: 'FirstVisitRequested',
      payload: {
        preferredDayOfWeek: input.schedulePreference.dayOfWeek,
        preferredTimeWindow: input.schedulePreference.timeWindow,
        requestedAt: input.requestedAt.toISOString(),
        status,
        subscriberId: state.record.subscriberId,
        subscriptionId: state.record.subscriptionId,
      },
      traceId: input.traceId,
    });
    assertCoreDomainEventContract(event);

    state.schedulePreference = input.schedulePreference;
    state.status = status;
    this.firstVisitRequests.push({
      countryCode: state.record.countryCode,
      events: [event],
      requestedAt: input.requestedAt,
      schedulePreference: input.schedulePreference,
      status,
      subscriberId: state.record.subscriberId,
      subscriptionId: state.record.subscriptionId,
    });
    this.recordNotificationMessages([event]);

    return this.getSubscriptionDetail({
      countryCode: state.record.countryCode,
      subscriptionId: state.record.subscriptionId,
    });
  }

  public async createSubscriberAddressChangeRequest(
    input: CreateSubscriberAddressChangeRequestInput,
  ): Promise<SubscriberAddressChangeRequestRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);
    const record = buildSubscriberAddressChangeRequestRecord({
      countryCode: state.record.countryCode,
      input,
    });
    this.subscriberAddressChangeRequests.push(record);
    return record;
  }

  public async getSubscriberNotificationPreferences(
    input: GetSubscriberNotificationPreferencesInput,
  ): Promise<SubscriberNotificationPreferencesRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);
    const existing = this.subscriberNotificationPreferences.find(
      (preferences) => preferences.subscriptionId === input.subscriptionId,
    );

    if (existing !== undefined) return existing;

    return buildSubscriberNotificationPreferencesRecord({
      countryCode: state.record.countryCode,
      input: {
        emailRecap: true,
        pushReveal: true,
        pushRoute: true,
        smsReminder: true,
        subscriberUserId: input.subscriberUserId,
        subscriptionId: input.subscriptionId,
        traceId: randomUUID(),
        updatedAt: new Date(),
      },
      subscriberId: state.record.subscriberId,
      withEvent: false,
    });
  }

  public async updateSubscriberNotificationPreferences(
    input: UpdateSubscriberNotificationPreferencesInput,
  ): Promise<SubscriberNotificationPreferencesRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);
    const record = buildSubscriberNotificationPreferencesRecord({
      countryCode: state.record.countryCode,
      input,
      subscriberId: state.record.subscriberId,
      withEvent: true,
    });
    const existingIndex = this.subscriberNotificationPreferences.findIndex(
      (preferences) => preferences.subscriptionId === input.subscriptionId,
    );

    if (existingIndex === -1) {
      this.subscriberNotificationPreferences.push(record);
    } else {
      this.subscriberNotificationPreferences[existingIndex] = record;
    }

    return record;
  }

  public async startOtpChallenge(
    input: StartOtpChallengeInput,
  ): Promise<StartedOtpChallengeRecord> {
    const challengeId = randomUUID();
    const delivery = await this.otpProvider.startChallenge(input);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.otpChallenges.set(challengeId, {
      attempts: 0,
      codeHash: hashOtpCode(challengeId, delivery.code),
      countryCode: input.countryCode,
      expiresAt,
      phoneNumber: input.phoneNumber,
    });

    return {
      challengeId,
      expiresAt,
      phoneNumber: input.phoneNumber,
      provider: delivery.provider,
      testCode: delivery.testCode,
    };
  }

  public async verifyOtpChallenge(input: VerifyOtpChallengeInput): Promise<AuthSessionRecord> {
    const challenge = this.otpChallenges.get(input.challengeId);

    if (challenge === undefined) {
      throw new Error('OTP challenge was not found.');
    }

    if (challenge.consumedAt !== undefined) {
      throw new Error('OTP challenge was already used.');
    }

    if (challenge.expiresAt.getTime() <= Date.now()) {
      throw new Error('OTP challenge has expired.');
    }

    if (challenge.attempts >= 5) {
      throw new Error('OTP challenge has too many failed attempts.');
    }

    if (!safeHashEqual(challenge.codeHash, hashOtpCode(input.challengeId, input.code))) {
      challenge.attempts += 1;
      throw new Error('OTP code is invalid.');
    }

    challenge.consumedAt = new Date();

    const user = this.findOrCreateAuthUser(
      challenge.countryCode,
      challenge.phoneNumber,
      input.role,
    );
    return this.createAuthSession(user, input.deviceId);
  }

  public async refreshAuthSession(input: RefreshAuthSessionInput): Promise<AuthSessionRecord> {
    const refreshTokenHash = hashRefreshToken(input.refreshToken);
    const session = this.authSessionsByRefreshHash.get(refreshTokenHash);

    if (session === undefined) {
      throw new Error('Refresh token is invalid.');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new Error('Refresh token has expired.');
    }

    const user: InMemoryAuthUserState = {
      countryCode: 'TG',
      phoneNumber: session.phoneNumber,
      role: session.role,
      userId: session.userId,
    };
    this.authSessionsByRefreshHash.delete(refreshTokenHash);
    return this.createAuthSession(user, session.deviceId);
  }

  public async registerPushDevice(input: RegisterPushDeviceInput): Promise<PushDeviceRecord> {
    const existingIndex = this.pushDevices.findIndex(
      (record) => record.userId === input.userId && record.deviceId === input.deviceId,
    );
    const existing = this.pushDevices[existingIndex];
    const record: PushDeviceRecord = {
      app: input.app,
      countryCode: input.countryCode,
      createdAt: existing?.createdAt ?? input.registeredAt,
      deviceId: input.deviceId,
      environment: input.environment,
      lastRegisteredAt: input.registeredAt,
      platform: input.platform,
      pushDeviceId: existing?.pushDeviceId ?? randomUUID(),
      role: input.role,
      status: 'active',
      token: input.token,
      updatedAt: input.registeredAt,
      userId: input.userId,
    };

    if (existingIndex >= 0) {
      this.pushDevices[existingIndex] = record;
    } else {
      this.pushDevices.push(record);
    }

    return record;
  }

  private findOrCreateAuthUser(
    countryCode: CountryCode,
    phoneNumber: string,
    role: AuthRole,
  ): InMemoryAuthUserState {
    const existing = this.authUsersByPhone.get(`${countryCode}:${phoneNumber}`);

    if (existing !== undefined) {
      return existing;
    }

    const user: InMemoryAuthUserState = {
      countryCode,
      phoneNumber,
      role,
      userId: randomUUID(),
    };
    this.authUsersByPhone.set(`${countryCode}:${phoneNumber}`, user);
    return user;
  }

  private resolveSubscriberId(
    countryCode: CountryCode,
    phoneNumber: string,
    preferredSubscriberId: string = randomUUID(),
  ): string {
    const key = subscriberPhoneKey(countryCode, phoneNumber);
    const existing = this.subscriberIdsByPhone.get(key);

    if (existing !== undefined) {
      return existing;
    }

    this.subscriberIdsByPhone.set(key, preferredSubscriberId);
    return preferredSubscriberId;
  }

  private findCurrentSubscriberSubscription(
    input: GetCurrentSubscriberSubscriptionInput,
  ): InMemorySubscriptionState | undefined {
    const subscriberId = this.resolveSubscriberId(
      input.countryCode,
      input.phoneNumber,
      input.subscriberUserId,
    );

    return [...this.subscriptionState.values()]
      .filter((state) => state.record.subscriberId === subscriberId)
      .sort((left, right) => {
        if (left.status === 'cancelled' && right.status !== 'cancelled') return 1;
        if (right.status === 'cancelled' && left.status !== 'cancelled') return -1;
        return right.record.createdAt.getTime() - left.record.createdAt.getTime();
      })[0];
  }

  private createAuthSession(user: InMemoryAuthUserState, deviceId: string): AuthSessionRecord {
    const sessionId = randomUUID();
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tokens = issueAuthTokens({
      phoneNumber: user.phoneNumber,
      role: user.role,
      sessionId,
      userId: user.userId,
    });

    this.authSessionsByRefreshHash.set(hashRefreshToken(tokens.refreshToken), {
      deviceId,
      expiresAt: refreshTokenExpiresAt,
      phoneNumber: user.phoneNumber,
      refreshTokenHash: hashRefreshToken(tokens.refreshToken),
      role: user.role,
      sessionId,
      userId: user.userId,
    });

    return {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshToken: tokens.refreshToken,
      refreshTokenExpiresAt,
      role: user.role,
      sessionId,
      userId: user.userId,
    };
  }

  public async upsertWorkerProfile(input: UpsertWorkerProfileInput): Promise<WorkerProfileRecord> {
    const record: WorkerProfileRecord = {
      countryCode: input.countryCode,
      displayName: input.displayName,
      maxActiveSubscriptions: input.maxActiveSubscriptions,
      serviceNeighborhoods: [...input.serviceNeighborhoods],
      status: input.status,
      workerId: input.workerId,
    };

    this.workerProfiles.set(input.workerId, record);
    return record;
  }

  public async getWorkerProfile(workerId: string): Promise<WorkerProfileRecord> {
    const worker = this.workerProfiles.get(workerId);

    if (worker === undefined) {
      throw new Error('Worker profile was not found.');
    }

    return worker;
  }

  public async createWorkerOnboardingCase(
    input: CreateWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord> {
    if (this.workerOnboardingCases.some((record) => record.workerId === input.workerId)) {
      throw new Error('Worker onboarding case already exists for this worker.');
    }

    const caseRecord = buildCreatedWorkerOnboardingCaseRecord(input);
    this.workerProfiles.set(input.workerId, {
      countryCode: input.countryCode,
      displayName: input.displayName,
      maxActiveSubscriptions: input.maxActiveSubscriptions,
      serviceNeighborhoods: [...input.serviceNeighborhoods],
      status: 'applicant',
      workerId: input.workerId,
    });
    this.workerOnboardingCases.push(caseRecord);
    return caseRecord;
  }

  public async listWorkerOnboardingCases(
    input: ListWorkerOnboardingCasesInput,
  ): Promise<readonly WorkerOnboardingCaseRecord[]> {
    return this.workerOnboardingCases
      .filter((record) => input.stage === undefined || record.stage === input.stage)
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .slice(0, input.limit);
  }

  public async advanceWorkerOnboardingCase(
    input: AdvanceWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord> {
    const index = this.workerOnboardingCases.findIndex((record) => record.caseId === input.caseId);
    const current = this.workerOnboardingCases[index];

    if (current === undefined) {
      throw new Error('Worker onboarding case was not found.');
    }

    assertWorkerOnboardingStageCanAdvance(current.stage, input.stage);
    const record = buildAdvancedWorkerOnboardingCaseRecord({ input, record: current });
    this.workerOnboardingCases[index] = record;

    const worker = this.workerProfiles.get(record.workerId);
    if (worker !== undefined) {
      this.workerProfiles.set(record.workerId, {
        ...worker,
        status:
          record.stage === 'activated'
            ? 'active'
            : record.stage === 'rejected'
              ? 'inactive'
              : 'onboarding',
      });
    }

    return record;
  }

  public async createWorkerUnavailability(
    input: CreateWorkerUnavailabilityInput,
  ): Promise<WorkerUnavailabilityRecord> {
    if (!this.workerProfiles.has(input.workerId)) {
      throw new Error('Worker was not found.');
    }

    if (
      this.workerUnavailability.some(
        (record) => record.workerId === input.workerId && record.date === input.date,
      )
    ) {
      throw new Error('Worker unavailability already exists for this date.');
    }

    const record = buildWorkerUnavailabilityRecord(input);
    this.workerUnavailability.push(record);
    return record;
  }

  public async listWorkerUnavailability(
    input: ListWorkerUnavailabilityInput,
  ): Promise<readonly WorkerUnavailabilityRecord[]> {
    return this.workerUnavailability
      .filter((record) => record.workerId === input.workerId)
      .filter((record) => input.dateFrom === undefined || record.date >= input.dateFrom)
      .filter((record) => input.dateTo === undefined || record.date <= input.dateTo)
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, input.limit);
  }

  public async assignWorker(input: AssignWorkerInput): Promise<AssignedSubscriptionRecord> {
    const state = this.subscriptionState.get(input.subscriptionId);

    if (state === undefined) {
      throw new Error('Subscription was not found.');
    }

    const schedulePreference = state.schedulePreference;

    if (state.status !== 'pending_match' || schedulePreference === null) {
      throw new Error('First visit must be requested before worker assignment.');
    }

    if (isWorkerUnavailable(this.workerUnavailability, input.workerId, input.anchorDate)) {
      this.recordAssignmentDecision({
        countryCode: state.record.countryCode,
        decision: 'rejected',
        input,
        reason: 'worker_unavailable',
      });
      throw new Error('Worker is unavailable on the assignment anchor date.');
    }

    const worker = this.workerProfiles.get(input.workerId);

    if (worker !== undefined) {
      try {
        assertWorkerCanTakeAssignment({
          activeSubscriptionCount: this.assignments.filter(
            (assignment) => assignment.workerId === input.workerId,
          ).length,
          subscriptionNeighborhood: state.address.neighborhood,
          worker,
        });
      } catch (error) {
        this.recordAssignmentDecision({
          countryCode: state.record.countryCode,
          decision: 'rejected',
          input,
          reason: assignmentRejectionReason(error),
        });
        throw error;
      }
    }

    const assignment = buildAssignedSubscriptionRecord({
      ...input,
      countryCode: state.record.countryCode,
      schedulePreference,
      visitsPerCycle: state.visitsPerCycle,
    });

    this.assignments.push(assignment);
    this.recordNotificationMessages(assignment.events);
    this.recordAssignmentDecision({
      countryCode: state.record.countryCode,
      decision: 'assigned',
      input,
      reason: 'operator_selected_worker',
    });
    this.assignedSubscriptionIds.add(input.subscriptionId);
    state.status = assignment.status;
    for (const visit of assignment.visits) {
      this.visitState.set(visit.visitId, {
        address: state.address,
        countryCode: state.record.countryCode,
        fallbackCode: visit.fallbackCode,
        scheduledDate: visit.scheduledDate,
        scheduledTimeWindow: visit.scheduledTimeWindow,
        status: visit.status,
        subscriberPhoneNumber: state.phoneNumber,
        subscriptionId: input.subscriptionId,
        visitId: visit.visitId,
        workerId: visit.workerId,
      });
    }
    return assignment;
  }

  public async declineAssignmentCandidate(
    input: DeclineAssignmentCandidateInput,
  ): Promise<AssignmentDecisionRecord> {
    const state = this.subscriptionState.get(input.subscriptionId);

    if (state === undefined) {
      throw new Error('Subscription was not found.');
    }

    if (state.status !== 'pending_match') {
      throw new Error(
        `Subscription cannot record assignment decisions from status ${state.status}.`,
      );
    }

    if (!this.workerProfiles.has(input.workerId)) {
      throw new Error('Worker was not found.');
    }

    return this.recordAssignmentDecision({
      countryCode: state.record.countryCode,
      decision: 'declined',
      input,
      reason: 'operator_declined_candidate',
    });
  }

  private recordAssignmentDecision(input: {
    readonly countryCode: CountryCode;
    readonly decision: AssignmentDecision;
    readonly input: AssignWorkerInput | DeclineAssignmentCandidateInput;
    readonly reason: AssignmentDecisionReason;
  }): AssignmentDecisionRecord {
    const decisionId = randomUUID();
    const createdAt = new Date();
    const event = createAssignmentDecisionRecordedEvent({
      anchorDate: input.input.anchorDate,
      countryCode: input.countryCode,
      createdAt,
      decision: input.decision,
      decisionId,
      operatorUserId: input.input.operatorUserId,
      reason: input.reason,
      subscriptionId: input.input.subscriptionId,
      traceId: input.input.traceId,
      workerId: input.input.workerId,
    });
    const record = {
      anchorDate: input.input.anchorDate,
      countryCode: input.countryCode,
      createdAt,
      decision: input.decision,
      decisionId,
      events: [event],
      operatorUserId: input.input.operatorUserId,
      reason: input.reason,
      subscriptionId: input.input.subscriptionId,
      workerId: input.input.workerId,
    };
    this.assignmentDecisions.push(record);
    return record;
  }

  public async cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelledSubscriptionRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    const status = transitionSubscription(state.status, 'cancel');
    assertCancelledSubscriptionStatus(status);
    const cancelledScheduledVisits = [...this.visitState.values()].filter(
      (visit) => visit.subscriptionId === input.subscriptionId && visit.status === 'scheduled',
    );

    for (const visit of cancelledScheduledVisits) {
      visit.status = 'cancelled';
    }

    state.status = status;
    return buildCancelledSubscriptionRecord({
      cancelledScheduledVisits: cancelledScheduledVisits.length,
      countryCode: state.record.countryCode,
      input,
      status,
    });
  }

  public async pauseSubscription(input: PauseSubscriptionInput): Promise<PausedSubscriptionRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    const status = transitionSubscription(state.status, 'pause');
    assertPausedSubscriptionStatus(status);
    const pausedScheduledVisits = [...this.visitState.values()].filter(
      (visit) => visit.subscriptionId === input.subscriptionId && visit.status === 'scheduled',
    );

    for (const visit of pausedScheduledVisits) {
      visit.status = 'cancelled';
    }

    state.status = status;
    return buildPausedSubscriptionRecord({
      countryCode: state.record.countryCode,
      input,
      pausedScheduledVisits: pausedScheduledVisits.length,
      status,
    });
  }

  public async resumeSubscription(
    input: ResumeSubscriptionInput,
  ): Promise<ResumedSubscriptionRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    const status = transitionSubscription(state.status, 'resume');
    assertActiveSubscriptionStatus(status);
    state.status = status;
    return buildResumedSubscriptionRecord({
      countryCode: state.record.countryCode,
      input,
      status,
    });
  }

  public async getWorkerRoute(input: GetWorkerRouteInput): Promise<WorkerRouteRecord> {
    const visits = [...this.visitState.values()]
      .filter((visit) => visit.workerId === input.workerId && visit.scheduledDate === input.date)
      .sort(compareRouteVisits)
      .map((visit) => ({
        address: visit.address,
        scheduledDate: visit.scheduledDate,
        scheduledTimeWindow: visit.scheduledTimeWindow,
        status: visit.status,
        subscriberPhoneNumber: visit.subscriberPhoneNumber,
        subscriptionId: visit.subscriptionId,
        visitId: visit.visitId,
      }));

    return {
      date: input.date,
      visits,
      workerId: input.workerId,
    };
  }

  public async getSubscriptionDetail(
    input: GetSubscriptionDetailInput,
  ): Promise<SubscriptionDetailRecord> {
    const state = this.subscriptionState.get(input.subscriptionId);

    if (state === undefined) {
      throw new Error('Subscription was not found.');
    }

    const assignment = [...this.assignments]
      .reverse()
      .find((candidate) => candidate.subscriptionId === input.subscriptionId);
    const worker =
      assignment === undefined
        ? null
        : (() => {
            const workerRatings = this.visitRatings.filter(
              (rating) => rating.workerId === assignment.workerId,
            );
            return {
              averageRating:
                workerRatings.length === 0
                  ? null
                  : workerRatings.reduce((sum, rating) => sum + rating.rating, 0) /
                    workerRatings.length,
              completedVisitCount: this.completedVisits.filter(
                (visit) => visit.workerId === assignment.workerId,
              ).length,
              disputeCount: this.supportDisputes.filter(
                (dispute) => dispute.workerId === assignment.workerId,
              ).length,
              displayName:
                this.workerProfiles.get(assignment.workerId)?.displayName ??
                `Worker ${assignment.workerId.slice(0, 8)}`,
              workerId: assignment.workerId,
            };
          })();
    const upcomingVisits = [...this.visitState.values()]
      .filter(
        (visit) =>
          visit.subscriptionId === input.subscriptionId &&
          (visit.status === 'scheduled' || visit.status === 'in_progress'),
      )
      .sort(compareSubscriptionDetailVisits)
      .slice(0, 4)
      .map((visit) => ({
        scheduledDate: visit.scheduledDate,
        scheduledTimeWindow: visit.scheduledTimeWindow,
        status: visit.status,
        visitId: visit.visitId,
        workerId: visit.workerId,
      }));
    const recentVisits = [...this.visitState.values()]
      .filter(
        (visit) =>
          visit.subscriptionId === input.subscriptionId &&
          (visit.status === 'cancelled' ||
            visit.status === 'completed' ||
            visit.status === 'disputed' ||
            visit.status === 'no_show'),
      )
      .sort((left, right) => -compareSubscriptionDetailVisits(left, right))
      .slice(0, 4)
      .map((visit) => ({
        scheduledDate: visit.scheduledDate,
        scheduledTimeWindow: visit.scheduledTimeWindow,
        status: visit.status,
        visitId: visit.visitId,
        workerId: visit.workerId,
      }));
    const supportCredits = this.supportCredits
      .filter((credit) => credit.subscriptionId === input.subscriptionId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 10)
      .map((credit) => ({
        amount: credit.amount,
        createdAt: credit.createdAt,
        creditId: credit.creditId,
        reason: credit.reason,
      }));
    const latestPaymentAttempt = [...this.paymentAttempts]
      .filter((attempt) => attempt.subscriptionId === input.subscriptionId)
      .sort((left, right) => right.chargedAt.getTime() - left.chargedAt.getTime())[0];
    const latestSucceededPaymentAttempt = [...this.paymentAttempts]
      .filter(
        (attempt) =>
          attempt.subscriptionId === input.subscriptionId && attempt.status === 'succeeded',
      )
      .sort((left, right) => right.chargedAt.getTime() - left.chargedAt.getTime())[0];
    const pendingAddressChange =
      [...this.subscriberAddressChangeRequests]
        .filter(
          (request) =>
            request.subscriptionId === input.subscriptionId && request.status === 'pending_review',
        )
        .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())[0] ?? null;

    return {
      address: state.address,
      assignedWorker: worker,
      billingStatus: {
        nextChargeAt: addDays(
          latestSucceededPaymentAttempt?.chargedAt ?? state.record.createdAt,
          30,
        ),
        overdueSince:
          state.status === 'payment_overdue' ? (latestPaymentAttempt?.chargedAt ?? null) : null,
        paymentAuthorizationStatus:
          state.paymentMethod === null
            ? 'unavailable'
            : latestPaymentAttempt?.status === 'failed'
              ? 'authorization_failed'
              : 'ready',
      },
      countryCode: state.record.countryCode,
      monthlyPriceMinor: state.monthlyPriceMinor,
      pendingAddressChange,
      paymentMethod: state.paymentMethod,
      phoneNumber: state.phoneNumber,
      schedulePreference: state.schedulePreference,
      status: state.status,
      subscriberId: state.record.subscriberId,
      subscriptionId: state.record.subscriptionId,
      recentVisits,
      tierCode: state.tierCode,
      supportCredits,
      upcomingVisits,
      visitsPerCycle: state.visitsPerCycle,
    };
  }

  public async getSubscriberVisitDetail(input: {
    readonly countryCode: CountryCode;
    readonly subscriberUserId: string;
    readonly subscriptionId: string;
    readonly visitId: string;
  }): Promise<SubscriberVisitDetailRecord> {
    this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined || visit.subscriptionId !== input.subscriptionId) {
      throw new Error('Visit was not found.');
    }

    const completed = this.completedVisits.find((candidate) => candidate.visitId === input.visitId);
    const worker =
      visit.workerId === null
        ? null
        : {
            displayName:
              this.workerProfiles.get(visit.workerId)?.displayName ??
              `Worker ${visit.workerId.slice(0, 8)}`,
            workerId: visit.workerId,
          };

    return {
      address: visit.address,
      countryCode: visit.countryCode,
      dispute:
        this.supportDisputes.find((candidate) => candidate.visitId === input.visitId) ?? null,
      photos: this.visitPhotos
        .filter((photo) => photo.visitId === input.visitId)
        .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime()),
      rating: this.visitRatings.find((rating) => rating.visitId === input.visitId) ?? null,
      scheduledDate: visit.scheduledDate,
      scheduledTimeWindow: visit.scheduledTimeWindow,
      status: visit.status,
      subscriptionId: visit.subscriptionId,
      timeline: {
        checkedInAt: visit.checkedInAt ?? completed?.checkedInAt ?? null,
        checkedOutAt: completed?.checkedOutAt ?? null,
        durationMinutes: completed?.durationMinutes ?? null,
      },
      visitId: visit.visitId,
      worker,
    };
  }

  public async createWorkerAdvanceRequest(
    input: CreateWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord> {
    const worker = this.workerProfiles.get(input.workerId);

    if (worker === undefined) {
      throw new Error('Worker was not found.');
    }

    assertWorkerAdvanceAmountAllowed(input.amountMinor);

    if (
      this.workerAdvanceRequests.some(
        (request) => request.workerId === input.workerId && request.month === input.month,
      )
    ) {
      throw new Error('Worker advance limit reached for this month.');
    }

    const record = buildCreatedWorkerAdvanceRequestRecord({
      countryCode: worker.countryCode,
      input,
      workerName: worker.displayName,
    });

    this.workerAdvanceRequests.push(record);
    return record;
  }

  public async listWorkerAdvanceRequests(
    input: ListWorkerAdvanceRequestsInput,
  ): Promise<readonly WorkerAdvanceRequestRecord[]> {
    return this.workerAdvanceRequests
      .filter((request) => input.status === undefined || request.status === input.status)
      .filter((request) => input.workerId === undefined || request.workerId === input.workerId)
      .filter((request) => input.month === undefined || request.month === input.month)
      .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())
      .slice(0, input.limit);
  }

  public async createWorkerMonthlyPayout(
    input: CreateWorkerMonthlyPayoutInput,
  ): Promise<WorkerPayoutRecord> {
    const worker = this.workerProfiles.get(input.workerId);

    if (worker === undefined) {
      throw new Error('Worker was not found.');
    }

    const earnings = await this.getWorkerMonthlyEarnings({
      countryCode: worker.countryCode,
      month: input.month,
      workerId: input.workerId,
    });

    if (earnings.netDue.amountMinor < 1n) {
      throw new Error('Worker monthly payout has no remaining balance.');
    }

    const payoutProviderResult = await this.createMonthlyPayoutProviderResult(
      input,
      earnings.netDue,
    );

    const record = buildWorkerPayoutRecord({
      amount: earnings.netDue,
      countryCode: worker.countryCode,
      input,
      payoutType: 'monthly_settlement',
      providerResult: payoutProviderResult,
      workerName: worker.displayName,
    });

    this.workerPayouts.push(record);
    return record;
  }

  private async createMonthlyPayoutProviderResult(
    input: CreateWorkerMonthlyPayoutInput,
    amount: Money,
  ): Promise<WorkerPayoutProviderResult | WorkerPayoutFailureResult> {
    try {
      return await this.paymentProvider.payoutWorker({
        amount,
        operatorUserId: input.operatorUserId,
        paidAt: input.paidAt,
        payoutType: 'monthly_settlement',
        periodMonth: input.month,
        ...(input.providerReference === undefined
          ? {}
          : { providerReference: input.providerReference }),
        traceId: input.traceId,
        workerId: input.workerId,
      });
    } catch (error) {
      return buildWorkerPayoutFailureResult(error, input.providerReference);
    }
  }

  public async listWorkerPayouts(
    input: ListWorkerPayoutsInput,
  ): Promise<readonly WorkerPayoutRecord[]> {
    return this.workerPayouts
      .filter((payout) => input.workerId === undefined || payout.workerId === input.workerId)
      .filter((payout) => input.month === undefined || payout.periodMonth === input.month)
      .sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime())
      .slice(0, input.limit);
  }

  public async resolveWorkerAdvanceRequest(
    input: ResolveWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord> {
    const index = this.workerAdvanceRequests.findIndex(
      (request) => request.requestId === input.requestId,
    );
    const request = this.workerAdvanceRequests[index];

    if (request === undefined) {
      throw new Error('Worker advance request was not found.');
    }

    if (request.status !== 'open') {
      throw new Error(`Worker advance request cannot be resolved from status ${request.status}.`);
    }

    const record = buildResolvedWorkerAdvanceRequestRecord({ input, request });
    this.workerAdvanceRequests[index] = record;
    if (input.resolution === 'approved') {
      const payoutProviderResult = await this.paymentProvider.payoutWorker({
        amount: request.amount,
        operatorUserId: input.operatorUserId,
        paidAt: input.resolvedAt,
        payoutType: 'advance',
        periodMonth: request.month,
        traceId: input.traceId,
        workerId: request.workerId,
      });
      const payout = buildWorkerPayoutRecord({
        advanceRequestId: request.requestId,
        amount: request.amount,
        countryCode: request.countryCode,
        input: {
          countryCode: request.countryCode,
          month: request.month,
          note: input.resolutionNote,
          operatorUserId: input.operatorUserId,
          paidAt: input.resolvedAt,
          traceId: input.traceId,
          workerId: request.workerId,
        },
        payoutType: 'advance',
        providerResult: payoutProviderResult,
        ...(request.workerName === undefined ? {} : { workerName: request.workerName }),
      });
      this.workerPayouts.push(payout);
    }
    return record;
  }

  public async createWorkerSwapRequest(
    input: CreateWorkerSwapRequestInput,
  ): Promise<WorkerSwapRequestRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);
    const assignment = [...this.assignments]
      .reverse()
      .find((candidate) => candidate.subscriptionId === input.subscriptionId);

    if (assignment === undefined) {
      throw new Error('Subscription was not found.');
    }

    if (state.status !== 'active') {
      throw new Error(`Worker swap cannot be requested from status ${state.status}.`);
    }

    const quarterStart = startOfUtcQuarter(input.requestedAt);
    const requestsThisQuarter = this.workerSwapRequests.filter(
      (request) =>
        request.subscriptionId === input.subscriptionId && request.requestedAt >= quarterStart,
    );

    if (requestsThisQuarter.length >= 2) {
      throw new Error('Worker swap limit reached for this quarter.');
    }

    if (
      this.workerSwapRequests.some(
        (request) => request.subscriptionId === input.subscriptionId && request.status === 'open',
      )
    ) {
      throw new Error('A worker swap request is already open.');
    }

    const currentWorkerName = this.workerProfiles.get(assignment.workerId)?.displayName;
    const record = buildCreatedWorkerSwapRequestRecord({
      countryCode: state.record.countryCode,
      currentWorkerId: assignment.workerId,
      input,
      subscriberPhoneNumber: state.phoneNumber,
      subscriberId: state.record.subscriberId,
      ...(currentWorkerName === undefined ? {} : { currentWorkerName }),
    });

    this.workerSwapRequests.push(record);
    this.recordNotificationMessages(record.events);
    return record;
  }

  public async listWorkerSwapRequests(
    input: ListWorkerSwapRequestsInput,
  ): Promise<readonly WorkerSwapRequestRecord[]> {
    return this.workerSwapRequests
      .filter((request) => input.status === undefined || request.status === input.status)
      .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())
      .slice(0, input.limit);
  }

  public async resolveWorkerSwapRequest(
    input: ResolveWorkerSwapRequestInput,
  ): Promise<WorkerSwapRequestRecord> {
    const index = this.workerSwapRequests.findIndex(
      (request) => request.requestId === input.requestId,
    );
    const request = this.workerSwapRequests[index];

    if (request === undefined) {
      throw new Error('Worker swap request was not found.');
    }

    if (request.status !== 'open') {
      throw new Error(`Worker swap request cannot be resolved from status ${request.status}.`);
    }

    if (input.resolution === 'approved' && input.replacementWorkerId === undefined) {
      throw new Error('replacementWorkerId is required when approving a worker swap.');
    }

    const replacementWorkerName =
      input.replacementWorkerId === undefined
        ? undefined
        : this.workerProfiles.get(input.replacementWorkerId)?.displayName;
    const record = buildResolvedWorkerSwapRequestRecord({
      input,
      request,
      ...(replacementWorkerName === undefined ? {} : { replacementWorkerName }),
    });

    this.workerSwapRequests[index] = record;
    if (input.resolution === 'approved' && input.replacementWorkerId !== undefined) {
      for (const visit of this.visitState.values()) {
        if (visit.subscriptionId === request.subscriptionId && visit.status === 'scheduled') {
          visit.workerId = input.replacementWorkerId;
        }
      }
      this.assignments.push({
        events: [],
        status: 'active',
        subscriptionId: request.subscriptionId,
        visits: [...this.visitState.values()]
          .filter(
            (visit) =>
              visit.subscriptionId === request.subscriptionId && visit.status === 'scheduled',
          )
          .map((visit) => ({
            fallbackCode: visit.fallbackCode,
            scheduledDate: visit.scheduledDate,
            scheduledTimeWindow: visit.scheduledTimeWindow,
            status: 'scheduled',
            visitId: visit.visitId,
            workerId: visit.workerId,
          })),
        workerId: input.replacementWorkerId,
      });
    }

    return record;
  }

  public async changeSubscriptionTier(
    input: ChangeSubscriptionTierInput,
  ): Promise<ChangedSubscriptionTierRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    assertSubscriptionCanChangeTier(state.status);
    const record = buildChangedSubscriptionTierRecord({
      countryCode: state.record.countryCode,
      input,
      previousTierCode: state.tierCode,
      status: state.status,
    });

    state.tierCode = record.tierCode;
    state.visitsPerCycle = record.visitsPerCycle;
    state.monthlyPriceMinor = record.monthlyPriceMinor;
    return record;
  }

  public async updateSubscriptionPaymentMethod(
    input: UpdateSubscriptionPaymentMethodInput,
  ): Promise<UpdatedSubscriptionPaymentMethodRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    if (state.status === 'cancelled') {
      throw new Error('Cancelled subscriptions cannot change payment method.');
    }

    const record = buildUpdatedSubscriptionPaymentMethodRecord({
      countryCode: state.record.countryCode,
      input,
    });

    state.paymentMethod = record.paymentMethod;
    return record;
  }

  public async chargeSubscription(input: ChargeSubscriptionInput): Promise<PaymentAttemptRecord> {
    const existingAttempt = this.paymentAttempts.find(
      (attempt) => attempt.idempotencyKey === input.idempotencyKey,
    );

    if (existingAttempt !== undefined) {
      return existingAttempt;
    }

    const state = this.subscriptionState.get(input.subscriptionId);

    if (state === undefined) {
      throw new Error('Subscription was not found.');
    }

    if (state.status !== 'active' && state.status !== 'payment_overdue') {
      throw new Error(`Subscription cannot be charged from status ${state.status}.`);
    }

    const amount: Money = {
      amountMinor: state.monthlyPriceMinor,
      currencyCode: state.record.currencyCode as Money['currencyCode'],
    };
    const charge = await this.paymentProvider.chargeSubscription({
      amount,
      chargedAt: input.chargedAt,
      idempotencyKey: input.idempotencyKey,
      mockOutcome: input.mockOutcome,
      operatorUserId: input.operatorUserId,
      subscriptionId: input.subscriptionId,
      traceId: input.traceId,
    });
    const nextStatus = nextPaymentSubscriptionStatus(state.status, charge.status);
    state.status = nextStatus;

    const attempt = buildPaymentAttemptRecord({
      actor: { role: 'operator', userId: input.operatorUserId },
      amount,
      charge,
      chargedAt: input.chargedAt,
      countryCode: state.record.countryCode,
      idempotencyKey: input.idempotencyKey,
      subscriptionId: input.subscriptionId,
      subscriptionStatus: nextStatus,
      traceId: input.traceId,
    });

    this.paymentAttempts.push(attempt);
    this.recordNotificationMessages(attempt.events);
    return attempt;
  }

  public async ingestPaymentWebhook(
    input: IngestPaymentWebhookInput,
  ): Promise<PaymentAttemptRecord> {
    const existingAttempt = this.paymentAttempts.find(
      (attempt) =>
        attempt.idempotencyKey === input.idempotencyKey ||
        (attempt.provider === input.provider &&
          attempt.providerReference === input.providerReference),
    );

    if (existingAttempt !== undefined) {
      return existingAttempt;
    }

    const state = this.subscriptionState.get(input.subscriptionId);

    if (state === undefined) {
      throw new Error('Subscription was not found.');
    }

    if (state.status !== 'active' && state.status !== 'payment_overdue') {
      throw new Error(`Subscription cannot be charged from status ${state.status}.`);
    }

    const amount: Money = {
      amountMinor: state.monthlyPriceMinor,
      currencyCode: state.record.currencyCode as Money['currencyCode'],
    };
    const nextStatus = nextPaymentSubscriptionStatus(state.status, input.status);
    state.status = nextStatus;

    const attempt = buildPaymentAttemptRecord({
      actor: { role: 'system', userId: null },
      amount,
      charge: {
        provider: input.provider,
        providerReference: input.providerReference,
        status: input.status,
      },
      chargedAt: input.receivedAt,
      countryCode: state.record.countryCode,
      idempotencyKey: input.idempotencyKey,
      subscriptionId: input.subscriptionId,
      subscriptionStatus: nextStatus,
      traceId: input.traceId,
    });

    this.paymentAttempts.push(attempt);
    this.recordNotificationMessages(attempt.events);
    return attempt;
  }

  public async issuePaymentRefund(input: IssuePaymentRefundInput): Promise<PaymentRefundRecord> {
    if (this.paymentRefunds.some((refund) => refund.paymentAttemptId === input.paymentAttemptId)) {
      throw new Error('Payment attempt already has a refund.');
    }

    const attempt = this.paymentAttempts.find(
      (paymentAttempt) => paymentAttempt.paymentAttemptId === input.paymentAttemptId,
    );

    if (attempt === undefined) {
      throw new Error('Payment attempt was not found.');
    }

    if (attempt.status !== 'succeeded') {
      throw new Error('Only successful payment attempts can be refunded.');
    }

    if (input.amountMinor <= 0n || input.amountMinor > attempt.amount.amountMinor) {
      throw new Error('Refund amount must be positive and no greater than the payment amount.');
    }

    const state = this.subscriptionState.get(attempt.subscriptionId);

    if (state === undefined) {
      throw new Error('Subscription was not found.');
    }

    const amount = money(input.amountMinor, attempt.amount.currencyCode);
    const refundResult = await this.paymentProvider.refundPayment({
      amount,
      issuedAt: input.issuedAt,
      operatorUserId: input.operatorUserId,
      paymentAttemptId: input.paymentAttemptId,
      paymentProvider: attempt.provider,
      paymentProviderReference: attempt.providerReference,
      reason: input.reason,
      subscriptionId: attempt.subscriptionId,
      traceId: input.traceId,
    });
    const refund = buildPaymentRefundRecord({
      countryCode: state.record.countryCode,
      input,
      paymentAttempt: attempt,
      refund: refundResult,
    });
    this.paymentRefunds.push(refund);
    return refund;
  }

  public async checkInVisit(input: CheckInVisitInput): Promise<CheckedInVisitRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined) {
      throw new Error('Visit was not found.');
    }

    assertVisitWorker(visit.workerId, input.workerId);
    assertVisitLocationVerified({
      fallbackCode: input.fallbackCode,
      location: input.location,
      target: visit.address,
      visitFallbackCode: visit.fallbackCode,
    });
    visit.status = transitionVisit(visit.status, 'check_in');
    visit.checkedInAt = input.checkedInAt;

    return {
      checkedInAt: input.checkedInAt,
      status: 'in_progress',
      visitId: input.visitId,
      workerId: input.workerId,
    };
  }

  public async uploadVisitPhoto(input: UploadVisitPhotoInput): Promise<VisitPhotoRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined) {
      throw new Error('Visit was not found.');
    }

    assertVisitWorker(visit.workerId, input.workerId);

    const event = createDomainEvent({
      actor: { role: 'worker', userId: input.workerId },
      aggregateId: input.visitId,
      aggregateType: 'visit',
      countryCode: visit.countryCode,
      eventType: 'VisitPhotoUploaded',
      payload: {
        byteSize: input.byteSize,
        contentType: input.contentType,
        objectKey: input.objectKey,
        photoType: input.photoType,
        workerId: input.workerId,
      },
      traceId: input.traceId,
    });
    const record: VisitPhotoRecord = {
      byteSize: input.byteSize,
      capturedAt: input.capturedAt,
      contentType: input.contentType,
      countryCode: visit.countryCode,
      events: [event],
      objectKey: input.objectKey,
      photoId: randomUUID(),
      photoType: input.photoType,
      uploadedAt: new Date(input.capturedAt),
      visitId: input.visitId,
      workerId: input.workerId,
    };
    const previousIndex = this.visitPhotos.findIndex(
      (photo) => photo.visitId === input.visitId && photo.photoType === input.photoType,
    );

    if (previousIndex === -1) {
      this.visitPhotos.push(record);
    } else {
      this.visitPhotos[previousIndex] = record;
    }

    return record;
  }

  public async rescheduleVisit(input: RescheduleVisitInput): Promise<RescheduledVisitRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined || visit.subscriptionId !== input.subscriptionId) {
      throw new Error('Visit was not found.');
    }

    this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    if (visit.status !== 'scheduled') {
      throw new Error(`Visit cannot be rescheduled from status ${visit.status}.`);
    }

    const record = buildRescheduledVisitRecord({
      countryCode: visit.countryCode,
      currentScheduledDate: visit.scheduledDate,
      currentScheduledTimeWindow: visit.scheduledTimeWindow,
      input,
      workerId: visit.workerId,
    });

    visit.scheduledDate = input.scheduledDate;
    visit.scheduledTimeWindow = input.scheduledTimeWindow;
    return record;
  }

  public async skipVisit(input: SkipVisitInput): Promise<SkippedVisitRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined || visit.subscriptionId !== input.subscriptionId) {
      throw new Error('Visit was not found.');
    }

    this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    const status = transitionVisit(visit.status, 'cancel');
    assertCancelledStatus(status);
    const record = buildSkippedVisitRecord({
      countryCode: visit.countryCode,
      input,
      scheduledDate: visit.scheduledDate,
      scheduledTimeWindow: visit.scheduledTimeWindow,
      status,
      workerId: visit.workerId,
    });

    visit.status = status;
    return record;
  }

  public async updateOperatorVisitStatus(
    input: UpdateOperatorVisitStatusInput,
  ): Promise<OperatorVisitStatusRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined) {
      throw new Error('Visit was not found.');
    }

    const previousStatus = visit.status;
    const status = transitionVisit(
      previousStatus,
      input.status === 'no_show' ? 'mark_no_show' : 'cancel',
    );

    if (status !== input.status) {
      throw new Error(`Expected ${input.status} visit status, received ${status}.`);
    }

    const record = buildOperatorVisitStatusRecord({
      countryCode: visit.countryCode,
      input,
      previousStatus,
      scheduledDate: visit.scheduledDate,
      scheduledTimeWindow: visit.scheduledTimeWindow,
      status,
      subscriptionId: visit.subscriptionId,
      workerId: visit.workerId,
    });

    visit.status = status;
    this.operatorVisitStatusUpdates.push(record);
    this.recordNotificationMessages(record.events);
    return record;
  }

  public async createDispute(input: CreateDisputeInput): Promise<DisputeRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined || visit.subscriptionId !== input.subscriptionId) {
      throw new Error('Visit was not found.');
    }

    this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    visit.status = transitionVisit(visit.status, 'dispute');
    const record = buildCreatedDisputeRecord({
      countryCode: visit.countryCode,
      input,
      subscriberPhoneNumber: visit.subscriberPhoneNumber,
      workerId: visit.workerId,
    });

    this.supportDisputes.push(record);
    return record;
  }

  public async listOperatorDisputes(
    input: ListOperatorDisputesInput,
  ): Promise<readonly DisputeRecord[]> {
    return this.supportDisputes
      .filter((dispute) => input.status === undefined || dispute.status === input.status)
      .filter(
        (dispute) =>
          input.subscriptionId === undefined || dispute.subscriptionId === input.subscriptionId,
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, input.limit);
  }

  public async resolveDispute(input: ResolveDisputeInput): Promise<DisputeRecord> {
    const index = this.supportDisputes.findIndex(
      (dispute) => dispute.disputeId === input.disputeId,
    );
    const dispute = this.supportDisputes[index];

    if (dispute === undefined) {
      throw new Error('Dispute was not found.');
    }

    if (dispute.status !== 'open') {
      throw new Error(`Dispute cannot be resolved from status ${dispute.status}.`);
    }

    const record = buildResolvedDisputeRecord({ dispute, input });
    this.supportDisputes[index] = record;
    const credit = buildSupportCreditRecord(record, input);
    if (credit !== null) {
      this.supportCredits.push(credit);
    }
    return record;
  }

  public async createSupportContact(
    input: CreateSupportContactInput,
  ): Promise<SupportContactRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    const record = buildCreatedSupportContactRecord({
      countryCode: state.record.countryCode,
      input,
    });
    this.supportContacts.push(record);
    return record;
  }

  public async createSupportContactMessage(
    input: CreateSupportContactMessageInput,
  ): Promise<SupportContactMessageRecord> {
    const state = this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);
    const contact = this.supportContacts.find(
      (candidate) =>
        candidate.contactId === input.contactId &&
        candidate.subscriptionId === input.subscriptionId,
    );

    if (contact === undefined) {
      throw new Error('Support contact was not found.');
    }

    if (contact.status !== 'open') {
      throw new Error(`Support contact cannot receive replies from status ${contact.status}.`);
    }

    const record = buildSupportContactMessageRecord({
      countryCode: state.record.countryCode,
      input,
    });
    this.supportContactMessages.push(record);
    return record;
  }

  public async listSupportContactsForSubscription(
    input: ListSupportContactsInput,
  ): Promise<readonly SupportContactRecord[]> {
    return this.supportContacts
      .filter((contact) => contact.subscriptionId === input.subscriptionId)
      .filter((contact) => input.status === undefined || contact.status === input.status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, input.limit);
  }

  public async getSupportContact(
    input: GetSupportContactInput,
  ): Promise<SupportContactRecord | null> {
    const contact = this.supportContacts.find(
      (candidate) =>
        candidate.contactId === input.contactId &&
        candidate.subscriptionId === input.subscriptionId,
    );
    return contact ?? null;
  }

  public async listSupportContactMessages(
    input: GetSupportContactInput,
  ): Promise<readonly SupportContactMessageRecord[]> {
    const contact = await this.getSupportContact(input);

    if (contact === null) {
      throw new Error('Support contact was not found.');
    }

    return this.supportContactMessages
      .filter((message) => message.contactId === input.contactId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  public async resolveSupportContact(
    input: ResolveSupportContactInput,
  ): Promise<SupportContactRecord> {
    const index = this.supportContacts.findIndex(
      (candidate) => candidate.contactId === input.contactId,
    );
    const contact = this.supportContacts[index];

    if (contact === undefined) {
      throw new Error('Support contact was not found.');
    }

    if (contact.status !== 'open') {
      throw new Error(`Support contact cannot be resolved from status ${contact.status}.`);
    }

    const record = buildResolvedSupportContactRecord({ contact, input });
    this.supportContacts[index] = record;
    return record;
  }

  public async rateVisit(input: RateVisitInput): Promise<VisitRatingRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined || visit.subscriptionId !== input.subscriptionId) {
      throw new Error('Visit was not found.');
    }

    this.getOwnedSubscriptionState(input.subscriptionId, input.subscriberUserId);

    if (visit.status !== 'completed' && visit.status !== 'disputed') {
      throw new Error(`Visit cannot be rated from status ${visit.status}.`);
    }

    if (this.visitRatings.some((rating) => rating.visitId === input.visitId)) {
      throw new Error('Visit was already rated.');
    }

    const record = buildVisitRatingRecord({
      countryCode: visit.countryCode,
      input,
      workerId: visit.workerId,
    });

    this.visitRatings.push(record);
    return record;
  }

  public async reportWorkerIssue(input: ReportWorkerIssueInput): Promise<WorkerIssueReportRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined) {
      throw new Error('Visit was not found.');
    }

    assertVisitWorker(visit.workerId, input.workerId);
    const record = buildWorkerIssueReportRecord({
      address: visit.address,
      countryCode: visit.countryCode,
      input,
      scheduledDate: visit.scheduledDate,
      scheduledTimeWindow: visit.scheduledTimeWindow,
      subscriberPhoneNumber: visit.subscriberPhoneNumber,
      subscriptionId: visit.subscriptionId,
    });

    this.workerIssueReports.push(record);
    return record;
  }

  public async listWorkerIssues(
    input: ListWorkerIssuesInput,
  ): Promise<readonly WorkerIssueReportRecord[]> {
    return this.workerIssueReports
      .filter((issue) => input.status === undefined || issue.status === input.status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, input.limit);
  }

  public async resolveWorkerIssue(
    input: ResolveWorkerIssueInput,
  ): Promise<WorkerIssueReportRecord> {
    const index = this.workerIssueReports.findIndex((issue) => issue.issueId === input.issueId);
    const issue = this.workerIssueReports[index];

    if (issue === undefined) {
      throw new Error('Worker issue was not found.');
    }

    if (issue.status === 'resolved') {
      throw new Error('Worker issue is already resolved.');
    }

    const record = buildResolvedWorkerIssueRecord({ input, issue });
    this.workerIssueReports[index] = record;
    return record;
  }

  public async listMatchingQueue(
    input: ListMatchingQueueInput,
  ): Promise<readonly MatchingQueueItemRecord[]> {
    return [...this.subscriptionState.values()]
      .filter(
        (state) =>
          state.record.countryCode === input.countryCode &&
          state.status === 'pending_match' &&
          state.schedulePreference !== null &&
          !this.assignedSubscriptionIds.has(state.record.subscriptionId),
      )
      .sort((left, right) => left.record.createdAt.getTime() - right.record.createdAt.getTime())
      .slice(0, input.limit)
      .map((state) => {
        if (state.schedulePreference === null) {
          throw new Error('Pending-match subscription is missing a first visit request.');
        }

        return {
          address: state.address,
          assignmentDueAt: addHours(state.record.createdAt, 4),
          countryCode: state.record.countryCode,
          monthlyPriceMinor: state.monthlyPriceMinor,
          phoneNumber: state.phoneNumber,
          queuedAt: state.record.createdAt,
          schedulePreference: state.schedulePreference,
          status: 'pending_match',
          subscriberId: state.record.subscriberId,
          subscriptionId: state.record.subscriptionId,
          tierCode: state.tierCode,
          visitsPerCycle: state.visitsPerCycle,
        };
      });
  }

  public async listMatchingCandidates(
    input: ListMatchingCandidatesInput,
  ): Promise<readonly MatchingCandidateRecord[]> {
    const subscription = this.subscriptionState.get(input.subscriptionId);

    if (subscription === undefined) {
      throw new Error('Subscription was not found.');
    }

    const neighborhood = normalizeNeighborhood(subscription.address.neighborhood);
    const declinedWorkerIds = new Set(
      this.assignmentDecisions
        .filter(
          (decision) =>
            decision.subscriptionId === input.subscriptionId && decision.decision === 'declined',
        )
        .map((decision) => decision.workerId),
    );

    return [...this.workerProfiles.values()]
      .filter(
        (worker) =>
          worker.countryCode === subscription.record.countryCode &&
          worker.status === 'active' &&
          !declinedWorkerIds.has(worker.workerId) &&
          worker.serviceNeighborhoods.some(
            (workerNeighborhood) => normalizeNeighborhood(workerNeighborhood) === neighborhood,
          ),
      )
      .filter(
        (worker) =>
          input.anchorDate === undefined ||
          !isWorkerUnavailable(this.workerUnavailability, worker.workerId, input.anchorDate),
      )
      .map((worker) => {
        const activeSubscriptionCount = this.assignments.filter(
          (assignment) => assignment.workerId === worker.workerId,
        ).length;
        return toMatchingCandidate(worker, activeSubscriptionCount);
      })
      .filter((candidate) => candidate.capacityRemaining > 0)
      .sort(compareMatchingCandidates)
      .slice(0, input.limit);
  }

  public async listAuditEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]> {
    return this.collectAuditEvents()
      .filter((event) => event.countryCode === input.countryCode)
      .filter(
        (event) => input.aggregateType === undefined || event.aggregateType === input.aggregateType,
      )
      .filter((event) => input.aggregateId === undefined || event.aggregateId === input.aggregateId)
      .filter((event) => input.eventType === undefined || event.eventType === input.eventType)
      .sort(
        (left, right) =>
          left.occurredAt.getTime() - right.occurredAt.getTime() ||
          left.eventId.localeCompare(right.eventId),
      )
      .slice(0, input.limit);
  }

  public async createSubscriberPrivacyRequest(
    input: CreateSubscriberPrivacyRequestInput,
  ): Promise<SubscriberPrivacyRequestRecord> {
    const detail = await this.getSubscriptionDetail({
      countryCode: input.countryCode,
      subscriptionId: input.subscriptionId,
    });
    const billingHistory = await this.listSubscriptionBilling({
      countryCode: detail.countryCode,
      limit: 100,
      subscriptionId: input.subscriptionId,
    });
    const disputes = (
      await this.listOperatorDisputes({ countryCode: detail.countryCode, limit: 500 })
    ).filter((dispute) => dispute.subscriptionId === input.subscriptionId);
    const notifications = await this.listNotificationMessages({
      aggregateId: input.subscriptionId,
      countryCode: detail.countryCode,
      limit: 100,
    });
    const auditEvents = await this.listAuditEvents({
      aggregateId: input.subscriptionId,
      aggregateType: 'subscription',
      countryCode: detail.countryCode,
      limit: 100,
    });
    const record = buildSubscriberPrivacyRequestRecord({
      auditEvents,
      billingHistory,
      detail,
      disputes,
      input,
      notifications,
    });

    this.subscriberPrivacyRequests.push(record);
    return record;
  }

  public async listPaymentAttempts(
    input: ListPaymentAttemptsInput,
  ): Promise<readonly PaymentAttemptSummaryRecord[]> {
    return this.paymentAttempts
      .map((attempt) => {
        const state = this.subscriptionState.get(attempt.subscriptionId);
        return state === undefined ? null : { ...attempt, countryCode: state.record.countryCode };
      })
      .filter((attempt): attempt is PaymentAttemptSummaryRecord => attempt !== null)
      .filter((attempt) => attempt.countryCode === input.countryCode)
      .filter((attempt) => input.provider === undefined || attempt.provider === input.provider)
      .filter((attempt) => input.status === undefined || attempt.status === input.status)
      .sort(
        (left, right) =>
          right.chargedAt.getTime() - left.chargedAt.getTime() ||
          right.paymentAttemptId.localeCompare(left.paymentAttemptId),
      )
      .slice(0, input.limit);
  }

  public async listSubscriberSupportMatches(
    input: ListSubscriberSupportMatchesInput,
  ): Promise<readonly SubscriberSupportMatchRecord[]> {
    const phoneNeedle = input.phoneNumber?.trim().toLowerCase();

    return [...this.subscriptionState.values()]
      .filter((state) => state.record.countryCode === input.countryCode)
      .filter(
        (state) =>
          phoneNeedle === undefined || state.phoneNumber.toLowerCase().includes(phoneNeedle),
      )
      .sort((left, right) => right.record.createdAt.getTime() - left.record.createdAt.getTime())
      .slice(0, input.limit)
      .map((state) => ({
        countryCode: state.record.countryCode,
        phoneNumber: state.phoneNumber,
        status: state.status,
        subscriberId: state.record.subscriberId,
        subscriptionId: state.record.subscriptionId,
        tierCode: state.tierCode,
      }));
  }

  public async listSubscriptionBilling(
    input: ListSubscriptionBillingInput,
  ): Promise<readonly SubscriptionBillingItemRecord[]> {
    const charges = this.paymentAttempts
      .filter((attempt) => attempt.subscriptionId === input.subscriptionId)
      .map(
        (attempt): SubscriptionBillingItemRecord => ({
          amount: attempt.amount,
          itemId: attempt.paymentAttemptId,
          itemType: 'charge',
          occurredAt: attempt.chargedAt,
          paymentAttemptId: attempt.paymentAttemptId,
          provider: attempt.provider,
          providerReference: attempt.providerReference,
          reason: null,
          refundId: null,
          status: attempt.status,
          subscriptionId: attempt.subscriptionId,
        }),
      );
    const refunds = this.paymentRefunds
      .filter((refund) => refund.subscriptionId === input.subscriptionId)
      .map(
        (refund): SubscriptionBillingItemRecord => ({
          amount: refund.amount,
          itemId: refund.refundId,
          itemType: 'refund',
          occurredAt: refund.issuedAt,
          paymentAttemptId: refund.paymentAttemptId,
          provider: refund.provider,
          providerReference: refund.providerReference,
          reason: refund.reason,
          refundId: refund.refundId,
          status: refund.status,
          subscriptionId: refund.subscriptionId,
        }),
      );

    return [...charges, ...refunds]
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          right.itemId.localeCompare(left.itemId),
      )
      .slice(0, input.limit);
  }

  public async runPaymentReconciliation(
    input: RunPaymentReconciliationInput,
  ): Promise<PaymentReconciliationRunRecord> {
    const paymentAttempts = await this.listPaymentAttempts({
      countryCode: input.countryCode,
      limit: Number.MAX_SAFE_INTEGER,
      ...(input.provider === undefined ? {} : { provider: input.provider }),
    });
    const refundTotals = new Map<string, Money>();

    for (const refund of this.paymentRefunds) {
      if (refund.countryCode !== input.countryCode) {
        continue;
      }

      const existing = refundTotals.get(refund.paymentAttemptId);
      refundTotals.set(
        refund.paymentAttemptId,
        money(
          (existing?.amountMinor ?? 0n) + refund.amount.amountMinor,
          refund.amount.currencyCode,
        ),
      );
    }

    const run = buildPaymentReconciliationRunRecord({ input, paymentAttempts, refundTotals });
    this.paymentReconciliationRuns.push(run);
    return run;
  }

  public async listNotificationMessages(
    input: ListNotificationMessagesInput,
  ): Promise<readonly NotificationMessageRecord[]> {
    return this.collectNotificationMessages()
      .filter((message) => message.countryCode === input.countryCode)
      .filter((message) => input.status === undefined || message.status === input.status)
      .filter((message) => input.channel === undefined || message.channel === input.channel)
      .filter(
        (message) => input.templateKey === undefined || message.templateKey === input.templateKey,
      )
      .filter(
        (message) =>
          input.aggregateType === undefined || message.aggregateType === input.aggregateType,
      )
      .filter(
        (message) => input.aggregateId === undefined || message.aggregateId === input.aggregateId,
      )
      .sort(
        (left, right) =>
          left.availableAt.getTime() - right.availableAt.getTime() ||
          left.messageId.localeCompare(right.messageId),
      )
      .slice(0, input.limit);
  }

  public async deliverDueNotificationMessages(
    input: DeliverDueNotificationMessagesInput,
  ): Promise<readonly NotificationMessageRecord[]> {
    const dueMessages = this.notificationMessages
      .filter(
        (message) =>
          message.countryCode === input.countryCode &&
          message.status === 'pending' &&
          message.availableAt <= input.deliveredAt,
      )
      .sort(
        (left, right) =>
          left.availableAt.getTime() - right.availableAt.getTime() ||
          left.messageId.localeCompare(right.messageId),
      )
      .slice(0, input.limit);
    const delivered: NotificationMessageRecord[] = [];

    for (const message of dueMessages) {
      const updated = await deliverNotificationMessageLocally({
        deliveredAt: input.deliveredAt,
        message,
        pushTokens: this.resolvePushTokensForMessage(message),
      });
      const index = this.notificationMessages.findIndex(
        (candidate) => candidate.messageId === message.messageId,
      );

      if (index >= 0) {
        this.notificationMessages[index] = updated;
      }
      delivered.push(updated);
    }

    return delivered;
  }

  public async listPushDevices(input: ListPushDevicesInput): Promise<readonly PushDeviceRecord[]> {
    return this.pushDevices
      .filter((record) => record.countryCode === input.countryCode)
      .filter((record) => input.role === undefined || record.role === input.role)
      .filter((record) => input.status === undefined || record.status === input.status)
      .sort(
        (left, right) =>
          right.lastRegisteredAt.getTime() - left.lastRegisteredAt.getTime() ||
          left.pushDeviceId.localeCompare(right.pushDeviceId),
      )
      .slice(0, input.limit);
  }

  private resolvePushTokensForMessage(message: NotificationMessageRecord): readonly string[] {
    if (message.channel !== 'push') {
      return [];
    }

    const recipientUserId =
      message.recipientUserId ?? this.resolveRecipientUserIdForMessage(message);

    if (recipientUserId === null) {
      return [];
    }

    return this.pushDevices
      .filter((device) => device.countryCode === message.countryCode)
      .filter((device) => device.userId === recipientUserId)
      .filter((device) => device.role === message.recipientRole)
      .filter((device) => device.status === 'active')
      .sort(
        (left, right) =>
          right.lastRegisteredAt.getTime() - left.lastRegisteredAt.getTime() ||
          left.pushDeviceId.localeCompare(right.pushDeviceId),
      )
      .map((device) => device.token);
  }

  private resolveRecipientUserIdForMessage(message: NotificationMessageRecord): string | null {
    if (message.recipientRole !== 'subscriber' || message.aggregateType !== 'subscription') {
      return null;
    }

    const subscription = this.subscriptionState.get(message.aggregateId);

    if (subscription === undefined) {
      return null;
    }

    const user = this.authUsersByPhone.get(`${message.countryCode}:${subscription.phoneNumber}`);

    return user?.role === 'subscriber' ? user.userId : null;
  }

  public async listServiceCells(
    input: ListServiceCellsInput,
  ): Promise<readonly ServiceCellCapacityRecord[]> {
    const cellKeys = new Map<string, string>();

    for (const worker of this.workerProfiles.values()) {
      for (const neighborhood of worker.serviceNeighborhoods) {
        cellKeys.set(normalizeNeighborhood(neighborhood), neighborhood);
      }
    }

    for (const subscription of this.subscriptionState.values()) {
      cellKeys.set(
        normalizeNeighborhood(subscription.address.neighborhood),
        subscription.address.neighborhood,
      );
    }

    return [...cellKeys]
      .map(([cellKey, serviceCell]) => {
        const activeWorkers = [...this.workerProfiles.values()].filter(
          (worker) =>
            worker.status === 'active' &&
            worker.serviceNeighborhoods.some(
              (neighborhood) => normalizeNeighborhood(neighborhood) === cellKey,
            ),
        );
        const activeSubscriptions = [...this.subscriptionState.values()].filter(
          (subscription) =>
            subscription.status === 'active' &&
            normalizeNeighborhood(subscription.address.neighborhood) === cellKey,
        ).length;
        const visits = [...this.visitState.values()].filter(
          (visit) =>
            visit.scheduledDate === input.date &&
            normalizeNeighborhood(visit.address.neighborhood) === cellKey,
        );
        const totalCapacity = activeWorkers.reduce(
          (sum, worker) => sum + worker.maxActiveSubscriptions,
          0,
        );

        return toServiceCellCapacityRecord({
          activeSubscriptions,
          activeWorkers: activeWorkers.length,
          completedVisits: visits.filter((visit) => visit.status === 'completed').length,
          inProgressVisits: visits.filter((visit) => visit.status === 'in_progress').length,
          scheduledVisits: visits.filter((visit) => visit.status === 'scheduled').length,
          serviceCell,
          totalCapacity,
        });
      })
      .sort(compareServiceCells)
      .slice(0, input.limit);
  }

  private collectAuditEvents(): readonly AuditEventRecord[] {
    return [
      ...this.subscriptions.flatMap((record) => record.events),
      ...this.assignments.flatMap((record) => record.events),
      ...this.assignmentDecisions.flatMap((record) => record.events),
      ...this.firstVisitRequests.flatMap((record) => record.events),
      ...this.paymentAttempts.flatMap((record) => record.events),
      ...this.workerOnboardingCases.flatMap((record) => record.events),
      ...this.workerUnavailability.flatMap((record) => record.events),
      ...this.workerAdvanceRequests.flatMap((record) => record.events),
      ...this.workerPayouts.flatMap((record) => record.events),
      ...this.workerSwapRequests.flatMap((record) => record.events),
      ...this.supportDisputes.flatMap((record) => record.events),
      ...this.visitRatings.flatMap((record) => record.events),
      ...this.workerIssueReports.flatMap((record) => record.events),
      ...this.completedVisits.flatMap((record) => record.events),
      ...this.operatorVisitStatusUpdates.flatMap((record) => record.events),
      ...this.visitPhotos.flatMap((record) => record.events),
    ].map((event) => ({
      actor: event.actor,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      countryCode: event.countryCode,
      eventId: event.eventId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      payload: event.payload,
      recordedAt: event.occurredAt,
      traceId: event.traceId,
    }));
  }

  private collectNotificationMessages(): readonly NotificationMessageRecord[] {
    return this.notificationMessages;
  }

  private recordNotificationMessages(events: readonly DomainEvent[]): void {
    this.notificationMessages.push(
      ...events.flatMap((event) => buildNotificationMessagesForEvent(event)),
    );
  }

  public async checkOutVisit(input: CheckOutVisitInput): Promise<CompletedVisitRecord> {
    const visit = this.visitState.get(input.visitId);

    if (visit === undefined) {
      throw new Error('Visit was not found.');
    }

    if (visit.checkedInAt === undefined) {
      throw new Error('Visit has not been checked in.');
    }

    assertVisitWorker(visit.workerId, input.workerId);
    assertVisitLocationVerified({
      fallbackCode: input.fallbackCode,
      location: input.location,
      target: visit.address,
      visitFallbackCode: visit.fallbackCode,
    });
    assertVisitCompletionAllowed({
      checkedInAt: visit.checkedInAt,
      checkedOutAt: input.checkedOutAt,
    });
    assertVisitPhotosReady(this.visitPhotos, input.visitId);
    visit.status = transitionVisit(visit.status, 'check_out');

    const event = createDomainEvent({
      actor: { role: 'worker', userId: input.workerId },
      aggregateId: input.visitId,
      aggregateType: 'visit',
      countryCode: visit.countryCode,
      eventType: 'VisitCompleted',
      payload: {
        bonusAmountMinor: completedVisitBonus().amountMinor.toString(),
        bonusCurrencyCode: completedVisitBonus().currencyCode,
        checkedInAt: visit.checkedInAt.toISOString(),
        checkedOutAt: input.checkedOutAt.toISOString(),
        durationMinutes: durationMinutes(visit.checkedInAt, input.checkedOutAt),
        workerId: input.workerId,
      },
      traceId: input.traceId,
    });

    const completed: CompletedVisitRecord = {
      bonus: completedVisitBonus(),
      checkedInAt: visit.checkedInAt,
      checkedOutAt: input.checkedOutAt,
      durationMinutes: durationMinutes(visit.checkedInAt, input.checkedOutAt),
      events: [event],
      status: 'completed',
      visitId: input.visitId,
      workerId: input.workerId,
    };

    this.completedVisits.push(completed);
    return completed;
  }

  public async getWorkerMonthlyEarnings(
    input: GetWorkerMonthlyEarningsInput,
  ): Promise<WorkerMonthlyEarningsRecord> {
    const completedVisits = this.completedVisits.filter(
      (visit) =>
        visit.workerId === input.workerId && formatYearMonth(visit.checkedOutAt) === input.month,
    ).length;
    const compensation = calculateWorkerMonthlyCompensation(completedVisits);
    const payoutHistory = this.workerPayouts
      .filter((payout) => payout.workerId === input.workerId && payout.periodMonth === input.month)
      .sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime());
    const paidOutTotal = money(
      payoutHistory.reduce(
        (total, payout) => (payout.status === 'paid' ? total + payout.amount.amountMinor : total),
        0n,
      ),
      compensation.total.currencyCode,
    );

    return {
      completedVisits: compensation.completedVisits,
      floor: compensation.floor,
      month: input.month,
      netDue: money(compensation.total.amountMinor - paidOutTotal.amountMinor, 'XOF'),
      paidOutTotal,
      payoutHistory,
      total: compensation.total,
      visitBonusTotal: compensation.visitBonusTotal,
      workerId: input.workerId,
    };
  }
}

function assertVisitWorker(actualWorkerId: string, requestedWorkerId: string): void {
  if (actualWorkerId !== requestedWorkerId) {
    throw new Error('Visit is not assigned to this worker.');
  }
}

function subscriberPhoneKey(countryCode: CountryCode, phoneNumber: string): string {
  return `${countryCode}:${phoneNumber}`;
}

function formatYearMonth(value: Date): string {
  return value.toISOString().slice(0, 7);
}

function assertWorkerAdvanceAmountAllowed(amountMinor: bigint): void {
  const maxAdvanceAmountMinor = calculateWorkerMonthlyCompensation(0).floor.amountMinor / 2n;

  if (amountMinor < 1n) {
    throw new Error('Worker advance amount must be greater than zero.');
  }

  if (amountMinor > maxAdvanceAmountMinor) {
    throw new Error('Worker advance cannot exceed 50% of the monthly floor.');
  }
}

const WORKER_ONBOARDING_STAGE_ORDER: Record<Exclude<WorkerOnboardingStage, 'rejected'>, number> = {
  activated: 6,
  application_received: 0,
  casier_received: 3,
  cni_uploaded: 1,
  references_called: 2,
  training_scheduled: 4,
  uniform_issued: 5,
};

function assertWorkerOnboardingStageCanAdvance(
  currentStage: WorkerOnboardingStage,
  nextStage: WorkerOnboardingStage,
): void {
  if (currentStage === 'activated' || currentStage === 'rejected') {
    throw new Error(`Worker onboarding case cannot advance from ${currentStage}.`);
  }

  if (nextStage === 'application_received') {
    throw new Error('Worker onboarding case is already at application_received.');
  }

  if (nextStage === 'rejected') {
    return;
  }

  if (WORKER_ONBOARDING_STAGE_ORDER[nextStage] <= WORKER_ONBOARDING_STAGE_ORDER[currentStage]) {
    throw new Error(`Worker onboarding case cannot move from ${currentStage} to ${nextStage}.`);
  }
}

function isWorkerUnavailable(
  records: readonly WorkerUnavailabilityRecord[],
  workerId: string,
  date: string,
): boolean {
  return records.some((record) => record.workerId === workerId && record.date === date);
}

function assertVisitLocationVerified(input: {
  readonly fallbackCode: string | undefined;
  readonly location: VisitLocationInput;
  readonly target: CreateSubscriptionInput['address'];
  readonly visitFallbackCode?: string | null;
}): void {
  if (
    distanceMeters(input.location, {
      latitude: input.target.gpsLatitude,
      longitude: input.target.gpsLongitude,
    }) <= 100
  ) {
    return;
  }

  if (
    input.fallbackCode !== undefined &&
    input.visitFallbackCode !== undefined &&
    input.visitFallbackCode !== null &&
    input.fallbackCode === input.visitFallbackCode
  ) {
    return;
  }

  throw new Error('Visit location is outside the 100m check-in radius.');
}

function assertVisitPhotosReady(photos: readonly VisitPhotoRecord[], visitId: string): void {
  const photoTypes = new Set(
    photos.filter((photo) => photo.visitId === visitId).map((photo) => photo.photoType),
  );

  if (!photoTypes.has('before') || !photoTypes.has('after')) {
    throw new Error('Visit requires before and after photos before checkout.');
  }
}

function distanceMeters(left: VisitLocationInput, right: VisitLocationInput): number {
  const earthRadiusMeters = 6_371_000;
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function durationMinutes(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function startOfUtcQuarter(value: Date): Date {
  const quarterStartMonth = Math.floor(value.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(value.getUTCFullYear(), quarterStartMonth, 1));
}

function toMatchingCandidate(
  worker: WorkerProfileRecord,
  activeSubscriptionCount: number,
): MatchingCandidateRecord {
  const capacityRemaining = worker.maxActiveSubscriptions - activeSubscriptionCount;
  const score = 100 + capacityRemaining * 5 - activeSubscriptionCount * 10;

  return {
    activeSubscriptionCount,
    capacityRemaining,
    displayName: worker.displayName,
    maxActiveSubscriptions: worker.maxActiveSubscriptions,
    score,
    scoreReasons: ['service_neighborhood_match', 'capacity_available'],
    serviceNeighborhoods: worker.serviceNeighborhoods,
    workerId: worker.workerId,
  };
}

function assertWorkerCanTakeAssignment(input: {
  readonly activeSubscriptionCount: number;
  readonly subscriptionNeighborhood: string;
  readonly worker: WorkerProfileRecord;
}): void {
  if (input.worker.status !== 'active') {
    throw new Error('Worker is not active for assignment.');
  }

  const subscriptionNeighborhood = normalizeNeighborhood(input.subscriptionNeighborhood);
  const servesNeighborhood = input.worker.serviceNeighborhoods.some(
    (neighborhood) => normalizeNeighborhood(neighborhood) === subscriptionNeighborhood,
  );

  if (!servesNeighborhood) {
    throw new Error('Worker does not serve the subscription service cell.');
  }

  if (input.activeSubscriptionCount >= input.worker.maxActiveSubscriptions) {
    throw new Error('Worker has no remaining assignment capacity.');
  }
}

function assignmentRejectionReason(error: unknown): AssignmentDecisionReason {
  if (!(error instanceof Error)) {
    return 'worker_unavailable';
  }

  if (error.message === 'Worker is not active for assignment.') {
    return 'worker_not_active';
  }

  if (error.message === 'Worker does not serve the subscription service cell.') {
    return 'service_cell_mismatch';
  }

  if (error.message === 'Worker has no remaining assignment capacity.') {
    return 'capacity_exhausted';
  }

  return 'worker_unavailable';
}

function createAssignmentDecisionRecordedEvent(input: {
  readonly anchorDate: string;
  readonly countryCode: CountryCode;
  readonly createdAt: Date;
  readonly decision: AssignmentDecision;
  readonly decisionId: string;
  readonly operatorUserId: string;
  readonly reason: AssignmentDecisionReason;
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly workerId: string;
}): DomainEvent {
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.operatorUserId },
    aggregateId: input.decisionId,
    aggregateType: 'assignment_decision',
    countryCode: input.countryCode,
    eventType: 'AssignmentDecisionRecorded',
    occurredAt: input.createdAt,
    payload: {
      anchorDate: input.anchorDate,
      decision: input.decision,
      decisionId: input.decisionId,
      operatorUserId: input.operatorUserId,
      reason: input.reason,
      subscriptionId: input.subscriptionId,
      workerId: input.workerId,
    },
    traceId: input.traceId,
  });
  assertCoreDomainEventContract(event);
  return event;
}

function compareMatchingCandidates(
  left: MatchingCandidateRecord,
  right: MatchingCandidateRecord,
): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.activeSubscriptionCount !== right.activeSubscriptionCount) {
    return left.activeSubscriptionCount - right.activeSubscriptionCount;
  }

  return left.displayName.localeCompare(right.displayName, 'fr');
}

function compareServiceCells(
  left: ServiceCellCapacityRecord,
  right: ServiceCellCapacityRecord,
): number {
  return (
    right.utilizationPercent - left.utilizationPercent ||
    right.activeSubscriptions - left.activeSubscriptions ||
    left.serviceCell.localeCompare(right.serviceCell, 'fr')
  );
}

function toServiceCellCapacityRecord(input: {
  readonly activeSubscriptions: number;
  readonly activeWorkers: number;
  readonly completedVisits: number;
  readonly inProgressVisits: number;
  readonly scheduledVisits: number;
  readonly serviceCell: string;
  readonly totalCapacity: number;
}): ServiceCellCapacityRecord {
  const capacityRemaining = Math.max(0, input.totalCapacity - input.activeSubscriptions);
  const utilizationPercent =
    input.totalCapacity === 0
      ? 0
      : Math.round((input.activeSubscriptions / input.totalCapacity) * 100);

  return {
    ...input,
    capacityRemaining,
    utilizationPercent,
  };
}

function normalizeNeighborhood(value: string): string {
  return value.trim().toLocaleLowerCase('fr');
}

function compareRouteVisits(left: InMemoryVisitState, right: InMemoryVisitState): number {
  const windowOrder = compareTimeWindows(left.scheduledTimeWindow, right.scheduledTimeWindow);

  if (windowOrder !== 0) {
    return windowOrder;
  }

  return left.visitId.localeCompare(right.visitId);
}

function compareSubscriptionDetailVisits(
  left: InMemoryVisitState,
  right: InMemoryVisitState,
): number {
  const dateOrder = left.scheduledDate.localeCompare(right.scheduledDate);

  if (dateOrder !== 0) {
    return dateOrder;
  }

  return compareRouteVisits(left, right);
}

export function buildRescheduledVisitRecord(input: {
  readonly countryCode: CountryCode;
  readonly currentScheduledDate: string;
  readonly currentScheduledTimeWindow: TimeWindow;
  readonly input: RescheduleVisitInput;
  readonly workerId: string;
}): RescheduledVisitRecord {
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.visitId,
    aggregateType: 'visit',
    countryCode: input.countryCode,
    eventType: 'VisitRescheduled',
    payload: {
      previousScheduledDate: input.currentScheduledDate,
      previousScheduledTimeWindow: input.currentScheduledTimeWindow,
      scheduledDate: input.input.scheduledDate,
      scheduledTimeWindow: input.input.scheduledTimeWindow,
      subscriptionId: input.input.subscriptionId,
      workerId: input.workerId,
    },
    traceId: input.input.traceId,
  });

  return {
    events: [event],
    scheduledDate: input.input.scheduledDate,
    scheduledTimeWindow: input.input.scheduledTimeWindow,
    status: 'scheduled',
    subscriptionId: input.input.subscriptionId,
    visitId: input.input.visitId,
    workerId: input.workerId,
  };
}

export function buildSkippedVisitRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: SkipVisitInput;
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: 'cancelled';
  readonly workerId: string;
}): SkippedVisitRecord {
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.visitId,
    aggregateType: 'visit',
    countryCode: input.countryCode,
    eventType: 'VisitSkipped',
    payload: {
      scheduledDate: input.scheduledDate,
      scheduledTimeWindow: input.scheduledTimeWindow,
      subscriptionId: input.input.subscriptionId,
      workerId: input.workerId,
    },
    traceId: input.input.traceId,
  });

  return {
    events: [event],
    status: input.status,
    subscriptionId: input.input.subscriptionId,
    visitId: input.input.visitId,
    workerId: input.workerId,
  };
}

export function buildOperatorVisitStatusRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: UpdateOperatorVisitStatusInput;
  readonly previousStatus: VisitStatus;
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: OperatorVisitCloseoutStatus;
  readonly subscriptionId: string;
  readonly workerId: string;
}): OperatorVisitStatusRecord {
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.input.visitId,
    aggregateType: 'visit',
    countryCode: input.countryCode,
    eventType: 'OperatorVisitStatusUpdated',
    occurredAt: input.input.updatedAt,
    payload: {
      note: input.input.note,
      previousStatus: input.previousStatus,
      scheduledDate: input.scheduledDate,
      scheduledTimeWindow: input.scheduledTimeWindow,
      status: input.status,
      subscriptionId: input.subscriptionId,
      workerId: input.workerId,
    },
    traceId: input.input.traceId,
  });

  return {
    events: [event],
    note: input.input.note,
    previousStatus: input.previousStatus,
    status: input.status,
    subscriptionId: input.subscriptionId,
    updatedAt: input.input.updatedAt,
    visitId: input.input.visitId,
    workerId: input.workerId,
  };
}

export function buildCreatedDisputeRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: CreateDisputeInput;
  readonly subscriberPhoneNumber?: string;
  readonly workerId: string | null;
}): DisputeRecord {
  const disputeId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.visitId,
    aggregateType: 'visit',
    countryCode: input.countryCode,
    eventType: 'VisitDisputed',
    payload: {
      description: input.input.description,
      disputeId,
      issueType: input.input.issueType,
      status: 'open',
      subscriptionId: input.input.subscriptionId,
      workerId: input.workerId,
    },
    traceId: input.input.traceId,
  });

  const record: DisputeRecord = {
    countryCode: input.countryCode,
    createdAt: input.input.createdAt,
    description: input.input.description,
    disputeId,
    events: [event],
    issueType: input.input.issueType,
    openedByUserId: input.input.subscriberUserId,
    resolvedAt: null,
    resolvedByOperatorUserId: null,
    resolutionNote: null,
    status: 'open',
    subscriberCredit: null,
    subscriberCreditId: null,
    subscriptionId: input.input.subscriptionId,
    visitId: input.input.visitId,
    workerId: input.workerId,
  };

  return input.subscriberPhoneNumber === undefined
    ? record
    : { ...record, subscriberPhoneNumber: input.subscriberPhoneNumber };
}

export function buildResolvedDisputeRecord(input: {
  readonly dispute: DisputeRecord;
  readonly input: ResolveDisputeInput;
}): DisputeRecord {
  if (
    input.input.subscriberCreditAmountMinor !== undefined &&
    input.input.subscriberCreditAmountMinor > 0n &&
    input.input.resolution !== 'resolved_for_subscriber'
  ) {
    throw new Error('Subscriber credits can only be issued for subscriber resolutions.');
  }

  const subscriberCredit =
    input.input.subscriberCreditAmountMinor === undefined ||
    input.input.subscriberCreditAmountMinor <= 0n
      ? null
      : {
          amountMinor: input.input.subscriberCreditAmountMinor,
          currencyCode: 'XOF' as const,
        };
  const subscriberCreditId = subscriberCredit === null ? null : randomUUID();
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.dispute.disputeId,
    aggregateType: 'support_dispute',
    countryCode: input.dispute.countryCode,
    eventType: input.input.resolution === 'escalated' ? 'DisputeEscalated' : 'DisputeResolved',
    payload: {
      disputeId: input.dispute.disputeId,
      resolution: input.input.resolution,
      resolutionNote: input.input.resolutionNote,
      subscriberCreditAmountMinor: subscriberCredit?.amountMinor.toString() ?? null,
      subscriberCreditId,
      subscriptionId: input.dispute.subscriptionId,
      visitId: input.dispute.visitId,
      workerId: input.dispute.workerId,
    },
    traceId: input.input.traceId,
  });
  const creditEvent =
    subscriberCredit === null || subscriberCreditId === null
      ? null
      : createDomainEvent({
          actor: { role: 'operator', userId: input.input.operatorUserId },
          aggregateId: input.dispute.subscriptionId,
          aggregateType: 'subscription',
          countryCode: input.dispute.countryCode,
          eventType: 'SubscriberCreditIssued',
          payload: {
            amountMinor: subscriberCredit.amountMinor.toString(),
            creditId: subscriberCreditId,
            currencyCode: subscriberCredit.currencyCode,
            disputeId: input.dispute.disputeId,
            reason: input.input.resolutionNote,
            visitId: input.dispute.visitId,
          },
          traceId: input.input.traceId,
        });

  return {
    ...input.dispute,
    events: creditEvent === null ? [event] : [event, creditEvent],
    resolvedAt: input.input.resolvedAt,
    resolvedByOperatorUserId: input.input.operatorUserId,
    resolutionNote: input.input.resolutionNote,
    status: input.input.resolution,
    subscriberCredit,
    subscriberCreditId,
  };
}

export function buildSupportCreditRecord(
  dispute: DisputeRecord,
  input: ResolveDisputeInput,
): SupportCreditRecord | null {
  if (dispute.subscriberCredit === null || dispute.subscriberCreditId === null) {
    return null;
  }

  return {
    amount: dispute.subscriberCredit,
    createdAt: input.resolvedAt,
    creditId: dispute.subscriberCreditId,
    disputeId: dispute.disputeId,
    issuedByOperatorUserId: input.operatorUserId,
    reason: input.resolutionNote,
    subscriptionId: dispute.subscriptionId,
  };
}

export function buildVisitRatingRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: RateVisitInput;
  readonly workerId: string | null;
}): VisitRatingRecord {
  const ratingId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.visitId,
    aggregateType: 'visit',
    countryCode: input.countryCode,
    eventType: 'VisitRated',
    payload: {
      comment: input.input.comment ?? null,
      rating: input.input.rating,
      ratingId,
      subscriptionId: input.input.subscriptionId,
      workerId: input.workerId,
    },
    traceId: input.input.traceId,
  });

  return {
    comment: input.input.comment ?? null,
    countryCode: input.countryCode,
    createdAt: input.input.createdAt,
    events: [event],
    ratedByUserId: input.input.subscriberUserId,
    rating: input.input.rating,
    ratingId,
    subscriptionId: input.input.subscriptionId,
    visitId: input.input.visitId,
    workerId: input.workerId,
  };
}

export function buildWorkerIssueReportRecord(input: {
  readonly address?: WorkerIssueReportRecord['address'];
  readonly countryCode: CountryCode;
  readonly input: ReportWorkerIssueInput;
  readonly scheduledDate?: string;
  readonly scheduledTimeWindow?: TimeWindow;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
}): WorkerIssueReportRecord {
  const issueId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'worker', userId: input.input.workerId },
    aggregateId: input.input.visitId,
    aggregateType: 'visit',
    countryCode: input.countryCode,
    eventType: 'WorkerIssueReported',
    payload: {
      description: input.input.description,
      issueId,
      issueType: input.input.issueType,
      status: 'open',
      subscriptionId: input.subscriptionId,
      workerId: input.input.workerId,
    },
    traceId: input.input.traceId,
  });

  const record: WorkerIssueReportRecord = {
    countryCode: input.countryCode,
    createdAt: input.input.createdAt,
    description: input.input.description,
    events: [event],
    handledByOperatorUserId: null,
    issueId,
    issueType: input.input.issueType,
    resolutionNote: null,
    resolvedAt: null,
    status: 'open',
    subscriptionId: input.subscriptionId,
    visitId: input.input.visitId,
    workerId: input.input.workerId,
  };

  return {
    ...record,
    ...(input.address === undefined ? {} : { address: input.address }),
    ...(input.scheduledDate === undefined ? {} : { scheduledDate: input.scheduledDate }),
    ...(input.scheduledTimeWindow === undefined
      ? {}
      : { scheduledTimeWindow: input.scheduledTimeWindow }),
    ...(input.subscriberPhoneNumber === undefined
      ? {}
      : { subscriberPhoneNumber: input.subscriberPhoneNumber }),
  };
}

export function buildCreatedSupportContactRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: CreateSupportContactInput;
}): SupportContactRecord {
  const contactId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: contactId,
    aggregateType: 'support_contact',
    countryCode: input.countryCode,
    eventType: 'SubscriberSupportContactOpened',
    payload: {
      category: input.input.category,
      contactId,
      subject: input.input.subject,
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    body: input.input.body,
    category: input.input.category,
    contactId,
    countryCode: input.countryCode,
    createdAt: input.input.createdAt,
    events: [event],
    openedByUserId: input.input.subscriberUserId,
    resolutionNote: null,
    resolvedAt: null,
    resolvedByOperatorUserId: null,
    status: 'open',
    subject: input.input.subject,
    subscriptionId: input.input.subscriptionId,
  };
}

export function buildResolvedSupportContactRecord(input: {
  readonly contact: SupportContactRecord;
  readonly input: ResolveSupportContactInput;
}): SupportContactRecord {
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.contact.contactId,
    aggregateType: 'support_contact',
    countryCode: input.contact.countryCode,
    eventType: 'SubscriberSupportContactResolved',
    payload: {
      contactId: input.contact.contactId,
      operatorUserId: input.input.operatorUserId,
      resolutionNote: input.input.resolutionNote,
      subscriptionId: input.contact.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    ...input.contact,
    events: [event],
    resolutionNote: input.input.resolutionNote,
    resolvedAt: input.input.resolvedAt,
    resolvedByOperatorUserId: input.input.operatorUserId,
    status: 'resolved',
  };
}

export function buildCreatedWorkerAdvanceRequestRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: CreateWorkerAdvanceRequestInput;
  readonly workerName?: string;
}): WorkerAdvanceRequestRecord {
  const requestId = randomUUID();
  const amount = money(input.input.amountMinor, 'XOF');
  const event = createDomainEvent({
    actor: { role: 'worker', userId: input.input.workerId },
    aggregateId: requestId,
    aggregateType: 'worker_advance_request',
    countryCode: input.countryCode,
    eventType: 'WorkerAdvanceRequested',
    payload: {
      amountMinor: amount.amountMinor.toString(),
      currencyCode: amount.currencyCode,
      month: input.input.month,
      reason: input.input.reason,
      requestId,
      status: 'open',
      workerId: input.input.workerId,
    },
    traceId: input.input.traceId,
  });

  const record: WorkerAdvanceRequestRecord = {
    amount,
    countryCode: input.countryCode,
    events: [event],
    month: input.input.month,
    reason: input.input.reason,
    requestedAt: input.input.requestedAt,
    requestId,
    resolvedAt: null,
    resolvedByOperatorUserId: null,
    resolutionNote: null,
    status: 'open',
    workerId: input.input.workerId,
  };

  return input.workerName === undefined ? record : { ...record, workerName: input.workerName };
}

export function buildResolvedWorkerAdvanceRequestRecord(input: {
  readonly input: ResolveWorkerAdvanceRequestInput;
  readonly request: WorkerAdvanceRequestRecord;
}): WorkerAdvanceRequestRecord {
  if (input.request.status !== 'open') {
    throw new Error(
      `Worker advance request cannot be resolved from status ${input.request.status}.`,
    );
  }

  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.request.requestId,
    aggregateType: 'worker_advance_request',
    countryCode: input.request.countryCode,
    eventType:
      input.input.resolution === 'approved' ? 'WorkerAdvanceApproved' : 'WorkerAdvanceDeclined',
    payload: {
      amountMinor: input.request.amount.amountMinor.toString(),
      currencyCode: input.request.amount.currencyCode,
      month: input.request.month,
      requestId: input.request.requestId,
      resolutionNote: input.input.resolutionNote,
      status: input.input.resolution,
      workerId: input.request.workerId,
    },
    traceId: input.input.traceId,
  });

  return {
    ...input.request,
    events: [event],
    resolvedAt: input.input.resolvedAt,
    resolvedByOperatorUserId: input.input.operatorUserId,
    resolutionNote: input.input.resolutionNote,
    status: input.input.resolution,
  };
}

export function buildWorkerPayoutRecord(input: {
  readonly advanceRequestId?: string;
  readonly amount: Money;
  readonly countryCode: CountryCode;
  readonly input: CreateWorkerMonthlyPayoutInput;
  readonly payoutType: WorkerPayoutType;
  readonly providerResult?: WorkerPayoutProviderResult | WorkerPayoutFailureResult;
  readonly workerName?: string;
}): WorkerPayoutRecord {
  const payoutId = randomUUID();
  const providerResult = input.providerResult ?? {
    failureReason: null,
    provider: 'manual',
    providerReference: input.input.providerReference ?? null,
    status: 'paid',
  };
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: payoutId,
    aggregateType: 'worker_payout',
    countryCode: input.countryCode,
    eventType: 'WorkerPayoutRecorded',
    payload: {
      advanceRequestId: input.advanceRequestId ?? null,
      amountMinor: input.amount.amountMinor.toString(),
      currencyCode: input.amount.currencyCode,
      failureReason: providerResult.failureReason,
      payoutId,
      payoutType: input.payoutType,
      periodMonth: input.input.month,
      provider: providerResult.provider,
      providerReference: providerResult.providerReference,
      status: providerResult.status,
      workerId: input.input.workerId,
    },
    traceId: input.input.traceId,
  });

  const record: WorkerPayoutRecord = {
    advanceRequestId: input.advanceRequestId ?? null,
    amount: input.amount,
    countryCode: input.countryCode,
    createdByOperatorUserId: input.input.operatorUserId,
    events: [event],
    failureReason: providerResult.failureReason,
    note: input.input.note,
    paidAt: input.input.paidAt,
    payoutId,
    payoutType: input.payoutType,
    periodMonth: input.input.month,
    provider: providerResult.provider,
    providerReference: providerResult.providerReference,
    status: providerResult.status,
    workerId: input.input.workerId,
  };

  return input.workerName === undefined ? record : { ...record, workerName: input.workerName };
}

interface WorkerPayoutFailureResult {
  readonly failureReason: string;
  readonly provider: 'manual' | 'mobile_money_http';
  readonly providerReference: string | null;
  readonly status: 'failed';
}

function buildWorkerPayoutFailureResult(
  error: unknown,
  providerReference: string | undefined,
): WorkerPayoutFailureResult {
  return {
    failureReason: normalizeFailureReason(error),
    provider: 'mobile_money_http',
    providerReference: providerReference ?? null,
    status: 'failed',
  };
}

function normalizeFailureReason(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.slice(0, 240);
  }

  return 'worker_payout_provider_failed';
}

export function buildCreatedWorkerOnboardingCaseRecord(
  input: CreateWorkerOnboardingCaseInput,
): WorkerOnboardingCaseRecord {
  const caseId = randomUUID();
  const stage: WorkerOnboardingStage = 'application_received';
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.operatorUserId },
    aggregateId: caseId,
    aggregateType: 'worker_onboarding_case',
    countryCode: input.countryCode,
    eventType: 'WorkerOnboardingCaseCreated',
    payload: {
      caseId,
      displayName: input.displayName,
      phoneNumber: input.phoneNumber,
      stage,
      workerId: input.workerId,
    },
    traceId: input.traceId,
  });

  return {
    appliedAt: input.appliedAt,
    caseId,
    countryCode: input.countryCode,
    displayName: input.displayName,
    events: [event],
    maxActiveSubscriptions: input.maxActiveSubscriptions,
    notes: [
      {
        createdAt: input.appliedAt,
        note: 'Application received.',
        operatorUserId: input.operatorUserId,
        stage,
      },
    ],
    phoneNumber: input.phoneNumber,
    serviceNeighborhoods: [...input.serviceNeighborhoods],
    stage,
    updatedAt: input.appliedAt,
    workerId: input.workerId,
  };
}

export function buildAdvancedWorkerOnboardingCaseRecord(input: {
  readonly input: AdvanceWorkerOnboardingCaseInput;
  readonly record: WorkerOnboardingCaseRecord;
}): WorkerOnboardingCaseRecord {
  assertWorkerOnboardingStageCanAdvance(input.record.stage, input.input.stage);
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.record.caseId,
    aggregateType: 'worker_onboarding_case',
    countryCode: input.record.countryCode,
    eventType:
      input.input.stage === 'activated' ? 'WorkerOnboardingActivated' : 'WorkerOnboardingAdvanced',
    payload: {
      caseId: input.record.caseId,
      note: input.input.note,
      previousStage: input.record.stage,
      stage: input.input.stage,
      workerId: input.record.workerId,
    },
    traceId: input.input.traceId,
  });

  return {
    ...input.record,
    events: [event],
    notes: [
      ...input.record.notes,
      {
        createdAt: input.input.occurredAt,
        note: input.input.note,
        operatorUserId: input.input.operatorUserId,
        stage: input.input.stage,
      },
    ],
    stage: input.input.stage,
    updatedAt: input.input.occurredAt,
  };
}

export function buildWorkerUnavailabilityRecord(
  input: CreateWorkerUnavailabilityInput,
): WorkerUnavailabilityRecord {
  const unavailabilityId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'worker', userId: input.workerId },
    aggregateId: input.workerId,
    aggregateType: 'worker',
    countryCode: 'TG',
    eventType: 'WorkerMarkedUnavailable',
    payload: {
      date: input.date,
      reason: input.reason,
      unavailabilityId,
      workerId: input.workerId,
    },
    traceId: input.traceId,
  });

  return {
    createdAt: input.createdAt,
    date: input.date,
    events: [event],
    reason: input.reason,
    unavailabilityId,
    workerId: input.workerId,
  };
}

export function buildCreatedWorkerSwapRequestRecord(input: {
  readonly countryCode: CountryCode;
  readonly currentWorkerId: string;
  readonly currentWorkerName?: string;
  readonly input: CreateWorkerSwapRequestInput;
  readonly subscriberId: string;
  readonly subscriberPhoneNumber?: string;
}): WorkerSwapRequestRecord {
  const requestId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'WorkerSwapRequested',
    payload: {
      currentWorkerId: input.currentWorkerId,
      reason: input.input.reason,
      requestId,
      status: 'open',
      subscriberId: input.subscriberId,
    },
    traceId: input.input.traceId,
  });

  const record: WorkerSwapRequestRecord = {
    countryCode: input.countryCode,
    currentWorkerId: input.currentWorkerId,
    events: [event],
    reason: input.input.reason,
    replacementWorkerId: null,
    requestedAt: input.input.requestedAt,
    requestId,
    resolvedAt: null,
    resolvedByOperatorUserId: null,
    resolutionNote: null,
    status: 'open',
    subscriberId: input.subscriberId,
    subscriptionId: input.input.subscriptionId,
  };

  return {
    ...record,
    ...(input.currentWorkerName === undefined
      ? {}
      : { currentWorkerName: input.currentWorkerName }),
    ...(input.subscriberPhoneNumber === undefined
      ? {}
      : { subscriberPhoneNumber: input.subscriberPhoneNumber }),
  };
}

export function buildResolvedWorkerSwapRequestRecord(input: {
  readonly input: ResolveWorkerSwapRequestInput;
  readonly replacementWorkerName?: string;
  readonly request: WorkerSwapRequestRecord;
}): WorkerSwapRequestRecord {
  if (input.request.status !== 'open') {
    throw new Error(`Worker swap request cannot be resolved from status ${input.request.status}.`);
  }

  if (input.input.resolution === 'approved' && input.input.replacementWorkerId === undefined) {
    throw new Error('replacementWorkerId is required when approving a worker swap.');
  }

  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.request.requestId,
    aggregateType: 'worker_swap_request',
    countryCode: input.request.countryCode,
    eventType: input.input.resolution === 'approved' ? 'WorkerSwapApproved' : 'WorkerSwapDeclined',
    payload: {
      currentWorkerId: input.request.currentWorkerId,
      replacementWorkerId: input.input.replacementWorkerId ?? null,
      requestId: input.request.requestId,
      resolutionNote: input.input.resolutionNote,
      status: input.input.resolution,
      subscriptionId: input.request.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  const record: WorkerSwapRequestRecord = {
    ...input.request,
    events: [event],
    replacementWorkerId: input.input.replacementWorkerId ?? null,
    resolvedAt: input.input.resolvedAt,
    resolvedByOperatorUserId: input.input.operatorUserId,
    resolutionNote: input.input.resolutionNote,
    status: input.input.resolution,
  };

  return input.replacementWorkerName === undefined
    ? record
    : { ...record, replacementWorkerName: input.replacementWorkerName };
}

export function buildResolvedWorkerIssueRecord(input: {
  readonly input: ResolveWorkerIssueInput;
  readonly issue: WorkerIssueReportRecord;
}): WorkerIssueReportRecord {
  if (input.issue.status === 'resolved') {
    throw new Error('Worker issue is already resolved.');
  }

  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.issue.issueId,
    aggregateType: 'worker_issue',
    countryCode: input.issue.countryCode,
    eventType:
      input.input.status === 'acknowledged' ? 'WorkerIssueAcknowledged' : 'WorkerIssueResolved',
    payload: {
      issueId: input.issue.issueId,
      resolutionNote: input.input.resolutionNote,
      resolvedAt: input.input.resolvedAt.toISOString(),
      status: input.input.status,
      visitId: input.issue.visitId,
      workerId: input.issue.workerId,
    },
    traceId: input.input.traceId,
  });

  return {
    ...input.issue,
    events: [event],
    handledByOperatorUserId: input.input.operatorUserId,
    resolutionNote: input.input.resolutionNote,
    resolvedAt: input.input.status === 'resolved' ? input.input.resolvedAt : null,
    status: input.input.status,
  };
}

export function buildCancelledSubscriptionRecord(input: {
  readonly cancelledScheduledVisits: number;
  readonly countryCode: CountryCode;
  readonly input: CancelSubscriptionInput;
  readonly status: 'cancelled';
}): CancelledSubscriptionRecord {
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'SubscriptionCancelled',
    payload: {
      cancelledAt: input.input.cancelledAt.toISOString(),
      cancelledScheduledVisits: input.cancelledScheduledVisits,
      status: input.status,
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    cancelledAt: input.input.cancelledAt,
    cancelledScheduledVisits: input.cancelledScheduledVisits,
    events: [event],
    status: input.status,
    subscriptionId: input.input.subscriptionId,
  };
}

export function buildChangedSubscriptionTierRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: ChangeSubscriptionTierInput;
  readonly previousTierCode: SubscriptionTierCode;
  readonly status: SubscriptionStatus;
}): ChangedSubscriptionTierRecord {
  const tier = getLomeV1Tier(input.input.tierCode);
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'SubscriptionTierChanged',
    payload: {
      effectiveAt: input.input.effectiveAt.toISOString(),
      monthlyPriceMinor: tier.monthlyPrice.amountMinor.toString(),
      previousTierCode: input.previousTierCode,
      status: input.status,
      subscriptionId: input.input.subscriptionId,
      tierCode: tier.code,
      visitsPerCycle: tier.visitsPerCycle,
    },
    traceId: input.input.traceId,
  });

  return {
    effectiveAt: input.input.effectiveAt,
    events: [event],
    monthlyPriceMinor: tier.monthlyPrice.amountMinor,
    previousTierCode: input.previousTierCode,
    status: input.status,
    subscriptionId: input.input.subscriptionId,
    tierCode: tier.code,
    visitsPerCycle: tier.visitsPerCycle,
  };
}

export function buildPausedSubscriptionRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: PauseSubscriptionInput;
  readonly pausedScheduledVisits: number;
  readonly status: 'paused';
}): PausedSubscriptionRecord {
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'SubscriptionPaused',
    payload: {
      pausedAt: input.input.pausedAt.toISOString(),
      pausedScheduledVisits: input.pausedScheduledVisits,
      status: input.status,
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    events: [event],
    pausedAt: input.input.pausedAt,
    pausedScheduledVisits: input.pausedScheduledVisits,
    status: input.status,
    subscriptionId: input.input.subscriptionId,
  };
}

export function buildResumedSubscriptionRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: ResumeSubscriptionInput;
  readonly status: 'active';
}): ResumedSubscriptionRecord {
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'SubscriptionResumed',
    payload: {
      resumedAt: input.input.resumedAt.toISOString(),
      status: input.status,
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    events: [event],
    resumedAt: input.input.resumedAt,
    status: input.status,
    subscriptionId: input.input.subscriptionId,
  };
}

export function buildUpdatedSubscriptionPaymentMethodRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: UpdateSubscriptionPaymentMethodInput;
}): UpdatedSubscriptionPaymentMethodRecord {
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'SubscriptionPaymentMethodUpdated',
    occurredAt: input.input.updatedAt,
    payload: {
      paymentMethod: input.input.paymentMethod,
      subscriptionId: input.input.subscriptionId,
      updatedAt: input.input.updatedAt.toISOString(),
    },
    traceId: input.input.traceId,
  });

  return {
    events: [event],
    paymentMethod: input.input.paymentMethod,
    subscriptionId: input.input.subscriptionId,
    updatedAt: input.input.updatedAt,
  };
}

export function buildSubscriberAddressChangeRequestRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: CreateSubscriberAddressChangeRequestInput;
}): SubscriberAddressChangeRequestRecord {
  const requestId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'SubscriberAddressChangeRequested',
    occurredAt: input.input.requestedAt,
    payload: {
      neighborhood: input.input.address.neighborhood,
      requestId,
      status: 'pending_review',
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    address: input.input.address,
    countryCode: input.countryCode,
    events: [event],
    requestId,
    requestedAt: input.input.requestedAt,
    requestedByUserId: input.input.subscriberUserId,
    status: 'pending_review',
    subscriptionId: input.input.subscriptionId,
  };
}

export function buildSubscriberNotificationPreferencesRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: UpdateSubscriberNotificationPreferencesInput;
  readonly subscriberId: string;
  readonly withEvent: boolean;
}): SubscriberNotificationPreferencesRecord {
  const event = input.withEvent
    ? createDomainEvent({
        actor: { role: 'subscriber', userId: input.input.subscriberUserId },
        aggregateId: input.input.subscriptionId,
        aggregateType: 'subscription',
        countryCode: input.countryCode,
        eventType: 'SubscriberNotificationPreferencesUpdated',
        occurredAt: input.input.updatedAt,
        payload: {
          emailRecap: input.input.emailRecap,
          pushReveal: input.input.pushReveal,
          pushRoute: input.input.pushRoute,
          smsReminder: input.input.smsReminder,
          subscriptionId: input.input.subscriptionId,
        },
        traceId: input.input.traceId,
      })
    : null;

  return {
    countryCode: input.countryCode,
    emailRecap: input.input.emailRecap,
    events: event === null ? [] : [event],
    pushReveal: input.input.pushReveal,
    pushRoute: input.input.pushRoute,
    smsReminder: input.input.smsReminder,
    subscriberId: input.subscriberId,
    subscriptionId: input.input.subscriptionId,
    updatedAt: input.input.updatedAt,
    updatedByUserId: input.input.subscriberUserId,
  };
}

export function buildSupportContactMessageRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: CreateSupportContactMessageInput;
}): SupportContactMessageRecord {
  const messageId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: input.input.contactId,
    aggregateType: 'support_contact',
    countryCode: input.countryCode,
    eventType: 'SupportContactMessageCreated',
    occurredAt: input.input.createdAt,
    payload: {
      contactId: input.input.contactId,
      messageId,
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    authorRole: 'subscriber',
    authorUserId: input.input.subscriberUserId,
    body: input.input.body,
    contactId: input.input.contactId,
    countryCode: input.countryCode,
    createdAt: input.input.createdAt,
    events: [event],
    messageId,
    subscriptionId: input.input.subscriptionId,
  };
}

export function buildSubscriberPrivacyRequestRecord(input: {
  readonly auditEvents: readonly AuditEventRecord[];
  readonly billingHistory: readonly SubscriptionBillingItemRecord[];
  readonly detail: SubscriptionDetailRecord;
  readonly disputes: readonly DisputeRecord[];
  readonly input: CreateSubscriberPrivacyRequestInput;
  readonly notifications: readonly NotificationMessageRecord[];
}): SubscriberPrivacyRequestRecord {
  const requestId = randomUUID();
  const retainedRecords = [
    {
      reason: 'Accounting, refund, and payment dispute defense.',
      recordType: 'payment_attempts_and_refunds',
      retention: 'Accounting/legal window from the retention schedule.',
    },
    {
      reason: 'Safety, fraud, and dispute investigation integrity.',
      recordType: 'support_disputes_safety_incidents_visit_evidence',
      retention: 'Open dispute plus configured safety retention window.',
    },
    {
      reason: 'Immutable audit trail for operator accountability.',
      recordType: 'audit_events',
      retention: 'Immutable audit retention window; personal payloads are minimized.',
    },
  ];
  const immediateActions =
    input.input.requestType === 'erasure'
      ? [
          'Verify requester identity before any destructive action.',
          'Cancel or anonymize active subscriber-facing profile data after open visits close.',
          'Revoke subscriber push devices and active auth sessions.',
          'Queue object-storage deletion for expired photo evidence outside dispute/legal hold.',
          'Preserve payment, audit, and safety records required by retention policy.',
        ]
      : ['Generate export bundle and deliver it through an operator-approved support channel.'];
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: input.input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.detail.countryCode,
    eventType: 'SubscriberPrivacyRequestRecorded',
    payload: {
      auditEventCount: input.auditEvents.length,
      billingItemCount: input.billingHistory.length,
      disputeCount: input.disputes.length,
      notificationCount: input.notifications.length,
      reason: input.input.reason,
      requestId,
      requestType: input.input.requestType,
      retainedRecordTypes: retainedRecords.map((record) => record.recordType),
      subscriberId: input.detail.subscriberId,
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    erasurePlan: {
      immediateActions,
      retainedRecords,
    },
    events: [event],
    exportBundle: {
      auditEvents: input.auditEvents,
      billingHistory: input.billingHistory,
      disputes: input.disputes,
      notifications: input.notifications,
      subscription: input.detail,
    },
    operatorUserId: input.input.operatorUserId,
    reason: input.input.reason,
    requestedAt: input.input.requestedAt,
    requestId,
    requestType: input.input.requestType,
    subscriptionId: input.input.subscriptionId,
  };
}

function compareTimeWindows(left: TimeWindow, right: TimeWindow): number {
  const order: Record<TimeWindow, number> = {
    morning: 0,
    afternoon: 1,
  };

  return order[left] - order[right];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function assertCancelledStatus(status: VisitStatus): asserts status is 'cancelled' {
  if (status !== 'cancelled') {
    throw new Error(`Expected cancelled visit status, received ${status}.`);
  }
}

function assertCancelledSubscriptionStatus(
  status: SubscriptionStatus,
): asserts status is 'cancelled' {
  if (status !== 'cancelled') {
    throw new Error(`Expected cancelled subscription status, received ${status}.`);
  }
}

function assertPausedSubscriptionStatus(status: SubscriptionStatus): asserts status is 'paused' {
  if (status !== 'paused') {
    throw new Error(`Expected paused subscription status, received ${status}.`);
  }
}

function assertActiveSubscriptionStatus(status: SubscriptionStatus): asserts status is 'active' {
  if (status !== 'active') {
    throw new Error(`Expected active subscription status, received ${status}.`);
  }
}

function assertSubscriptionCanChangeTier(status: SubscriptionStatus): void {
  if (status === 'cancelled') {
    throw new Error('Cancelled subscriptions cannot change tier.');
  }
}

function nextPaymentSubscriptionStatus(
  currentStatus: SubscriptionStatus,
  outcome: MockPaymentOutcome,
): SubscriptionStatus {
  if (outcome === 'succeeded') {
    return currentStatus === 'payment_overdue'
      ? transitionSubscription(currentStatus, 'payment_recovered')
      : currentStatus;
  }

  return currentStatus === 'active'
    ? transitionSubscription(currentStatus, 'payment_failed')
    : currentStatus;
}

function buildPaymentAttemptRecord(input: {
  readonly actor: DomainEvent['actor'];
  readonly amount: Money;
  readonly charge: {
    readonly provider: string;
    readonly providerReference: string;
    readonly status: MockPaymentOutcome;
  };
  readonly chargedAt: Date;
  readonly countryCode: CountryCode;
  readonly idempotencyKey: string;
  readonly subscriptionId: string;
  readonly subscriptionStatus: SubscriptionStatus;
  readonly traceId: string;
}): PaymentAttemptRecord {
  const paymentAttemptId = randomUUID();
  const eventType =
    input.charge.status === 'succeeded'
      ? 'SubscriptionPaymentSucceeded'
      : 'SubscriptionPaymentFailed';
  const event = createDomainEvent({
    actor: input.actor,
    aggregateId: input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType,
    payload: {
      amountMinor: input.amount.amountMinor.toString(),
      currencyCode: input.amount.currencyCode,
      idempotencyKey: input.idempotencyKey,
      paymentAttemptId,
      provider: input.charge.provider,
      providerReference: input.charge.providerReference,
      status: input.charge.status,
      subscriptionStatus: input.subscriptionStatus,
    },
    traceId: input.traceId,
  });

  return {
    amount: input.amount,
    chargedAt: input.chargedAt,
    events: [event],
    idempotencyKey: input.idempotencyKey,
    paymentAttemptId,
    provider: input.charge.provider,
    providerReference: input.charge.providerReference,
    status: input.charge.status,
    subscriptionId: input.subscriptionId,
    subscriptionStatus: input.subscriptionStatus,
  };
}

export function buildPaymentRefundRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: IssuePaymentRefundInput;
  readonly paymentAttempt: PaymentAttemptRecord;
  readonly refund: {
    readonly provider: string;
    readonly providerReference: string | null;
    readonly status: 'issued';
  };
}): PaymentRefundRecord {
  const refundId = randomUUID();
  const amount = money(input.input.amountMinor, input.paymentAttempt.amount.currencyCode);
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: refundId,
    aggregateType: 'payment_refund',
    countryCode: input.countryCode,
    eventType: 'PaymentRefundIssued',
    payload: {
      amountMinor: amount.amountMinor.toString(),
      currencyCode: amount.currencyCode,
      paymentAttemptId: input.input.paymentAttemptId,
      provider: input.refund.provider,
      providerReference: input.refund.providerReference,
      reason: input.input.reason,
      refundId,
      status: input.refund.status,
      subscriptionId: input.paymentAttempt.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    amount,
    countryCode: input.countryCode,
    events: [event],
    issuedAt: input.input.issuedAt,
    operatorUserId: input.input.operatorUserId,
    paymentAttemptId: input.input.paymentAttemptId,
    provider: input.refund.provider,
    providerReference: input.refund.providerReference,
    reason: input.input.reason,
    refundId,
    status: input.refund.status,
    subscriptionId: input.paymentAttempt.subscriptionId,
  };
}

export function buildPaymentReconciliationRunRecord(input: {
  readonly input: RunPaymentReconciliationInput;
  readonly paymentAttempts: readonly PaymentAttemptSummaryRecord[];
  readonly refundTotals: ReadonlyMap<string, Money>;
}): PaymentReconciliationRunRecord {
  const reconciliationRunId = randomUUID();
  let totalCollectedMinor = 0n;
  let totalRefundedMinor = 0n;
  let totalFailedAttempts = 0;
  let totalSucceededAttempts = 0;
  const issues: PaymentReconciliationIssue[] = [];

  for (const attempt of input.paymentAttempts) {
    const refundedAmount =
      input.refundTotals.get(attempt.paymentAttemptId) ?? money(0n, attempt.amount.currencyCode);

    totalRefundedMinor += refundedAmount.amountMinor;

    if (attempt.status === 'succeeded') {
      totalSucceededAttempts += 1;
      totalCollectedMinor += attempt.amount.amountMinor;

      if (refundedAmount.amountMinor > attempt.amount.amountMinor) {
        issues.push({
          amount: attempt.amount,
          issueType: 'refund_exceeds_payment_amount',
          paymentAttemptId: attempt.paymentAttemptId,
          refundedAmount,
          severity: 'critical',
          subscriptionId: attempt.subscriptionId,
        });
      }
    } else {
      totalFailedAttempts += 1;

      if (attempt.subscriptionStatus === 'payment_overdue') {
        issues.push({
          amount: attempt.amount,
          issueType: 'overdue_failed_payment',
          paymentAttemptId: attempt.paymentAttemptId,
          refundedAmount,
          severity: 'warning',
          subscriptionId: attempt.subscriptionId,
        });
      }
    }
  }

  const status = issues.length === 0 ? 'clean' : 'issues_found';
  const event = createDomainEvent({
    actor: { role: 'operator', userId: input.input.operatorUserId },
    aggregateId: reconciliationRunId,
    aggregateType: 'payment_reconciliation_run',
    countryCode: input.input.countryCode,
    eventType: 'PaymentReconciliationRunCompleted',
    payload: {
      issueCount: issues.length,
      provider: input.input.provider ?? null,
      reconciliationRunId,
      status,
      totalCollectedMinor: totalCollectedMinor.toString(),
      totalFailedAttempts,
      totalRefundedMinor: totalRefundedMinor.toString(),
      totalSucceededAttempts,
    },
    traceId: input.input.traceId,
  });

  return {
    checkedAt: input.input.checkedAt,
    countryCode: input.input.countryCode,
    events: [event],
    issues,
    operatorUserId: input.input.operatorUserId,
    provider: input.input.provider ?? null,
    reconciliationRunId,
    status,
    totalCollected: money(totalCollectedMinor, 'XOF'),
    totalFailedAttempts,
    totalRefunded: money(totalRefundedMinor, 'XOF'),
    totalSucceededAttempts,
  };
}
