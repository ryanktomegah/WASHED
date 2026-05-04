export interface SubscriberVisitDemo {
  readonly workerName: string;
  readonly workerInitials: string;
  readonly neighborhood: string;
  readonly visitDateLabel: string;
  readonly arrivalTime: string;
  readonly estimatedDuration: string;
  readonly distance: string;
  readonly eta: string;
  readonly updateCadence: string;
  readonly arrivedAt: string;
  readonly beforePhotoTime: string;
  readonly afterPhotoTime: string;
  readonly completedAt: string;
  readonly completedDuration: string;
  readonly counter: string;
  readonly counterSince: string;
  readonly tenureLabel: string;
}

export const SUBSCRIBER_VISIT_DEMO: SubscriberVisitDemo = {
  workerName: 'Akouvi K.',
  workerInitials: 'AK',
  neighborhood: 'Tokoin',
  visitDateLabel: 'Mardi 5 mai',
  arrivalTime: '9 h 00',
  estimatedDuration: '~1 h 30',
  distance: '800 m',
  eta: '8 min',
  updateCadence: '30 secondes',
  arrivedAt: '9 h 02',
  beforePhotoTime: '9 h 01',
  afterPhotoTime: '10 h 04',
  completedAt: '10 h 07',
  completedDuration: '1 h 06',
  counter: '33 visites',
  counterSince: 'septembre 2025',
  tenureLabel: '8e mois',
};

export const RESCHEDULE_OPTIONS = [
  {
    id: 'thu-07',
    label: 'Jeudi 7 mai',
    subline: '9 h 00 · Akouvi disponible',
  },
  {
    id: 'sat-09',
    label: 'Samedi 9 mai',
    subline: '10 h 30 · même créneau de zone',
  },
  {
    id: 'tue-12',
    label: 'Mardi 12 mai',
    subline: '9 h 00 · horaire habituel',
  },
] as const;

export const ISSUE_OPTIONS = [
  'Linge endommagé',
  'Linge mal lavé',
  "Akouvi n'est pas venue",
  'Comportement inapproprié',
  'Autre · décrire',
] as const;
