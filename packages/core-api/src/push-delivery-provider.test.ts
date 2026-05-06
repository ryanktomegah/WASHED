import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createPushDeliveryProvider } from './push-delivery-provider.js';

const message = {
  aggregateId: '33333333-3333-4333-8333-333333333333',
  aggregateType: 'subscription',
  attemptCount: 0,
  availableAt: new Date('2026-05-01T10:00:00.000Z'),
  channel: 'push',
  countryCode: 'TG',
  createdAt: new Date('2026-05-01T10:00:00.000Z'),
  eventId: '88888888-8888-4888-8888-888888888888',
  failureReason: null,
  lastAttemptAt: null,
  messageId: '77777777-7777-4777-8777-777777777777',
  payload: {},
  provider: null,
  providerReference: null,
  recipientRole: 'subscriber',
  recipientUserId: null,
  sentAt: null,
  status: 'pending',
  templateKey: 'subscriber.assignment.confirmed.v1',
} as const;

describe('createPushDeliveryProvider', () => {
  it('sends through the local push simulator by default', async () => {
    const result = await createPushDeliveryProvider({}).deliver({
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      message,
    });

    expect(result).toEqual({
      failureReason: null,
      provider: 'local_push_simulator',
      providerReference: 'local_push_77777777-7777-4777-8777-777777777777',
      sentAt: new Date('2026-05-01T10:05:00.000Z'),
      status: 'sent',
    });
  });

  it('fails closed when APNs is selected without credentials', async () => {
    const result = await createPushDeliveryProvider({ PUSH_PROVIDER: 'apns' }).deliver({
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      message,
    });

    expect(result).toEqual({
      failureReason: 'missing_credentials:APNS_BUNDLE_ID,APNS_KEY_ID,APNS_PRIVATE_KEY,APNS_TEAM_ID',
      provider: 'apns',
      providerReference: null,
      sentAt: null,
      status: 'failed',
    });
  });

  it('keeps real FCM sends disabled even when credentials are present', async () => {
    const result = await createPushDeliveryProvider({
      FCM_CLIENT_EMAIL: 'firebase-adminsdk@washed-dev.iam.gserviceaccount.com',
      FCM_PRIVATE_KEY: 'secret-fcm-private-key',
      FCM_PROJECT_ID: 'washed-dev',
      PUSH_PROVIDER: 'fcm',
    }).deliver({
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      message,
    });

    expect(result).toMatchObject({
      failureReason: 'real_send_disabled',
      provider: 'fcm',
      status: 'failed',
    });
  });

  it('fails as retryable when real FCM sends are enabled but no push token is resolved', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const fetchStub = async (): Promise<Response> => {
      throw new Error('FCM should not be called without a token.');
    };

    const result = await createPushDeliveryProvider(
      {
        FCM_CLIENT_EMAIL: 'firebase-adminsdk@washed-dev.iam.gserviceaccount.com',
        FCM_PRIVATE_KEY: privateKeyPem,
        FCM_PROJECT_ID: 'washed-dev',
        PUSH_PROVIDER: 'fcm',
        PUSH_REAL_SEND_ENABLED: 'true',
      },
      fetchStub,
    ).deliver({
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      message,
    });

    expect(result).toMatchObject({
      failureReason: 'missing_push_token',
      provider: 'fcm',
      status: 'failed',
    });
  });

  it('sends through FCM HTTP v1 when explicitly enabled and a push token is present', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const requests: Array<{ readonly body: string; readonly url: string }> = [];
    const fetchStub = async (url: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
      requests.push({ body: String(init?.body ?? ''), url: String(url) });

      if (String(url) === 'https://oauth2.googleapis.com/token') {
        return Response.json({ access_token: 'ya29.test-token' });
      }

      return Response.json({
        name: 'projects/washed-dev/messages/0:abc123',
      });
    };

    const result = await createPushDeliveryProvider(
      {
        FCM_CLIENT_EMAIL: 'firebase-adminsdk@washed-dev.iam.gserviceaccount.com',
        FCM_PRIVATE_KEY: privateKeyPem,
        FCM_PROJECT_ID: 'washed-dev',
        PUSH_PROVIDER: 'fcm',
        PUSH_REAL_SEND_ENABLED: 'true',
      },
      fetchStub,
    ).deliver({
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      message: {
        ...message,
        payload: {
          bodyKey: 'notifications.subscriber.assignment_confirmed.body',
          pushToken: 'fcm-device-token',
          titleKey: 'notifications.subscriber.assignment_confirmed.title',
        },
      },
    });

    expect(result).toEqual({
      failureReason: null,
      provider: 'fcm',
      providerReference: 'projects/washed-dev/messages/0:abc123',
      sentAt: new Date('2026-05-01T10:05:00.000Z'),
      status: 'sent',
    });
    expect(requests.map((request) => request.url)).toEqual([
      'https://oauth2.googleapis.com/token',
      'https://fcm.googleapis.com/v1/projects/washed-dev/messages:send',
    ]);
    expect(JSON.parse(requests[1]?.body ?? '{}')).toMatchObject({
      message: {
        data: {
          aggregateId: '33333333-3333-4333-8333-333333333333',
          notificationId: '77777777-7777-4777-8777-777777777777',
          templateKey: 'subscriber.assignment.confirmed.v1',
        },
        notification: {
          body: 'Votre abonnement Washed est actif. Vos premieres visites sont planifiees.',
          title: 'Agent assigne',
        },
        token: 'fcm-device-token',
      },
    });
  }, 15_000);

  it('sends through APNs HTTP/2 when explicitly enabled and push tokens are resolved', async () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const requests: Array<{
      readonly authorization: string;
      readonly bundleId: string;
      readonly environment: string;
      readonly token: string;
    }> = [];

    const result = await createPushDeliveryProvider(
      {
        APNS_BUNDLE_ID: 'com.washed.subscriber',
        APNS_KEY_ID: 'ABC123DEFG',
        APNS_PRIVATE_KEY: privateKeyPem,
        APNS_TEAM_ID: 'TEAM123456',
        PUSH_PROVIDER: 'apns',
        PUSH_REAL_SEND_ENABLED: 'true',
      },
      fetch,
      async (input) => {
        requests.push({
          authorization: input.authorization,
          bundleId: input.bundleId,
          environment: input.environment,
          token: input.token,
        });
        return {
          failureReason: null,
          providerReference: `apns-${input.token}`,
          status: 'sent',
        };
      },
    ).deliver({
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      message,
      pushTokens: ['apns-token-1', 'apns-token-2'],
    });

    expect(result).toEqual({
      failureReason: null,
      provider: 'apns',
      providerReference: 'apns-apns-token-1,apns-apns-token-2',
      sentAt: new Date('2026-05-01T10:05:00.000Z'),
      status: 'sent',
    });
    expect(requests).toMatchObject([
      {
        bundleId: 'com.washed.subscriber',
        environment: 'development',
        token: 'apns-token-1',
      },
      {
        bundleId: 'com.washed.subscriber',
        environment: 'development',
        token: 'apns-token-2',
      },
    ]);
    expect(requests[0]?.authorization).toMatch(/^bearer .+\..+\..+$/u);
  });
});
