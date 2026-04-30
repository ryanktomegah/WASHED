import { describe, expect, it } from 'vitest';

import { createPaymentProvider } from './payment-provider.js';

const paymentInput = {
  amount: { amountMinor: 2500n, currencyCode: 'XOF' },
  chargedAt: new Date('2026-05-01T08:00:00.000Z'),
  idempotencyKey: 'billing-2026-05',
  mockOutcome: 'succeeded',
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  subscriptionId: '33333333-3333-4333-8333-333333333333',
  traceId: 'trace_payment',
} as const;

const refundInput = {
  amount: { amountMinor: 2500n, currencyCode: 'XOF' },
  issuedAt: new Date('2026-05-02T08:00:00.000Z'),
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  paymentAttemptId: '99999999-9999-4999-8999-999999999999',
  paymentProvider: 'mobile_money_http',
  paymentProviderReference: 'mobile-money-charge-123',
  reason: 'subscriber_goodwill',
  subscriptionId: '33333333-3333-4333-8333-333333333333',
  traceId: 'trace_payment_refund',
} as const;

const payoutInput = {
  amount: { amountMinor: 20000n, currencyCode: 'XOF' },
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  paidAt: new Date('2026-05-31T18:00:00.000Z'),
  payoutType: 'monthly_settlement',
  periodMonth: '2026-05',
  providerReference: 'manual-test-1',
  traceId: 'trace_worker_payout',
  workerId: '22222222-2222-4222-8222-222222222222',
} as const;

