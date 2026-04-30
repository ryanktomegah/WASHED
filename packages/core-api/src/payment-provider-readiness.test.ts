import { describe, expect, it } from 'vitest';

import { getPaymentProviderReadiness } from './payment-provider-readiness.js';

describe('getPaymentProviderReadiness', () => {
  it('defaults to the local mock provider without requiring external credentials', () => {
    expect(getPaymentProviderReadiness({})).toEqual({
      providers: [
        {
          charge: {
            canRun: true,
            configured: true,
            enabled: true,
            missingKeys: [],
            requiredKeys: [],
          },
          payout: {
            canRun: true,
            configured: true,
            enabled: true,
            missingKeys: [],
            requiredKeys: [],
          },
          provider: 'mock',
          refund: {
            canRun: true,
            configured: true,
            enabled: true,
            missingKeys: [],
            requiredKeys: [],
          },
        },
        {
          charge: {
            canRun: false,
            configured: false,
            enabled: false,
            missingKeys: [
              'MOBILE_MONEY_API_KEY',
              'MOBILE_MONEY_ENDPOINT',
              'MOBILE_MONEY_MERCHANT_ID',
            ],
            requiredKeys: [
              'MOBILE_MONEY_API_KEY',
              'MOBILE_MONEY_ENDPOINT',
              'MOBILE_MONEY_MERCHANT_ID',
            ],
          },
          payout: {
            canRun: false,
            configured: false,
            enabled: false,
            missingKeys: [
              'MOBILE_MONEY_API_KEY',
              'MOBILE_MONEY_MERCHANT_ID',
              'MOBILE_MONEY_PAYOUT_ENDPOINT',
            ],
            requiredKeys: [
              'MOBILE_MONEY_API_KEY',
              'MOBILE_MONEY_MERCHANT_ID',
              'MOBILE_MONEY_PAYOUT_ENDPOINT',
            ],
          },
          provider: 'mobile_money_http',
          refund: {
            canRun: false,
            configured: false,
            enabled: false,
            missingKeys: [
              'MOBILE_MONEY_API_KEY',
              'MOBILE_MONEY_MERCHANT_ID',
              'MOBILE_MONEY_REFUND_ENDPOINT',
            ],
            requiredKeys: [
              'MOBILE_MONEY_API_KEY',
              'MOBILE_MONEY_MERCHANT_ID',
              'MOBILE_MONEY_REFUND_ENDPOINT',
            ],
          },
        },
      ],
      selectedProvider: 'mock',
      selectedProviderCanCharge: true,
      selectedProviderCanPayout: true,
      selectedProviderCanRefund: true,
    });
  });

  it('reports configured mobile money charge, refund, and payout readiness without exposing secrets', () => {
    const readiness = getPaymentProviderReadiness({
      MOBILE_MONEY_API_KEY: 'payment-secret',
      MOBILE_MONEY_ENDPOINT: 'https://payments.example.test/charges',
      MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
      MOBILE_MONEY_PAYOUT_ENDPOINT: 'https://payments.example.test/payouts',
      MOBILE_MONEY_REFUND_ENDPOINT: 'https://payments.example.test/refunds',
      PAYMENT_PROVIDER: 'mobile_money_http',
      PAYMENT_REAL_CHARGE_ENABLED: 'true',
      PAYMENT_REAL_PAYOUT_ENABLED: 'true',
      PAYMENT_REAL_REFUND_ENABLED: 'true',
    });

    expect(readiness.selectedProvider).toBe('mobile_money_http');
    expect(readiness.selectedProviderCanCharge).toBe(true);
    expect(readiness.selectedProviderCanPayout).toBe(true);
    expect(readiness.selectedProviderCanRefund).toBe(true);
    expect(
      readiness.providers.find((provider) => provider.provider === 'mobile_money_http'),
    ).toMatchObject({
      charge: { configured: true, enabled: true, missingKeys: [] },
      payout: { configured: true, enabled: true, missingKeys: [] },
      refund: { configured: true, enabled: true, missingKeys: [] },
    });
    expect(JSON.stringify(readiness)).not.toContain('payment-secret');
  });

  it('keeps configured mobile money blocked until each capability is explicitly enabled', () => {
    const readiness = getPaymentProviderReadiness({
      MOBILE_MONEY_API_KEY: 'payment-secret',
      MOBILE_MONEY_ENDPOINT: 'https://payments.example.test/charges',
      MOBILE_MONEY_MERCHANT_ID: 'washed-lome',
      MOBILE_MONEY_PAYOUT_ENDPOINT: 'https://payments.example.test/payouts',
      MOBILE_MONEY_REFUND_ENDPOINT: 'https://payments.example.test/refunds',
      PAYMENT_PROVIDER: 'mobile_money_http',
    });

    expect(readiness.selectedProviderCanCharge).toBe(false);
    expect(readiness.selectedProviderCanPayout).toBe(false);
    expect(readiness.selectedProviderCanRefund).toBe(false);
    expect(
      readiness.providers.find((provider) => provider.provider === 'mobile_money_http'),
    ).toMatchObject({
      charge: { configured: true, enabled: false, canRun: false },
      payout: { configured: true, enabled: false, canRun: false },
      refund: { configured: true, enabled: false, canRun: false },
    });
  });
});
