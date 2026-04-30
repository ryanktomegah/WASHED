import type { CurrencyCode } from '../money/currency.js';

export type CountryCode = 'BJ' | 'CI' | 'GH' | 'NG' | 'SN' | 'TG';
export type LocaleCode = 'en' | 'fr' | 'ee' | 'tw' | 'yo';

export interface RequestContext {
  readonly countryCode: CountryCode;
  readonly currencyCode: CurrencyCode;
  readonly locale: LocaleCode;
  readonly traceId: string;
}

const COUNTRY_DEFAULTS = {
  BJ: { currencyCode: 'XOF', locale: 'fr' },
  CI: { currencyCode: 'XOF', locale: 'fr' },
  GH: { currencyCode: 'GHS', locale: 'en' },
  NG: { currencyCode: 'NGN', locale: 'en' },
  SN: { currencyCode: 'XOF', locale: 'fr' },
  TG: { currencyCode: 'XOF', locale: 'fr' },
} as const satisfies Record<CountryCode, Pick<RequestContext, 'currencyCode' | 'locale'>>;

export function createRequestContext(input: {
  readonly countryCode: CountryCode;
  readonly locale?: LocaleCode;
  readonly traceId: string;
}): RequestContext {
  const defaults = COUNTRY_DEFAULTS[input.countryCode];

  return {
    countryCode: input.countryCode,
    currencyCode: defaults.currencyCode,
    locale: input.locale ?? defaults.locale,
    traceId: input.traceId,
  };
}
