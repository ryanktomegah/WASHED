// X-24 → X-28 Profil demo data — locked to design/05-subscriber/
// subscriber.html:797-914 and :1347-1375. Aggregates align with the hub
// + history demos so the same Yawa/Akouvi pair appears across surfaces.

export interface SubscriberProfileDemo {
  readonly fullName: string;
  readonly initials: string;
  readonly phoneDisplay: string;
  readonly memberSinceLabel: string;
  readonly addressNeighborhood: string;
  readonly addressStreet: string;
  readonly addressLandmark: string;
  readonly languageCode: 'FR' | 'EN';
  readonly workerFirstName: string;
  readonly visitsWithWorker: number;
  readonly nextVisit: {
    readonly weekday: string;
    readonly date: string;
  };
}

export const SUBSCRIBER_PROFILE_DEMO: SubscriberProfileDemo = {
  fullName: 'Yawa Mensah',
  initials: 'YM',
  phoneDisplay: '+228 90 12 34 56',
  memberSinceLabel: 'sept. 2025',
  addressNeighborhood: 'Tokoin Casablanca',
  addressStreet: 'rue 254, maison bleue',
  addressLandmark: 'portail vert · sonnette à droite',
  languageCode: 'FR',
  workerFirstName: 'Akouvi',
  visitsWithWorker: 32,
  nextVisit: {
    weekday: 'mardi',
    date: '5 mai',
  },
};

export interface NotificationToggleDemo {
  readonly id: 'sms_reminder' | 'push_route' | 'push_reveal' | 'email_recap';
  readonly defaultEnabled: boolean;
}

export const SUBSCRIBER_NOTIFICATION_DEFAULTS: readonly NotificationToggleDemo[] = [
  { id: 'sms_reminder', defaultEnabled: true },
  { id: 'push_route', defaultEnabled: true },
  { id: 'push_reveal', defaultEnabled: true },
  { id: 'email_recap', defaultEnabled: false },
];

// Same Lomé neighborhood list used at signup (X-04). Re-used here
// rather than imported from onboarding to keep profile concerns isolated.
export const LOME_NEIGHBORHOODS = [
  'Adidogomé',
  'Agoè',
  'Bè',
  'Bè-Klikamé',
  'Cacavéli',
  'Hédzranawoé',
  'Kégué',
  'Lomé II',
  'Nyékonakpoè',
  'Tokoin Casablanca',
  'Tokoin Forever',
  'Tokoin Solidarité',
] as const;

export type LomeNeighborhood = (typeof LOME_NEIGHBORHOODS)[number];
