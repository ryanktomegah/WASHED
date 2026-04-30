import { describe, expect, it } from 'vitest';

import { getLomeV1Tier, listLomeV1Tiers, revenuePerVisit } from './pricing.js';

describe('Lome v1 pricing', () => {
  it('contains only the approved launch tiers', () => {
    expect(listLomeV1Tiers().map((tier) => tier.code)).toEqual(['T1', 'T2']);
  });

  it('prices T1 at 2,500 XOF for 1 visit', () => {
    expect(getLomeV1Tier('T1')).toMatchObject({
      code: 'T1',
      countryCode: 'TG',
      visitsPerCycle: 1,
    });
    expect(getLomeV1Tier('T1').monthlyPrice.amountMinor).toBe(2500n);
  });

  it('prices T2 at 4,500 XOF for 2 visits', () => {
    expect(getLomeV1Tier('T2')).toMatchObject({
      code: 'T2',
      countryCode: 'TG',
      visitsPerCycle: 2,
    });
    expect(getLomeV1Tier('T2').monthlyPrice.amountMinor).toBe(4500n);
  });

  it('keeps per-visit revenue above the worker visit bonus', () => {
    expect(revenuePerVisit(getLomeV1Tier('T1')).amountMinor).toBe(2500n);
    expect(revenuePerVisit(getLomeV1Tier('T2')).amountMinor).toBe(2250n);
  });
});
