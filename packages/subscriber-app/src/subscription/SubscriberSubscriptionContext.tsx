import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { SubscriptionDetailDto } from '@washed/api-client';

import type { SignupPaymentProvider, SignupTier } from '../screens/onboarding/SignupContext.js';

export type SubscriberSubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'paused'
  | 'payment_overdue'
  | 'ready_no_visit'
  | 'visit_request_pending';

export type FirstVisitDayId =
  | 'friday'
  | 'monday'
  | 'saturday'
  | 'sunday'
  | 'thursday'
  | 'tuesday'
  | 'wednesday';

export type FirstVisitTimeWindowId = 'afternoon' | 'morning';

export interface FirstVisitRequest {
  readonly dayId: FirstVisitDayId;
  readonly requestedAtIso: string | null;
  readonly timeWindowId: FirstVisitTimeWindowId;
}

export interface SubscriberSubscriptionState {
  readonly createdAtIso: string | null;
  readonly firstVisitRequest: FirstVisitRequest | null;
  readonly paymentPhoneNumber: string | null;
  readonly paymentProvider: SignupPaymentProvider;
  readonly status: SubscriberSubscriptionStatus;
  readonly subscriptionId: string | null;
  readonly tier: SignupTier;
}

export interface SubscriberSubscriptionContextValue {
  readonly changePaymentProvider: (paymentProvider: SignupPaymentProvider) => void;
  readonly changeTier: (tier: SignupTier) => void;
  readonly confirmSubscription: (input: {
    readonly paymentPhoneNumber?: string;
    readonly paymentProvider: SignupPaymentProvider;
    readonly subscriptionId?: string;
    readonly tier: SignupTier;
  }) => void;
  readonly pauseSubscription: () => void;
  readonly requestFirstVisit: (input: {
    readonly dayId: FirstVisitDayId;
    readonly requestedAtIso?: string;
    readonly timeWindowId: FirstVisitTimeWindowId;
  }) => void;
  readonly resumeSubscription: () => void;
  readonly state: SubscriberSubscriptionState;
  readonly syncFromApi: (subscription: SubscriptionDetailDto | null) => void;
}

export const SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY = 'washed.subscriber.subscription';

export const DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE: SubscriberSubscriptionState = {
  createdAtIso: null,
  firstVisitRequest: null,
  paymentPhoneNumber: null,
  paymentProvider: 'mixx',
  status: 'ready_no_visit',
  subscriptionId: null,
  tier: 'T1',
};

const SubscriberSubscriptionContext = createContext<SubscriberSubscriptionContextValue | null>(
  null,
);

