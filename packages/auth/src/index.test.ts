import { CoreApiError, type CoreApiClient, type CoreApiOperationId } from '@washed/api-client';
import { describe, expect, it } from 'vitest';

import {
  AuthSessionUnavailableError,
  createAuthManager,
  createMemoryAuthStorage,
  isAccessTokenFresh,
  isRefreshTokenFresh,
  type AuthSession,
} from './index.js';

interface ApiCall {
  readonly body?: unknown;
  readonly operationId: CoreApiOperationId;
}

describe('createAuthManager', () => {
  it('starts OTP challenges with the launch country code', async () => {
    const calls: ApiCall[] = [];
    const manager = createAuthManager({
      api: createApiStub(calls, {
        startOtpChallenge: {
          challengeId: '11111111-1111-4111-8111-111111111111',
          expiresAt: '2026-05-01T10:05:00.000Z',
          phoneNumber: '+22890000000',
          provider: 'mock',
          testCode: '123456',
        },
      }),
      deviceId: 'device-1',
      role: 'subscriber',
      storage: createMemoryAuthStorage(),
    });

    await expect(manager.startOtp('+22890000000')).resolves.toMatchObject({
      challengeId: '11111111-1111-4111-8111-111111111111',
    });
    expect(calls).toEqual([
      {
        body: {
          countryCode: 'TG',
          phoneNumber: '+22890000000',
        },
        operationId: 'startOtpChallenge',
      },
    ]);
  });

  it('verifies OTP challenges with role and device context, then stores the session', async () => {
    const calls: ApiCall[] = [];
    const session = makeSession();
    const storage = createMemoryAuthStorage();
    const manager = createAuthManager({
      api: createApiStub(calls, { verifyOtpChallenge: session }),
      deviceId: async () => 'ios-simulator-1',
      role: 'subscriber',
      storage,
    });

    await expect(
      manager.verifyOtp({
        challengeId: '11111111-1111-4111-8111-111111111111',
        code: '123456',
      }),
    ).resolves.toEqual(session);
    expect(await storage.get()).toEqual(session);
    expect(calls).toEqual([
      {
        body: {
          challengeId: '11111111-1111-4111-8111-111111111111',
          code: '123456',
          deviceId: 'ios-simulator-1',
          role: 'subscriber',
        },
        operationId: 'verifyOtpChallenge',
      },
    ]);
  });

  it('returns a fresh access token without refreshing', async () => {
    const calls: ApiCall[] = [];
    const manager = createAuthManager({
      api: createApiStub(calls, {}),
      deviceId: 'device-1',
      now: () => new Date('2026-05-01T10:00:00.000Z'),
      role: 'worker',
      storage: createMemoryAuthStorage(
        makeSession({
          accessToken: 'fresh-access',
          accessTokenExpiresAt: '2026-05-01T10:05:00.000Z',
        }),
      ),
    });

    await expect(manager.getAccessToken()).resolves.toBe('fresh-access');
    expect(calls).toEqual([]);
  });

  it('refreshes an expired access token while the refresh token is valid', async () => {
    const calls: ApiCall[] = [];
    const refreshed = makeSession({ accessToken: 'refreshed-access' });
    const storage = createMemoryAuthStorage(
      makeSession({
        accessToken: 'expired-access',
        accessTokenExpiresAt: '2026-05-01T09:59:00.000Z',
        refreshToken: 'refresh-1',
        refreshTokenExpiresAt: '2026-05-31T10:00:00.000Z',
      }),
    );
    const manager = createAuthManager({
      api: createApiStub(calls, { refreshAuthSession: refreshed }),
      deviceId: 'device-1',
      now: () => new Date('2026-05-01T10:00:00.000Z'),
      role: 'operator',
      storage,
    });

    await expect(manager.getAccessToken()).resolves.toBe('refreshed-access');
    expect(await storage.get()).toEqual(refreshed);
    expect(calls).toEqual([
      {
        body: { refreshToken: 'refresh-1' },
        operationId: 'refreshAuthSession',
      },
    ]);
  });

  it('clears sessions whose refresh token has expired', async () => {
    const storage = createMemoryAuthStorage(
      makeSession({
        accessTokenExpiresAt: '2026-05-01T09:59:00.000Z',
        refreshTokenExpiresAt: '2026-05-01T09:59:30.000Z',
      }),
    );
    const manager = createAuthManager({
      api: createApiStub([], {}),
      deviceId: 'device-1',
      now: () => new Date('2026-05-01T10:00:00.000Z'),
      role: 'subscriber',
      storage,
    });

    await expect(manager.getAccessToken()).resolves.toBeUndefined();
    expect(await storage.get()).toBeNull();
  });

  it('clears the session when refresh is rejected as unauthorized', async () => {
    const storage = createMemoryAuthStorage(
      makeSession({
        accessTokenExpiresAt: '2026-05-01T09:59:00.000Z',
        refreshTokenExpiresAt: '2026-05-31T10:00:00.000Z',
      }),
    );
    const manager = createAuthManager({
      api: {
        request: async () => {
          throw new CoreApiError('Refresh token revoked.', 401, 'core.auth.unauthorized');
        },
      },
      deviceId: 'device-1',
      now: () => new Date('2026-05-01T10:00:00.000Z'),
      role: 'subscriber',
      storage,
    });

    await expect(manager.getAccessToken()).rejects.toMatchObject({ status: 401 });
    expect(await storage.get()).toBeNull();
  });

  it('throws a typed error when a required session is unavailable', async () => {
    const manager = createAuthManager({
      api: createApiStub([], {}),
      deviceId: 'device-1',
      role: 'subscriber',
      storage: createMemoryAuthStorage(),
    });

    await expect(manager.requireAccessToken()).rejects.toBeInstanceOf(AuthSessionUnavailableError);
  });
});

describe('auth session freshness', () => {
  it('treats token expiry dates as stale inside the refresh leeway window', () => {
    const session = makeSession({ accessTokenExpiresAt: '2026-05-01T10:00:20.000Z' });

    expect(isAccessTokenFresh(session, new Date('2026-05-01T10:00:00.000Z'))).toBe(false);
    expect(isAccessTokenFresh(session, new Date('2026-05-01T10:00:00.000Z'), 5_000)).toBe(true);
  });

  it('rejects invalid refresh expiry values', () => {
    expect(isRefreshTokenFresh(makeSession({ refreshTokenExpiresAt: 'invalid-date' }))).toBe(false);
  });
});

function createApiStub(
  calls: ApiCall[],
  responses: Partial<Record<CoreApiOperationId, unknown>>,
): CoreApiClient {
  return {
    async request<TResponse>(operationId: CoreApiOperationId, options = {}): Promise<TResponse> {
      calls.push({ body: options.body, operationId });

      if (!(operationId in responses)) {
        throw new Error(`Unexpected API call: ${operationId}`);
      }

      return responses[operationId] as TResponse;
    },
  };
}

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    accessToken: 'access-1',
    accessTokenExpiresAt: '2026-05-01T10:05:00.000Z',
    refreshToken: 'refresh-1',
    refreshTokenExpiresAt: '2026-05-31T10:00:00.000Z',
    role: 'subscriber',
    sessionId: '22222222-2222-4222-8222-222222222222',
    userId: '33333333-3333-4333-8333-333333333333',
    ...overrides,
  };
}
