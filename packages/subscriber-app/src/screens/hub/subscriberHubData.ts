// X-10 Hub demo data — locked to the visual contract at
// design/05-subscriber/subscriber.html:333-371. Each field maps 1:1 to a
// copy-deck placeholder so the hub can swap to live API data in Sprint-2
// without touching the JSX.

export type GreetingTimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface NextVisitDemo {
  readonly weekday: string;
  readonly hour: number;
  readonly minute: number;
  readonly inDays: number;
  readonly inHours: number;
}

export interface HubWorkerDemo {
  readonly name: string;
  readonly initials: string;
  readonly neighborhood: string;
  readonly tenureMonths: number;
  readonly isReady: boolean;
}

export interface LastVisitDemo {
  readonly dateLabel: string;
  readonly streakCount: number;
}

export interface SubscriberHubDemo {
  readonly subscriberFirstName: string;
  readonly nextVisit: NextVisitDemo;
  readonly worker: HubWorkerDemo;
  readonly lastVisit: LastVisitDemo;
}

// Aligned with SUBSCRIBER_VISIT_DEMO in ../visits/visitDemoData.ts so the
// hub → X-11 transition reads as the same active visit.
export const SUBSCRIBER_HUB_DEMO: SubscriberHubDemo = {
  subscriberFirstName: 'Yawa',
  nextVisit: {
    weekday: 'Mardi',
    hour: 9,
    minute: 0,
    inDays: 2,
    inHours: 21,
  },
  worker: {
    name: 'Akouvi K.',
    initials: 'AK',
    neighborhood: 'Tokoin',
    tenureMonths: 8,
    isReady: true,
  },
  lastVisit: {
    dateLabel: '28 avril',
    streakCount: 32,
  },
};

export function greetingTimeOfDay(now: Date = new Date()): GreetingTimeOfDay {
  const hour = now.getHours();
  // Deck contracts: 5–12 morning, 12–18 afternoon, 18–24 evening.
  // Pre-5h falls into evening per the deck (no late-night greeting key).
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
