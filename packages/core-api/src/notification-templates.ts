import { randomUUID } from 'node:crypto';

import type { DomainEvent } from '@washed/shared';

import type { NotificationMessageRecord } from './repository.js';

type NotificationTemplatePlan = Omit<
  NotificationMessageRecord,
  | 'attemptCount'
  | 'createdAt'
  | 'failureReason'
  | 'lastAttemptAt'
  | 'messageId'
  | 'provider'
  | 'providerReference'
  | 'sentAt'
  | 'status'
>;

export function buildNotificationMessagesForEvent(
  event: DomainEvent,
): readonly NotificationMessageRecord[] {
  return notificationPlansForEvent(event).map((plan) => ({
    ...plan,
    attemptCount: 0,
    createdAt: event.occurredAt,
    failureReason: null,
    lastAttemptAt: null,
    messageId: randomUUID(),
    provider: null,
    providerReference: null,
    sentAt: null,
    status: 'pending',
  }));
}

function notificationPlansForEvent(event: DomainEvent): readonly NotificationTemplatePlan[] {
  if (event.eventType === 'SubscriberAssigned') {
    return [
      {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        availableAt: event.occurredAt,
        channel: 'push',
        countryCode: event.countryCode,
        eventId: event.eventId,
        payload: {
          generatedVisitIds: event.payload['generatedVisitIds'],
          status: event.payload['status'],
          subscriptionId: event.aggregateId,
          titleKey: 'notifications.subscriber.assignment_confirmed.title',
          bodyKey: 'notifications.subscriber.assignment_confirmed.body',
          workerId: event.payload['workerId'],
        },
        recipientRole: 'subscriber',
        recipientUserId: null,
        templateKey: 'subscriber.assignment.confirmed.v1',
      },
    ];
  }

  if (event.eventType === 'SubscriptionPaymentFailed') {
    return [
      {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        availableAt: event.occurredAt,
        channel: 'sms',
        countryCode: event.countryCode,
        eventId: event.eventId,
        payload: {
          amountMinor: event.payload['amountMinor'],
          currencyCode: event.payload['currencyCode'],
          paymentAttemptId: event.payload['paymentAttemptId'],
          subscriptionId: event.aggregateId,
          subscriptionStatus: event.payload['subscriptionStatus'],
        },
        recipientRole: 'subscriber',
        recipientUserId: null,
        templateKey: 'subscriber.payment.failed.v1',
      },
    ];
  }

  if (event.eventType === 'WorkerSwapRequested') {
    return [
      {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        availableAt: event.occurredAt,
        channel: 'in_app',
        countryCode: event.countryCode,
        eventId: event.eventId,
        payload: {
          currentWorkerId: event.payload['currentWorkerId'],
          reason: event.payload['reason'],
          requestId: event.aggregateId,
          subscriptionId: event.payload['subscriptionId'],
        },
        recipientRole: 'operator',
        recipientUserId: null,
        templateKey: 'operator.worker_swap.requested.v1',
      },
    ];
  }

  return [];
}
