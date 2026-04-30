import type { CountryCode } from '@washed/shared';

import type { CoreRepository } from './repository.js';

export interface NotificationDeliveryWorkerResult {
  readonly deliveredCount: number;
  readonly skippedReason: 'already_running' | null;
}

export interface NotificationDeliveryWorker {
  runOnce(): Promise<NotificationDeliveryWorkerResult>;
  start(): void;
  stop(): void;
}

export interface StartNotificationDeliveryWorkerInput {
  readonly env?: NodeJS.ProcessEnv;
  readonly now?: () => Date;
  readonly repository: Pick<CoreRepository, 'deliverDueNotificationMessages'>;
  readonly setIntervalFn?: typeof setInterval;
}

export function startNotificationDeliveryWorker(
  input: StartNotificationDeliveryWorkerInput,
): NotificationDeliveryWorker | null {
  const env = input.env ?? process.env;

  if (env['NOTIFICATION_DELIVERY_WORKER_ENABLED'] !== 'true') {
    return null;
  }

  const worker = new IntervalNotificationDeliveryWorker({
    countryCode: readCountryCode(env['NOTIFICATION_DELIVERY_COUNTRY_CODE'] ?? 'TG'),
    intervalMs: readPositiveInteger(env['NOTIFICATION_DELIVERY_WORKER_INTERVAL_MS'], 30_000),
    limit: readPositiveInteger(env['NOTIFICATION_DELIVERY_WORKER_LIMIT'], 25),
    now: input.now ?? (() => new Date()),
    repository: input.repository,
    setIntervalFn: input.setIntervalFn ?? setInterval,
  });
  worker.start();
  return worker;
}

class IntervalNotificationDeliveryWorker implements NotificationDeliveryWorker {
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly input: {
      readonly countryCode: CountryCode;
      readonly intervalMs: number;
      readonly limit: number;
      readonly now: () => Date;
      readonly repository: Pick<CoreRepository, 'deliverDueNotificationMessages'>;
      readonly setIntervalFn: typeof setInterval;
    },
  ) {}

  public start(): void {
    if (this.timer !== null) {
      return;
    }

    this.timer = this.input.setIntervalFn(() => {
      void this.runOnce();
    }, this.input.intervalMs);
    this.timer.unref();
    void this.runOnce();
  }

  public stop(): void {
    if (this.timer === null) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  public async runOnce(): Promise<NotificationDeliveryWorkerResult> {
    if (this.running) {
      return {
        deliveredCount: 0,
        skippedReason: 'already_running',
      };
    }

    this.running = true;

    try {
      const delivered = await this.input.repository.deliverDueNotificationMessages({
        countryCode: this.input.countryCode,
        deliveredAt: this.input.now(),
        limit: this.input.limit,
      });

      return {
        deliveredCount: delivered.length,
        skippedReason: null,
      };
    } finally {
      this.running = false;
    }
  }
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readCountryCode(value: string): CountryCode {
  if (value !== 'TG') {
    throw new Error(`Unsupported notification delivery worker country code: ${value}.`);
  }

  return value;
}
