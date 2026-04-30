import type { NotificationMessageRecord } from './repository.js';

const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 4 * 60 * 60_000] as const;

export function applyNotificationRetryPolicy(
  message: NotificationMessageRecord,
  deliveredAt: Date,
): NotificationMessageRecord {
  if (message.status !== 'failed' || !isRetryableFailure(message.failureReason)) {
    return message;
  }

  if (message.attemptCount >= RETRY_DELAYS_MS.length) {
    return message;
  }

  const delayMs = RETRY_DELAYS_MS[message.attemptCount - 1] ?? RETRY_DELAYS_MS[0];

  return {
    ...message,
    availableAt: new Date(deliveredAt.getTime() + delayMs),
    status: 'pending',
  };
}

export function isRetryableFailure(failureReason: string | null): boolean {
  if (failureReason === null) {
    return false;
  }

  return (
    failureReason === 'missing_push_token' ||
    failureReason.startsWith('apns_send_failed:') ||
    failureReason.startsWith('fcm_send_failed:') ||
    failureReason.startsWith('provider_exception:')
  );
}
