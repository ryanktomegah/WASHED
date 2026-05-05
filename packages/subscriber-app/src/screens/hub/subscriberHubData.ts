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
  readonly label: string;
  readonly renewsOn: string;
  readonly progressPct: number;
}

export interface SubscriberHubDemo {
  readonly subscriberFirstName: string;
  readonly visit: SubscriberHubVisit;
  readonly worker: SubscriberHubWorker;
  readonly plan: SubscriberHubPlan;
}

export const SUBSCRIBER_HUB_DEMO: SubscriberHubDemo = {
  subscriberFirstName: 'Mariam',
  visit: {
    status: 'confirmée',
    time: '9:00',
    date: 'mar 7 mai',
  },
  worker: {
    name: 'Akouvi K.',
    detail: 'votre laveuse · 8 mois',
  },
  plan: {
    label: 'forfait actif',
    renewsOn: '31 mai',
    progressPct: 64,
  },
};
