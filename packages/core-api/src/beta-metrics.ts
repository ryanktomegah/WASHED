import type { CountryCode } from '@washed/shared';

import type { AuditEventRecord, CoreRepository, WorkerPayoutRecord } from './repository.js';

export interface GetBetaMetricsInput {
  readonly countryCode: CountryCode;
}

export interface BetaMetrics {
  readonly countryCode: CountryCode;
  readonly disputes: {
    readonly escalated: number;
    readonly open: number;
    readonly resolvedForSubscriber: number;
    readonly resolvedForWorker: number;
    readonly total: number;
  };
  readonly generatedAt: Date;
  readonly nps: number | null;
  readonly payments: {
    readonly failed: number;
    readonly successRate: number | null;
    readonly succeeded: number;
    readonly total: number;
  };
  readonly refunds: {
    readonly total: number;
    readonly totalAmountMinor: string;
  };
  readonly subscribers: {
    readonly active: number;
    readonly cancelled: number;
    readonly paymentOverdue: number;
    readonly pendingMatch: number;
    readonly total: number;
  };
  readonly supportLoad: {
    readonly openWorkerIssues: number;
    readonly resolvedWorkerIssues: number;
    readonly totalWorkerIssues: number;
  };
  readonly visits: {
    readonly averageDurationMinutes: number | null;
    readonly cancelled: number;
    readonly completed: number;
    readonly completionRate: number | null;
    readonly disputed: number;
    readonly noShow: number;
    readonly skipped: number;
    readonly totalClosed: number;
  };
  readonly workerEarnings: {
    readonly failedPayouts: number;
    readonly paidPayouts: number;
    readonly totalPaidMinor: string;
  };
  readonly workerSatisfaction: number | null;
}

const METRICS_LIMIT = 10_000;

export async function buildBetaMetrics(
  repository: CoreRepository,
  input: GetBetaMetricsInput,
): Promise<BetaMetrics> {
  const [subscribers, auditEvents, paymentAttempts, disputes, workerIssues, workerPayouts] =
    await Promise.all([
      repository.listSubscriberSupportMatches({
        countryCode: input.countryCode,
        limit: METRICS_LIMIT,
      }),
      repository.listAuditEvents({
        countryCode: input.countryCode,
        limit: METRICS_LIMIT,
      }),
      repository.listPaymentAttempts({
        countryCode: input.countryCode,
        limit: METRICS_LIMIT,
      }),
      repository.listOperatorDisputes({ countryCode: input.countryCode, limit: METRICS_LIMIT }),
      repository.listWorkerIssues({ countryCode: input.countryCode, limit: METRICS_LIMIT }),
      repository.listWorkerPayouts({ countryCode: input.countryCode, limit: METRICS_LIMIT }),
    ]);

  const completed = countEvents(auditEvents, 'VisitCompleted');
  const skipped = countEvents(auditEvents, 'VisitSkipped');
  const disputed = countEvents(auditEvents, 'VisitDisputed');
  const noShow = auditEvents.filter(
    (event) =>
      event.eventType === 'OperatorVisitStatusUpdated' && event.payload['status'] === 'no_show',
  ).length;
  const cancelled = auditEvents.filter(
    (event) =>
      event.eventType === 'OperatorVisitStatusUpdated' && event.payload['status'] === 'cancelled',
  ).length;
  const totalClosed = completed + skipped + noShow + cancelled;
  const succeeded = paymentAttempts.filter((attempt) => attempt.status === 'succeeded').length;
  const failed = paymentAttempts.filter((attempt) => attempt.status === 'failed').length;
  const refunds = auditEvents.filter((event) => event.eventType === 'PaymentRefundIssued');
  const paidPayouts = workerPayouts.filter((payout) => payout.status === 'paid');
  const failedPayouts = workerPayouts.filter((payout) => payout.status === 'failed');

  return {
    countryCode: input.countryCode,
    disputes: {
      escalated: disputes.filter((dispute) => dispute.status === 'escalated').length,
      open: disputes.filter((dispute) => dispute.status === 'open').length,
      resolvedForSubscriber: disputes.filter(
        (dispute) => dispute.status === 'resolved_for_subscriber',
      ).length,
      resolvedForWorker: disputes.filter((dispute) => dispute.status === 'resolved_for_worker')
        .length,
      total: disputes.length,
    },
    generatedAt: new Date(),
    nps: null,
    payments: {
      failed,
      successRate: rate(succeeded, succeeded + failed),
      succeeded,
      total: paymentAttempts.length,
    },
    refunds: {
      total: refunds.length,
      totalAmountMinor: sumRefundAmountMinor(refunds).toString(),
    },
    subscribers: {
      active: subscribers.filter((subscriber) => subscriber.status === 'active').length,
      cancelled: subscribers.filter((subscriber) => subscriber.status === 'cancelled').length,
      paymentOverdue: subscribers.filter((subscriber) => subscriber.status === 'payment_overdue')
        .length,
      pendingMatch: subscribers.filter((subscriber) => subscriber.status === 'pending_match')
        .length,
      total: subscribers.length,
    },
    supportLoad: {
      openWorkerIssues: workerIssues.filter((issue) => issue.status === 'open').length,
      resolvedWorkerIssues: workerIssues.filter((issue) => issue.status === 'resolved').length,
      totalWorkerIssues: workerIssues.length,
    },
    visits: {
      averageDurationMinutes: averageDurationMinutes(auditEvents),
      cancelled,
      completed,
      completionRate: rate(completed, totalClosed),
      disputed,
      noShow,
      skipped,
      totalClosed,
    },
    workerEarnings: {
      failedPayouts: failedPayouts.length,
      paidPayouts: paidPayouts.length,
      totalPaidMinor: sumPayoutAmountMinor(paidPayouts).toString(),
    },
    workerSatisfaction: null,
  };
}

function countEvents(events: readonly AuditEventRecord[], eventType: string): number {
  return events.filter((event) => event.eventType === eventType).length;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Number((numerator / denominator).toFixed(4));
}

function sumRefundAmountMinor(events: readonly AuditEventRecord[]): bigint {
  return events.reduce((sum, event) => {
    const amount = event.payload['amountMinor'];
    return typeof amount === 'string' ? sum + BigInt(amount) : sum;
  }, 0n);
}

function sumPayoutAmountMinor(payouts: readonly WorkerPayoutRecord[]): bigint {
  return payouts.reduce((sum, payout) => sum + payout.amount.amountMinor, 0n);
}

function averageDurationMinutes(events: readonly AuditEventRecord[]): number | null {
  const durations = events
    .filter((event) => event.eventType === 'VisitCompleted')
    .map((event) => event.payload['durationMinutes'])
    .filter((value): value is number => typeof value === 'number');

  if (durations.length === 0) {
    return null;
  }

  return Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1));
}
