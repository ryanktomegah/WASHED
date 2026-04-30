import { describe, expect, it } from 'vitest';

import { applyNotificationRetryPolicy, isRetryableFailure } from './notification-retry-policy.js';
import type { NotificationMessageRecord } from './repository.js';

const failedMessage: NotificationMessageRecord = {
  aggregateId: '33333333-3333-4333-8333-333333333333',
  aggregateType: 'subscription',
  attemptCount: 1,
  availableAt: new Date('2026-05-01T10:00:00.000Z'),
  channel: 'push',
  countryCode: 'TG',
  createdAt: new Date('2026-05-01T10:00:00.000Z'),
  eventId: '88888888-8888-4888-8888-888888888888',
  failureReason: 'missing_push_token',
  lastAttemptAt: new Date('2026-05-01T10:05:00.000Z'),
  messageId: '77777777-7777-4777-8777-777777777777',
  payload: {},
  provider: 'fcm',
  providerReference: null,
  recipientRole: 'subscriber',
  recipientUserId: null,
  sentAt: null,
  status: 'failed',
  templateKey: 'subscriber.assignment.confirmed.v1',
};

describe('applyNotificationRetryPolicy', () => {
  it('keeps retryable failures pending with the next due time', () => {
    const message = applyNotificationRetryPolicy(
      failedMessage,
      new Date('2026-05-01T10:05:00.000Z'),
    );

    expect(message.status).toBe('pending');
    expect(message.availableAt).toEqual(new Date('2026-05-01T10:06:00.000Z'));
    expect(message.failureReason).toBe('missing_push_token');
  });

  it('leaves terminal failures failed', () => {
    const message = applyNotificationRetryPolicy(
      {
        ...failedMessage,
        failureReason: 'real_send_disabled',
      },
      new Date('2026-05-01T10:05:00.000Z'),
    );

    expect(message.status).toBe('failed');
    expect(message.availableAt).toEqual(new Date('2026-05-01T10:00:00.000Z'));
  });

  it('stops retrying after the last configured attempt', () => {
    const message = applyNotificationRetryPolicy(
      {
        ...failedMessage,
        attemptCount: 5,
        failureReason: 'fcm_send_failed:503',
      },
      new Date('2026-05-01T10:05:00.000Z'),
    );

    expect(message.status).toBe('failed');
  });
});

describe('isRetryableFailure', () => {
  it('classifies missing tokens and provider send failures as retryable', () => {
    expect(isRetryableFailure('missing_push_token')).toBe(true);
    expect(isRetryableFailure('apns_send_failed:500:{}')).toBe(true);
    expect(isRetryableFailure('fcm_send_failed:503')).toBe(true);
    expect(isRetryableFailure('provider_exception:timeout')).toBe(true);
    expect(isRetryableFailure('missing_credentials:FCM_PROJECT_ID')).toBe(false);
  });
});
