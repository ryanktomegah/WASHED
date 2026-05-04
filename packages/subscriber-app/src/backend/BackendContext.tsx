import {
  createContext,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';

import { createCoreApiClient, createDemoFrontendDataSource } from '@washed/api-client';
import { createAuthManager, createMemoryAuthStorage } from '@washed/auth';

import { createSubscriberBackend, type SubscriberBackend } from './createBackend.js';

const BackendContext = createContext<SubscriberBackend | null>(null);

let fallbackBackend: SubscriberBackend | null = null;

function getFallbackBackend(): SubscriberBackend {
  if (fallbackBackend !== null) return fallbackBackend;

  const storage = createMemoryAuthStorage();
  const api = createCoreApiClient({
    baseUrl: 'http://localhost',
    fetch: async () => {
      throw new Error('Backend is not configured for this context.');
    },
  });

  fallbackBackend = {
    api,
    auth: createAuthManager({
      api,
      deviceId: 'memory-fallback',
      role: 'subscriber',
      storage,
    }),
    data: createDemoFrontendDataSource(),
    liveBackendEnabled: false,
  };

  return fallbackBackend;
}

export interface BackendProviderProps {
  readonly backend?: SubscriberBackend;
  readonly children: ReactNode;
}

export function BackendProvider({ backend, children }: BackendProviderProps): ReactElement {
  const value = useMemo(() => backend ?? createSubscriberBackend(), [backend]);

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend(): SubscriberBackend {
  const value = useContext(BackendContext);
  return value ?? getFallbackBackend();
}
