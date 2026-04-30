import { describe, expect, it } from 'vitest';

import { startPaymentReconciliationWorker } from './payment-reconciliation-worker.js';
import type { PaymentReconciliationRunRecord } from './repository.js';

const run = {
  checkedAt: new Date('2026-05-03T08:00:00.000Z'),
  countryCode: 'TG',
  events: [],
  issues: [],
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  provider: 'mobile_money_http',
  reconciliationRunId: '77777777-7777-4777-8777-777777777777',
  status: 'clean',
  totalCollected: { amountMinor: 2500n, currencyCode: 'XOF' },
  totalFailedAttempts: 0,
  totalRefunded: { amountMinor: 0n, currencyCode: 'XOF' },
  totalSucceededAttempts: 1,
} as const satisfies PaymentReconciliationRunRecord;

describe('startPaymentReconciliationWorker', () => {
  it('stays disabled by default', () => {
    const worker = startPaymentReconciliationWorker({
      env: {},
      repository: {
        async runPaymentReconciliation() {
          return run;
        },
      },
    });

    expect(worker).toBeNull();
  });

  it('runs reconciliation immediately and on an interval when enabled', async () => {
    const inputs: unknown[] = [];
    const intervals: Array<{ readonly intervalMs: number; readonly callback: () => void }> = [];
    const worker = startPaymentReconciliationWorker({
      env: {
        PAYMENT_RECONCILIATION_OPERATOR_USER_ID: '11111111-1111-4111-8111-111111111111',
        PAYMENT_RECONCILIATION_PROVIDER: 'mobile_money_http',
        PAYMENT_RECONCILIATION_WORKER_ENABLED: 'true',
        PAYMENT_RECONCILIATION_WORKER_INTERVAL_MS: '60000',
      },
      now: () => new Date('2026-05-03T08:00:00.000Z'),
      repository: {
        async runPaymentReconciliation(input) {
          inputs.push(input);
          return run;
        },
      },
      setIntervalFn: ((callback: () => void, intervalMs: number) => {
        intervals.push({ callback, intervalMs });
        return { unref() {} } as NodeJS.Timeout;
      }) as typeof setInterval,
    });

    await Promise.resolve();
    await worker?.runOnce();

    expect(worker).not.toBeNull();
    expect(intervals[0]?.intervalMs).toBe(60000);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toMatchObject({
      countryCode: 'TG',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      provider: 'mobile_money_http',
    });
  });

  it('skips overlapping runs', async () => {
    let releaseRun: (() => void) | undefined;
    const worker = startPaymentReconciliationWorker({
      env: { PAYMENT_RECONCILIATION_WORKER_ENABLED: 'true' },
      repository: {
        async runPaymentReconciliation() {
          await new Promise<void>((resolve) => {
            releaseRun = resolve;
          });
          return run;
        },
      },
      setIntervalFn: (() => ({ unref() {} }) as NodeJS.Timeout) as typeof setInterval,
    });

    const overlap = await worker?.runOnce();
    releaseRun?.();
    await Promise.resolve();

    expect(overlap).toEqual({
      issueCount: 0,
      reconciliationRunId: null,
      skippedReason: 'already_running',
      status: null,
    });
  });
});
