import { performance } from 'node:perf_hooks';

import { createCoreApiApp, InMemoryCoreRepository } from '../packages/core-api/dist/index.js';

const SUBSCRIBER_COUNT = Number.parseInt(process.env.BETA_LOAD_SUBSCRIBERS ?? '30', 10);
const WORKER_COUNT = Number.parseInt(process.env.BETA_LOAD_WORKERS ?? '10', 10);
const MAX_LATENCY_MS = Number.parseInt(process.env.BETA_LOAD_MAX_LATENCY_MS ?? '1500', 10);

const app = createCoreApiApp({ repository: new InMemoryCoreRepository() });
const timings = [];

try {
  await runBetaLoad();
} finally {
  await app.close();
}

async function runBetaLoad() {
  await timed('health', () => injectOk({ method: 'GET', url: '/health' }));

  await Promise.all(
    Array.from({ length: WORKER_COUNT }, (_, index) =>
      timed(`worker:${index + 1}`, () =>
        injectOk({
          method: 'PUT',
          payload: {
            countryCode: 'TG',
            displayName: `Beta Worker ${index + 1}`,
            maxActiveSubscriptions: 12,
            serviceNeighborhoods: ['Tokoin', 'Be Kpota', 'Adidogome'],
            status: 'active',
          },
          url: `/v1/operator/workers/${workerId(index)}/profile`,
        }),
      ),
    ),
  );

  const subscriptions = await Promise.all(
    Array.from({ length: SUBSCRIBER_COUNT }, (_, index) =>
      timed(`subscription:${index + 1}`, async () => {
        const response = await injectOk({
          method: 'POST',
          payload: {
            address: {
              gpsLatitude: 6.1319 + index * 0.0001,
              gpsLongitude: 1.2228 + index * 0.0001,
              landmark: `Beta landmark ${index + 1}`,
              neighborhood: index % 2 === 0 ? 'Tokoin' : 'Be Kpota',
            },
            countryCode: 'TG',
            phoneNumber: `+22890${String(index + 1).padStart(6, '0')}`,
            schedulePreference: {
              dayOfWeek: 'tuesday',
              timeWindow: index % 2 === 0 ? 'morning' : 'afternoon',
            },
            tierCode: index % 2 === 0 ? 'T1' : 'T2',
          },
          url: '/v1/subscriptions',
        });
        return response.json();
      }),
    ),
  );

  await Promise.all(
    subscriptions.map((subscription, index) =>
      timed(`detail:${index + 1}`, () =>
        injectOk({
          method: 'GET',
          url: `/v1/subscriptions/${subscription.subscriptionId}`,
        }),
      ),
    ),
  );

  await Promise.all(
    subscriptions.slice(0, Math.min(10, subscriptions.length)).map((subscription, index) =>
      timed(`assign:${index + 1}`, () =>
        injectOk({
          method: 'POST',
          payload: {
            anchorDate: '2026-05-05',
            operatorUserId: '11111111-1111-4111-8111-111111111111',
            workerId: workerId(index % WORKER_COUNT),
          },
          url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
        }),
      ),
    ),
  );

  const sorted = timings.toSorted((left, right) => left.durationMs - right.durationMs);
  const p95 = percentile(sorted, 0.95);
  const max = sorted.at(-1)?.durationMs ?? 0;

  if (p95 > MAX_LATENCY_MS) {
    throw new Error(`Beta load p95 ${Math.round(p95)}ms exceeded ${MAX_LATENCY_MS}ms.`);
  }

  process.stdout.write(
    JSON.stringify(
      {
        maxMs: Math.round(max),
        operations: timings.length,
        p95Ms: Math.round(p95),
        subscribers: SUBSCRIBER_COUNT,
        workers: WORKER_COUNT,
      },
      null,
      2,
    ) + '\n',
  );
}

async function timed(name, action) {
  const startedAt = performance.now();
  const result = await action();
  timings.push({ durationMs: performance.now() - startedAt, name });
  return result;
}

async function injectOk(input) {
  const response = await app.inject(input);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `${input.method} ${input.url} returned ${response.statusCode}: ${response.body}`,
    );
  }

  return response;
}

function workerId(index) {
  const suffix = String(index + 1).padStart(12, '0');
  return `22222222-2222-4222-8222-${suffix}`;
}

function percentile(sortedTimings, ratio) {
  if (sortedTimings.length === 0) {
    return 0;
  }

  const index = Math.min(sortedTimings.length - 1, Math.ceil(sortedTimings.length * ratio) - 1);
  return sortedTimings[index]?.durationMs ?? 0;
}
