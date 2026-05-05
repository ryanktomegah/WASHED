import type { DayOfWeek, SubscriptionTierCode, TimeWindow } from '@washed/core-domain';
import type { CountryCode } from '@washed/shared';

import { isAuthRole, type AuthRole } from './auth-tokens.js';
import type { CreateUploadUrlInput } from './object-storage-provider.js';
import type {
  AssignWorkerInput,
  CancelSubscriptionInput,
  ChangeSubscriptionTierInput,
  CheckInVisitInput,
  CheckOutVisitInput,
  ChargeSubscriptionInput,
  AdvanceWorkerOnboardingCaseInput,
  CreateWorkerMonthlyPayoutInput,
  CreateWorkerOnboardingCaseInput,
  CreateSubscriberPrivacyRequestInput,
  CreateWorkerUnavailabilityInput,
  CreateWorkerAdvanceRequestInput,
  CreateSubscriptionInput,
  CreateDisputeInput,
  CreateSupportContactInput,
  CreateWorkerSwapRequestInput,
  DeclineAssignmentCandidateInput,
  DeliverDueNotificationMessagesInput,
  DisputeIssueType,
  DisputeStatus,
  GetSubscriptionDetailInput,
  GetWorkerMonthlyEarningsInput,
  GetWorkerRouteInput,
  IngestPaymentWebhookInput,
  IssuePaymentRefundInput,
  ListWorkerPayoutsInput,
  ListSubscriptionBillingInput,
  ListWorkerOnboardingCasesInput,
  ListWorkerUnavailabilityInput,
  ListWorkerAdvanceRequestsInput,
  ListAuditEventsInput,
  ListMatchingCandidatesInput,
  ListMatchingQueueInput,
  ListNotificationMessagesInput,
  ListOperatorDisputesInput,
  ListPaymentAttemptsInput,
  ListSubscriberSupportMatchesInput,
  ListServiceCellsInput,
  ListSupportContactsInput,
  ListWorkerSwapRequestsInput,
  ListWorkerIssuesInput,
  GetSupportContactInput,
  SupportContactCategory,
  SupportContactStatus,
  NotificationChannel,
  NotificationStatus,
  OperatorVisitCloseoutStatus,
  PushDeviceEnvironment,
  PushDevicePlatform,
  PushDeviceStatus,
  RateVisitInput,
  RefreshAuthSessionInput,
  RegisterPushDeviceInput,
  ReportWorkerIssueInput,
  ResolveDisputeInput,
  RunPaymentReconciliationInput,
  ResolveWorkerAdvanceRequestInput,
  ResolveWorkerSwapRequestInput,
  ResolveWorkerIssueInput,
  RescheduleVisitInput,
  SkipVisitInput,
  StartOtpChallengeInput,
  UploadVisitPhotoInput,
  UpdateOperatorVisitStatusInput,
  UpsertWorkerProfileInput,
  VerifyOtpChallengeInput,
  VisitLocationInput,
  WorkerAdvanceRequestStatus,
  WorkerOnboardingStage,
  WorkerIssueStatus,
  WorkerIssueType,
  WorkerSwapRequestStatus,
} from './repository.js';

const DAY_VALUES = new Set<DayOfWeek>([
  'friday',
  'monday',
  'saturday',
  'sunday',
  'thursday',
  'tuesday',
  'wednesday',
]);
const TIME_WINDOW_VALUES = new Set<TimeWindow>(['afternoon', 'morning']);
const TIER_VALUES = new Set<SubscriptionTierCode>(['T1', 'T2']);
const MOCK_PAYMENT_OUTCOME_VALUES = new Set<ChargeSubscriptionInput['mockOutcome']>([
  'failed',
  'succeeded',
]);
const PAYMENT_WEBHOOK_PROVIDER_VALUES = new Set<IngestPaymentWebhookInput['provider']>([
  'mobile_money_http',
  'mock',
]);
const DISPUTE_ISSUE_TYPE_VALUES = new Set<DisputeIssueType>([
  'damaged_item',
  'missing_item',
  'other',
  'worker_no_show',
]);
const SUPPORT_CONTACT_CATEGORY_VALUES = new Set<SupportContactCategory>([
  'other',
  'payment',
  'plan',
  'visit',
  'worker',
]);
const SUPPORT_CONTACT_STATUS_VALUES = new Set<SupportContactStatus>(['open', 'resolved']);
const DISPUTE_STATUS_VALUES = new Set<DisputeStatus>([
  'escalated',
  'open',
  'resolved_for_subscriber',
  'resolved_for_worker',
]);
const DISPUTE_RESOLUTION_VALUES = new Set<ResolveDisputeInput['resolution']>([
  'escalated',
  'resolved_for_subscriber',
  'resolved_for_worker',
]);
const WORKER_ISSUE_TYPE_VALUES = new Set<WorkerIssueType>([
  'access_issue',
  'client_unavailable',
  'other',
  'safety_concern',
  'supplies_missing',
]);
const WORKER_ISSUE_STATUS_VALUES = new Set<WorkerIssueStatus>(['acknowledged', 'open', 'resolved']);
const WORKER_ISSUE_RESOLUTION_VALUES = new Set<ResolveWorkerIssueInput['status']>([
  'acknowledged',
  'resolved',
]);
const WORKER_SWAP_STATUS_VALUES = new Set<WorkerSwapRequestStatus>([
  'approved',
  'declined',
  'open',
]);
const WORKER_SWAP_RESOLUTION_VALUES = new Set<ResolveWorkerSwapRequestInput['resolution']>([
  'approved',
  'declined',
]);
const WORKER_ADVANCE_STATUS_VALUES = new Set<WorkerAdvanceRequestStatus>([
  'approved',
  'declined',
  'open',
]);
const WORKER_ADVANCE_RESOLUTION_VALUES = new Set<ResolveWorkerAdvanceRequestInput['resolution']>([
  'approved',
  'declined',
]);
const WORKER_STATUS_VALUES = new Set<UpsertWorkerProfileInput['status']>([
  'active',
  'applicant',
  'inactive',
  'onboarding',
  'suspended',
]);
const WORKER_ONBOARDING_STAGE_VALUES = new Set<WorkerOnboardingStage>([
  'activated',
  'application_received',
  'casier_received',
  'cni_uploaded',
  'references_called',
  'rejected',
  'training_scheduled',
  'uniform_issued',
]);
const WORKER_ONBOARDING_ADVANCE_STAGE_VALUES = new Set<AdvanceWorkerOnboardingCaseInput['stage']>([
  'activated',
  'casier_received',
  'cni_uploaded',
  'references_called',
  'rejected',
  'training_scheduled',
  'uniform_issued',
]);
const VISIT_PHOTO_TYPE_VALUES = new Set<UploadVisitPhotoInput['photoType']>(['after', 'before']);
const VISIT_PHOTO_CONTENT_TYPE_VALUES = new Set<UploadVisitPhotoInput['contentType']>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const OPERATOR_VISIT_CLOSEOUT_STATUS_VALUES = new Set<OperatorVisitCloseoutStatus>([
  'cancelled',
  'no_show',
]);
const NOTIFICATION_CHANNEL_VALUES = new Set<NotificationChannel>([
  'in_app',
  'push',
  'sms',
  'whatsapp',
]);
const NOTIFICATION_STATUS_VALUES = new Set<NotificationStatus>([
  'failed',
  'pending',
  'sent',
  'suppressed_quiet_hours',
]);
const PUSH_DEVICE_PLATFORM_VALUES = new Set<PushDevicePlatform>(['android', 'ios']);
const PUSH_DEVICE_ENVIRONMENT_VALUES = new Set<PushDeviceEnvironment>([
  'development',
  'production',
  'simulator',
]);
const PUSH_DEVICE_STATUS_VALUES = new Set<PushDeviceStatus>(['active', 'revoked']);
const SUBSCRIBER_PRIVACY_REQUEST_TYPE_VALUES = new Set<
  CreateSubscriberPrivacyRequestInput['requestType']
