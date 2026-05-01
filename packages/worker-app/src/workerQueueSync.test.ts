import { describe, expect, it } from 'vitest';

import { createLegacyOfflineQueue } from './workerState.js';
import { syncWorkerOfflineQueue } from './workerQueueSync.js';

describe('syncWorkerOfflineQueue', () => {
  it('keeps demo mode explicit when no API base URL is configured', async () => {
    const queue = createLegacyOfflineQueue(2);

    await expect(syncWorkerOfflineQueue(queue, { baseUrl: '' })).resolves.toEqual({
      mode: 'demo',
      syncedCount: 2,
    });
  });

  it('submits queued operations with path params, body, and idempotency keys', async () => {
    const [item] = createLegacyOfflineQueue(1);
    const requests: Request[] = [];
    const fetchMock: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    };

    await expect(
      syncWorkerOfflineQueue([item!], {
        authToken: 'worker-token',
        baseUrl: 'http://127.0.0.1:3000',
        fetch: fetchMock,
      }),
    ).resolves.toEqual({
      mode: 'api',
      syncedCount: 1,
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe(
      'http://127.0.0.1:3000/v1/visits/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/photos',
    );
    expect(requests[0]?.headers.get('authorization')).toBe('Bearer worker-token');
    expect(requests[0]?.headers.get('idempotency-key')).toBe(item?.idempotencyKey);
    await expect(requests[0]?.json()).resolves.toMatchObject({
      objectKey: 'visits/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/before-1.jpg',
      photoType: 'before',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
  });
});
