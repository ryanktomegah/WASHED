import type { MessageKey } from '@washed/i18n';

export interface SubscriberHubVisit {
  readonly status: string;
  readonly time: string;
  readonly date: string;
}

export interface SubscriberHubWorker {
  readonly name: string;
  readonly detail: string;
}

export interface SubscriberHubPlan {
  readonly labelKey: MessageKey;
  readonly renewsOnKey: MessageKey;
  readonly progressPct: number;
}

export interface SubscriberHubDemo {
  readonly subscriberFirstName: string;
  readonly visit: SubscriberHubVisit | null;
  readonly worker: SubscriberHubWorker | null;
  readonly plan: SubscriberHubPlan;
}

export interface SubscriberBookingDay {
  readonly id: string;
  readonly labelKey: MessageKey;
}

export interface SubscriberBookingTimeWindow {
  readonly id: string;
  readonly labelKey: MessageKey;
  readonly detailKey: MessageKey;
}

export const SUBSCRIBER_FIRST_VISIT_REQUEST_STORAGE_KEY = 'washed.subscriber.firstVisitRequested';

export const SUBSCRIBER_HUB_DEMO: SubscriberHubDemo = {
  subscriberFirstName: 'Mariam',
  visit: null,
  worker: null,
  plan: {
    labelKey: 'subscriber.dashboard.plan.ready_label',
    renewsOnKey: 'subscriber.dashboard.plan.first_visit_status',
    progressPct: 0,
  },
};

export const SUBSCRIBER_BOOKING_DAYS: readonly SubscriberBookingDay[] = [
  {
    id: 'monday',
    labelKey: 'subscriber.booking.day.monday',
  },
  {
    id: 'tuesday',
    labelKey: 'subscriber.booking.day.tuesday',
  },
  {
    id: 'wednesday',
    labelKey: 'subscriber.booking.day.wednesday',
  },
  {
    id: 'thursday',
    labelKey: 'subscriber.booking.day.thursday',
  },
  {
    id: 'friday',
    labelKey: 'subscriber.booking.day.friday',
  },
  {
    id: 'saturday',
    labelKey: 'subscriber.booking.day.saturday',
  },
  {
    id: 'sunday',
    labelKey: 'subscriber.booking.day.sunday',
  },
];

export const SUBSCRIBER_BOOKING_TIME_WINDOWS: readonly SubscriberBookingTimeWindow[] = [
  {
    id: 'morning',
    labelKey: 'subscriber.booking.time.morning.label',
    detailKey: 'subscriber.booking.time.morning.detail',
  },
  {
    id: 'afternoon',
    labelKey: 'subscriber.booking.time.afternoon.label',
    detailKey: 'subscriber.booking.time.afternoon.detail',
  },
];
