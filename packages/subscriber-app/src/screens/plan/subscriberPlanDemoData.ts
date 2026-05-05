// X-19 Forfait demo data — locked to design/05-subscriber/subscriber.html
// :642-783 (active) and :1224-1345 (upgrade / pause confirmations / paused).
// Aggregates mirror the SUBSCRIBER_HUB_DEMO + SUBSCRIBER_HISTORY_DEMO so
// crossing surfaces (hub → plan → history) show the same person/numbers.

export type PlanTier = 'T1' | 'T2';

export interface ActivePlanDemo {
  readonly tier: PlanTier;
  readonly amountXof: number;
  readonly nextChargeDateIso: string;
  readonly accountGoodUntilIso: string;
  readonly nextVisit: {
    readonly dateIso: string;
    readonly time24h: string;
    readonly workerName: string;
    readonly workerInitials: string;
  };
}

export interface UpgradeDemo {
  readonly currentAmountXof: number;
  readonly newAmountXof: number;
  readonly savingsXof: number;
  readonly effectiveDateIso: string;
  readonly remainingThisMonth: number;
  readonly workerFirstName: string;
}

export interface PausedPlanDemo {
  readonly pauseStartDateIso: string;
  readonly daysIntoPause: number;
  readonly maxDays: number;
  readonly autoCloseDateIso: string;
  readonly workerFirstName: string;
  readonly workerName: string;
  readonly workerInitials: string;
  readonly tenureMonths: number;
}

export interface PaymentReceiptDemo {
  readonly dateIso: string;
  readonly provider: string;
  readonly reference: string;
  readonly amountXof: number;
}

export interface PaymentMethodDemo {
  readonly provider: string;
  readonly phone: string;
  readonly isActive: boolean;
}

export interface PaymentDemo {
  readonly subscriberFirstName: string;
  readonly subscriberInitials: string;
  readonly historyMonths: number;
  readonly receipts: readonly PaymentReceiptDemo[];
  readonly methods: readonly PaymentMethodDemo[];
  readonly overdueAttempts: number;
}

export const SUBSCRIBER_PLAN_DEMO: {
  readonly active: ActivePlanDemo;
  readonly upgrade: UpgradeDemo;
  readonly paused: PausedPlanDemo;
  readonly payment: PaymentDemo;
} = {
  active: {
    tier: 'T1',
    amountXof: 2_500,
    nextChargeDateIso: '2026-06-01',
    accountGoodUntilIso: '2026-05-31',
    nextVisit: {
      dateIso: '2026-05-05',
      time24h: '09:00',
      workerName: 'Akouvi K.',
      workerInitials: 'AK',
    },
  },
  upgrade: {
    currentAmountXof: 2_500,
    newAmountXof: 4_500,
    savingsXof: 500,
    effectiveDateIso: '2026-06-01',
    remainingThisMonth: 1,
    workerFirstName: 'Akouvi',
  },
  paused: {
    pauseStartDateIso: '2026-05-14',
    daysIntoPause: 22,
    maxDays: 90,
    autoCloseDateIso: '2026-08-14',
    workerFirstName: 'Akouvi',
    workerName: 'Akouvi K.',
    workerInitials: 'AK',
    tenureMonths: 8,
  },
  payment: {
    subscriberFirstName: 'Yawa',
    subscriberInitials: 'YM',
    historyMonths: 8,
    receipts: [
      {
        dateIso: '2026-05-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78423190',
        amountXof: 2_500,
      },
      {
        dateIso: '2026-04-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78421042',
        amountXof: 2_500,
      },
      {
        dateIso: '2026-03-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78420993',
        amountXof: 2_500,
      },
      {
        dateIso: '2026-02-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78420122',
        amountXof: 2_500,
      },
      {
        dateIso: '2026-01-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78419881',
        amountXof: 2_500,
      },
      {
        dateIso: '2025-12-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78418640',
        amountXof: 2_500,
      },
      {
        dateIso: '2025-11-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78417309',
        amountXof: 2_500,
      },
      {
        dateIso: '2025-10-01',
        provider: 'Mixx by Yas',
        reference: 'MM-78416277',
        amountXof: 2_500,
      },
    ],
    methods: [
      { provider: 'Mixx by Yas', phone: '+228 90 12 34 56', isActive: true },
      { provider: 'Flooz', phone: '+228 99 87 65 43', isActive: false },
    ],
    overdueAttempts: 3,
  },
};
