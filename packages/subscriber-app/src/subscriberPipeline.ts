import type { AppRoute, SubscriberSheet, SupportIssueKind } from './appData.js';
import type { SubscriberState } from './subscriberState.js';

export type HomeIntent =
  | 'liveTracking'
  | 'nextVisitConfidence'
  | 'paymentRecovery'
  | 'serviceEnded';

export type SubscriberServiceStatus = 'active' | 'cancelled' | 'paymentAttention' | 'visitInMotion';

export type SubscriberMessageKind = 'maintenance' | 'operator' | 'payment' | 'visit';

export interface SubscriberMessage {
  readonly actionLabelEn: string;
  readonly actionLabelFr: string;
  readonly bodyEn: string;
  readonly bodyFr: string;
  readonly createdLabelEn: string;
  readonly createdLabelFr: string;
  readonly id: SubscriberMessageKind;
  readonly needsAttention: boolean;
  readonly target:
    | { readonly route: AppRoute }
    | { readonly sheet: SubscriberSheet; readonly issue?: SupportIssueKind };
  readonly titleEn: string;
  readonly titleFr: string;
}

export interface BillingLedgerEntry {
  readonly amountXof: number;
  readonly id: string;
  readonly method: string;
  readonly periodEn: string;
  readonly periodFr: string;
  readonly statusEn: string;
  readonly statusFr: string;
}

export interface BillingSummary {
  readonly balanceDueXof: number;
  readonly ledger: readonly BillingLedgerEntry[];
  readonly nextRetryLabelEn: string;
  readonly nextRetryLabelFr: string;
  readonly paymentMethodLabel: string;
  readonly retrySteps: readonly {
    readonly id: string;
    readonly isCurrent: boolean;
    readonly labelEn: string;
    readonly labelFr: string;
    readonly valueEn: string;
    readonly valueFr: string;
  }[];
}

export interface VisitPlanSummary {
  readonly nextVisits: readonly {
    readonly dateEn: string;
    readonly dateFr: string;
    readonly id: string;
    readonly isNext: boolean;
    readonly labelEn: string;
    readonly labelFr: string;
    readonly windowEn: string;
    readonly windowFr: string;
  }[];
  readonly readinessEn: string;
  readonly readinessFr: string;
}

export interface SubscriberPipeline {
  readonly billing: BillingSummary;
  readonly homeIntent: HomeIntent;
  readonly messages: readonly SubscriberMessage[];
  readonly primaryAction:
    | { readonly labelEn: string; readonly labelFr: string; readonly route: AppRoute }
    | { readonly labelEn: string; readonly labelFr: string; readonly sheet: SubscriberSheet };
  readonly serviceStatus: SubscriberServiceStatus;
  readonly visitPlan: VisitPlanSummary;
}

export function buildSubscriberPipeline(state: SubscriberState): SubscriberPipeline {
  const serviceStatus = getServiceStatus(state);

  return {
    billing: buildBillingSummary(state),
    homeIntent: getHomeIntent(state, serviceStatus),
    messages: buildMessages(state),
    primaryAction: getPrimaryAction(state, serviceStatus),
    serviceStatus,
    visitPlan: buildVisitPlan(state),
  };
}

function getServiceStatus(state: SubscriberState): SubscriberServiceStatus {
  if (state.subscription.status === 'cancelled') return 'cancelled';
  if (state.nextVisit.stage === 'enRoute' || state.nextVisit.stage === 'arrived') {
    return 'visitInMotion';
  }
  if (state.subscription.paymentStatus === 'overdue') return 'paymentAttention';

  return 'active';
}

function getHomeIntent(state: SubscriberState, serviceStatus: SubscriberServiceStatus): HomeIntent {
  if (serviceStatus === 'cancelled') return 'serviceEnded';
  if (serviceStatus === 'visitInMotion') return 'liveTracking';
  if (state.subscription.paymentStatus === 'overdue') return 'paymentRecovery';

  return 'nextVisitConfidence';
}

function getPrimaryAction(
  state: SubscriberState,
  serviceStatus: SubscriberServiceStatus,
): SubscriberPipeline['primaryAction'] {
  if (serviceStatus === 'cancelled') {
    return { labelEn: 'Contact support', labelFr: 'Contacter le support', route: 'support' };
  }

  if (state.nextVisit.stage === 'enRoute') {
    return { labelEn: 'Track visit', labelFr: 'Suivre la visite', route: 'visit' };
  }

  if (state.subscription.paymentStatus === 'overdue') {
    return {
      labelEn: 'Recover payment',
      labelFr: 'Régulariser le paiement',
      sheet: 'paymentRecovery',
    };
  }

  return { labelEn: 'View visit', labelFr: 'Voir la visite', route: 'visit' };
}

