import {
  createCoreApiClient,
  createDemoFrontendDataSource,
  type CoreApiClient,
  type FrontendDataSource,
} from '@washed/api-client';
import { createAuthManager, createMemoryAuthStorage, type AuthManager } from '@washed/auth';

import { getOrCreateDeviceId, readBackendConfig } from './config.js';
import { createBrowserAuthStorage } from './storage.js';

export interface SubscriberBackend {
  readonly api: CoreApiClient;
  readonly auth: AuthManager;
  readonly data: FrontendDataSource;
  readonly liveBackendEnabled: boolean;
}

export function createSubscriberBackend(): SubscriberBackend {
  const config = readBackendConfig();
  const deviceId = getOrCreateDeviceId(config.deviceIdStorageKey);
  const storage =
    typeof window === 'undefined'
      ? createMemoryAuthStorage()
      : createBrowserAuthStorage(config.sessionStorageKey);

  const api = createCoreApiClient({
    baseUrl: config.apiBaseUrl,
    getAccessToken: async () => {
      const session = await storage.get();
      return session?.accessToken;
    },
  });

  const auth = createAuthManager({
    api,
    deviceId,
    role: 'subscriber',
    storage,
  });

  return {
    api,
    auth,
    data: createDemoFrontendDataSource(),
    liveBackendEnabled: config.liveBackendEnabled,
  };
}
