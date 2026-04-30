import type { NotificationMessageRecord } from './repository.js';
import { createPushDeliveryProvider } from './push-delivery-provider.js';
import { applyNotificationRetryPolicy } from './notification-retry-policy.js';

export interface LocalNotificationDeliveryInput {
  readonly deliveredAt: Date;
  readonly env?: NodeJS.ProcessEnv;
  readonly message: NotificationMessageRecord;
  readonly pushTokens?: readonly string[];
}

export function deliverNotificationMessageLocally(
  input: LocalNotificationDeliveryInput,
): Promise<NotificationMessageRecord> {
  const attemptCount = input.message.attemptCount + 1;

  if (shouldSuppressForQuietHours(input.message, input.deliveredAt)) {
    return Promise.resolve({
      ...input.message,
      attemptCount,
      failureReason: 'quiet_hours',
      lastAttemptAt: input.deliveredAt,
      provider: 'local',
      providerReference: null,
      sentAt: null,
      status: 'suppressed_quiet_hours',
    });
  }

  if (input.message.channel === 'push') {
    const deliveryInput = {
      deliveredAt: input.deliveredAt,
      message: input.message,
      ...(input.pushTokens === undefined ? {} : { pushTokens: input.pushTokens }),
    };

    return createPushDeliveryProvider(input.env)
      .deliver(deliveryInput)
      .catch((error: unknown) => ({
        failureReason: `provider_exception:${error instanceof Error ? error.message : 'unknown'}`,
        provider: input.message.provider ?? 'push',
        providerReference: null,
        sentAt: null,
        status: 'failed' as const,
      }))
      .then((result) =>
        applyNotificationRetryPolicy(
          {
            ...input.message,
            attemptCount,
            failureReason: result.failureReason,
            lastAttemptAt: input.deliveredAt,
            provider: result.provider,
            providerReference: result.providerReference,
            sentAt: result.sentAt,
            status: result.status,
          },
          input.deliveredAt,
        ),
      );
  }

  return Promise.resolve({
    ...input.message,
    attemptCount,
    failureReason: null,
    lastAttemptAt: input.deliveredAt,
    provider: 'local',
    providerReference: `local_${input.message.messageId}`,
    sentAt: input.deliveredAt,
    status: 'sent',
  });
}

function shouldSuppressForQuietHours(
  message: NotificationMessageRecord,
  deliveredAt: Date,
): boolean {
  if (message.channel === 'in_app' || message.recipientRole === 'operator') {
    return false;
  }

  const hourInTogo = deliveredAt.getUTCHours();
  return hourInTogo < 8 || hourInTogo >= 20;
}