>(['erasure', 'export']);

export function parseCreateSubscriptionBody(
  body: unknown,
  traceId: string,
): CreateSubscriptionInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const address = readRecord(body, 'address');
  const schedulePreference = readRecord(body, 'schedulePreference');
  const countryCode = readLiteral<CountryCode>(body, 'countryCode', new Set(['TG']));
  const tierCode = readLiteral<SubscriptionTierCode>(body, 'tierCode', TIER_VALUES);

  return {
    address: {
      gpsLatitude: readLatitude(address, 'gpsLatitude'),
      gpsLongitude: readLongitude(address, 'gpsLongitude'),
      landmark: readString(address, 'landmark'),
      neighborhood: readString(address, 'neighborhood'),
    },
    countryCode,
    phoneNumber: readPhoneNumber(body, 'phoneNumber'),
    schedulePreference: {
      dayOfWeek: readLiteral<DayOfWeek>(schedulePreference, 'dayOfWeek', DAY_VALUES),
      timeWindow: readLiteral<TimeWindow>(schedulePreference, 'timeWindow', TIME_WINDOW_VALUES),
    },
    tierCode,
    traceId,
  };
}

export function parseAssignWorkerBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): AssignWorkerInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const anchorDate = readString(body, 'anchorDate');

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(anchorDate)) {
    throw new Error('anchorDate must use YYYY-MM-DD format.');
  }

  return {
    anchorDate,
    operatorUserId: readUuid(body, 'operatorUserId'),
    subscriptionId,
    traceId,
    workerId: readUuid(body, 'workerId'),
  };
}

export function parseDeclineAssignmentCandidateBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): DeclineAssignmentCandidateInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    anchorDate: readDateString(body, 'anchorDate'),
    operatorUserId: readUuid(body, 'operatorUserId'),
    subscriptionId,
    traceId,
    workerId: readUuid(body, 'workerId'),
  };
}

export function parseChargeSubscriptionBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): ChargeSubscriptionInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    chargedAt: readIsoDateTime(body, 'chargedAt'),
    idempotencyKey: readIdempotencyKey(body, 'idempotencyKey'),
    mockOutcome: readLiteral<ChargeSubscriptionInput['mockOutcome']>(
      body,
      'mockOutcome',
      MOCK_PAYMENT_OUTCOME_VALUES,
    ),
    operatorUserId: readUuid(body, 'operatorUserId'),
    subscriptionId,
    traceId,
  };
}

export function parseIngestPaymentWebhookBody(
  body: unknown,
  traceId: string,
): IngestPaymentWebhookInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    idempotencyKey: readIdempotencyKey(body, 'idempotencyKey'),
    provider: readLiteral<IngestPaymentWebhookInput['provider']>(
      body,
      'provider',
      PAYMENT_WEBHOOK_PROVIDER_VALUES,
    ),
    providerReference: readString(body, 'providerReference'),
    receivedAt: readIsoDateTime(body, 'receivedAt'),
    status: readLiteral<IngestPaymentWebhookInput['status']>(
      body,
      'status',
      MOCK_PAYMENT_OUTCOME_VALUES,
    ),
    subscriptionId: readUuid(body, 'subscriptionId'),
    traceId,
  };
}

