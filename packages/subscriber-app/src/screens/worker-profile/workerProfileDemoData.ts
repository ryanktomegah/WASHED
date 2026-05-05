export interface WorkerProfileDemo {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly neighborhood: string;
  readonly distanceFromHome: string;
  readonly tenureMonths: number;
  readonly visitCount: number;
  readonly since: {
    readonly en: string;
    readonly fr: string;
  };
  readonly regularHouseholds: number;
  readonly languages: {
    readonly en: string;
    readonly fr: string;
  };
  readonly totalVisits: number;
  readonly cancellationsByWorker: number;
  readonly onTimeRateThisMonth: number;
}

export const SUBSCRIBER_WORKER_PROFILE_DEMO: WorkerProfileDemo = {
  id: 'akouvi',
  name: 'Akouvi K.',
  initials: 'AK',
  neighborhood: 'Tokoin',
  distanceFromHome: '800 m',
  tenureMonths: 8,
  visitCount: 32,
  since: { en: 'September 2025', fr: 'septembre 2025' },
  regularHouseholds: 14,
  languages: { en: 'French and Ewe', fr: 'français et éwé' },
  totalVisits: 238,
  cancellationsByWorker: 0,
  onTimeRateThisMonth: 100,
};
