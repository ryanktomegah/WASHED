import {
  DEMO_SUBSCRIBER_APP_SNAPSHOT,
  type SubscriberVisitStage,
  type SubscriberVisitStatus,
  type SubscriptionPaymentStatus,
  type SubscriptionStatus as ApiSubscriptionStatus,
  type SubscriptionTierCode,
} from '@washed/api-client';

export type SubscriptionStatus = ApiSubscriptionStatus;
export type PaymentStatus = SubscriptionPaymentStatus;
export type VisitStatus = SubscriberVisitStatus;
export type VisitStage = SubscriberVisitStage;

export type SubscriberFeedback =
  | 'cancelRequested'
  | 'dataErasureRequested'
  | 'dataExportRequested'
  | 'paymentRecovered'
  | 'rescheduled'
  | 'skipUsed'
  | 'tierChanged'
  | 'trackingArrived'
  | 'trackingStarted'
  | 'trackingStopped'
  | 'visitInProgress'
  | 'workerSwapRequested';

export interface SubscriberState {
  readonly inboxUnread: number;
  readonly lastFeedback: SubscriberFeedback | null;
  readonly nextVisit: {
    readonly cell: string;
    readonly startsAt: string;
    readonly status: VisitStatus;
    readonly stage: VisitStage;
    readonly window: string;
    readonly workerName: string;
  };
  readonly privacy: {
    readonly erasureRequested: boolean;
    readonly exportRequested: boolean;
  };
  readonly subscription: {
    readonly monthlyPriceXof: number;
    readonly paymentStatus: PaymentStatus;
    readonly skipCreditsRemaining: number;
    readonly status: SubscriptionStatus;
    readonly swapCreditsRemaining: number;
    readonly tier: SubscriptionTierCode;
  };
}

export type SubscriberAction =
  | { readonly type: 'payment/recover' }
  | { readonly type: 'privacy/erasure' }
  | { readonly type: 'privacy/export' }
  | { readonly type: 'subscription/cancel' }
  | { readonly type: 'subscription/changeTier' }
  | { readonly type: 'subscription/requestSwap' }
  | { readonly type: 'visit/arrive' }
  | { readonly type: 'visit/startProgress' }
  | { readonly type: 'visit/reschedule' }
  | { readonly type: 'visit/skip' }
  | { readonly type: 'visit/startTracking' }
  | { readonly type: 'visit/stopTracking' };

export const initialSubscriberState = {
  ...DEMO_SUBSCRIBER_APP_SNAPSHOT,
  lastFeedback: null,
} as const satisfies SubscriberState;

export function subscriberReducer(
  state: SubscriberState,
  action: SubscriberAction,
): SubscriberState {
  if (action.type === 'visit/startTracking') {
    return {
      ...state,
      lastFeedback: 'trackingStarted',
      nextVisit: { ...state.nextVisit, stage: 'enRoute' },
    };
  }

  if (action.type === 'visit/stopTracking') {
    return {
      ...state,
      lastFeedback: 'trackingStopped',
      nextVisit: { ...state.nextVisit, stage: 'scheduled' },
    };
  }

  if (action.type === 'visit/arrive') {
    return {
      ...state,
      lastFeedback: 'trackingArrived',
      nextVisit: { ...state.nextVisit, stage: 'arrived' },
    };
  }

  if (action.type === 'visit/startProgress') {
    return {
      ...state,
      lastFeedback: 'visitInProgress',
      nextVisit: { ...state.nextVisit, stage: 'inProgress' },
    };
  }

  if (action.type === 'visit/skip') {
    return {
      ...state,
      lastFeedback: 'skipUsed',
      nextVisit: { ...state.nextVisit, status: 'skipped', stage: 'scheduled' },
      subscription: {
        ...state.subscription,
        skipCreditsRemaining: Math.max(0, state.subscription.skipCreditsRemaining - 1),
      },
    };
  }

  if (action.type === 'visit/reschedule') {
    return {
      ...state,
      lastFeedback: 'rescheduled',
      nextVisit: { ...state.nextVisit, status: 'rescheduled', stage: 'scheduled' },
    };
  }

  if (action.type === 'subscription/requestSwap') {
    return {
      ...state,
      lastFeedback: 'workerSwapRequested',
      subscription: {
        ...state.subscription,
        swapCreditsRemaining: Math.max(0, state.subscription.swapCreditsRemaining - 1),
      },
    };
  }

  if (action.type === 'subscription/changeTier') {
    const nextTier = state.subscription.tier === 'T2' ? 'T1' : 'T2';

    return {
      ...state,
      lastFeedback: 'tierChanged',
      subscription: {
        ...state.subscription,
        monthlyPriceXof: nextTier === 'T2' ? 4500 : 2500,
        tier: nextTier,
      },
    };
  }

  if (action.type === 'payment/recover') {
    return {
      ...state,
      lastFeedback: 'paymentRecovered',
      subscription: { ...state.subscription, paymentStatus: 'recovered' },
    };
  }

  if (action.type === 'subscription/cancel') {
    return {
      ...state,
      lastFeedback: 'cancelRequested',
      subscription: { ...state.subscription, status: 'cancelled' },
    };
  }

  if (action.type === 'privacy/export') {
    return {
      ...state,
      lastFeedback: 'dataExportRequested',
      privacy: { ...state.privacy, exportRequested: true },
    };
  }

  if (action.type === 'privacy/erasure') {
    return {
      ...state,
      lastFeedback: 'dataErasureRequested',
      privacy: { ...state.privacy, erasureRequested: true },
    };
  }

  return state;
}
