import { createSign } from 'node:crypto';
import { connect } from 'node:http2';

import type { NotificationMessageRecord } from './repository.js';
import { localizeNotificationText } from './notification-localization.js';
import { getPushProviderReadiness, type PushProviderKind } from './push-provider-readiness.js';

type FetchLike = typeof fetch;

interface ApnsSendInput {
  readonly authorization: string;
  readonly body: string;
  readonly bundleId: string;
  readonly environment: string;
  readonly token: string;
}

interface ApnsSendResult {
  readonly failureReason: string | null;
  readonly providerReference: string | null;
  readonly status: 'failed' | 'sent';
}

type ApnsSendLike = (input: ApnsSendInput) => Promise<ApnsSendResult>;

export interface PushDeliveryInput {
  readonly deliveredAt: Date;
  readonly message: NotificationMessageRecord;
  readonly pushTokens?: readonly string[];
}

export interface PushDeliveryResult {
  readonly failureReason: string | null;
  readonly provider: PushProviderKind;
  readonly providerReference: string | null;
  readonly sentAt: Date | null;
  readonly status: 'failed' | 'sent';
}

export interface PushDeliveryProvider {
  readonly provider: PushProviderKind;
  deliver(input: PushDeliveryInput): Promise<PushDeliveryResult>;
}

export function createPushDeliveryProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: FetchLike = fetch,
  apnsSendFn: ApnsSendLike = sendApnsHttp2,
): PushDeliveryProvider {
  const readiness = getPushProviderReadiness(env);

  if (readiness.selectedProvider === 'local_push_simulator') {
    return new LocalPushSimulatorProvider();
  }

  const selected = readiness.providers.find(
    (provider) => provider.provider === readiness.selectedProvider,
  );

  if (selected === undefined || !selected.configured) {
    return new DisabledPushProvider(
      readiness.selectedProvider,
      `missing_credentials:${selected?.missingKeys.join(',') ?? 'unknown'}`,
    );
  }

  if (env['PUSH_REAL_SEND_ENABLED'] !== 'true') {
    return new DisabledPushProvider(readiness.selectedProvider, 'real_send_disabled');
  }

  if (readiness.selectedProvider === 'fcm') {
    return new FcmPushProvider(env, fetchFn);
  }

  return new ApnsPushProvider(env, apnsSendFn);
}

class LocalPushSimulatorProvider implements PushDeliveryProvider {
  public readonly provider = 'local_push_simulator';

  public async deliver(input: PushDeliveryInput): Promise<PushDeliveryResult> {
    return {
      failureReason: null,
      provider: this.provider,
      providerReference: `local_push_${input.message.messageId}`,
      sentAt: input.deliveredAt,
      status: 'sent',
    };
  }
}

class DisabledPushProvider implements PushDeliveryProvider {
  public constructor(
    public readonly provider: Exclude<PushProviderKind, 'local_push_simulator'>,
    private readonly reason: string,
  ) {}

  public async deliver(): Promise<PushDeliveryResult> {
    return {
      failureReason: this.reason,
      provider: this.provider,
      providerReference: null,
      sentAt: null,
      status: 'failed',
    };
  }
}

class FcmPushProvider implements PushDeliveryProvider {
  public readonly provider = 'fcm';

  public constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly fetchFn: FetchLike,
  ) {}

  public async deliver(input: PushDeliveryInput): Promise<PushDeliveryResult> {
    const tokens = readPushTokens(input);

    if (tokens.length === 0) {
      return {
        failureReason: 'missing_push_token',
        provider: this.provider,
        providerReference: null,
        sentAt: null,
        status: 'failed',
      };
    }

    const accessToken = await this.fetchAccessToken(input.deliveredAt);
    const projectId = requireEnv(this.env, 'FCM_PROJECT_ID');
    const providerReferences: string[] = [];
    let lastFailureReason = 'fcm_send_failed:unknown';

    for (const token of tokens) {
      const response = await this.fetchFn(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
        {
          body: JSON.stringify({
            message: {
              data: toFcmData(input.message),
              notification: {
                body: notificationBody(input.message),
                title: notificationTitle(input.message),
              },
              token,
            },
          }),
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          method: 'POST',
        },
      );
      const body = (await response.json()) as { name?: unknown; error?: unknown };

      if (!response.ok || typeof body.name !== 'string') {
        lastFailureReason = `fcm_send_failed:${response.status}`;
      } else {
        providerReferences.push(body.name);
      }
    }

    if (providerReferences.length === 0) {
      return {
        failureReason: lastFailureReason,
        provider: this.provider,
        providerReference: null,
        sentAt: null,
        status: 'failed',
      };
    }

    return {
      failureReason: null,
      provider: this.provider,
      providerReference: providerReferences.join(','),
      sentAt: input.deliveredAt,
      status: 'sent',
    };
  }

  private async fetchAccessToken(now: Date): Promise<string> {
    const response = await this.fetchFn('https://oauth2.googleapis.com/token', {
      body: new URLSearchParams({
        assertion: signGoogleServiceAccountJwt(this.env, now),
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      method: 'POST',
    });
    const body = (await response.json()) as { access_token?: unknown };

    if (!response.ok || typeof body.access_token !== 'string') {
      throw new Error(`FCM access token request failed with status ${response.status}.`);
    }

    return body.access_token;
  }
}

class ApnsPushProvider implements PushDeliveryProvider {
  public readonly provider = 'apns';

  public constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly sendFn: ApnsSendLike,
  ) {}

  public async deliver(input: PushDeliveryInput): Promise<PushDeliveryResult> {
    const tokens = readPushTokens(input);

    if (tokens.length === 0) {
      return {
        failureReason: 'missing_push_token',
        provider: this.provider,
        providerReference: null,
        sentAt: null,
        status: 'failed',
      };
    }

    const authorization = `bearer ${signAppleProviderJwt(this.env, input.deliveredAt)}`;
    const body = JSON.stringify({
      aps: {
        alert: {
          body: notificationBody(input.message),
          title: notificationTitle(input.message),
        },
        sound: 'default',
      },
      data: toPushData(input.message),
    });
    const providerReferences: string[] = [];
    let lastFailureReason = 'apns_send_failed:unknown';

    for (const token of tokens) {
      const result = await this.sendFn({
        authorization,
        body,
        bundleId: requireEnv(this.env, 'APNS_BUNDLE_ID'),
        environment: this.env['PUSH_ENVIRONMENT'] ?? 'development',
        token,
      });

      if (result.status === 'sent') {
        if (result.providerReference !== null) {
          providerReferences.push(result.providerReference);
        }
      } else {
        lastFailureReason = result.failureReason ?? lastFailureReason;
      }
    }

    if (providerReferences.length === 0) {
      return {
        failureReason: lastFailureReason,
        provider: this.provider,
        providerReference: null,
        sentAt: null,
        status: 'failed',
      };
    }

    return {
      failureReason: null,
      provider: this.provider,
      providerReference: providerReferences.join(','),
      sentAt: input.deliveredAt,
      status: 'sent',
    };
  }
}

