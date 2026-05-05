import type { ActorRole, DomainEvent } from '@washed/shared';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ASSIGNMENT_DECISION_VALUES = new Set(['assigned', 'declined', 'rejected']);
const ASSIGNMENT_DECISION_REASON_VALUES = new Set([
  'capacity_exhausted',
  'operator_selected_worker',
  'operator_declined_candidate',
  'service_cell_mismatch',
  'worker_not_active',
  'worker_unavailable',
]);
const PAYMENT_EVENT_TYPES = new Set(['SubscriptionPaymentFailed', 'SubscriptionPaymentSucceeded']);
const PAYMENT_STATUS_VALUES = new Set(['failed', 'succeeded']);
const SUBSCRIPTION_STATUS_VALUES = new Set(['active', 'payment_overdue', 'pending_match']);
const TIER_VALUES = new Set(['T1', 'T2']);
const REGISTERED_EVENT_CONTRACTS = new Map<
  string,
  {
    readonly aggregateType: string;
    readonly actorRole: ActorRole;
    readonly requiredPayloadKeys: readonly string[];
  }
>([
  [
    'SubscriberPrivacyRequestRecorded',
    {
      actorRole: 'operator',
      aggregateType: 'subscription',
      requiredPayloadKeys: [
        'auditEventCount',
        'billingItemCount',
        'disputeCount',
        'notificationCount',
        'reason',
        'requestId',
        'requestType',
        'retainedRecordTypes',
        'subscriberId',
        'subscriptionId',
      ],
    },
  ],
  [
    'PaymentReconciliationRunCompleted',
    {
      actorRole: 'operator',
      aggregateType: 'payment_reconciliation_run',
      requiredPayloadKeys: [
        'issueCount',
        'provider',
        'reconciliationRunId',
        'status',
        'totalCollectedMinor',
        'totalFailedAttempts',
        'totalRefundedMinor',
        'totalSucceededAttempts',
      ],
    },
  ],
  [
    'PaymentRefundIssued',
    {
      actorRole: 'operator',
      aggregateType: 'payment_refund',
      requiredPayloadKeys: [
        'amountMinor',
        'currencyCode',
        'paymentAttemptId',
        'provider',
        'providerReference',
        'reason',
        'refundId',
        'status',
        'subscriptionId',
      ],
    },
  ],
  [
    'VisitPhotoUploaded',
    {
      actorRole: 'worker',
      aggregateType: 'visit',
      requiredPayloadKeys: ['byteSize', 'contentType', 'objectKey', 'photoType', 'workerId'],
    },
  ],
  [
    'VisitRescheduled',
    {
      actorRole: 'subscriber',
      aggregateType: 'visit',
      requiredPayloadKeys: [
        'previousScheduledDate',
        'previousScheduledTimeWindow',
        'scheduledDate',
        'scheduledTimeWindow',
        'subscriptionId',
        'workerId',
      ],
    },
  ],
  [
    'VisitSkipped',
    {
      actorRole: 'subscriber',
      aggregateType: 'visit',
      requiredPayloadKeys: ['scheduledDate', 'scheduledTimeWindow', 'subscriptionId', 'workerId'],
    },
  ],
  [
    'OperatorVisitStatusUpdated',
    {
      actorRole: 'operator',
      aggregateType: 'visit',
      requiredPayloadKeys: [
        'note',
        'previousStatus',
        'scheduledDate',
        'scheduledTimeWindow',
        'status',
        'subscriptionId',
        'workerId',
      ],
    },
  ],
  [
    'VisitDisputed',
    {
      actorRole: 'subscriber',
      aggregateType: 'visit',
      requiredPayloadKeys: ['description', 'disputeId', 'issueType', 'status', 'subscriptionId'],
    },
  ],
  [
    'SubscriberSupportContactOpened',
    {
      actorRole: 'subscriber',
      aggregateType: 'support_contact',
      requiredPayloadKeys: ['category', 'contactId', 'subject', 'subscriptionId'],
    },
  ],
  [
    'DisputeResolved',
    {
      actorRole: 'operator',
      aggregateType: 'support_dispute',
      requiredPayloadKeys: [
        'disputeId',
        'resolution',
        'resolutionNote',
        'subscriberCreditAmountMinor',
        'subscriberCreditId',
        'subscriptionId',
        'visitId',
      ],
    },
  ],
  [
    'DisputeEscalated',
    {
      actorRole: 'operator',
      aggregateType: 'support_dispute',
      requiredPayloadKeys: [
        'disputeId',
        'resolution',
        'resolutionNote',
        'subscriberCreditAmountMinor',
        'subscriberCreditId',
        'subscriptionId',
        'visitId',
      ],
    },
  ],
  [
    'SubscriberCreditIssued',
    {
      actorRole: 'operator',
      aggregateType: 'subscription',
      requiredPayloadKeys: [
        'amountMinor',
        'creditId',
        'currencyCode',
        'disputeId',
        'reason',
        'visitId',
      ],
    },
  ],
  [
    'VisitRated',
    {
      actorRole: 'subscriber',
      aggregateType: 'visit',
      requiredPayloadKeys: ['comment', 'rating', 'ratingId', 'subscriptionId'],
    },
  ],
  [
    'WorkerIssueReported',
    {
      actorRole: 'worker',
      aggregateType: 'visit',
      requiredPayloadKeys: [
        'description',
        'issueId',
        'issueType',
        'status',
        'subscriptionId',
        'workerId',
      ],
    },
  ],
  [
    'WorkerIssueAcknowledged',
    {
      actorRole: 'operator',
      aggregateType: 'worker_issue',
      requiredPayloadKeys: [
        'issueId',
        'resolutionNote',
        'resolvedAt',
        'status',
        'visitId',
        'workerId',
      ],
    },
  ],
  [
    'WorkerIssueResolved',
    {
      actorRole: 'operator',
      aggregateType: 'worker_issue',
      requiredPayloadKeys: [
        'issueId',
        'resolutionNote',
        'resolvedAt',
        'status',
        'visitId',
        'workerId',
      ],
    },
  ],
  [
    'WorkerAdvanceRequested',
    {
      actorRole: 'worker',
      aggregateType: 'worker_advance_request',
      requiredPayloadKeys: [
        'amountMinor',
        'currencyCode',
        'month',
        'reason',
        'requestId',
        'status',
        'workerId',
      ],
    },
  ],
  [
    'WorkerAdvanceApproved',
    {
      actorRole: 'operator',
      aggregateType: 'worker_advance_request',
      requiredPayloadKeys: [
        'amountMinor',
        'currencyCode',
        'month',
        'requestId',
        'resolutionNote',
        'status',
        'workerId',
      ],
    },
  ],
  [
    'WorkerAdvanceDeclined',
    {
      actorRole: 'operator',
      aggregateType: 'worker_advance_request',
      requiredPayloadKeys: [
        'amountMinor',
        'currencyCode',
        'month',
        'requestId',
        'resolutionNote',
        'status',
        'workerId',
      ],
    },
  ],
  [
    'WorkerPayoutRecorded',
    {
      actorRole: 'operator',
      aggregateType: 'worker_payout',
      requiredPayloadKeys: [
        'advanceRequestId',
        'amountMinor',
        'currencyCode',
        'failureReason',
        'payoutId',
        'payoutType',
        'periodMonth',
        'provider',
        'providerReference',
        'status',
        'workerId',
      ],
    },
  ],
  [
    'WorkerOnboardingCaseCreated',
    {
      actorRole: 'operator',
      aggregateType: 'worker_onboarding_case',
      requiredPayloadKeys: ['caseId', 'displayName', 'phoneNumber', 'stage', 'workerId'],
    },
  ],
  [
    'WorkerOnboardingAdvanced',
    {
      actorRole: 'operator',
      aggregateType: 'worker_onboarding_case',
      requiredPayloadKeys: ['caseId', 'note', 'previousStage', 'stage', 'workerId'],
    },
  ],
  [
    'WorkerOnboardingActivated',
    {
      actorRole: 'operator',
      aggregateType: 'worker_onboarding_case',
      requiredPayloadKeys: ['caseId', 'note', 'previousStage', 'stage', 'workerId'],
    },
  ],
  [
    'WorkerMarkedUnavailable',
    {
      actorRole: 'worker',
      aggregateType: 'worker',
      requiredPayloadKeys: ['date', 'reason', 'unavailabilityId', 'workerId'],
    },
  ],
  [
    'WorkerSwapRequested',
    {
      actorRole: 'subscriber',
      aggregateType: 'subscription',
      requiredPayloadKeys: ['currentWorkerId', 'reason', 'requestId', 'status', 'subscriberId'],
    },
  ],
  [
    'WorkerSwapApproved',
    {
      actorRole: 'operator',
      aggregateType: 'worker_swap_request',
      requiredPayloadKeys: [
        'currentWorkerId',
        'replacementWorkerId',
        'requestId',
        'resolutionNote',
        'status',
        'subscriptionId',
      ],
    },
  ],
  [
    'WorkerSwapDeclined',
    {
      actorRole: 'operator',
      aggregateType: 'worker_swap_request',
      requiredPayloadKeys: [
        'currentWorkerId',
        'replacementWorkerId',
        'requestId',
        'resolutionNote',
        'status',
        'subscriptionId',
      ],
    },
  ],
  [
    'SubscriptionCancelled',
    {
      actorRole: 'subscriber',
      aggregateType: 'subscription',
      requiredPayloadKeys: ['cancelledAt', 'cancelledScheduledVisits', 'status', 'subscriptionId'],
    },
  ],
  [
    'SubscriptionTierChanged',
    {
      actorRole: 'subscriber',
      aggregateType: 'subscription',
      requiredPayloadKeys: [
        'effectiveAt',
        'monthlyPriceMinor',
        'previousTierCode',
        'status',
        'subscriptionId',
        'tierCode',
        'visitsPerCycle',
      ],
    },
  ],
]);

