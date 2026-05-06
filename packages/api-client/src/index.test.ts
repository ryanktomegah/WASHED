import { describe, expect, it } from 'vitest';

import { CORE_API_OPERATIONS } from './operations.js';
import {
  CoreApiError,
  FRONTEND_OPERATION_IDS,
  createCoreApiClient,
  createDemoFrontendDataSource,
} from './index.js';

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

    const route = await client.request('getWorkerRoute', {
      pathParams: { workerId: '22222222-2222-4222-8222-222222222222' },
      query: { date: '2026-05-05' },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe('GET');
    expect(requests[0]?.url).toBe(
      'http://127.0.0.1:3000/v1/workers/22222222-2222-4222-8222-222222222222/route?date=2026-05-05',
    );
    expect(requests[0]?.headers.get('authorization')).toBe('Bearer token-123');
    expect(route).toEqual({ ok: true });
  });

  it('keeps explicit response typing available for untyped operations', async () => {
    const client = createCoreApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => Response.json({ status: 'ok' }),
    });

    const health = await client.request<{ readonly status: string }>('getHealth');

    expect(health.status).toBe('ok');
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
    expect(CORE_API_OPERATIONS).toHaveLength(93);
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'getCurrentSubscriberSubscription',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'pauseCurrentSubscriberSubscription',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'updateCurrentSubscriberPaymentMethod',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'getOperatorSubscriptionSupportContext',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'upsertSubscriberProfile',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'rescheduleCurrentSubscriberVisit',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'getCurrentSubscriberVisitDetail',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'createCurrentSubscriberPrivacyRequest',
    );
    expect(CORE_API_OPERATIONS.map((operation) => operation.operationId)).toContain(
      'listSubscriberSupportContacts',
    );
  });

  it('maps frontend actions to existing operation ids', () => {
    const operationIds = new Set(CORE_API_OPERATIONS.map((operation) => operation.operationId));
    const frontendOperationIds = Object.values(FRONTEND_OPERATION_IDS).flatMap((surface) =>
      Object.values(surface),
    );

    expect(frontendOperationIds.every((operationId) => operationIds.has(operationId))).toBe(true);
    expect(FRONTEND_OPERATION_IDS.subscriber.reportVisitIssue).toBe(
      'createCurrentSubscriberVisitDispute',
    );
    expect(FRONTEND_OPERATION_IDS.subscriber.skipVisit).toBe('skipCurrentSubscriberVisit');
    expect(FRONTEND_OPERATION_IDS.worker.checkIn).toBe('checkInVisit');
    expect(FRONTEND_OPERATION_IDS.operator.issueRefund).toBe('issueOperatorPaymentRefund');
  });

  it('loads isolated demo snapshots for the three production apps', async () => {
    const dataSource = createDemoFrontendDataSource();
    const first = await dataSource.loadSubscriberApp();
    const second = await dataSource.loadSubscriberApp();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.nextVisit.workerName).toBe('Akouvi');
    expect((await dataSource.loadWorkerApp()).offlineQueueCount).toBe(3);
    expect((await dataSource.loadOperatorConsole()).payments.exceptions).toBe(4);
  });
});
