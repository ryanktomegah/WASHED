import { describe, expect, it } from 'vitest';

import { createOtpProvider } from './otp-provider.js';

describe('createOtpProvider', () => {
  it('uses the local test provider by default', async () => {
    const delivery = await createOtpProvider({}).startChallenge({
      countryCode: 'TG',
      phoneNumber: '+22890123456',
      traceId: 'trace_auth',
    });

    expect(delivery).toEqual({
      code: '123456',
      provider: 'test',
      testCode: '123456',
    });
  });

  it('fails closed when HTTP SMS is selected without credentials', async () => {
    const provider = createOtpProvider({ OTP_PROVIDER: 'sms_http' });

    await expect(
      provider.startChallenge({
        countryCode: 'TG',
        phoneNumber: '+22890123456',
        traceId: 'trace_auth',
      }),
    ).rejects.toThrow(
      'OTP provider sms_http is not send-capable: missing_credentials:SMS_OTP_API_KEY,SMS_OTP_ENDPOINT,SMS_OTP_SENDER_ID.',
    );
  });

  it('sends through HTTP SMS only when real send is explicitly enabled', async () => {
    const requests: Array<{
      readonly body: string;
      readonly headers: HeadersInit;
      readonly url: string;
    }> = [];
    const fetchStub = async (url: URL | RequestInfo, init?: RequestInit): Promise<Response> => {
      requests.push({
        body: String(init?.body ?? ''),
        headers: init?.headers ?? {},
        url: String(url),
      });
      return Response.json({ messageId: 'sms_123' });
    };

    const delivery = await createOtpProvider(
      {
        OTP_PROVIDER: 'sms_http',
        OTP_REAL_SEND_ENABLED: 'true',
        SMS_OTP_API_KEY: 'sms-secret',
        SMS_OTP_ENDPOINT: 'https://sms.example.test/send',
        SMS_OTP_SENDER_ID: 'WASHED',
      },
      fetchStub,
    ).startChallenge({
      countryCode: 'TG',
      phoneNumber: '+22890123456',
      traceId: 'trace_auth',
    });

    expect(delivery.provider).toBe('sms_http');
    expect(delivery.testCode).toBeNull();
    expect(delivery.code).toMatch(/^\d{6}$/u);
    expect(requests[0]?.url).toBe('https://sms.example.test/send');
    expect(JSON.parse(requests[0]?.body ?? '{}')).toMatchObject({
      countryCode: 'TG',
      phoneNumber: '+22890123456',
      senderId: 'WASHED',
      traceId: 'trace_auth',
    });
  });
});