export function SubscriberSubscriptionProvider({
  children,
  initialState,
  storageKey = SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY,
}: {
  readonly children: ReactNode;
  readonly initialState?: SubscriberSubscriptionState;
  readonly storageKey?: string | null;
}): ReactElement {
  const [state, setState] = useState<SubscriberSubscriptionState>(() => {
    if (initialState !== undefined) return initialState;
    if (storageKey === null) return DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE;
    return readStoredSubscription(storageKey) ?? DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE;
  });

  useEffect(() => {
    if (storageKey === null) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const confirmSubscription = useCallback(
    (input: {
      readonly paymentPhoneNumber?: string;
      readonly paymentProvider: SignupPaymentProvider;
      readonly subscriptionId?: string;
      readonly tier: SignupTier;
    }) => {
      setState({
        createdAtIso: new Date().toISOString(),
        firstVisitRequest: null,
        paymentPhoneNumber: input.paymentPhoneNumber ?? null,
        paymentProvider: input.paymentProvider,
        status: 'ready_no_visit',
        subscriptionId: input.subscriptionId ?? null,
        tier: input.tier,
      });
    },
    [],
  );

  const requestFirstVisit = useCallback(
    (input: {
      readonly dayId: FirstVisitDayId;
      readonly requestedAtIso?: string;
      readonly timeWindowId: FirstVisitTimeWindowId;
    }) => {
      setState((current) => ({
        ...current,
        firstVisitRequest: {
          dayId: input.dayId,
          requestedAtIso: input.requestedAtIso ?? new Date().toISOString(),
          timeWindowId: input.timeWindowId,
        },
        status: 'visit_request_pending',
      }));
    },
    [],
  );

  const syncFromApi = useCallback((subscription: SubscriptionDetailDto | null) => {
    if (subscription === null) {
      setState(DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE);
      return;
    }

    setState((current) => ({
      createdAtIso: current.createdAtIso,
      firstVisitRequest:
        subscription.status === 'pending_match' && subscription.schedulePreference !== null
          ? {
              dayId: subscription.schedulePreference.dayOfWeek,
              requestedAtIso: null,
              timeWindowId: subscription.schedulePreference.timeWindow,
            }
          : null,
      paymentPhoneNumber: subscription.paymentMethod?.phoneNumber ?? current.paymentPhoneNumber,
      paymentProvider: subscription.paymentMethod?.provider ?? current.paymentProvider,
      status: toSubscriberSubscriptionStatus(subscription.status),
      subscriptionId: subscription.subscriptionId,
      tier: subscription.tierCode,
    }));
  }, []);

  const changeTier = useCallback((tier: SignupTier) => {
    setState((current) => ({ ...current, tier }));
  }, []);

  const changePaymentProvider = useCallback((paymentProvider: SignupPaymentProvider) => {
    setState((current) => ({ ...current, paymentProvider }));
  }, []);

  const pauseSubscription = useCallback(() => {
    setState((current) => ({ ...current, status: 'paused' }));
  }, []);

  const resumeSubscription = useCallback(() => {
    setState((current) => ({ ...current, status: 'active' }));
  }, []);

  const value = useMemo<SubscriberSubscriptionContextValue>(
    () => ({
      changePaymentProvider,
      changeTier,
      confirmSubscription,
      pauseSubscription,
      requestFirstVisit,
      resumeSubscription,
      state,
      syncFromApi,
    }),
    [
      changePaymentProvider,
      changeTier,
      confirmSubscription,
      pauseSubscription,
      requestFirstVisit,
      resumeSubscription,
      state,
      syncFromApi,
    ],
  );

  return (
    <SubscriberSubscriptionContext.Provider value={value}>
      {children}
    </SubscriberSubscriptionContext.Provider>
  );
}

export function useSubscriberSubscription(): SubscriberSubscriptionContextValue {
  const value = useContext(SubscriberSubscriptionContext);
  if (value === null) {
    throw new Error(
      'useSubscriberSubscription must be used inside SubscriberSubscriptionProvider.',
    );
  }
  return value;
}

function readStoredSubscription(storageKey: string): SubscriberSubscriptionState | null {
  const raw = window.localStorage.getItem(storageKey);
  if (raw === null) return null;

  let parsed: Partial<SubscriberSubscriptionState>;
  try {
    parsed = JSON.parse(raw) as Partial<SubscriberSubscriptionState>;
  } catch {
    return null;
  }
  if (
    parsed.status === undefined ||
    parsed.tier === undefined ||
    parsed.paymentProvider === undefined
  ) {
    return null;
  }

  return {
    createdAtIso: parsed.createdAtIso ?? null,
    firstVisitRequest: parsed.firstVisitRequest ?? null,
    paymentPhoneNumber: parsed.paymentPhoneNumber ?? null,
    paymentProvider: parsed.paymentProvider,
    status: parsed.status,
    subscriptionId: parsed.subscriptionId ?? null,
    tier: parsed.tier,
  };
}

function toSubscriberSubscriptionStatus(
  status: SubscriptionDetailDto['status'],
): SubscriberSubscriptionStatus {
  return status === 'pending_match' ? 'visit_request_pending' : status;
}
