import { CoreApiError, type CoreApiClient } from '@washed/api-client';

export type AuthRole = 'operator' | 'subscriber' | 'worker';
export type CountryCode = 'TG';

export interface OtpChallenge {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly phoneNumber: string;
  readonly provider: string;
  readonly testCode?: string | null;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
  readonly role: AuthRole;
  readonly sessionId: string;
  readonly userId: string;
}

export interface AuthStorage {
  readonly get: () => Awaitable<AuthSession | null>;
  readonly set: (session: AuthSession) => Awaitable<void>;
  readonly clear: () => Awaitable<void>;
}

export interface StartOtpOptions {
  readonly countryCode?: CountryCode;
}

export interface VerifyOtpInput {
  readonly challengeId: string;
  readonly code: string;
}

export interface AuthManager {
  readonly clearSession: () => Promise<void>;
  readonly getAccessToken: () => Promise<string | undefined>;
  readonly getSession: () => Promise<AuthSession | null>;
  readonly requireAccessToken: () => Promise<string>;
  readonly setSession: (session: AuthSession) => Promise<void>;
  readonly startOtp: (phoneNumber: string, options?: StartOtpOptions) => Promise<OtpChallenge>;
  readonly verifyOtp: (input: VerifyOtpInput) => Promise<AuthSession>;
}

export interface AuthManagerOptions {
  readonly api: CoreApiClient;
  readonly deviceId: AwaitableValue<string>;
  readonly now?: () => Date;
  readonly refreshLeewayMs?: number;
  readonly role: AuthRole;
  readonly storage: AuthStorage;
}

type Awaitable<T> = Promise<T> | T;
type AwaitableValue<T> = Awaitable<T> | (() => Awaitable<T>);

const DEFAULT_COUNTRY_CODE: CountryCode = 'TG';
const DEFAULT_REFRESH_LEEWAY_MS = 30_000;

export function createAuthManager(options: AuthManagerOptions): AuthManager {
  const now = options.now ?? (() => new Date());
  const refreshLeewayMs = options.refreshLeewayMs ?? DEFAULT_REFRESH_LEEWAY_MS;

  async function refreshSession(session: AuthSession): Promise<AuthSession> {
    try {
      const refreshedSession = await options.api.request<AuthSession>('refreshAuthSession', {
        body: { refreshToken: session.refreshToken },
      });
      await options.storage.set(refreshedSession);
      return refreshedSession;
    } catch (error) {
      if (error instanceof CoreApiError && error.status === 401) {
        await options.storage.clear();
      }

      throw error;
    }
  }

  return {
    async clearSession(): Promise<void> {
      await options.storage.clear();
    },

    async getAccessToken(): Promise<string | undefined> {
      const session = await options.storage.get();

      if (session === null) {
        return undefined;
      }

      if (isAccessTokenFresh(session, now(), refreshLeewayMs)) {
        return session.accessToken;
      }

      if (!isRefreshTokenFresh(session, now())) {
        await options.storage.clear();
        return undefined;
      }

      const refreshedSession = await refreshSession(session);
      return refreshedSession.accessToken;
    },

    async getSession(): Promise<AuthSession | null> {
      return options.storage.get();
    },

    async requireAccessToken(): Promise<string> {
      const accessToken = await this.getAccessToken();

      if (accessToken === undefined) {
        throw new AuthSessionUnavailableError();
      }

      return accessToken;
    },

    async setSession(session: AuthSession): Promise<void> {
      await options.storage.set(session);
    },

    async startOtp(phoneNumber: string, startOptions: StartOtpOptions = {}): Promise<OtpChallenge> {
      return options.api.request<OtpChallenge>('startOtpChallenge', {
        body: {
          countryCode: startOptions.countryCode ?? DEFAULT_COUNTRY_CODE,
          phoneNumber,
        },
      });
    },

    async verifyOtp(input: VerifyOtpInput): Promise<AuthSession> {
      const session = await options.api.request<AuthSession>('verifyOtpChallenge', {
        body: {
          challengeId: input.challengeId,
          code: input.code,
          deviceId: await resolveAwaitableValue(options.deviceId),
          role: options.role,
        },
      });

      await options.storage.set(session);
      return session;
    },
  };
}

export function createMemoryAuthStorage(initialSession: AuthSession | null = null): AuthStorage {
  let session = initialSession;

  return {
    clear(): void {
      session = null;
    },

    get(): AuthSession | null {
      return session;
    },

    set(nextSession: AuthSession): void {
      session = nextSession;
    },
  };
}

export function isAccessTokenFresh(
  session: AuthSession,
  now: Date = new Date(),
  leewayMs = DEFAULT_REFRESH_LEEWAY_MS,
): boolean {
  return expiresAfter(session.accessTokenExpiresAt, now, leewayMs);
}

export function isRefreshTokenFresh(session: AuthSession, now: Date = new Date()): boolean {
  return expiresAfter(session.refreshTokenExpiresAt, now, 0);
}

export class AuthSessionUnavailableError extends Error {
  public constructor(message = 'No valid auth session is available.') {
    super(message);
    this.name = 'AuthSessionUnavailableError';
  }
}

async function resolveAwaitableValue<T>(value: AwaitableValue<T>): Promise<T> {
  if (typeof value === 'function') {
    return (value as () => Awaitable<T>)();
  }

  return value;
}

function expiresAfter(expiresAt: string, now: Date, leewayMs: number): boolean {
  const expiresAtMs = Date.parse(expiresAt);

  return Number.isFinite(expiresAtMs) && expiresAtMs > now.getTime() + leewayMs;
}