export function parseIssuePaymentRefundBody(
  paymentAttemptId: string,
  body: unknown,
  traceId: string,
): IssuePaymentRefundInput {
  if (!isUuid(paymentAttemptId)) {
    throw new Error('paymentAttemptId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    amountMinor: readAmountMinor(body, 'amountMinor'),
    issuedAt: readIsoDateTime(body, 'issuedAt'),
    operatorUserId: readUuid(body, 'operatorUserId'),
    paymentAttemptId,
    reason: readString(body, 'reason'),
    traceId,
  };
}

export function parseCancelSubscriptionBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): CancelSubscriptionInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    cancelledAt: readIsoDateTime(body, 'cancelledAt'),
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
  };
}

export function parseChangeSubscriptionTierBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): ChangeSubscriptionTierInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    effectiveAt: readIsoDateTime(body, 'effectiveAt'),
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    tierCode: readLiteral<SubscriptionTierCode>(body, 'tierCode', TIER_VALUES),
    traceId,
  };
}

export function parseGetSubscriptionDetailRequest(
  subscriptionId: string,
): GetSubscriptionDetailInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  return {
    subscriptionId,
  };
}

export function parseListSubscriptionBillingRequest(
  subscriptionId: string,
  query: unknown,
): ListSubscriptionBillingInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  return {
    limit: readOptionalLimit(query, 'limit') ?? 25,
    subscriptionId,
  };
}

export function parseCheckInVisitBody(
  visitId: string,
  body: unknown,
  traceId: string,
): CheckInVisitInput {
  if (!isUuid(visitId)) {
    throw new Error('visitId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const fallbackCode = readOptionalFallbackCode(body);

  return {
    checkedInAt: readIsoDateTime(body, 'checkedInAt'),
    ...(fallbackCode === undefined ? {} : { fallbackCode }),
    location: readLocation(body),
    traceId,
    visitId,
    workerId: readUuid(body, 'workerId'),
  };
}

export function parseCheckOutVisitBody(
  visitId: string,
  body: unknown,
  traceId: string,
): CheckOutVisitInput {
  if (!isUuid(visitId)) {
    throw new Error('visitId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const fallbackCode = readOptionalFallbackCode(body);

  return {
    checkedOutAt: readIsoDateTime(body, 'checkedOutAt'),
    ...(fallbackCode === undefined ? {} : { fallbackCode }),
    location: readLocation(body),
    traceId,
    visitId,
    workerId: readUuid(body, 'workerId'),
  };
}

export function parseUploadVisitPhotoBody(
  visitId: string,
  body: unknown,
  traceId: string,
): UploadVisitPhotoInput {
  if (!isUuid(visitId)) {
    throw new Error('visitId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const objectKey = readString(body, 'objectKey');

  if (!/^[A-Za-z0-9/_:.-]{4,512}$/u.test(objectKey)) {
    throw new Error('objectKey must be a 4-512 character storage key.');
  }

  return {
    byteSize: readBoundedInteger(body, 'byteSize', 1, 5_000_000),
    capturedAt: readIsoDateTime(body, 'capturedAt'),
    contentType: readLiteral<UploadVisitPhotoInput['contentType']>(
      body,
      'contentType',
      VISIT_PHOTO_CONTENT_TYPE_VALUES,
    ),
    objectKey,
    photoType: readLiteral<UploadVisitPhotoInput['photoType']>(
      body,
      'photoType',
      VISIT_PHOTO_TYPE_VALUES,
    ),
    traceId,
    visitId,
    workerId: readUuid(body, 'workerId'),
  };
}

export function parseCreateVisitPhotoUploadBody(
  visitId: string,
  body: unknown,
  traceId: string,
): CreateUploadUrlInput {
  if (!isUuid(visitId)) {
    throw new Error('visitId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const objectKey = readString(body, 'objectKey');

  if (!objectKey.startsWith(`visits/${visitId}/`)) {
    throw new Error('objectKey must be scoped to the visit.');
  }

  if (!/^[A-Za-z0-9/_:.-]{4,512}$/u.test(objectKey)) {
    throw new Error('objectKey must be a 4-512 character storage key.');
  }

  const expiresInSeconds = readOptionalBoundedInteger(body, 'expiresInSeconds', 60, 3600);

  return {
    byteSize: readBoundedInteger(body, 'byteSize', 1, 5_000_000),
    contentType: readLiteral<CreateUploadUrlInput['contentType']>(
      body,
      'contentType',
      VISIT_PHOTO_CONTENT_TYPE_VALUES,
    ),
    ...(expiresInSeconds === undefined ? {} : { expiresInSeconds }),
    objectKey,
    traceId,
  };
}

export function parseRescheduleVisitBody(
  subscriptionId: string,
  visitId: string,
  body: unknown,
  traceId: string,
): RescheduleVisitInput {
  assertSubscriptionVisitParams(subscriptionId, visitId);

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    scheduledDate: readDateString(body, 'scheduledDate'),
    scheduledTimeWindow: readLiteral<TimeWindow>(body, 'scheduledTimeWindow', TIME_WINDOW_VALUES),
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
    visitId,
  };
}

export function parseSkipVisitBody(
  subscriptionId: string,
  visitId: string,
  body: unknown,
  traceId: string,
): SkipVisitInput {
  assertSubscriptionVisitParams(subscriptionId, visitId);

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
    visitId,
  };
}

export function parseUpdateOperatorVisitStatusBody(
  visitId: string,
  body: unknown,
  traceId: string,
): UpdateOperatorVisitStatusInput {
  if (!isUuid(visitId)) {
    throw new Error('visitId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    note: readString(body, 'note'),
    operatorUserId: readUuid(body, 'operatorUserId'),
    status: readLiteral<OperatorVisitCloseoutStatus>(
      body,
      'status',
      OPERATOR_VISIT_CLOSEOUT_STATUS_VALUES,
    ),
    traceId,
    updatedAt: readIsoDateTime(body, 'updatedAt'),
    visitId,
  };
}

export function parseCreateDisputeBody(
  subscriptionId: string,
  visitId: string,
  body: unknown,
  traceId: string,
): CreateDisputeInput {
  assertSubscriptionVisitParams(subscriptionId, visitId);

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    createdAt: readIsoDateTime(body, 'createdAt'),
    description: readString(body, 'description'),
    issueType: readLiteral<DisputeIssueType>(body, 'issueType', DISPUTE_ISSUE_TYPE_VALUES),
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
    visitId,
  };
}

export function parseCreateSupportContactBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): CreateSupportContactInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const subject = readString(body, 'subject').trim();
  if (subject.length < 1 || subject.length > 120) {
    throw new Error('subject must be between 1 and 120 characters.');
  }

  const text = readString(body, 'body').trim();
  if (text.length < 1 || text.length > 4000) {
    throw new Error('body must be between 1 and 4000 characters.');
  }

  return {
    body: text,
    category: readLiteral<SupportContactCategory>(
      body,
      'category',
      SUPPORT_CONTACT_CATEGORY_VALUES,
    ),
    createdAt: readIsoDateTime(body, 'createdAt'),
    subject,
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
  };
}

export function parseListSupportContactsRequest(
  subscriptionId: string,
  query: unknown,
): ListSupportContactsInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }
  const record = isRecord(query) ? query : {};
  const status = readOptionalLiteral<SupportContactStatus>(
    record,
    'status',
    SUPPORT_CONTACT_STATUS_VALUES,
  );

  const base: ListSupportContactsInput = {
    limit: readOptionalLimit(record, 'limit') ?? 20,
    subscriptionId,
  };
  return status === undefined ? base : { ...base, status };
}

export function parseGetSupportContactParams(
  subscriptionId: string,
  contactId: string,
): GetSupportContactInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }
  if (!isUuid(contactId)) {
    throw new Error('contactId must be a UUID.');
  }
  return { contactId, subscriptionId };
}

