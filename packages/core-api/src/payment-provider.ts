import type { Money } from '@washed/shared';

import type { MockPaymentOutcome, WorkerPayoutType } from './repository.js';

export type PaymentProviderKind = 'mobile_money_http' | 'mock';

export interface PaymentChargeInput {
  readonly amount: Money;
  readonly chargedAt: Date;
  readonly idempotencyKey: string;
  readonly mockOutcome: MockPaymentOutcome;
  readonly operatorUserId: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface PaymentChargeResult {
  readonly provider: PaymentProviderKind;
  readonly providerReference: string;
  readonly status: MockPaymentOutcome;
}

export interface PaymentRefundInput {
  readonly amount: Money;
  readonly issuedAt: Date;
  readonly operatorUserId: string;
  readonly paymentAttemptId: string;
  readonly paymentProvider: string;
  readonly paymentProviderReference: string;
  readonly reason: string;
  readonly subscriptionId: string;
  readonly traceId: string;
}

export interface PaymentRefundResult {
  readonly provider: PaymentProviderKind | 'manual';
  readonly providerReference: string | null;
  readonly status: 'issued';
}

export interface WorkerPayoutProviderInput {
  readonly amount: Money;
  readonly operatorUserId: string;
  readonly paidAt: Date;
  readonly payoutType: WorkerPayoutType;
  readonly periodMonth: string;
  readonly providerReference?: string;
  readonly traceId: string;
  readonly workerId: string;
}

export interface WorkerPayoutProviderResult {
  readonly failureReason: null;
  readonly provider: 'manual' | 'mobile_money_http';
  readonly providerReference: string | null;
  readonly status: 'paid';
}

export interface PaymentProvider {
  chargeSubscription(input: PaymentChargeInput): Promise<PaymentChargeResult>;
  payoutWorker(input: WorkerPayoutProviderInput): Promise<WorkerPayoutProviderResult>;
  refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult>;
}

type FetchLike = typeof fetch;

const MOBILE_MONEY_REQUIRED_KEYS = [
  'MOBILE_MONEY_API_KEY',
  'MOBILE_MONEY_ENDPOINT',
  'MOBILE_MONEY_MERCHANT_ID',
] as const;
const MOBILE_MONEY_REFUND_REQUIRED_KEYS = [
  'MOBILE_MONEY_API_KEY',
  'MOBILE_MONEY_MERCHANT_ID',
  'MOBILE_MONEY_REFUND_ENDPOINT',
] as const;
const MOBILE_MONEY_PAYOUT_REQUIRED_KEYS = [
  'MOBILE_MONEY_API_KEY',
  'MOBILE_MONEY_MERCHANT_ID',
  'MOBILE_MONEY_PAYOUT_ENDPOINT',
] as const;

export function createPaymentProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: FetchLike = fetch,
): PaymentProvider {
  const provider = readPaymentProvider(env['PAYMENT_PROVIDER']);

  if (provider === 'mock') {
    return new MockPaymentProvider();
  }

  return new MobileMoneyHttpPaymentProvider(env, fetchFn);
}

class MockPaymentProvider implements PaymentProvider {
  public async chargeSubscription(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    return {
      provider: 'mock',
      providerReference: `mock_${input.idempotencyKey}`,
      status: input.mockOutcome,
    };
  }

  public async refundPayment(): Promise<PaymentRefundResult> {
    return {
      provider: 'manual',
      providerReference: null,
      status: 'issued',
    };
  }

  public async payoutWorker(input: WorkerPayoutProviderInput): Promise<WorkerPayoutProviderResult> {
    return {
      failureReason: null,
      provider: 'manual',
      providerReference: input.providerReference ?? null,
      status: 'paid',
    };
  }
}