function buildVisitPlan(state: SubscriberState): VisitPlanSummary {
  const windowEn = state.nextVisit.window === '9-11' ? '9:00 - 11:00' : state.nextVisit.window;
  const windowFr = state.nextVisit.window === '9-11' ? '9h00 - 11h00' : state.nextVisit.window;

  return {
    nextVisits: [
      {
        dateEn: 'Tuesday, May 5',
        dateFr: 'mardi 5 mai',
        id: '2026-05-05',
        isNext: true,
        labelEn: 'Next',
        labelFr: 'Suivante',
        windowEn,
        windowFr,
      },
      {
        dateEn: 'Tuesday, May 19',
        dateFr: 'mardi 19 mai',
        id: '2026-05-19',
        isNext: false,
        labelEn: 'Scheduled',
        labelFr: 'Planifiée',
        windowEn,
        windowFr,
      },
      {
        dateEn: 'Tuesday, June 2',
        dateFr: 'mardi 2 juin',
        id: '2026-06-02',
        isNext: false,
        labelEn: 'Scheduled',
        labelFr: 'Planifiée',
        windowEn,
        windowFr,
      },
    ],
    readinessEn:
      state.nextVisit.stage === 'enRoute'
        ? 'Akouvi is on the way. Tracking stops at arrival.'
        : 'You will be notified when Akouvi starts the trip. Tracking stops automatically when she arrives.',
    readinessFr:
      state.nextVisit.stage === 'enRoute'
        ? "Akouvi est en route. Le suivi s'arrête à l'arrivée."
        : "Vous serez prévenue quand Akouvi démarre le trajet. Le suivi s'arrête automatiquement à son arrivée.",
  };
}

function buildBillingSummary(state: SubscriberState): BillingSummary {
  return {
    balanceDueXof:
      state.subscription.paymentStatus === 'current' ? 0 : state.subscription.monthlyPriceXof,
    ledger: [
      {
        amountXof: 4500,
        id: '2026-04',
        method: 'T-Money · 1 avr.',
        periodEn: 'April 2026',
        periodFr: 'Avril 2026',
        statusEn: 'Paid',
        statusFr: 'Payé',
      },
      {
        amountXof: 4500,
        id: '2026-03',
        method: 'T-Money · 1 mars',
        periodEn: 'March 2026',
        periodFr: 'Mars 2026',
        statusEn: 'Paid',
        statusFr: 'Payé',
      },
      {
        amountXof: 4500,
        id: '2026-02',
        method: 'Ajustement support',
        periodEn: 'February 2026',
        periodFr: 'Février 2026',
        statusEn: 'Credit applied',
        statusFr: 'Crédit appliqué',
      },
    ],
    nextRetryLabelEn: 'Next retry before the visit',
    nextRetryLabelFr: 'Prochaine tentative avant la visite',
    paymentMethodLabel: 'Sandbox Mobile Money · 00 00',
    retrySteps: [
      {
        id: 'invoice',
        isCurrent: false,
        labelEn: 'Invoice issued',
        labelFr: 'Reçu émis',
        valueEn: 'May 1',
        valueFr: '1 mai',
      },
      {
        id: 'failed',
        isCurrent: false,
        labelEn: 'Retry failed',
        labelFr: 'Tentative échouée',
        valueEn: 'May 2',
        valueFr: '2 mai',
      },
      {
        id: 'next',
        isCurrent: state.subscription.paymentStatus === 'overdue',
        labelEn: 'Next retry',
        labelFr: 'Prochaine tentative',
        valueEn: 'May 4',
        valueFr: '4 mai',
      },
    ],
  };
}

function buildMessages(state: SubscriberState): readonly SubscriberMessage[] {
  const messages: SubscriberMessage[] = [
    {
      actionLabelEn: 'View visit',
      actionLabelFr: 'Voir la visite',
      bodyEn: 'Akouvi is confirmed for Tuesday 9:00 - 11:00.',
      bodyFr: 'Akouvi est confirmée pour mardi 9h00 - 11h00.',
      createdLabelEn: 'Washed Ops · today',
      createdLabelFr: 'Opérations Washed · aujourd’hui',
      id: 'operator',
      needsAttention: false,
      target: { route: 'visit' },
      titleEn: 'Operator-mediated messages',
      titleFr: 'Messages relayés par opérateur',
    },
    {
      actionLabelEn: 'Recover payment',
      actionLabelFr: 'Régulariser',
      bodyEn: 'Your next mobile-money retry is scheduled before the next visit.',
      bodyFr: 'Votre prochaine tentative mobile money est prévue avant la visite.',
      createdLabelEn: 'Billing · action available',
      createdLabelFr: 'Facturation · action possible',
      id: 'payment',
      needsAttention: state.subscription.paymentStatus === 'overdue',
      target: { sheet: 'paymentRecovery' },
      titleEn: 'Payment recovery reminder',
      titleFr: 'Rappel de régularisation',
    },
    {
      actionLabelEn: 'View visit',
      actionLabelFr: 'Voir la visite',
      bodyEn: 'Visit reminder, access, and notes for Tuesday.',
      bodyFr: 'Rappel de visite, accès et consignes pour mardi.',
      createdLabelEn: 'Visit · Tuesday, May 5',
      createdLabelFr: 'Visite · mardi 5 mai',
      id: 'visit',
      needsAttention: false,
      target: { route: 'visit' },
      titleEn: 'Tuesday visit reminder',
      titleFr: 'Rappel visite mardi',
    },
    {
      actionLabelEn: 'View legal',
      actionLabelFr: 'Voir les conditions',
      bodyEn: 'Maintenance and required update notices stay here after the push disappears.',
      bodyFr:
        'Les avis de maintenance et de mise à jour obligatoire restent ici après la notification.',
      createdLabelEn: 'System notice · kept in Inbox',
      createdLabelFr: 'Avis système · conservé dans Inbox',
      id: 'maintenance',
      needsAttention: false,
      target: { route: 'legal' },
      titleEn: 'Maintenance and required update states',
      titleFr: 'Maintenance et mise à jour obligatoire',
    },
  ];

  return messages.sort((left, right) => Number(right.needsAttention) - Number(left.needsAttention));
}