export function parseRateVisitBody(
  subscriptionId: string,
  visitId: string,
  body: unknown,
  traceId: string,
): RateVisitInput {
  assertSubscriptionVisitParams(subscriptionId, visitId);

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const comment = readOptionalString(body, 'comment');
  const input: RateVisitInput = {
    createdAt: readIsoDateTime(body, 'createdAt'),
    rating: readBoundedInteger(body, 'rating', 1, 5) as RateVisitInput['rating'],
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
    visitId,
  };

  return comment === undefined ? input : { ...input, comment };
}

export function parseReportWorkerIssueBody(
  visitId: string,
  body: unknown,
  traceId: string,
): ReportWorkerIssueInput {
  if (!isUuid(visitId)) {
    throw new Error('visitId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    createdAt: readIsoDateTime(body, 'createdAt'),
    description: readString(body, 'description'),
    issueType: readLiteral<WorkerIssueType>(body, 'issueType', WORKER_ISSUE_TYPE_VALUES),
    traceId,
    visitId,
    workerId: readUuid(body, 'workerId'),
  };
}

export function parseCreateWorkerSwapRequestBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): CreateWorkerSwapRequestInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    reason: readString(body, 'reason'),
    requestedAt: readIsoDateTime(body, 'requestedAt'),
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
  };
}

export function parseListWorkerSwapRequestsRequest(query: unknown): ListWorkerSwapRequestsInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const status = readOptionalLiteral<WorkerSwapRequestStatus>(
    query,
    'status',
    WORKER_SWAP_STATUS_VALUES,
  );
  const input: ListWorkerSwapRequestsInput = {
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };

  return status === undefined ? input : { ...input, status };
}

