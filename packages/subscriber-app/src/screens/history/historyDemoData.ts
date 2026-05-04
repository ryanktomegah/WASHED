// X-16 Visit History demo data — locked to the visual contract at
// design/05-subscriber/subscriber.html:546-571. Aggregates and entry
// list match the design hi-fi exactly.

export type VisitStatus = 'clean' | 'issue';

export interface PastVisitEntry {
  readonly id: string;
  readonly dateLabel: string;
  readonly detailDateLabel: string;
  readonly arrivalTime: string;
  readonly beforePhotoTime: string;
  readonly afterPhotoTime: string;
  readonly completedTime: string;
  readonly duration: string;
  readonly paymentAmountXof: number;
  readonly status: VisitStatus;
  readonly mostRecent: boolean;
}

export interface HistoryAggregates {
  readonly counter: number;
  readonly totalPaidXof: number;
  readonly tenureMonths: number;
  readonly workerFirstName: string;
}

export interface SubscriberHistoryDemo {
  readonly aggregates: HistoryAggregates;
  readonly recentVisits: readonly PastVisitEntry[];
}

export const SUBSCRIBER_HISTORY_DEMO: SubscriberHistoryDemo = {
  aggregates: {
    counter: 32,
    totalPaidXof: 80_000,
    tenureMonths: 8,
    workerFirstName: 'Akouvi',
  },
  recentVisits: [
    {
      id: 'visit-2026-04-28',
      dateLabel: '28 avr',
      detailDateLabel: '28 avril',
      arrivalTime: '9 h 02',
      beforePhotoTime: '9 h 03',
      afterPhotoTime: '10 h 04',
      completedTime: '10 h 07',
      duration: '1 h 06',
      paymentAmountXof: 0,
      status: 'clean',
      mostRecent: true,
    },
    {
      id: 'visit-2026-04-21',
      dateLabel: '21 avr',
      detailDateLabel: '21 avril',
      arrivalTime: '9 h 00',
      beforePhotoTime: '9 h 02',
      afterPhotoTime: '10 h 10',
      completedTime: '10 h 12',
      duration: '1 h 12',
      paymentAmountXof: 0,
      status: 'clean',
      mostRecent: false,
    },
    {
      id: 'visit-2026-04-14',
      dateLabel: '14 avr',
      detailDateLabel: '14 avril',
      arrivalTime: '9 h 04',
      beforePhotoTime: '9 h 05',
      afterPhotoTime: '10 h 00',
      completedTime: '10 h 02',
      duration: '58 min',
      paymentAmountXof: 0,
      status: 'clean',
      mostRecent: false,
    },
    {
      id: 'visit-2026-04-07',
      dateLabel: '7 avr',
      detailDateLabel: '7 avril',
      arrivalTime: '9 h 00',
      beforePhotoTime: '9 h 01',
      afterPhotoTime: '10 h 19',
      completedTime: '10 h 22',
      duration: '1 h 22',
      paymentAmountXof: 0,
      status: 'clean',
      mostRecent: false,
    },
  ],
};
