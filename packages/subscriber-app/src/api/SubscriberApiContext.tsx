import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';

import {
  createCoreApiClient,
  type AddressDto,
  type CoreApiClient,
  type CreatedSubscriptionDto,
  type CurrentSubscriberSubscriptionDto,
  type DisputeDto,
  type RescheduledSubscriberVisitDto,
  type SchedulePreferenceDto,
  type SkippedSubscriberVisitDto,
  type SubscriberProfileDto,
  type SupportContactCategory,
  type SupportContactDto,
  type SupportContactStatus,
  type SubscriptionBillingItemDto,
  type SubscriptionDetailDto,
  type SubscriptionPaymentMethodDto,
  type SubscriptionTierCode,
  type WorkerSwapRequestDto,
} from '@washed/api-client';
import {
  createAuthManager,
  type AuthManager,
  type AuthSession,
  type AuthStorage,
  type OtpChallenge,
} from '@washed/auth';

export interface SubscriberApiContextValue {
  readonly cancelSubscription: (input: {
    readonly cancelledAt: string;
  }) => Promise<SubscriptionDetailDto>;
  readonly changeSubscriptionTier: (input: {
    readonly effectiveAt: string;
    readonly tierCode: SubscriptionTierCode;
  }) => Promise<SubscriptionDetailDto>;
  readonly createSubscription: (input: {
    readonly address: AddressDto;
    readonly paymentMethod: SubscriptionPaymentMethodDto;
    readonly tierCode: SubscriptionTierCode;
  }) => Promise<CreatedSubscriptionDto>;
  readonly createSupportContact: (input: {
    readonly body: string;
    readonly category: SupportContactCategory;
    readonly createdAt: string;
    readonly subject: string;
  }) => Promise<SupportContactDto>;
  readonly getCurrentSubscription: () => Promise<CurrentSubscriberSubscriptionDto>;
  readonly getSupportContact: (contactId: string) => Promise<SupportContactDto>;
  readonly isConfigured: boolean;
  readonly listBillingHistory: (input?: { readonly limit?: number }) => Promise<{
    readonly items: readonly SubscriptionBillingItemDto[];
    readonly limit: number;
    readonly subscriptionId: string;
  }>;
  readonly listSupportContacts: (input?: {
    readonly limit?: number;
    readonly status?: SupportContactStatus;
  }) => Promise<{
    readonly items: readonly SupportContactDto[];
    readonly limit: number;
    readonly status: SupportContactStatus | null;
    readonly subscriptionId: string;
  }>;
  readonly pauseSubscription: (input: {
    readonly pausedAt: string;
  }) => Promise<SubscriptionDetailDto>;
  readonly requestFirstVisit: (input: {
    readonly requestedAt: string;
    readonly schedulePreference: SchedulePreferenceDto;
  }) => Promise<SubscriptionDetailDto>;
  readonly reportVisitIssue: (input: {
    readonly createdAt: string;
    readonly description: string;
    readonly issueType: DisputeDto['issueType'];
    readonly visitId: string;
  }) => Promise<DisputeDto>;
  readonly requestWorkerSwap: (input: {
    readonly reason: string;
    readonly requestedAt: string;
  }) => Promise<WorkerSwapRequestDto>;
  readonly rescheduleVisit: (input: {
    readonly scheduledDate: string;
    readonly scheduledTimeWindow: SchedulePreferenceDto['timeWindow'];
    readonly visitId: string;
  }) => Promise<RescheduledSubscriberVisitDto>;
  readonly resumeSubscription: (input: {
    readonly resumedAt: string;
  }) => Promise<SubscriptionDetailDto>;
  readonly skipVisit: (visitId: string) => Promise<SkippedSubscriberVisitDto>;
  readonly updatePaymentMethod: (input: {
    readonly paymentMethod: SubscriptionPaymentMethodDto;
    readonly updatedAt: string;
  }) => Promise<SubscriptionDetailDto>;
  readonly startOtp: (phoneNumber: string) => Promise<OtpChallenge>;
  readonly upsertProfile: (input: {
    readonly email?: string;
    readonly firstName: string;
    readonly isAdultConfirmed: boolean;
    readonly lastName: string;
  }) => Promise<SubscriberProfileDto>;
  readonly verifyOtp: (input: {
    readonly challengeId: string;
    readonly code: string;
  }) => Promise<AuthSession>;
}

export const SUBSCRIBER_AUTH_STORAGE_KEY = 'washed.subscriber.auth-session';
export const SUBSCRIBER_DEVICE_ID_STORAGE_KEY = 'washed.subscriber.device-id';

const SubscriberApiContext = createContext<SubscriberApiContextValue | null>(null);
const UNCONFIGURED_SUBSCRIBER_API = createUnconfiguredSubscriberApi();

export function SubscriberApiProvider({
  baseUrl,
  children,
  fetch,
}: {
  readonly baseUrl?: string | null;
  readonly children: ReactNode;
  readonly fetch?: typeof globalThis.fetch;
}): ReactElement {
  const value = useMemo<SubscriberApiContextValue>(() => {
    const configuredBaseUrl = baseUrl === undefined ? readConfiguredBaseUrl() : baseUrl;

    if (configuredBaseUrl === null || configuredBaseUrl.trim().length === 0) {
      return UNCONFIGURED_SUBSCRIBER_API;
    }

    const storage = createLocalStorageAuthStorage(SUBSCRIBER_AUTH_STORAGE_KEY);
    const authApi = createCoreApiClient({
      baseUrl: configuredBaseUrl,
      ...(fetch === undefined ? {} : { fetch }),
    });
    const auth = createAuthManager({
      api: authApi,
      deviceId: readOrCreateDeviceId,
      role: 'subscriber',
      storage,
    });
    const api = createCoreApiClient({
      baseUrl: configuredBaseUrl,
      ...(fetch === undefined ? {} : { fetch }),
      getAccessToken: () => auth.getAccessToken(),
    });

    return createConfiguredSubscriberApi(api, auth);
  }, [baseUrl, fetch]);

  return <SubscriberApiContext.Provider value={value}>{children}</SubscriberApiContext.Provider>;
}

