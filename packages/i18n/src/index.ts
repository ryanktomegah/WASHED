import frMessages from './fr.json' with { type: 'json' };
import enMessages from './en.json' with { type: 'json' };

export type WashedLocale = 'en' | 'fr';

export const defaultLocale: WashedLocale = 'fr';
export const supportedLocales = ['fr', 'en'] as const satisfies readonly WashedLocale[];

export type MessageKey = keyof typeof frMessages;

const fr: Record<MessageKey, string> = frMessages;
const en: Partial<Record<MessageKey, string>> = enMessages as Partial<Record<MessageKey, string>>;

export function normalizeLocale(locale: string | undefined): WashedLocale {
  if (locale?.toLowerCase().startsWith('en') === true) {
    return 'en';
  }

  return 'fr';
}

export function translate(
  key: MessageKey,
  locale: WashedLocale = defaultLocale,
  values: Record<string, string | number> = {},
): string {
  const template = locale === 'en' ? en[key] ?? fr[key] : fr[key];

  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match, valueKey: string) =>
    values[valueKey] === undefined ? match : String(values[valueKey]),
  );
}

export function hasMessageKey(key: string): key is MessageKey {
  return Object.hasOwn(fr, key);
}

const xofFormat = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatXof(amountMinor: bigint | number): string {
  const amount = typeof amountMinor === 'bigint' ? Number(amountMinor) : amountMinor;
  return `${xofFormat.format(amount).replace(/\s/g, ' ')} XOF`;
}

export function formatVisitDate(
  value: Date | string,
  locale: WashedLocale = defaultLocale,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;

  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-TG' : 'en-TG', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}
