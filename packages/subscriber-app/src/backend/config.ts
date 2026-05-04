const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const DEVICE_ID_STORAGE_KEY = 'washed.deviceId';
const SESSION_STORAGE_KEY = 'washed.session';

export interface BackendConfig {
  readonly apiBaseUrl: string;
  readonly deviceIdStorageKey: string;
  readonly sessionStorageKey: string;
  readonly liveBackendEnabled: boolean;
}

export function readBackendConfig(): BackendConfig {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const baseUrl = env['VITE_API_BASE_URL']?.replace(/\/+$/u, '') ?? DEFAULT_API_BASE_URL;
  const liveBackendEnabled = env['VITE_USE_LIVE_BACKEND'] === 'true';

  return {
    apiBaseUrl: baseUrl,
    deviceIdStorageKey: DEVICE_ID_STORAGE_KEY,
    sessionStorageKey: SESSION_STORAGE_KEY,
    liveBackendEnabled,
  };
}

export function getOrCreateDeviceId(storageKey: string = DEVICE_ID_STORAGE_KEY): string {
  if (typeof window === 'undefined') {
    return generateDeviceId();
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null && stored.length > 0) return stored;
  } catch {
    // localStorage unavailable
  }

  const fresh = generateDeviceId();

  try {
    window.localStorage.setItem(storageKey, fresh);
  } catch {
    // ignore
  }

  return fresh;
}

function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `device-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
