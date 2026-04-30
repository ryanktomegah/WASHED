import { describe, expect, it, vi } from 'vitest';

import { startNotificationDeliveryWorker } from './notification-worker.js';
import type { NotificationMessageRecord } from './repository.js';

describe('startNotificationDeliveryWorker', () => {
  it('stays disabled unless explicitly enabled', () => {
    const worker = startNotificationDeliveryWorker({
      env: {},
      repository: {
        deliverDueNotificationMessages: vi.fn(),
      },
    });

    expect(worker).toBeNull();
  });

  it('runs immediately and schedules interval delivery when enabled', async () => {
    const setIntervalFn = vi.fn((handler: () => void, intervalMs: number) => {
      expect(intervalMs).toBe(5_000);
      return { unref: vi.fn(), handler } as unknown as NodeJS.Timeout;
    });
    const deliverDueNotificationMessages = vi.fn(async () => [
      { messageId: 'notification-1' } as NotificationMessageRecord,
    ]);
    const worker = startNotificationDeliveryWorker({
      env: {
        NOTIFICATION_DELIVERY_WORKER_ENABLED: 'true',
        NOTIFICATION_DELIVERY_WORKER_INTERVAL_MS: '5000',
        NOTIFICATION_DELIVERY_WORKER_LIMIT: '3',
      },
      now: () => new Date('2026-05-01T10:05:00.000Z'),
      repository: { deliverDueNotificationMessages },
      setIntervalFn,
    });

    expect(worker).not.toBeNull();
    await vi.waitFor(() => expect(deliverDueNotificationMessages).toHaveBeenCalledTimes(1));
    expect(deliverDueNotificationMessages).toHaveBeenCalledWith({
      countryCode: 'TG',
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      limit: 3,
    });
    worker?.stop();
  });

  it('skips overlapping runs', async () => {
    let resolveDelivery: ((value: readonly NotificationMessageRecord[]) => void) | undefined;
    const deliverDueNotificationMessages = vi.fn(
      () =>
        new Promise<readonly NotificationMessageRecord[]>((resolve) => {
          resolveDelivery = resolve;
        }),
    );
    const worker = startNotificationDeliveryWorker({
      env: {
        NOTIFICATION_DELIVERY_WORKER_ENABLED: 'true',
      },
      repository: { deliverDueNotificationMessages },
      setIntervalFn: vi.fn(() => ({ unref: vi.fn() }) as unknown as NodeJS.Timeout),
    });

    await vi.waitFor(() => expect(deliverDueNotificationMessages).toHaveBeenCalledTimes(1));
    const skipped = await worker?.runOnce();
    resolveDelivery?.([]);

    expect(skipped).toEqual({
      deliveredCount: 0,
      skippedReason: 'already_running',
    });
  });
});
