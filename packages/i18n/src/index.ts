export type WashedLocale = 'en' | 'fr';

export const defaultLocale: WashedLocale = 'fr';
export const supportedLocales = ['fr', 'en'] as const satisfies readonly WashedLocale[];

export type MessageKey =
  | 'app.name'
  | 'common.cancel'
  | 'common.continue'
  | 'common.done'
  | 'common.retry'
  | 'errors.generic'
  | 'errors.offline'
  | 'subscriber.home.nextVisit'
  | 'subscriber.onboarding.start'
  | 'subscriber.subscription.price'
  | 'worker.route.today'
  | 'worker.safety.sos'
  | 'worker.sync.pendingActions'
  | 'operator.nav.liveOps'
  | 'operator.nav.matching'
  | 'operator.nav.payments';

export const messages = {
  en: {
    'app.name': 'Washed',
    'common.cancel': 'Cancel',
    'common.continue': 'Continue',
    'common.done': 'Done',
    'common.retry': 'Try again',
    'errors.generic': 'Something went wrong. Try again or contact support.',
    'errors.offline': 'You are offline. Your actions will sync when the network returns.',
    'operator.nav.liveOps': 'Live Ops',
    'operator.nav.matching': 'Matching',
    'operator.nav.payments': 'Payments',
    'subscriber.home.nextVisit': 'Next visit',
    'subscriber.onboarding.start': 'Start',
    'subscriber.subscription.price': 'Monthly price',
    'worker.route.today': "Today's route",
    'worker.safety.sos': 'SOS',
    'worker.sync.pendingActions': 'Actions waiting to sync',
  },
  fr: {
    'app.name': 'Washed',
    'common.cancel': 'Annuler',
    'common.continue': 'Continuer',
    'common.done': 'Terminé',
    'common.retry': 'Réessayer',
    'errors.generic': 'Une erreur est survenue. Réessayez ou contactez le support.',
    'errors.offline': 'Vous êtes hors ligne. Vos actions seront synchronisées au retour du réseau.',
    'operator.nav.liveOps': 'Opérations',
    'operator.nav.matching': 'Attribution',
    'operator.nav.payments': 'Paiements',
    'subscriber.home.nextVisit': 'Prochaine visite',
    'subscriber.onboarding.start': 'Commencer',
    'subscriber.subscription.price': 'Prix mensuel',
    'worker.route.today': "Route d'aujourd'hui",
    'worker.safety.sos': 'SOS',
    'worker.sync.pendingActions': 'Actions en attente de synchronisation',
  },
} as const satisfies Record<WashedLocale, Record<MessageKey, string>>;

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
  const template = messages[locale][key] ?? messages[defaultLocale][key] ?? key;

  return template.replace(/\{([A-Za-z0-9_]+)\}/gu, (match, valueKey: string) =>
    values[valueKey] === undefined ? match : String(values[valueKey]),
  );
}

export function formatXof(
  amountMinor: bigint | number,
  locale: WashedLocale = defaultLocale,
): string {
  const amount = typeof amountMinor === 'bigint' ? Number(amountMinor) : amountMinor;

  return new Intl.NumberFormat(locale === 'fr' ? 'fr-TG' : 'en-TG', {
    currency: 'XOF',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
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