export function parseResolveWorkerSwapRequestBody(
  requestId: string,
  body: unknown,
  traceId: string,
): ResolveWorkerSwapRequestInput {
  if (!isUuid(requestId)) {
    throw new Error('requestId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const replacementWorkerId = readOptionalUuid(body, 'replacementWorkerId');
  const input: ResolveWorkerSwapRequestInput = {
    operatorUserId: readUuid(body, 'operatorUserId'),
    requestId,
    resolution: readLiteral<ResolveWorkerSwapRequestInput['resolution']>(
      body,
      'resolution',
      WORKER_SWAP_RESOLUTION_VALUES,
    ),
    resolutionNote: readString(body, 'resolutionNote'),
    resolvedAt: readIsoDateTime(body, 'resolvedAt'),
    traceId,
  };

  return replacementWorkerId === undefined ? input : { ...input, replacementWorkerId };
}

export function parseListWorkerIssuesRequest(query: unknown): ListWorkerIssuesInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const status = readOptionalLiteral<WorkerIssueStatus>(
    query,
    'status',
    WORKER_ISSUE_STATUS_VALUES,
  );
  const input: ListWorkerIssuesInput = {
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };

  return status === undefined ? input : { ...input, status };
}

export function parseResolveWorkerIssueBody(
  issueId: string,
  body: unknown,
  traceId: string,
): ResolveWorkerIssueInput {
  if (!isUuid(issueId)) {
    throw new Error('issueId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    issueId,
    operatorUserId: readUuid(body, 'operatorUserId'),
    resolutionNote: readString(body, 'resolutionNote'),
    resolvedAt: readIsoDateTime(body, 'resolvedAt'),
    status: readLiteral<ResolveWorkerIssueInput['status']>(
      body,
      'status',
      WORKER_ISSUE_RESOLUTION_VALUES,
    ),
    traceId,
  };
}

export function parseListOperatorDisputesRequest(query: unknown): ListOperatorDisputesInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const status = readOptionalLiteral<DisputeStatus>(query, 'status', DISPUTE_STATUS_VALUES);
  const subscriptionId = readOptionalUuid(query, 'subscriptionId');
  const input: ListOperatorDisputesInput = {
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };

  return {
    ...input,
    ...(status === undefined ? {} : { status }),
    ...(subscriptionId === undefined ? {} : { subscriptionId }),
  };
}

export function parseResolveDisputeBody(
  disputeId: string,
  body: unknown,
  traceId: string,
): ResolveDisputeInput {
  if (!isUuid(disputeId)) {
    throw new Error('disputeId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const subscriberCreditAmountMinor = readOptionalAmountMinor(body, 'subscriberCreditAmountMinor');
  const input: ResolveDisputeInput = {
    disputeId,
    operatorUserId: readUuid(body, 'operatorUserId'),
    resolution: readLiteral<ResolveDisputeInput['resolution']>(
      body,
      'resolution',
      DISPUTE_RESOLUTION_VALUES,
    ),
    resolutionNote: readString(body, 'resolutionNote'),
    resolvedAt: readIsoDateTime(body, 'resolvedAt'),
    traceId,
  };

  return subscriberCreditAmountMinor === undefined
    ? input
    : { ...input, subscriberCreditAmountMinor };
}

export function parseGetWorkerMonthlyEarningsRequest(
  workerId: string,
  query: unknown,
): GetWorkerMonthlyEarningsInput {
  if (!isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const month = readString(query, 'month');

  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(month)) {
    throw new Error('month must use YYYY-MM format.');
  }

  return {
    month,
    workerId,
  };
}

export function parseCreateWorkerAdvanceRequestBody(
  workerId: string,
  body: unknown,
  traceId: string,
): CreateWorkerAdvanceRequestInput {
  if (!isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const month = readYearMonth(body, 'month');

  return {
    amountMinor: readAmountMinor(body, 'amountMinor'),
    month,
    reason: readString(body, 'reason'),
    requestedAt: readIsoDateTime(body, 'requestedAt'),
    traceId,
    workerId,
  };
}

export function parseCreateWorkerMonthlyPayoutBody(
  workerId: string,
  body: unknown,
  traceId: string,
): CreateWorkerMonthlyPayoutInput {
  if (!isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const providerReference = readOptionalString(body, 'providerReference');
  const input: CreateWorkerMonthlyPayoutInput = {
    month: readYearMonth(body, 'month'),
    note: readString(body, 'note'),
    operatorUserId: readUuid(body, 'operatorUserId'),
    paidAt: readIsoDateTime(body, 'paidAt'),
    traceId,
    workerId,
  };

  return providerReference === undefined ? input : { ...input, providerReference };
}

export function parseListWorkerPayoutsRequest(
  query: unknown,
  workerId?: string,
): ListWorkerPayoutsInput {
  if (workerId !== undefined && !isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const month = query.month === undefined ? undefined : readYearMonth(query, 'month');

  return {
    limit: readOptionalLimit(query, 'limit') ?? 50,
    ...(month === undefined ? {} : { month }),
    ...(workerId === undefined ? {} : { workerId }),
  };
}

export function parseListWorkerAdvanceRequestsRequest(
  query: unknown,
  workerId?: string,
): ListWorkerAdvanceRequestsInput {
  if (workerId !== undefined && !isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const month = query.month === undefined ? undefined : readYearMonth(query, 'month');
  const status =
    query.status === undefined
      ? undefined
      : readLiteral<WorkerAdvanceRequestStatus>(query, 'status', WORKER_ADVANCE_STATUS_VALUES);
  const input: ListWorkerAdvanceRequestsInput = {
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };

  return {
    ...input,
    ...(month === undefined ? {} : { month }),
    ...(status === undefined ? {} : { status }),
    ...(workerId === undefined ? {} : { workerId }),
  };
}

export function parseResolveWorkerAdvanceRequestBody(
  requestId: string,
  body: unknown,
  traceId: string,
): ResolveWorkerAdvanceRequestInput {
  if (!isUuid(requestId)) {
    throw new Error('requestId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    operatorUserId: readUuid(body, 'operatorUserId'),
    requestId,
    resolution: readLiteral<ResolveWorkerAdvanceRequestInput['resolution']>(
      body,
      'resolution',
      WORKER_ADVANCE_RESOLUTION_VALUES,
    ),
    resolutionNote: readString(body, 'resolutionNote'),
    resolvedAt: readIsoDateTime(body, 'resolvedAt'),
    traceId,
  };
}

export function parseGetWorkerRouteRequest(workerId: string, query: unknown): GetWorkerRouteInput {
  if (!isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const date = readString(query, 'date');

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new Error('date must use YYYY-MM-DD format.');
  }

  return {
    date,
    workerId,
  };
}

export function parseListMatchingQueueRequest(query: unknown): ListMatchingQueueInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  return {
    countryCode: readOptionalLiteral<CountryCode>(query, 'countryCode', new Set(['TG'])) ?? 'TG',
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };
}

export function parseUpsertWorkerProfileBody(
  workerId: string,
  body: unknown,
): UpsertWorkerProfileInput {
  if (!isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    countryCode: readLiteral<CountryCode>(body, 'countryCode', new Set(['TG'])),
    displayName: readString(body, 'displayName'),
    maxActiveSubscriptions: readBoundedInteger(body, 'maxActiveSubscriptions', 1, 100),
    serviceNeighborhoods: readStringArray(body, 'serviceNeighborhoods'),
    status: readLiteral<UpsertWorkerProfileInput['status']>(body, 'status', WORKER_STATUS_VALUES),
    workerId,
  };
}

export function parseCreateWorkerOnboardingCaseBody(
  body: unknown,
  traceId: string,
): CreateWorkerOnboardingCaseInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    appliedAt: readIsoDateTime(body, 'appliedAt'),
    countryCode: readLiteral<CountryCode>(body, 'countryCode', new Set(['TG'])),
    displayName: readString(body, 'displayName'),
    maxActiveSubscriptions: readBoundedInteger(body, 'maxActiveSubscriptions', 1, 100),
    operatorUserId: readUuid(body, 'operatorUserId'),
    phoneNumber: readPhoneNumber(body, 'phoneNumber'),
    serviceNeighborhoods: readStringArray(body, 'serviceNeighborhoods'),
    traceId,
    workerId: readUuid(body, 'workerId'),
  };
}

export function parseListAuditEventsRequest(query: unknown): ListAuditEventsInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const aggregateId = readOptionalUuid(query, 'aggregateId');
  const aggregateType = readOptionalString(query, 'aggregateType');
  const eventType = readOptionalString(query, 'eventType');
  const input: ListAuditEventsInput = {
    countryCode: readOptionalLiteral<CountryCode>(query, 'countryCode', new Set(['TG'])) ?? 'TG',
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };

  return {
    ...input,
    ...(aggregateId === undefined ? {} : { aggregateId }),
    ...(aggregateType === undefined ? {} : { aggregateType }),
    ...(eventType === undefined ? {} : { eventType }),
  };
}

export function parseCreateSubscriberPrivacyRequestBody(
  body: unknown,
  subscriptionId: string,
  traceId: string,
): CreateSubscriberPrivacyRequestInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    operatorUserId: readUuid(body, 'operatorUserId'),
    reason: readString(body, 'reason'),
    requestedAt: body.requestedAt === undefined ? new Date() : readIsoDateTime(body, 'requestedAt'),
    requestType: readLiteral(body, 'requestType', SUBSCRIBER_PRIVACY_REQUEST_TYPE_VALUES),
    subscriptionId: parseUuid(subscriptionId, 'subscriptionId'),
    traceId,
  };
}

export function parseListPaymentAttemptsRequest(query: unknown): ListPaymentAttemptsInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const provider = readOptionalString(query, 'provider');
  const status = readOptionalLiteral<ChargeSubscriptionInput['mockOutcome']>(
    query,
    'status',
    MOCK_PAYMENT_OUTCOME_VALUES,
  );
  const input: ListPaymentAttemptsInput = {
    countryCode: readOptionalLiteral<CountryCode>(query, 'countryCode', new Set(['TG'])) ?? 'TG',
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };

  return {
    ...input,
    ...(provider === undefined ? {} : { provider }),
    ...(status === undefined ? {} : { status }),
  };
}

export function parseGetBetaMetricsRequest(query: unknown): { readonly countryCode: CountryCode } {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  return {
    countryCode: readOptionalLiteral<CountryCode>(query, 'countryCode', new Set(['TG'])) ?? 'TG',
  };
}

export function parseListSubscriberSupportMatchesRequest(
  query: unknown,
): ListSubscriberSupportMatchesInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const phoneNumber = readOptionalString(query, 'phoneNumber');
  const input: ListSubscriberSupportMatchesInput = {
    countryCode: readOptionalLiteral<CountryCode>(query, 'countryCode', new Set(['TG'])) ?? 'TG',
    limit: readOptionalLimit(query, 'limit') ?? 10,
  };

  return phoneNumber === undefined ? input : { ...input, phoneNumber };
}

