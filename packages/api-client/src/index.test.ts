import { describe, expect, it } from 'vitest';

import { CORE_API_OPERATIONS } from './operations.js';
import { CoreApiError, createCoreApiClient } from './index.js';

describe('createCoreApiClient', () => {
  it('builds requests from OpenAPI operation ids', async () => {
    const requests: Request[] = [];
    const client = createCoreApiClient({
      baseUrl: 'http://127.0.0.1:3000/',
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        return Response.json({ ok: true });
      },
      getAccessToken: () => 'token-123',
    });

    await client.request('getWorkerRoute', {
      pathParams: { workerId: '22222222-2222-4222-8222-222222222222' },
      query: { date: '2026-05-05' },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe('GET');
    expect(requests[0]?.url).toBe(
      'http://127.0.0.1:3000/v1/workers/22222222-2222-4222-8222-222222222222/route?date=2026-05-05',
    );
    expect(requests[0]?.headers.get('authorization')).toBe('Bearer token-123');
  });

  it('sends JSON bodies and idempotency keys', async () => {
    const requests: Request[] = [];
    const client = createCoreApiClient({
      baseUrl: 'http://api.test',
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        return Response.json({ subscriptionId: 'sub_1' }, { status: 201 });
      },
    });

    await client.request('createSubscription', {
      body: { tierCode: 'T1' },
      idempotencyKey: 'subscription-1',
    });

    expect(requests[0]?.headers.get('content-type')).toBe('application/json');
    expect(requests[0]?.headers.get('idempotency-key')).toBe('subscription-1');
    await expect(requests[0]?.json()).resolves.toEqual({ tierCode: 'T1' });
  });

  it('throws structured API errors', async () => {
    const client = createCoreApiClient({
      baseUrl: 'http://api.test',
      fetch: async () =>
        Response.json(
          { code: 'core.auth.unauthorized', message: 'No token.', traceId: 'trace-1' },
          { status: 401 },
        ),
    });

    await expect(client.request('getOperatorBetaMetrics')).rejects.toMatchObject({
      code: 'core.auth.unauthorized',
      message: 'No token.',
      status: 401,
      traceId: 'trace-1',
    } satisfies Partial<CoreApiError>);
  });

  it('keeps generated operation ids complete', () => {
    expect(CORE_API_OPERATIONS).toHaveLength(65);
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'getOperatorSubscriptionSupportContext',
    );
  });
});
