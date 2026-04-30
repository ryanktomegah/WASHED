import type { CountryCode } from '@washed/shared';

import type { CoreRepository } from './repository.js';

export interface PaymentReconciliationWorkerResult {
  readonly issueCount: number;
  readonly reconciliationRunId: string | null;
  readonly skippedReason: 'already_running' | null;
  readonly status: 'clean' | 'issues_found' | null;
}

export interface PaymentReconciliationWorker {
  runOnce(): Promise<PaymentReconciliationWorkerResult>;
  start(): void;
  stop(): void;
}

export interface StartPaymentReconciliationWorkerInput {
  readonly env?: NodeJS.ProcessEnv;
  readonly now?: () => Date;
  readonly repository: Pick<CoreRepository, 'runPaymentReconciliation'>;
  readonly setIntervalFn?: typeof setInterval;
}

export function startPaymentReconciliationWorker(
  input: StartPaymentReconciliationWorkerInput,
): PaymentReconciliationWorker | null {
  const env = input.env ?? process.env;

  if (env['PAYMENT_RECONCILIATION_WORKER_ENABLED'] !== 'true') {
    return null;
  }

  const provider = readOptionalProvider(env['PAYMENT_RECONCILIATION_PROVIDER']);
  const worker = new IntervalPaymentReconciliationWorker({
    countryCode: readCountryCode(env['PAYMENT_RECONCILIATION_COUNTRY_CODE'] ?? 'TG'),
    intervalMs: readPositiveInteger(env['PAYMENT_RECONCILIATION_WORKER_INTERVAL_MS'], 3_600_000),
    now: input.now ?? (() => new Date()),
    operatorUserId:
      env['PAYMENT_RECONCILIATION_OPERATOR_USER_ID'] ?? '11111111-1111-4111-8111-111111111111',
    repository: input.repository,
    setIntervalFn: input.setIntervalFn ?? setInterval,
    ...(provider === undefined ? {} : { provider }),
  });
  worker.start();
  return worker;
}

class IntervalPaymentReconciliationWorker implements PaymentReconciliationWorker {
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly input: {
      readonly countryCode: CountryCode;
      readonly intervalMs: number;
      readonly now: () => Date;
      readonly operatorUserId: string;
      readonly provider?: string;
      readonly repository: Pick<CoreRepository, 'runPaymentReconciliation'>;
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

  public async runOnce(): Promise<PaymentReconciliationWorkerResult> {
    if (this.running) {
      return {
        issueCount: 0,
        reconciliationRunId: null,
        skippedReason: 'already_running',
        status: null,
      };
    }

    this.running = true;

    try {
      const run = await this.input.repository.runPaymentReconciliation({
        checkedAt: this.input.now(),
        countryCode: this.input.countryCode,
        operatorUserId: this.input.operatorUserId,
        traceId: `payment_reconciliation_worker_${this.input.now().toISOString()}`,
        ...(this.input.provider === undefined ? {} : { provider: this.input.provider }),
      });

      return {
        issueCount: run.issues.length,
        reconciliationRunId: run.reconciliationRunId,
        skippedReason: null,
        status: run.status,
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
    throw new Error(`Unsupported payment reconciliation worker country code: ${value}.`);
  }

  return value;
}

function readOptionalProvider(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}