export function parseRunPaymentReconciliationBody(
  body: unknown,
  traceId: string,
): RunPaymentReconciliationInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const provider = readOptionalString(body, 'provider');
  const input: RunPaymentReconciliationInput = {
    checkedAt: readIsoDateTime(body, 'checkedAt'),
    countryCode: readLiteral<CountryCode>(body, 'countryCode', new Set(['TG'])),
    operatorUserId: readUuid(body, 'operatorUserId'),
    traceId,
  };

  return provider === undefined ? input : { ...input, provider };
}

export function parseListNotificationMessagesRequest(
  query: unknown,
): ListNotificationMessagesInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const aggregateId = readOptionalUuid(query, 'aggregateId');
  const aggregateType = readOptionalString(query, 'aggregateType');
  const channel = readOptionalLiteral<NotificationChannel>(
    query,
    'channel',
    NOTIFICATION_CHANNEL_VALUES,
  );
  const status = readOptionalLiteral<NotificationStatus>(
    query,
    'status',
    NOTIFICATION_STATUS_VALUES,
  );
  const templateKey = readOptionalString(query, 'templateKey');
  const input: ListNotificationMessagesInput = {
    countryCode: readOptionalLiteral<CountryCode>(query, 'countryCode', new Set(['TG'])) ?? 'TG',
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };

  return {
    ...input,
    ...(aggregateId === undefined ? {} : { aggregateId }),
    ...(aggregateType === undefined ? {} : { aggregateType }),
    ...(channel === undefined ? {} : { channel }),
    ...(status === undefined ? {} : { status }),
    ...(templateKey === undefined ? {} : { templateKey }),
  };
}

