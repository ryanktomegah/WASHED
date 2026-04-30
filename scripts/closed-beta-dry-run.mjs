import { createCoreApiApp, InMemoryCoreRepository } from '../packages/core-api/dist/index.js';

const SUBSCRIBER_COUNT = 30;
const WORKER_COUNT = 10;
const operatorUserId = '11111111-1111-4111-8111-111111111111';
const app = createCoreApiApp({ repository: new InMemoryCoreRepository() });

try {
  const workers = await seedWorkers();
  const subscriptions = await seedSubscribers();
  await assignFirstRoutes(subscriptions, workers);
  await chargeAll(subscriptions);
  const metrics = await fetchMetrics();

  process.stdout.write(
    JSON.stringify(
      {
        assignedSubscribers: subscriptions.length,
        metrics: {
          paymentSuccess: metrics.payments.successRate,
          pendingMatch: metrics.subscribers.pendingMatch,
          subscribers: metrics.subscribers.total,
          workers: workers.length,
        },
        status: 'closed_beta_dry_run_ready',
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await app.close();
}

async function seedWorkers() {
  const workers = Array.from({ length: WORKER_COUNT }, (_, index) => ({
    displayName: `Beta Worker ${index + 1}`,
    workerId: workerId(index),
  }));

  for (const [index, worker] of workers.entries()) {
    await injectOk({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: worker.displayName,
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin', 'Be Kpota', 'Adidogome'],
        status: 'active',
      },
      url: `/v1/operator/workers/${worker.workerId}/profile`,
    });
  }

  return workers;
}

async function seedSubscribers() {
  const subscriptions = [];

  for (let index = 0; index < SUBSCRIBER_COUNT; index += 1) {
    const response = await injectOk({
      method: 'POST',
      payload: {
        address: {
          gpsLatitude: 6.1319 + index * 0.0001,
          gpsLongitude: 1.2228 + index * 0.0001,
          landmark: `Beta landmark ${index + 1}`,
          neighborhood: index % 3 === 0 ? 'Be Kpota' : index % 3 === 1 ? 'Tokoin' : 'Adidogome',
        },
        countryCode: 'TG',
        phoneNumber: `+22891${String(index + 1).padStart(6, '0')}`,
        schedulePreference: {
          dayOfWeek: index % 2 === 0 ? 'tuesday' : 'thursday',
          timeWindow: index % 2 === 0 ? 'morning' : 'afternoon',
        },
        tierCode: index % 2 === 0 ? 'T1' : 'T2',
      },
      url: '/v1/subscriptions',
    });
    subscriptions.push(response.json());
  }

  return subscriptions;
}

async function assignFirstRoutes(subscriptions, workers) {
  for (const [index, subscription] of subscriptions.entries()) {
    await injectOk({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId,
        workerId: workers[index % workers.length].workerId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
  }
}

async function chargeAll(subscriptions) {
  for (const [index, subscription] of subscriptions.entries()) {
    await injectOk({
      method: 'POST',
      payload: {
        chargedAt: '2026-05-01T08:00:00.000Z',
        idempotencyKey: `closed-beta-billing-${index + 1}`,
        mockOutcome: 'succeeded',
        operatorUserId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/mock-charge`,
    });
  }
}

async function fetchMetrics() {
  const response = await injectOk({
    method: 'GET',
    url: '/v1/operator/beta-metrics?countryCode=TG',
  });
  return response.json();
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