export function useSubscriberApi(): SubscriberApiContextValue {
  const value = useContext(SubscriberApiContext);

  if (value === null) {
    return UNCONFIGURED_SUBSCRIBER_API;
  }

  return value;
}

function createConfiguredSubscriberApi(
  api: CoreApiClient,
  auth: AuthManager,
): SubscriberApiContextValue {
  return {
    cancelSubscription(input) {
      return api.request('cancelCurrentSubscriberSubscription', {
        body: input,
      });
    },
    changeSubscriptionTier(input) {
      return api.request('changeCurrentSubscriberSubscriptionTier', {
        body: input,
      });
    },
    createSubscription(input) {
      return api.request('createCurrentSubscriberSubscription', {
        body: input,
      });
    },
    createSupportContact(input) {
      return api.request('createCurrentSubscriberSupportContact', {
        body: input,
      });
    },
    getCurrentSubscription() {
      return api.request('getCurrentSubscriberSubscription');
    },
    getSupportContact(contactId) {
      return api.request('getCurrentSubscriberSupportContact', {
        pathParams: { contactId },
      });
    },
    isConfigured: true,
    listBillingHistory(input = {}) {
      return api.request('listCurrentSubscriberSubscriptionBillingHistory', {
        query: input,
      });
    },
    listSupportContacts(input = {}) {
      return api.request('listCurrentSubscriberSupportContacts', {
        query: input,
      });
    },
    pauseSubscription(input) {
      return api.request('pauseCurrentSubscriberSubscription', {
        body: input,
      });
    },
    requestFirstVisit(input) {
      return api.request('requestCurrentSubscriberFirstVisit', {
        body: input,
      });
    },
    reportVisitIssue(input) {
      const { visitId, ...body } = input;
      return api.request('createCurrentSubscriberVisitDispute', {
        body,
        pathParams: { visitId },
      });
    },
    requestWorkerSwap(input) {
      return api.request('createCurrentSubscriberWorkerSwapRequest', {
        body: input,
      });
    },
    rescheduleVisit(input) {
      const { visitId, ...body } = input;
      return api.request('rescheduleCurrentSubscriberVisit', {
        body,
        pathParams: { visitId },
      });
    },
    resumeSubscription(input) {
      return api.request('resumeCurrentSubscriberSubscription', {
        body: input,
      });
    },
    skipVisit(visitId) {
      return api.request('skipCurrentSubscriberVisit', {
        body: {},
        pathParams: { visitId },
      });
    },
    updatePaymentMethod(input) {
      return api.request('updateCurrentSubscriberPaymentMethod', {
        body: input,
      });
    },
    startOtp(phoneNumber) {
      return auth.startOtp(phoneNumber);
    },
    upsertProfile(input) {
      return api.request('upsertSubscriberProfile', {
        body: input,
      });
    },
    verifyOtp(input) {
      return auth.verifyOtp(input);
    },
  };
}

function createUnconfiguredSubscriberApi(): SubscriberApiContextValue {
  async function unavailable(): Promise<never> {
    throw new Error('Subscriber API is not configured.');
  }

  return {
    cancelSubscription: unavailable,
    changeSubscriptionTier: unavailable,
    createSubscription: unavailable,
    createSupportContact: unavailable,
    getCurrentSubscription: unavailable,
    getSupportContact: unavailable,
    isConfigured: false,
    listBillingHistory: unavailable,
    listSupportContacts: unavailable,
    pauseSubscription: unavailable,
    requestFirstVisit: unavailable,
    reportVisitIssue: unavailable,
    requestWorkerSwap: unavailable,
    rescheduleVisit: unavailable,
    resumeSubscription: unavailable,
    skipVisit: unavailable,
    updatePaymentMethod: unavailable,
    startOtp: unavailable,
    upsertProfile: unavailable,
    verifyOtp: unavailable,
  };
}

function readConfiguredBaseUrl(): string | null {
  const env = import.meta.env;
  const viteBaseUrl = env.VITE_CORE_API_BASE_URL;
  const washedBaseUrl = env.WASHED_CORE_API_BASE_URL;

  if (typeof viteBaseUrl === 'string' && viteBaseUrl.length > 0) {
    return viteBaseUrl;
  }

  return typeof washedBaseUrl === 'string' && washedBaseUrl.length > 0 ? washedBaseUrl : null;
}

function createLocalStorageAuthStorage(storageKey: string): AuthStorage {
  return {
    clear(): void {
      window.localStorage.removeItem(storageKey);
    },
    get(): AuthSession | null {
      const raw = window.localStorage.getItem(storageKey);

      if (raw === null) {
        return null;
      }

      return JSON.parse(raw) as AuthSession;
    },
    set(session): void {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    },
  };
}

function readOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(SUBSCRIBER_DEVICE_ID_STORAGE_KEY);

  if (existing !== null) {
    return existing;
  }

  const deviceId =
    typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `subscriber-${Date.now().toString(36)}`;
  window.localStorage.setItem(SUBSCRIBER_DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}