function signGoogleServiceAccountJwt(env: NodeJS.ProcessEnv, now: Date): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = encodeBase64Url({ alg: 'RS256', typ: 'JWT' });
  const payload = encodeBase64Url({
    aud: 'https://oauth2.googleapis.com/token',
    exp: issuedAt + 3600,
    iat: issuedAt,
    iss: requireEnv(env, 'FCM_CLIENT_EMAIL'),
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  });
  const signingInput = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(normalizePrivateKey(requireEnv(env, 'FCM_PRIVATE_KEY')), 'base64url');

  return `${signingInput}.${signature}`;
}

function signAppleProviderJwt(env: NodeJS.ProcessEnv, now: Date): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = encodeBase64Url({
    alg: 'ES256',
    kid: requireEnv(env, 'APNS_KEY_ID'),
    typ: 'JWT',
  });
  const payload = encodeBase64Url({
    iat: issuedAt,
    iss: requireEnv(env, 'APNS_TEAM_ID'),
  });
  const signingInput = `${header}.${payload}`;
  const signature = createSign('SHA256')
    .update(signingInput)
    .sign(
      {
        dsaEncoding: 'ieee-p1363',
        key: normalizePrivateKey(requireEnv(env, 'APNS_PRIVATE_KEY')),
      },
      'base64url',
    );

  return `${signingInput}.${signature}`;
}

function toFcmData(message: NotificationMessageRecord): Record<string, string> {
  return toPushData(message);
}

function toPushData(message: NotificationMessageRecord): Record<string, string> {
  return {
    aggregateId: message.aggregateId,
    aggregateType: message.aggregateType,
    notificationId: message.messageId,
    templateKey: message.templateKey,
  };
}

function encodeBase64Url(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/gu, '\n');
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function notificationBody(message: NotificationMessageRecord): string {
  const bodyKey = readOptionalString(message.payload['bodyKey']);

  if (bodyKey === undefined) {
    return message.templateKey;
  }

  return localizeNotificationText(bodyKey, readOptionalString(message.payload['locale']));
}

function notificationTitle(message: NotificationMessageRecord): string {
  const titleKey = readOptionalString(message.payload['titleKey']);

  if (titleKey === undefined) {
    return 'Washed notification';
  }

  return localizeNotificationText(titleKey, readOptionalString(message.payload['locale']));
}

function readPushTokens(input: PushDeliveryInput): readonly string[] {
  const tokens = new Set<string>();

  for (const token of input.pushTokens ?? []) {
    const parsed = readOptionalString(token);

    if (parsed !== undefined) {
      tokens.add(parsed);
    }
  }

  const payloadToken = readOptionalString(input.message.payload['pushToken']);

  if (payloadToken !== undefined) {
    tokens.add(payloadToken);
  }

  const payloadTokens = input.message.payload['pushTokens'];

  if (Array.isArray(payloadTokens)) {
    for (const token of payloadTokens) {
      const parsed = readOptionalString(token);

      if (parsed !== undefined) {
        tokens.add(parsed);
      }
    }
  }

  return [...tokens];
}

function sendApnsHttp2(input: ApnsSendInput): Promise<ApnsSendResult> {
  const origin =
    input.environment === 'production'
      ? 'https://api.push.apple.com'
      : 'https://api.sandbox.push.apple.com';

  return new Promise((resolve, reject) => {
    const client = connect(origin);
    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${input.token}`,
      authorization: input.authorization,
      'apns-priority': '10',
      'apns-push-type': 'alert',
      'apns-topic': input.bundleId,
      'content-type': 'application/json',
    });
    const chunks: Buffer[] = [];

    client.once('error', reject);
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      chunks.push(Buffer.from(chunk));
    });
    request.once('error', reject);
    request.once('response', (headers) => {
      const status = Number(headers[':status']);
      const apnsId = typeof headers['apns-id'] === 'string' ? headers['apns-id'] : null;

      request.once('end', () => {
        client.close();

        if (status >= 200 && status < 300) {
          resolve({
            failureReason: null,
            providerReference: apnsId,
            status: 'sent',
          });
          return;
        }

        const responseBody = Buffer.concat(chunks).toString('utf8');
        resolve({
          failureReason: `apns_send_failed:${status}:${responseBody}`,
          providerReference: null,
          status: 'failed',
        });
      });
    });
    request.end(input.body);
  });
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}
