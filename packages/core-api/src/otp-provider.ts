import { randomInt } from 'node:crypto';

import type { CountryCode } from '@washed/shared';

export type OtpProviderKind = 'sms_http' | 'test';

export interface OtpDeliveryInput {
  readonly countryCode: CountryCode;
  readonly phoneNumber: string;
  readonly traceId: string;
}

export interface OtpDeliveryResult {
  readonly code: string;
  readonly provider: OtpProviderKind;
  readonly testCode: string | null;
}

export interface OtpProvider {
  startChallenge(input: OtpDeliveryInput): Promise<OtpDeliveryResult>;
}

type FetchLike = typeof fetch;

const SMS_HTTP_REQUIRED_KEYS = [
  'SMS_OTP_API_KEY',
  'SMS_OTP_ENDPOINT',
  'SMS_OTP_SENDER_ID',
] as const;

export function createOtpProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: FetchLike = fetch,
): OtpProvider {
  const provider = readOtpProvider(env['OTP_PROVIDER']);

  if (provider === 'test') {
    return new TestOtpProvider();
  }

  const missingKeys = SMS_HTTP_REQUIRED_KEYS.filter(
    (key) => env[key] === undefined || env[key] === '',
  );

  if (missingKeys.length > 0) {
    return new DisabledOtpProvider(provider, `missing_credentials:${missingKeys.join(',')}`);
  }

  if (env['OTP_REAL_SEND_ENABLED'] !== 'true') {
    return new DisabledOtpProvider(provider, 'real_send_disabled');
  }

  return new SmsHttpOtpProvider(env, fetchFn);
}

class TestOtpProvider implements OtpProvider {
  public async startChallenge(): Promise<OtpDeliveryResult> {
    return {
      code: '123456',
      provider: 'test',
      testCode: '123456',
    };
  }
}

class DisabledOtpProvider implements OtpProvider {
  public constructor(
    private readonly provider: OtpProviderKind,
    private readonly reason: string,
  ) {}

  public async startChallenge(): Promise<OtpDeliveryResult> {
    throw new Error(`OTP provider ${this.provider} is not send-capable: ${this.reason}.`);
  }
}

class SmsHttpOtpProvider implements OtpProvider {
  public constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly fetchFn: FetchLike,
  ) {}

  public async startChallenge(input: OtpDeliveryInput): Promise<OtpDeliveryResult> {
    const code = generateOtpCode();
    const endpoint = requireEnv(this.env, 'SMS_OTP_ENDPOINT');
    const response = await this.fetchFn(endpoint, {
      body: JSON.stringify({
        countryCode: input.countryCode,
        message: `Votre code Washed est ${code}.`,
        phoneNumber: input.phoneNumber,
        senderId: requireEnv(this.env, 'SMS_OTP_SENDER_ID'),
        traceId: input.traceId,
      }),
      headers: {
        authorization: `Bearer ${requireEnv(this.env, 'SMS_OTP_API_KEY')}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`OTP SMS provider request failed with status ${response.status}.`);
    }

    return {
      code,
      provider: 'sms_http',
      testCode: null,
    };
  }
}

function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function readOtpProvider(value: string | undefined): OtpProviderKind {
  if (value === undefined || value === 'test') {
    return 'test';
  }

  if (value === 'sms_http') {
    return 'sms_http';
  }

  throw new Error(`Unsupported OTP provider setting: ${value}.`);
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}
