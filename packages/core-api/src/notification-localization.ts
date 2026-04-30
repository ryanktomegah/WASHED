type NotificationLocale = 'en' | 'fr';

const DEFAULT_LOCALE: NotificationLocale = 'fr';

const MESSAGES: Record<NotificationLocale, Record<string, string>> = {
  en: {
    'notifications.subscriber.assignment_confirmed.body':
      'Your Washed subscription is active. Your first visits have been scheduled.',
    'notifications.subscriber.assignment_confirmed.title': 'Worker assigned',
  },
  fr: {
    'notifications.subscriber.assignment_confirmed.body':
      'Votre abonnement Washed est actif. Vos premieres visites sont planifiees.',
    'notifications.subscriber.assignment_confirmed.title': 'Agent assigne',
  },
};

export function localizeNotificationText(key: string, locale: string | undefined): string {
  const selectedLocale = readNotificationLocale(locale);

  return MESSAGES[selectedLocale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
}

function readNotificationLocale(locale: string | undefined): NotificationLocale {
  if (locale === 'en' || locale?.startsWith('en-')) {
    return 'en';
  }

  return DEFAULT_LOCALE;
}