export function assertCoreDomainEventContract(event: DomainEvent): void {
  if (event.eventType === 'AssignmentDecisionRecorded') {
    assertAssignmentDecisionRecorded(event);
    return;
  }

  if (event.eventType === 'SubscriptionCreated') {
    assertSubscriptionCreated(event);
    return;
  }

  if (event.eventType === 'SubscriberAssigned') {
    assertSubscriberAssigned(event);
    return;
  }

  if (PAYMENT_EVENT_TYPES.has(event.eventType)) {
    assertSubscriptionPaymentEvent(event);
    return;
  }

  if (event.eventType === 'VisitCompleted') {
    assertVisitCompleted(event);
    return;
  }

  const contract = REGISTERED_EVENT_CONTRACTS.get(event.eventType);

  if (contract === undefined) {
    throw new Error(`${event.eventType} is not registered in the core event contract catalog.`);
  }

  assertRegisteredEvent(event, contract);
}

function assertAssignmentDecisionRecorded(event: DomainEvent): void {
  if (event.aggregateType !== 'assignment_decision') {
    throw new Error('AssignmentDecisionRecorded aggregateType must be assignment_decision.');
  }

  if (event.actor.role !== 'operator' || event.actor.userId === null) {
    throw new Error('AssignmentDecisionRecorded actor must be an operator user.');
  }

  const payload = event.payload;
  assertUuid(event.aggregateId, 'aggregateId');
  assertString(payload['anchorDate'], 'payload.anchorDate');
  assertUuid(payload['decisionId'], 'payload.decisionId');
  assertUuid(payload['operatorUserId'], 'payload.operatorUserId');
  assertUuid(payload['subscriptionId'], 'payload.subscriptionId');
  assertUuid(payload['workerId'], 'payload.workerId');
  assertLiteral(payload['decision'], ASSIGNMENT_DECISION_VALUES, 'payload.decision');
  assertLiteral(payload['reason'], ASSIGNMENT_DECISION_REASON_VALUES, 'payload.reason');

  if (payload['decisionId'] !== event.aggregateId) {
    throw new Error('AssignmentDecisionRecorded decisionId must match aggregateId.');
  }

  if (payload['operatorUserId'] !== event.actor.userId) {
    throw new Error('AssignmentDecisionRecorded operatorUserId must match actor userId.');
  }
}

