import frMessages from './fr.json' with { type: 'json' };
import enMessages from './en.json' with { type: 'json' };

export type WashedLocale = 'en' | 'fr';

export const defaultLocale: WashedLocale = 'fr';
export const supportedLocales = ['fr', 'en'] as const satisfies readonly WashedLocale[];

export type MessageKey = keyof typeof frMessages;

const fr: Record<MessageKey, string> = frMessages;
const en: Partial<Record<MessageKey, string>> = enMessages as Partial<Record<MessageKey, string>>;

let activeLocale: WashedLocale = defaultLocale;
const localeSubscribers = new Set<() => void>();

export function getActiveLocale(): WashedLocale {
  return activeLocale;
}

export function setActiveLocale(locale: WashedLocale): void {
  if (activeLocale === locale) return;
  activeLocale = locale;
  for (const subscriber of localeSubscribers) {
    subscriber();
  }
}

export function subscribeLocale(listener: () => void): () => void {
  localeSubscribers.add(listener);
  return () => {
    localeSubscribers.delete(listener);
  };
}

export function normalizeLocale(locale: string | undefined): WashedLocale {
  if (locale?.toLowerCase().startsWith('en') === true) {
    return 'en';
  }

  return 'fr';
}

export function translate(key: MessageKey): string;
export function translate(key: MessageKey, values: Record<string, string | number>): string;
export function translate(
  key: MessageKey,
  locale: WashedLocale,
  values?: Record<string, string | number>,
): string;
export function translate(
  key: MessageKey,
  localeOrValues?: WashedLocale | Record<string, string | number>,
  values?: Record<string, string | number>,
): string;
export function translate(
  key: MessageKey,
  localeOrValues: WashedLocale | Record<string, string | number> = activeLocale,
  maybeValues: Record<string, string | number> = {},
): string {
  const locale = typeof localeOrValues === 'string' ? localeOrValues : activeLocale;
  const values = typeof localeOrValues === 'string' ? maybeValues : localeOrValues;
  const template = locale === 'en' ? (en[key] ?? fr[key]) : fr[key];

  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match, valueKey: string) =>
    values[valueKey] === undefined ? match : String(values[valueKey]),
  );
}

export function hasMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(fr, key);
}

const xofFormats: Record<WashedLocale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }),
  fr: new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }),
};

export function formatXof(
  amountMinor: bigint | number,
  locale: WashedLocale = activeLocale,
): string {
  const amount = typeof amountMinor === 'bigint' ? Number(amountMinor) : amountMinor;
  const formatted = xofFormats[locale].format(amount).replace(/\s/g, ' ');
  return `${formatted} XOF`;
}

export function formatVisitDate(value: Date | string, locale: WashedLocale = activeLocale): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-TG' : 'en-TG', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}
