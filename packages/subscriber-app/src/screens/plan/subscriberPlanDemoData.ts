// X-19 Forfait demo data — locked to design/05-subscriber/subscriber.html
// :642-783 (active) and :1224-1345 (upgrade / pause confirmations / paused).
// Aggregates mirror the SUBSCRIBER_HUB_DEMO + SUBSCRIBER_HISTORY_DEMO so
// crossing surfaces (hub → plan → history) show the same person/numbers.

export type PlanTier = 'T1' | 'T2';

export interface ActivePlanDemo {
  readonly tier: PlanTier;
  readonly tierLabel: string; // « Une visite », « Deux visites »
  readonly amountXof: number;
  readonly nextChargeDate: string; // « 1 juin »
  readonly accountGoodUntil: string; // « 31 mai »
  readonly nextVisit: {
    readonly weekday: string;
    readonly date: string; // « 5 mai »
    readonly time: string; // « 9 h 00 »
    readonly workerName: string;
    readonly workerInitials: string;
  };
}

export interface UpgradeDemo {
  readonly currentAmountXof: number;
  readonly newAmountXof: number;
  readonly savingsXof: number; // « 500 XOF »
  readonly effectiveDate: string; // « 1 juin »
  readonly remainingThisMonth: number; // 1
  readonly workerFirstName: string;
}

export interface PausedPlanDemo {
  readonly pauseStartDate: string; // « 14 mai »
  readonly daysIntoPause: number; // 22
  readonly maxDays: number; // 90
  readonly autoCloseDate: string; // « 14 août »
  readonly workerFirstName: string;
  readonly workerName: string;
  readonly workerInitials: string;
  readonly tenureMonths: number;
}

export const SUBSCRIBER_PLAN_DEMO: {
  readonly active: ActivePlanDemo;
  readonly upgrade: UpgradeDemo;
  readonly paused: PausedPlanDemo;
} = {
  active: {
    tier: 'T1',
    tierLabel: 'Une visite',
    amountXof: 2_500,
    nextChargeDate: '1 juin',
    accountGoodUntil: '31 mai',
    nextVisit: {
      weekday: 'Mardi',
      date: '5 mai',
      time: '9 h 00',
      workerName: 'Akouvi K.',
      workerInitials: 'AK',
    },
  },
  upgrade: {
    currentAmountXof: 2_500,
    newAmountXof: 4_500,
    savingsXof: 500,
    effectiveDate: '1 juin',
    remainingThisMonth: 1,
    workerFirstName: 'Akouvi',
  },
  paused: {
    pauseStartDate: '14 mai',
    daysIntoPause: 22,
    maxDays: 90,
    autoCloseDate: '14 août',
    workerFirstName: 'Akouvi',
    workerName: 'Akouvi K.',
    workerInitials: 'AK',
    tenureMonths: 8,
  },
};