export function parseListPushDevicesRequest(query: unknown): {
  readonly countryCode: CountryCode;
  readonly limit: number;
  readonly role?: AuthRole;
  readonly status?: PushDeviceStatus;
} {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const role =
    query.role === undefined
      ? undefined
      : readLiteral<AuthRole>(query, 'role', new Set(['operator', 'subscriber', 'worker']));
  const status = readOptionalLiteral<PushDeviceStatus>(query, 'status', PUSH_DEVICE_STATUS_VALUES);

  return {
    countryCode: readOptionalLiteral<CountryCode>(query, 'countryCode', new Set(['TG'])) ?? 'TG',
    limit: readOptionalLimit(query, 'limit') ?? 50,
    ...(role === undefined ? {} : { role }),
    ...(status === undefined ? {} : { status }),
  };
}

export function parseDeliverDueNotificationMessagesBody(
  body: unknown,
): DeliverDueNotificationMessagesInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const deliveredAtValue = body.deliveredAt;
  const deliveredAt =
    deliveredAtValue === undefined ? new Date() : readIsoDateTime(body, 'deliveredAt');

  return {
    countryCode: readOptionalLiteral<CountryCode>(body, 'countryCode', new Set(['TG'])) ?? 'TG',
    deliveredAt,
    limit: readOptionalLimit(body, 'limit') ?? 25,
  };
}

export function parseListWorkerOnboardingCasesRequest(
  query: unknown,
): ListWorkerOnboardingCasesInput {
  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const stage =
    query.stage === undefined
      ? undefined
      : readLiteral<WorkerOnboardingStage>(query, 'stage', WORKER_ONBOARDING_STAGE_VALUES);

  return {
    limit: readOptionalLimit(query, 'limit') ?? 50,
    ...(stage === undefined ? {} : { stage }),
  };
}

export function parseAdvanceWorkerOnboardingCaseBody(
  caseId: string,
  body: unknown,
  traceId: string,
): AdvanceWorkerOnboardingCaseInput {
  if (!isUuid(caseId)) {
    throw new Error('caseId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    caseId,
    note: readString(body, 'note'),
    occurredAt: readIsoDateTime(body, 'occurredAt'),
    operatorUserId: readUuid(body, 'operatorUserId'),
    stage: readLiteral<AdvanceWorkerOnboardingCaseInput['stage']>(
      body,
      'stage',
      WORKER_ONBOARDING_ADVANCE_STAGE_VALUES,
    ),
    traceId,
  };
}

export function parseListServiceCellsRequest(query: unknown): ListServiceCellsInput {
  if (!isRecord(query)) {
    throw new Error('Query parameters must be an object.');
  }

  return {
    date: readOptionalDateString(query, 'date') ?? new Date().toISOString().slice(0, 10),
    limit: readOptionalLimit(query, 'limit') ?? 50,
  };
}

export function parseListMatchingCandidatesRequest(
  subscriptionId: string,
  query: unknown,
): ListMatchingCandidatesInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const anchorDate =
    query.anchorDate === undefined ? undefined : readDateString(query, 'anchorDate');

  return {
    ...(anchorDate === undefined ? {} : { anchorDate }),
    limit: readOptionalLimit(query, 'limit') ?? 10,
    subscriptionId,
  };
}

export function parseCreateWorkerUnavailabilityBody(
  workerId: string,
  body: unknown,
  traceId: string,
): CreateWorkerUnavailabilityInput {
  if (!isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    createdAt: readIsoDateTime(body, 'createdAt'),
    date: readDateString(body, 'date'),
    reason: readString(body, 'reason'),
    traceId,
    workerId,
  };
}

export function parseListWorkerUnavailabilityRequest(
  workerId: string,
  query: unknown,
): ListWorkerUnavailabilityInput {
  if (!isUuid(workerId)) {
    throw new Error('workerId must be a UUID.');
  }

  if (!isRecord(query)) {
    throw new Error('Query string must be an object.');
  }

  const dateFrom = query.dateFrom === undefined ? undefined : readDateString(query, 'dateFrom');
  const dateTo = query.dateTo === undefined ? undefined : readDateString(query, 'dateTo');

  return {
    ...(dateFrom === undefined ? {} : { dateFrom }),
    ...(dateTo === undefined ? {} : { dateTo }),
    limit: readOptionalLimit(query, 'limit') ?? 50,
    workerId,
  };
}

export function parseStartOtpChallengeBody(body: unknown, traceId: string): StartOtpChallengeInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    countryCode: readLiteral<CountryCode>(body, 'countryCode', new Set(['TG'])),
    phoneNumber: readPhoneNumber(body, 'phoneNumber'),
    traceId,
  };
}

export function parseVerifyOtpChallengeBody(
  body: unknown,
  traceId: string,
): VerifyOtpChallengeInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const role = readString(body, 'role');

  if (!isAuthRole(role)) {
    throw new Error('role is not supported.');
  }

  return {
    challengeId: readUuid(body, 'challengeId'),
    code: readOtpCode(body, 'code'),
    deviceId: readString(body, 'deviceId'),
    role,
    traceId,
  };
}

export function parseRegisterPushDeviceBody(
  body: unknown,
  claims: {
    readonly countryCode: CountryCode;
    readonly role: AuthRole;
    readonly userId: string;
  },
): RegisterPushDeviceInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const app = readLiteral<AuthRole>(body, 'app', new Set(['operator', 'subscriber', 'worker']));

  if (app !== claims.role) {
    throw new Error('app must match the authenticated user role.');
  }

  return {
    app,
    countryCode: claims.countryCode,
    deviceId: readString(body, 'deviceId'),
    environment: readLiteral<PushDeviceEnvironment>(
      body,
      'environment',
      PUSH_DEVICE_ENVIRONMENT_VALUES,
    ),
    platform: readLiteral<PushDevicePlatform>(body, 'platform', PUSH_DEVICE_PLATFORM_VALUES),
    registeredAt: new Date(),
    role: claims.role,
    token: readString(body, 'token'),
    userId: claims.userId,
  };
}