function assertSubscriptionCreated(event: DomainEvent): void {
  assertAggregate(event, 'SubscriptionCreated', 'subscription');

  if (event.actor.role !== 'subscriber' || event.actor.userId === null) {
    throw new Error('SubscriptionCreated actor must be a subscriber user.');
  }

  const payload = event.payload;
  assertUuid(event.aggregateId, 'aggregateId');
  assertUuid(payload['addressId'], 'payload.addressId');
  assertString(payload['preferredDayOfWeek'], 'payload.preferredDayOfWeek');
  assertString(payload['preferredTimeWindow'], 'payload.preferredTimeWindow');
  assertLiteral(payload['status'], SUBSCRIPTION_STATUS_VALUES, 'payload.status');
  assertUuid(payload['subscriberId'], 'payload.subscriberId');
  assertLiteral(payload['tierCode'], TIER_VALUES, 'payload.tierCode');

  if (payload['subscriberId'] !== event.actor.userId) {
    throw new Error('SubscriptionCreated subscriberId must match actor userId.');
  }
}

function assertSubscriberAssigned(event: DomainEvent): void {
  assertAggregate(event, 'SubscriberAssigned', 'subscription');

  if (event.actor.role !== 'operator' || event.actor.userId === null) {
    throw new Error('SubscriberAssigned actor must be an operator user.');
  }

  const payload = event.payload;
  assertUuid(event.aggregateId, 'aggregateId');
  assertUuidArray(payload['generatedVisitIds'], 'payload.generatedVisitIds');
  assertLiteral(payload['status'], SUBSCRIPTION_STATUS_VALUES, 'payload.status');
  assertUuid(payload['workerId'], 'payload.workerId');
}