describe('createPaymentProvider', () => {
  it('uses the local mock provider by default', async () => {
    const provider = createPaymentProvider({});
    const result = await provider.chargeSubscription(paymentInput);
    const payout = await provider.payoutWorker(payoutInput);
    const refund = await provider.refundPayment(refundInput);

    expect(result).toEqual({
      provider: 'mock',
      providerReference: 'mock_billing-2026-05',
      status: 'succeeded',
    });
    expect(refund).toEqual({
      provider: 'manual',
      providerReference: null,
      status: 'issued',
    });
    expect(payout).toEqual({
      failureReason: null,
      provider: 'manual',
      providerReference: 'manual-test-1',
      status: 'paid',
    });
  });

  it('fails closed when mobile money is selected without credentials', async () => {
    const provider = createPaymentProvider({ PAYMENT_PROVIDER: 'mobile_money_http' });

    await expect(provider.chargeSubscription(paymentInput)).rejects.toThrow(
      'Payment provider mobile_money_http is not charge-capable: missing_credentials:MOBILE_MONEY_API_KEY,MOBILE_MONEY_ENDPOINT,MOBILE_MONEY_MERCHANT_ID.',
    );
  });

  it('keeps real mobile money charges disabled even when credentials are present', async () => {
    const provider = createPaymentProvider({
      MOBILE_MONEY_API_KEY: 'payment-secret',
      MOBILE_MONEY_ENDPOINT: 'https://payments.example.test/charges',
      MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
      PAYMENT_PROVIDER: 'mobile_money_http',
    });

    await expect(provider.chargeSubscription(paymentInput)).rejects.toThrow(
      'Payment provider mobile_money_http is not charge-capable: real_charge_disabled.',
    );
  });

  it('keeps real mobile money refunds disabled even when credentials are present', async () => {
    const provider = createPaymentProvider({
      MOBILE_MONEY_API_KEY: 'payment-secret',
      MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
      MOBILE_MONEY_REFUND_ENDPOINT: 'https://payments.example.test/refunds',
      PAYMENT_PROVIDER: 'mobile_money_http',
    });

    await expect(provider.refundPayment(refundInput)).rejects.toThrow(
      'Payment provider mobile_money_http is not refund-capable: real_refund_disabled.',
    );
  });

  it('keeps real mobile money payouts disabled even when credentials are present', async () => {
    const provider = createPaymentProvider({
      MOBILE_MONEY_API_KEY: 'payment-secret',
      MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
      MOBILE_MONEY_PAYOUT_ENDPOINT: 'https://payments.example.test/payouts',
      PAYMENT_PROVIDER: 'mobile_money_http',
    });

    await expect(provider.payoutWorker(payoutInput)).rejects.toThrow(
      'Payment provider mobile_money_http is not payout-capable: real_payout_disabled.',
    );
  });

  it('sends through HTTP mobile money only when real charging is explicitly enabled', async () => {
    const requests: Array<{
      readonly body: string;
      readonly headers: HeadersInit;
      readonly url: string;
    }> = [];
    const fetchStub = async (url: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
      requests.push({
        body: String(init?.body ?? ''),
        headers: init?.headers ?? {},
        url: String(url),
      });
      return Response.json({
        providerReference: 'mobile-money-charge-123',
        status: 'succeeded',
      });
    };

    const result = await createPaymentProvider(
      {
        MOBILE_MONEY_API_KEY: 'payment-secret',
        MOBILE_MONEY_ENDPOINT: 'https://payments.example.test/charges',
        MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
        PAYMENT_PROVIDER: 'mobile_money_http',
        PAYMENT_REAL_CHARGE_ENABLED: 'true',
      },
      fetchStub,
    ).chargeSubscription(paymentInput);

    expect(result).toEqual({
      provider: 'mobile_money_http',
      providerReference: 'mobile-money-charge-123',
      status: 'succeeded',
    });
    expect(requests[0]?.url).toBe('https://payments.example.test/charges');
    expect(requests[0]?.headers).toMatchObject({
      authorization: 'Bearer payment-secret',
      'content-type': 'application/json',
    });
    expect(JSON.parse(requests[0]?.body ?? '{}')).toMatchObject({
      amountMinor: '2500',
      currencyCode: 'XOF',
      idempotencyKey: 'billing-2026-05',
      merchantId: 'washed-lome',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_payment',
    });
  });

  it('sends refunds through HTTP mobile money only when real refunds are explicitly enabled', async () => {
    const requests: Array<{
      readonly body: string;
      readonly headers: HeadersInit;
      readonly url: string;
    }> = [];
    const fetchStub = async (url: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
      requests.push({
        body: String(init?.body ?? ''),
        headers: init?.headers ?? {},
        url: String(url),
      });
      return Response.json({
        providerReference: 'mobile-money-refund-123',
        status: 'issued',
      });
    };

    const result = await createPaymentProvider(
      {
        MOBILE_MONEY_API_KEY: 'payment-secret',
        MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
        MOBILE_MONEY_REFUND_ENDPOINT: 'https://payments.example.test/refunds',
        PAYMENT_PROVIDER: 'mobile_money_http',
        PAYMENT_REAL_REFUND_ENABLED: 'true',
      },
      fetchStub,
    ).refundPayment(refundInput);

    expect(result).toEqual({
      provider: 'mobile_money_http',
      providerReference: 'mobile-money-refund-123',
      status: 'issued',
    });
    expect(requests[0]?.url).toBe('https://payments.example.test/refunds');
    expect(requests[0]?.headers).toMatchObject({
      authorization: 'Bearer payment-secret',
      'content-type': 'application/json',
    });
    expect(JSON.parse(requests[0]?.body ?? '{}')).toMatchObject({
      amountMinor: '2500',
      currencyCode: 'XOF',
      merchantId: 'washed-lome',
      originalProviderReference: 'mobile-money-charge-123',
      paymentAttemptId: '99999999-9999-4999-8999-999999999999',
      reason: 'subscriber_goodwill',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_payment_refund',
    });
  });

  it('sends payouts through HTTP mobile money only when real payouts are explicitly enabled', async () => {
    const requests: Array<{
      readonly body: string;
      readonly headers: HeadersInit;
      readonly url: string;
    }> = [];
    const fetchStub = async (url: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
      requests.push({
        body: String(init?.body ?? ''),
        headers: init?.headers ?? {},
        url: String(url),
      });
      return Response.json({
        providerReference: 'mobile-money-payout-123',
        status: 'paid',
      });
    };

    const result = await createPaymentProvider(
      {
        MOBILE_MONEY_API_KEY: 'payment-secret',
        MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
        MOBILE_MONEY_PAYOUT_ENDPOINT: 'https://payments.example.test/payouts',
        PAYMENT_PROVIDER: 'mobile_money_http',
        PAYMENT_REAL_PAYOUT_ENABLED: 'true',
      },
      fetchStub,
    ).payoutWorker(payoutInput);

    expect(result).toEqual({
      failureReason: null,
      provider: 'mobile_money_http',
      providerReference: 'mobile-money-payout-123',
      status: 'paid',
    });
    expect(requests[0]?.url).toBe('https://payments.example.test/payouts');
    expect(requests[0]?.headers).toMatchObject({
      authorization: 'Bearer payment-secret',
      'content-type': 'application/json',
    });
    expect(JSON.parse(requests[0]?.body ?? '{}')).toMatchObject({
      amountMinor: '20000',
      currencyCode: 'XOF',
      idempotencyKey:
        '22222222-2222-4222-8222-222222222222:2026-05:monthly_settlement:trace_worker_payout',
      merchantId: 'washed-lome',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      paidAt: '2026-05-31T18:00:00.000Z',
      payoutType: 'monthly_settlement',
      periodMonth: '2026-05',
      traceId: 'trace_worker_payout',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
  });
});
