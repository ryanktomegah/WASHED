import type { Money } from '@washed/shared';

export interface MoneyDto {
  readonly amountMinor: string;
  readonly currencyCode: string;
}

export function toMoneyDto(value: Money): MoneyDto {
  return {
    amountMinor: value.amountMinor.toString(),
    currencyCode: value.currencyCode,
  };
}

export function toIsoString(value: Date): string {
  return value.toISOString();
}
