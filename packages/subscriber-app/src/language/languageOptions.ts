import type { MessageKey, WashedLocale } from '@washed/i18n';

export const SUBSCRIBER_LANGUAGE_STORAGE_KEY = 'washed.locale';

export const SUBSCRIBER_LANGUAGE_OPTIONS = ['fr', 'en'] as const satisfies readonly WashedLocale[];

export function languageOptionLabelKey(locale: WashedLocale): MessageKey {
  return locale === 'en' ? 'subscriber.language.option.en' : 'subscriber.language.option.fr';
}

export function languageOptionBodyKey(locale: WashedLocale): MessageKey {
  return locale === 'en'
    ? 'subscriber.language.option.en.body'
    : 'subscriber.language.option.fr.body';
}
