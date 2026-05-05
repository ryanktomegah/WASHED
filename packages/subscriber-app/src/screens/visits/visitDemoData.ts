export interface SubscriberVisitDemo {
  readonly workerName: string;
  readonly workerInitials: string;
  readonly neighborhood: string;
  readonly visitDateIso: string;
  readonly arrivalTime24h: string;
  readonly estimatedDurationMinutes: number;
  readonly distance: string;
  readonly etaMinutes: number;
  readonly updateCadenceSeconds: number;
  readonly arrivedAt24h: string;
  readonly beforePhotoTime24h: string;
  readonly afterPhotoTime24h: string;
  readonly completedAt24h: string;
  readonly completedDurationMinutes: number;
  readonly completedWashDurationMinutes: number;
  readonly counter: number;
  readonly counterSinceIso: string;
  readonly tenureMonths: number;
}

export const SUBSCRIBER_VISIT_DEMO: SubscriberVisitDemo = {
  workerName: 'Akouvi K.',
  workerInitials: 'AK',
  neighborhood: 'Tokoin',
  visitDateIso: '2026-05-05',
  arrivalTime24h: '09:00',
  estimatedDurationMinutes: 90,
  distance: '800 m',
  etaMinutes: 8,
  updateCadenceSeconds: 30,
  arrivedAt24h: '09:02',
  beforePhotoTime24h: '09:01',
  afterPhotoTime24h: '10:04',
  completedAt24h: '10:07',
  completedDurationMinutes: 66,
  completedWashDurationMinutes: 62,
  counter: 33,
  counterSinceIso: '2025-09-01',
  tenureMonths: 8,
};

export const RESCHEDULE_OPTIONS = [
  {
    id: 'thu-07',
    dateIso: '2026-05-07',
    time24h: '09:00',
    sublineKey: 'subscriber.visit.reschedule.option.worker_available',
  },
  {
    id: 'sat-09',
    dateIso: '2026-05-09',
    time24h: '10:30',
    sublineKey: 'subscriber.visit.reschedule.option.same_zone',
  },
  {
    id: 'tue-12',
    dateIso: '2026-05-12',
    time24h: '09:00',
    sublineKey: 'subscriber.visit.reschedule.option.usual',
  },
] as const;

export const ISSUE_OPTIONS = [
  { id: 'damaged', labelKey: 'subscriber.visit.issue.option.damaged' },
  { id: 'poor-wash', labelKey: 'subscriber.visit.issue.option.poor_wash' },
  { id: 'no-show', labelKey: 'subscriber.visit.issue.option.no_show' },
  { id: 'behavior', labelKey: 'subscriber.visit.issue.option.behavior' },
  { id: 'other', labelKey: 'subscriber.visit.issue.option.other' },
] as const;
