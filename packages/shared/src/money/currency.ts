export type CurrencyCode = 'EUR' | 'GHS' | 'NGN' | 'USD' | 'XOF';

export interface CurrencyDefinition {
  readonly code: CurrencyCode;
  readonly decimals: 0 | 2;
  readonly name: string;
}

export const CURRENCIES = {
  EUR: { code: 'EUR', decimals: 2, name: 'Euro' },
  GHS: { code: 'GHS', decimals: 2, name: 'Ghanaian cedi' },
  NGN: { code: 'NGN', decimals: 2, name: 'Nigerian naira' },
  USD: { code: 'USD', decimals: 2, name: 'US dollar' },
  XOF: { code: 'XOF', decimals: 0, name: 'West African CFA franc' },
} as const satisfies Record<CurrencyCode, CurrencyDefinition>;

export function getCurrencyDefinition(currencyCode: CurrencyCode): CurrencyDefinition {
  return CURRENCIES[currencyCode];
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(CURRENCIES, value);
}
