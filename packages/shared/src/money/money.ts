import type { CurrencyCode } from './currency.js';
import { getCurrencyDefinition } from './currency.js';

export interface Money {
  readonly amountMinor: bigint;
  readonly currencyCode: CurrencyCode;
}

export function money(amountMinor: bigint | number, currencyCode: CurrencyCode): Money {
  const normalized = normalizeAmountMinor(amountMinor);
  getCurrencyDefinition(currencyCode);

  return {
    amountMinor: normalized,
    currencyCode,
  };
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor + right.amountMinor, left.currencyCode);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  return money(left.amountMinor - right.amountMinor, left.currencyCode);
}

export function negateMoney(value: Money): Money {
  return money(-value.amountMinor, value.currencyCode);
}

export function compareMoney(left: Money, right: Money): -1 | 0 | 1 {
  assertSameCurrency(left, right);

  if (left.amountMinor < right.amountMinor) {
    return -1;
  }

  if (left.amountMinor > right.amountMinor) {
    return 1;
  }

  return 0;
}

export function assertSameCurrency(left: Money, right: Money): void {
  if (left.currencyCode !== right.currencyCode) {
    throw new Error(`Currency mismatch: ${left.currencyCode} !== ${right.currencyCode}.`);
  }
}

export function formatMoney(value: Money, locale: string): string {
  const currency = getCurrencyDefinition(value.currencyCode);
  const divisor = 10n ** BigInt(currency.decimals);
  const whole = value.amountMinor / divisor;
  const fraction = value.amountMinor % divisor;
  const asNumber =
    currency.decimals === 0 ? Number(whole) : Number(whole) + Number(fraction) / Number(divisor);

  return new Intl.NumberFormat(locale, {
    currency: value.currencyCode,
    maximumFractionDigits: currency.decimals,
    minimumFractionDigits: currency.decimals,
    style: 'currency',
  }).format(asNumber);
}

function normalizeAmountMinor(amountMinor: bigint | number): bigint {
  if (typeof amountMinor === 'bigint') {
    return amountMinor;
  }

  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error('Money amount must be a safe integer in minor units.');
  }

  return BigInt(amountMinor);
}
