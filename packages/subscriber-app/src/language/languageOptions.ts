import type { MessageKey, WashedLocale } from '@washed/i18n';

export const SUBSCRIBER_LANGUAGE_STORAGE_KEY = 'washed.locale';

export const SUBSCRIBER_LANGUAGE_OPTIONS = ['fr', 'en'] as const satisfies readonly WashedLocale[];

export function hasStoredSubscriberLanguagePreference(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = window.localStorage.getItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
  return SUBSCRIBER_LANGUAGE_OPTIONS.includes(stored as WashedLocale);
}

export function languageOptionLabelKey(locale: WashedLocale): MessageKey {
  return locale === 'en' ? 'subscriber.language.option.en' : 'subscriber.language.option.fr';
}

export function languageOptionBodyKey(locale: WashedLocale): MessageKey {
  return locale === 'en'
    ? 'subscriber.language.option.en.body'
    : 'subscriber.language.option.fr.body';
}