class MobileMoneyHttpPaymentProvider implements PaymentProvider {
  public constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly fetchFn: FetchLike,
  ) {}

  public async chargeSubscription(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    const missingKeys = missingRequiredKeys(this.env, MOBILE_MONEY_REQUIRED_KEYS);

    if (missingKeys.length > 0) {
      throwDisabledProvider(
        'mobile_money_http',
        'charge',
        `missing_credentials:${missingKeys.join(',')}`,
      );
    }

    if (this.env['PAYMENT_REAL_CHARGE_ENABLED'] !== 'true') {
      throwDisabledProvider('mobile_money_http', 'charge', 'real_charge_disabled');
    }

    const response = await this.fetchFn(requireEnv(this.env, 'MOBILE_MONEY_ENDPOINT'), {
      body: JSON.stringify({
        amountMinor: input.amount.amountMinor.toString(),
        currencyCode: input.amount.currencyCode,
        idempotencyKey: input.idempotencyKey,
        merchantId: requireEnv(this.env, 'MOBILE_MONEY_MERCHANT_ID'),
        subscriptionId: input.subscriptionId,
        traceId: input.traceId,
      }),
      headers: {
        authorization: `Bearer ${requireEnv(this.env, 'MOBILE_MONEY_API_KEY')}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    const body = (await response.json()) as {
      providerReference?: unknown;
      status?: unknown;
    };

    if (
      !response.ok ||
      !isPaymentStatus(body.status) ||
      typeof body.providerReference !== 'string'
    ) {
      throw new Error(`Mobile money charge failed with status ${response.status}.`);
    }

    return {
      provider: 'mobile_money_http',
      providerReference: body.providerReference,
      status: body.status,
    };
  }

  public async refundPayment(input: PaymentRefundInput): Promise<PaymentRefundResult> {
    const missingKeys = missingRequiredKeys(this.env, MOBILE_MONEY_REFUND_REQUIRED_KEYS);

    if (missingKeys.length > 0) {
      throwDisabledProvider(
        'mobile_money_http',
        'refund',
        `missing_credentials:${missingKeys.join(',')}`,
      );
    }

    if (this.env['PAYMENT_REAL_REFUND_ENABLED'] !== 'true') {
      throwDisabledProvider('mobile_money_http', 'refund', 'real_refund_disabled');
    }

    const response = await this.fetchFn(requireEnv(this.env, 'MOBILE_MONEY_REFUND_ENDPOINT'), {
      body: JSON.stringify({
        amountMinor: input.amount.amountMinor.toString(),
        currencyCode: input.amount.currencyCode,
        merchantId: requireEnv(this.env, 'MOBILE_MONEY_MERCHANT_ID'),
        originalProviderReference: input.paymentProviderReference,
        paymentAttemptId: input.paymentAttemptId,
        reason: input.reason,
        subscriptionId: input.subscriptionId,
        traceId: input.traceId,
      }),
      headers: {
        authorization: `Bearer ${requireEnv(this.env, 'MOBILE_MONEY_API_KEY')}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    const body = (await response.json()) as {
      providerReference?: unknown;
      status?: unknown;
    };

    if (!response.ok || body.status !== 'issued' || typeof body.providerReference !== 'string') {
      throw new Error(`Mobile money refund failed with status ${response.status}.`);
    }

    return {
      provider: 'mobile_money_http',
      providerReference: body.providerReference,
      status: 'issued',
    };
  }

  public async payoutWorker(input: WorkerPayoutProviderInput): Promise<WorkerPayoutProviderResult> {
    const missingKeys = missingRequiredKeys(this.env, MOBILE_MONEY_PAYOUT_REQUIRED_KEYS);

    if (missingKeys.length > 0) {
      throwDisabledProvider(
        'mobile_money_http',
        'payout',
        `missing_credentials:${missingKeys.join(',')}`,
      );
    }

    if (this.env['PAYMENT_REAL_PAYOUT_ENABLED'] !== 'true') {
      throwDisabledProvider('mobile_money_http', 'payout', 'real_payout_disabled');
    }

    const response = await this.fetchFn(requireEnv(this.env, 'MOBILE_MONEY_PAYOUT_ENDPOINT'), {
      body: JSON.stringify({
        amountMinor: input.amount.amountMinor.toString(),
        currencyCode: input.amount.currencyCode,
        idempotencyKey: `${input.workerId}:${input.periodMonth}:${input.payoutType}:${input.traceId}`,
        merchantId: requireEnv(this.env, 'MOBILE_MONEY_MERCHANT_ID'),
        operatorUserId: input.operatorUserId,
        paidAt: input.paidAt.toISOString(),
        payoutType: input.payoutType,
        periodMonth: input.periodMonth,
        traceId: input.traceId,
        workerId: input.workerId,
      }),
      headers: {
        authorization: `Bearer ${requireEnv(this.env, 'MOBILE_MONEY_API_KEY')}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });
    const body = (await response.json()) as {
      providerReference?: unknown;
      status?: unknown;
    };

    if (!response.ok || body.status !== 'paid' || typeof body.providerReference !== 'string') {
      throw new Error(`Mobile money payout failed with status ${response.status}.`);
    }

    return {
      failureReason: null,
      provider: 'mobile_money_http',
      providerReference: body.providerReference,
      status: 'paid',
    };
  }
}

function readPaymentProvider(value: string | undefined): PaymentProviderKind {
  if (value === undefined || value === 'mock') {
    return 'mock';
  }

  if (value === 'mobile_money_http') {
    return 'mobile_money_http';
  }

  throw new Error(`Unsupported payment provider setting: ${value}.`);
}

function isPaymentStatus(value: unknown): value is MockPaymentOutcome {
  return value === 'failed' || value === 'succeeded';
}

function missingRequiredKeys(env: NodeJS.ProcessEnv, keys: readonly string[]): readonly string[] {
  return keys.filter((key) => env[key] === undefined || env[key] === '');
}

function throwDisabledProvider(
  provider: PaymentProviderKind,
  capability: 'charge' | 'payout' | 'refund',
  reason: string,
): never {
  throw new Error(`Payment provider ${provider} is not ${capability}-capable: ${reason}.`);
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}
