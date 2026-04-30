import { type CountryCode, type Money, money } from '@washed/shared';

export type SubscriptionTierCode = 'T1' | 'T2';

export interface SubscriptionTier {
  readonly code: SubscriptionTierCode;
  readonly countryCode: CountryCode;
  readonly monthlyPrice: Money;
  readonly nameKey: string;
  readonly visitsPerCycle: 1 | 2;
}

export const LOME_V1_TIERS = {
  T1: {
    code: 'T1',
    countryCode: 'TG',
    monthlyPrice: money(2500, 'XOF'),
    nameKey: 'pricing.tiers.t1',
    visitsPerCycle: 1,
  },
  T2: {
    code: 'T2',
    countryCode: 'TG',
    monthlyPrice: money(4500, 'XOF'),
    nameKey: 'pricing.tiers.t2',
    visitsPerCycle: 2,
  },
} as const satisfies Record<SubscriptionTierCode, SubscriptionTier>;

export function getLomeV1Tier(tierCode: SubscriptionTierCode): SubscriptionTier {
  return LOME_V1_TIERS[tierCode];
}

export function revenuePerVisit(tier: SubscriptionTier): Money {
  return money(
    tier.monthlyPrice.amountMinor / BigInt(tier.visitsPerCycle),
    tier.monthlyPrice.currencyCode,
  );
}

export function listLomeV1Tiers(): readonly SubscriptionTier[] {
  return [LOME_V1_TIERS.T1, LOME_V1_TIERS.T2];
}
