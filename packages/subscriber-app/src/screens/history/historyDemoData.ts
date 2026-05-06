// X-16 Visit History demo data — locked to the visual contract at
// design/05-subscriber/subscriber.html:546-571. Aggregates and entry
// list match the design hi-fi exactly.

export type VisitStatus = 'clean' | 'issue';

export interface PastVisitEntry {
  readonly id: string;
  readonly dateIso: string;
  readonly arrivalTime24h: string;
  readonly beforePhotoTime24h: string;
  readonly afterPhotoTime24h: string;
  readonly completedTime24h: string;
  readonly durationMinutes: number;
  readonly paymentAmountXof: number;
  readonly status: VisitStatus;
  readonly mostRecent: boolean;
}

export interface HistoryAggregates {
  readonly coveredMonths: number;
  readonly counter: number;
  readonly tenureMonths: number;
  readonly workerFirstName: string;
}

export interface SubscriberHistoryDemo {
  readonly aggregates: HistoryAggregates;
  readonly recentVisits: readonly PastVisitEntry[];
}

export const SUBSCRIBER_HISTORY_DEMO: SubscriberHistoryDemo = {
  aggregates: {
    coveredMonths: 3,
    counter: 3,
    tenureMonths: 3,
    workerFirstName: 'Akouvi',
  },
  recentVisits: [
    {
      id: 'visit-2026-04-28',
      dateIso: '2026-04-28',
      arrivalTime24h: '09:02',
      beforePhotoTime24h: '09:03',
      afterPhotoTime24h: '10:04',
      completedTime24h: '10:07',
      durationMinutes: 66,
      paymentAmountXof: 0,
      status: 'clean',
      mostRecent: true,
    },
    {
      id: 'visit-2026-04-21',
      dateIso: '2026-04-21',
      arrivalTime24h: '09:00',
      beforePhotoTime24h: '09:02',
      afterPhotoTime24h: '10:10',
      completedTime24h: '10:12',
      durationMinutes: 72,
      paymentAmountXof: 0,
      status: 'clean',
      mostRecent: false,
    },
    {
      id: 'visit-2026-04-14',
      dateIso: '2026-04-14',
      arrivalTime24h: '09:04',
      beforePhotoTime24h: '09:05',
      afterPhotoTime24h: '10:00',
      completedTime24h: '10:02',
      durationMinutes: 58,
      paymentAmountXof: 0,
      status: 'clean',
      mostRecent: false,
    },
  ],
};