function assertSubscriptionPaymentEvent(event: DomainEvent): void {
  assertAggregate(event, event.eventType, 'subscription');

  if (
    (event.actor.role !== 'operator' || event.actor.userId === null) &&
    (event.actor.role !== 'system' || event.actor.userId !== null)
  ) {
    throw new Error(`${event.eventType} actor must be an operator user or system.`);
  }

  const payload = event.payload;
  assertUuid(event.aggregateId, 'aggregateId');
  assertAmountMinor(payload['amountMinor'], 'payload.amountMinor');
  assertString(payload['currencyCode'], 'payload.currencyCode');
  assertString(payload['idempotencyKey'], 'payload.idempotencyKey');
  assertUuid(payload['paymentAttemptId'], 'payload.paymentAttemptId');
  assertString(payload['provider'], 'payload.provider');
  assertString(payload['providerReference'], 'payload.providerReference');
  assertLiteral(payload['status'], PAYMENT_STATUS_VALUES, 'payload.status');
  assertLiteral(
    payload['subscriptionStatus'],
    SUBSCRIPTION_STATUS_VALUES,
    'payload.subscriptionStatus',
  );
}

function assertVisitCompleted(event: DomainEvent): void {
  assertAggregate(event, 'VisitCompleted', 'visit');

  if (event.actor.role !== 'worker' || event.actor.userId === null) {
    throw new Error('VisitCompleted actor must be a worker user.');
  }

  const payload = event.payload;
  assertUuid(event.aggregateId, 'aggregateId');
  assertAmountMinor(payload['bonusAmountMinor'], 'payload.bonusAmountMinor');
  assertString(payload['bonusCurrencyCode'], 'payload.bonusCurrencyCode');
  assertIsoDateTime(payload['checkedInAt'], 'payload.checkedInAt');
  assertIsoDateTime(payload['checkedOutAt'], 'payload.checkedOutAt');
  assertNonNegativeInteger(payload['durationMinutes'], 'payload.durationMinutes');
  assertUuid(payload['workerId'], 'payload.workerId');

  if (payload['workerId'] !== event.actor.userId) {
    throw new Error('VisitCompleted workerId must match actor userId.');
  }
}

function assertIsoDateTime(value: unknown, path: string): void {
  assertString(value, path);

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${path} must be an ISO date-time string.`);
  }
}

function assertNonNegativeInteger(value: unknown, path: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${path} must be a non-negative integer.`);
  }
}

function assertAggregate(event: DomainEvent, eventType: string, aggregateType: string): void {
  if (event.aggregateType !== aggregateType) {
    throw new Error(`${eventType} aggregateType must be ${aggregateType}.`);
  }
}

function assertRegisteredEvent(
  event: DomainEvent,
  contract: {
    readonly actorRole: ActorRole;
    readonly aggregateType: string;
    readonly requiredPayloadKeys: readonly string[];
  },
): void {
  assertAggregate(event, event.eventType, contract.aggregateType);
  assertUuid(event.aggregateId, 'aggregateId');

  if (event.actor.role !== contract.actorRole || event.actor.userId === null) {
    throw new Error(`${event.eventType} actor must be a ${contract.actorRole} user.`);
  }

  for (const key of contract.requiredPayloadKeys) {
    if (!(key in event.payload)) {
      throw new Error(`${event.eventType} payload.${key} is required.`);
    }
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertUuid(value: unknown, label: string): asserts value is string {
  assertString(value, label);

  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${label} must be a UUID.`);
  }
}

function assertLiteral(value: unknown, allowed: ReadonlySet<string>, label: string): void {
  assertString(value, label);

  if (!allowed.has(value)) {
    throw new Error(`${label} is not supported.`);
  }
}

function assertAmountMinor(value: unknown, label: string): void {
  assertString(value, label);

  if (!/^[0-9]+$/u.test(value)) {
    throw new Error(`${label} must be a non-negative integer minor-unit amount.`);
  }
}

function assertUuidArray(value: unknown, label: string): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty UUID array.`);
  }

  value.forEach((item, index) => assertUuid(item, `${label}[${index}]`));
}
