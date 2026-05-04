export interface WorkerProfileDemo {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly neighborhood: string;
  readonly distanceFromHome: string;
  readonly tenureMonths: number;
  readonly visitCount: number;
  readonly since: string;
  readonly regularHouseholds: number;
  readonly languages: string;
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
  since: 'septembre 2025',
  regularHouseholds: 14,
  languages: 'français et éwé',
  totalVisits: 238,
  cancellationsByWorker: 0,
  onTimeRateThisMonth: 100,
};
