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

import type { AddressDto, SubscriptionDetailDto, VisitSummaryDto } from '@washed/api-client';

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
  readonly address: AddressDto | null;
  readonly addressNeighborhood: string | null;
  readonly assignedWorker: SubscriptionDetailDto['assignedWorker'];
  readonly billingStatus: SubscriptionDetailDto['billingStatus'];
  readonly createdAtIso: string | null;
  readonly firstVisitRequest: FirstVisitRequest | null;
  readonly isHydratedFromApi: boolean;
  readonly paymentPhoneNumber: string | null;
  readonly paymentProvider: SignupPaymentProvider;
  readonly pendingAddressChange: SubscriptionDetailDto['pendingAddressChange'];
  readonly recentVisits: readonly VisitSummaryDto[];
  readonly status: SubscriberSubscriptionStatus;
  readonly subscriptionId: string | null;
  readonly tier: SignupTier;
  readonly upcomingVisits: readonly VisitSummaryDto[];
  readonly visitsPerCycle: 1 | 2;
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
  address: null,
  addressNeighborhood: null,
  assignedWorker: null,
  billingStatus: null,
  createdAtIso: null,
  firstVisitRequest: null,
  isHydratedFromApi: false,
  paymentPhoneNumber: null,
  paymentProvider: 'mixx',
  pendingAddressChange: null,
  recentVisits: [],
  status: 'ready_no_visit',
  subscriptionId: null,
  tier: 'T1',
  upcomingVisits: [],
  visitsPerCycle: 1,
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
        address: null,
        addressNeighborhood: null,
        assignedWorker: null,
        billingStatus: null,
        createdAtIso: new Date().toISOString(),
        firstVisitRequest: null,
        isHydratedFromApi: false,
        paymentPhoneNumber: input.paymentPhoneNumber ?? null,
        paymentProvider: input.paymentProvider,
        pendingAddressChange: null,
        recentVisits: [],
        status: 'ready_no_visit',
        subscriptionId: input.subscriptionId ?? null,
        tier: input.tier,
        upcomingVisits: [],
        visitsPerCycle: input.tier === 'T2' ? 2 : 1,
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
      setState({ ...DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE, isHydratedFromApi: true });
      return;
    }

    setState((current) => ({
      addressNeighborhood: subscription.address.neighborhood,
      address: subscription.address,
      assignedWorker: subscription.assignedWorker,
      billingStatus: subscription.billingStatus,
      createdAtIso: current.createdAtIso,
      firstVisitRequest:
        subscription.status === 'pending_match' && subscription.schedulePreference !== null
          ? {
              dayId: subscription.schedulePreference.dayOfWeek,
              requestedAtIso: null,
              timeWindowId: subscription.schedulePreference.timeWindow,
            }
          : null,
      isHydratedFromApi: true,
      paymentPhoneNumber: subscription.paymentMethod?.phoneNumber ?? current.paymentPhoneNumber,
      paymentProvider: subscription.paymentMethod?.provider ?? current.paymentProvider,
      pendingAddressChange: subscription.pendingAddressChange,
      recentVisits: subscription.recentVisits,
      status: toSubscriberSubscriptionStatus(subscription.status),
      subscriptionId: subscription.subscriptionId,
      tier: subscription.tierCode,
      upcomingVisits: subscription.upcomingVisits,
      visitsPerCycle: subscription.visitsPerCycle,
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

export function hasStoredSubscriberSubscription(
  storageKey = SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY,
): boolean {
  if (typeof window === 'undefined') return false;

  const stored = readStoredSubscription(storageKey);
  if (stored === null) return false;

  return (
    stored.createdAtIso !== null ||
    stored.firstVisitRequest !== null ||
    stored.paymentPhoneNumber !== null ||
    stored.subscriptionId !== null ||
    stored.status !== DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE.status
  );
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
    addressNeighborhood: parsed.addressNeighborhood ?? null,
    address: parsed.address ?? null,
    assignedWorker: parsed.assignedWorker ?? null,
    billingStatus: parsed.billingStatus ?? null,
    createdAtIso: parsed.createdAtIso ?? null,
    firstVisitRequest: parsed.firstVisitRequest ?? null,
    isHydratedFromApi: parsed.isHydratedFromApi ?? false,
    paymentPhoneNumber: parsed.paymentPhoneNumber ?? null,
    paymentProvider: parsed.paymentProvider,
    pendingAddressChange: parsed.pendingAddressChange ?? null,
    recentVisits: parsed.recentVisits ?? [],
    status: parsed.status,
    subscriptionId: parsed.subscriptionId ?? null,
    tier: parsed.tier,
    upcomingVisits: parsed.upcomingVisits ?? [],
    visitsPerCycle: parsed.visitsPerCycle ?? (parsed.tier === 'T2' ? 2 : 1),
  };
}

function toSubscriberSubscriptionStatus(
  status: SubscriptionDetailDto['status'],
): SubscriberSubscriptionStatus {
  return status === 'pending_match' ? 'visit_request_pending' : status;
}