export function parseRefreshAuthSessionBody(
  body: unknown,
  traceId: string,
): RefreshAuthSessionInput {
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  return {
    refreshToken: readString(body, 'refreshToken'),
    traceId,
  };
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];

  if (!isRecord(value)) {
    throw new Error(`${key} must be an object.`);
  }

  return value;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string.`);
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function readPhoneNumber(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);

  if (!/^\+[1-9]\d{7,14}$/u.test(value)) {
    throw new Error(`${key} must be an E.164 phone number.`);
  }

  return value;
}

function readIdempotencyKey(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);

  if (!/^[A-Za-z0-9._:-]{8,128}$/u.test(value)) {
    throw new Error(`${key} must be 8-128 URL-safe characters.`);
  }

  return value;
}

function readOtpCode(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);

  if (!/^\d{6}$/u.test(value)) {
    throw new Error(`${key} must be a 6-digit code.`);
  }

  return value;
}

function readLatitude(record: Record<string, unknown>, key: string): number {
  const value = readNumber(record, key);

  if (value < -90 || value > 90) {
    throw new Error(`${key} must be between -90 and 90.`);
  }

  return value;
}

function readLongitude(record: Record<string, unknown>, key: string): number {
  const value = readNumber(record, key);

  if (value < -180 || value > 180) {
    throw new Error(`${key} must be between -180 and 180.`);
  }

  return value;
}

function readLocation(record: Record<string, unknown>): VisitLocationInput {
  const location = readRecord(record, 'location');

  return {
    latitude: readLatitude(location, 'latitude'),
    longitude: readLongitude(location, 'longitude'),
  };
}

function readOptionalFallbackCode(record: Record<string, unknown>): string | undefined {
  const value = record.fallbackCode;

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !/^\d{4}$/u.test(value)) {
    throw new Error('fallbackCode must be a 4-digit code.');
  }

  return value;
}

function readIsoDateTime(record: Record<string, unknown>, key: string): Date {
  const value = readString(record, key);
  const date = new Date(value);

  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error(`${key} must be an ISO-8601 UTC timestamp.`);
  }

  return date;
}

function readDateString(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error(`${key} must use YYYY-MM-DD format.`);
  }

  return value;
}

function readOptionalDateString(record: Record<string, unknown>, key: string): string | undefined {
  if (record[key] === undefined) {
    return undefined;
  }

  return readDateString(record, key);
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number.`);
  }

  return value;
}

function readBoundedInteger(
  record: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const value = readNumber(record, key);

  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be an integer between ${minimum} and ${maximum}.`);
  }

  return value;
}

function readOptionalBoundedInteger(
  record: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  const parsed =
    typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${key} must be an integer between ${minimum} and ${maximum}.`);
  }

  return parsed;
}

function readStringArray(record: Record<string, unknown>, key: string): readonly string[] {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array.`);
  }

  const strings = value.map((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      throw new Error(`${key}[${index}] must be a non-empty string.`);
    }

    return item.trim();
  });

  if (strings.length === 0) {
    throw new Error(`${key} must contain at least one value.`);
  }

  return [...new Set(strings)];
}

function readOptionalLimit(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  const parsed =
    typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : Number.NaN;

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error(`${key} must be an integer between 1 and 100.`);
  }

  return parsed;
}

function readOptionalAmountMinor(record: Record<string, unknown>, key: string): bigint | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${key} must be an integer minor-unit amount.`);
  }

  const text = String(value).trim();

  if (!/^[0-9]+$/u.test(text)) {
    throw new Error(`${key} must be a non-negative integer minor-unit amount.`);
  }

  return BigInt(text);
}

function readAmountMinor(record: Record<string, unknown>, key: string): bigint {
  const value = readOptionalAmountMinor(record, key);

  if (value === undefined) {
    throw new Error(`${key} must be an integer minor-unit amount.`);
  }

  return value;
}

function readYearMonth(record: Record<string, unknown>, key: string): string {
  const month = readString(record, key);

  if (!/^\d{4}-(0[1-9]|1[0-2])$/u.test(month)) {
    throw new Error(`${key} must use YYYY-MM format.`);
  }

  return month;
}

function assertSubscriptionVisitParams(subscriptionId: string, visitId: string): void {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }

  if (!isUuid(visitId)) {
    throw new Error('visitId must be a UUID.');
  }
}

function readUuid(record: Record<string, unknown>, key: string): string {
  const value = readString(record, key);

  return parseUuid(value, key);
}

function parseUuid(value: string, key: string): string {
  if (!isUuid(value)) {
    throw new Error(`${key} must be a UUID.`);
  }

  return value;
}

function readOptionalUuid(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string' || !isUuid(value)) {
    throw new Error(`${key} must be a UUID.`);
  }

  return value;
}

function readLiteral<TValue extends string>(
  record: Record<string, unknown>,
  key: string,
  allowed: ReadonlySet<TValue>,
): TValue {
  const value = readString(record, key);

  if (!allowed.has(value as TValue)) {
    throw new Error(`${key} is not supported.`);
  }

  return value as TValue;
}

function readOptionalLiteral<TValue extends string>(
  record: Record<string, unknown>,
  key: string,
  allowed: ReadonlySet<TValue>,
): TValue | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }

  const normalized = value.trim();

  if (!allowed.has(normalized as TValue)) {
    throw new Error(`${key} is not supported.`);
  }

  return normalized as TValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
