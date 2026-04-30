import { afterEach, describe, expect, it } from 'vitest';

import { createCoreApiApp } from './app.js';
import { issueAuthTokens, type AuthRole } from './auth-tokens.js';
import type { ObservabilityProvider } from './observability-provider.js';
import type { ObjectStorageProvider } from './object-storage-provider.js';
import type { PaymentProvider, WorkerPayoutProviderInput } from './payment-provider.js';
import { InMemoryCoreRepository } from './repository.js';

const validBody = {
  address: {
    gpsLatitude: 6.1319,
    gpsLongitude: 1.2228,
    landmark: 'Pres de la pharmacie du quartier',
    neighborhood: 'Tokoin',
  },
  countryCode: 'TG',
  phoneNumber: '+22890123456',
  schedulePreference: {
    dayOfWeek: 'tuesday',
    timeWindow: 'morning',
  },
  tierCode: 'T1',
};

function authHeader(role: AuthRole): { readonly authorization: string } {
  const tokens = issueAuthTokens({
    now: new Date(),
    phoneNumber:
      role === 'subscriber'
        ? '+22890123456'
        : role === 'operator'
          ? '+22890000001'
          : '+22890000002',
    role,
    sessionId: `session-${role}`,
    userId:
      role === 'subscriber'
        ? '99999999-9999-4999-8999-999999999999'
        : role === 'operator'
          ? '11111111-1111-4111-8111-111111111111'
          : '22222222-2222-4222-8222-222222222222',
  });

  return { authorization: `Bearer ${tokens.accessToken}` };
}

function createPayoutProviderStub(): {
  readonly payoutInputs: WorkerPayoutProviderInput[];
  readonly provider: PaymentProvider;
} {
  const payoutInputs: WorkerPayoutProviderInput[] = [];

  return {
    payoutInputs,
    provider: {
      async chargeSubscription(input) {
        return {
          provider: 'mock',
          providerReference: `mock_${input.idempotencyKey}`,
          status: input.mockOutcome,
        };
      },
      async payoutWorker(input) {
        payoutInputs.push(input);
        return {
          failureReason: null,
          provider: 'mobile_money_http',
          providerReference: 'mobile-money-payout-123',
          status: 'paid',
        };
      },
      async refundPayment() {
        return {
          provider: 'manual',
          providerReference: null,
          status: 'issued',
        };
      },
    },
  };
}

function createObjectStorageProviderStub(): {
  readonly inputs: Parameters<ObjectStorageProvider['createUploadUrl']>[0][];
  readonly provider: ObjectStorageProvider;
} {
  const inputs: Parameters<ObjectStorageProvider['createUploadUrl']>[0][] = [];

  return {
    inputs,
    provider: {
      async createUploadUrl(input) {
        inputs.push(input);
        return {
          expiresAt: new Date('2026-05-05T09:10:00.000Z'),
          headers: { 'content-type': input.contentType },
          method: 'PUT',
          objectKey: input.objectKey,
          provider: 'local_signed_url',
          uploadUrl: `http://storage.local/${input.objectKey}`,
        };
      },
    },
  };
}

function createObservabilityProviderStub(): {
  readonly inputs: Parameters<ObservabilityProvider['captureException']>[0][];
  readonly provider: ObservabilityProvider;
} {
  const inputs: Parameters<ObservabilityProvider['captureException']>[0][] = [];

  return {
    inputs,
    provider: {
      async captureException(input) {
        inputs.push(input);
        return {
          eventId: 'observability-event-1',
          provider: 'local_structured_log',
          status: 'sent',
        };
      },
    },
  };
}

async function uploadVisitPhotos(
  app: ReturnType<typeof createCoreApiApp>,
  visitId: string | undefined,
  workerId = '22222222-2222-4222-8222-222222222222',
): Promise<void> {
  for (const photoType of ['before', 'after'] as const) {
    const response = await app.inject({
      method: 'POST',
      payload: {
        byteSize: photoType === 'before' ? 128_000 : 142_000,
        capturedAt:
          photoType === 'before' ? '2026-05-05T09:05:00.000Z' : '2026-05-05T09:35:00.000Z',
        contentType: 'image/jpeg',
        objectKey: `visits/${visitId}/${photoType}.jpg`,
        photoType,
        workerId,
      },
      url: `/v1/visits/${visitId}/photos`,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      objectKey: `visits/${visitId}/${photoType}.jpg`,
      photoType,
      visitId,
      workerId,
    });
  }
}

describe('core api app', () => {
  const apps = new Set<ReturnType<typeof createCoreApiApp>>();

  afterEach(async () => {
    await Promise.all([...apps].map((app) => app.close()));
    apps.clear();
  });

  it('returns health and readiness', async () => {
    const app = createCoreApiApp();
    apps.add(app);

    await expect(app.inject({ method: 'GET', url: '/health' })).resolves.toMatchObject({
      statusCode: 200,
    });

    const ready = await app.inject({ method: 'GET', url: '/ready' });
    expect(ready.json()).toEqual({ repository: 'ok', status: 'ok' });
  });

  it('exposes Lome launch pricing without a four-visit tier', async () => {
    const app = createCoreApiApp();
    apps.add(app);

    const response = await app.inject({ method: 'GET', url: '/v1/pricing/lome' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      countryCode: 'TG',
      tiers: [
        {
          code: 'T1',
          monthlyPrice: { amountMinor: '2500', currencyCode: 'XOF' },
          nameKey: 'pricing.tiers.t1',
          visitsPerCycle: 1,
        },
        {
          code: 'T2',
          monthlyPrice: { amountMinor: '4500', currencyCode: 'XOF' },
          nameKey: 'pricing.tiers.t2',
          visitsPerCycle: 2,
        },
      ],
    });
  });

  it('enforces role route guards when enabled', async () => {
    const app = createCoreApiApp({
      repository: new InMemoryCoreRepository(),
      routeGuardsEnabled: true,
    });
    apps.add(app);

    const publicPricing = await app.inject({ method: 'GET', url: '/v1/pricing/lome' });
    const missingOperator = await app.inject({
      method: 'GET',
      url: '/v1/operator/matching-queue?countryCode=TG&limit=1',
    });
    const wrongRole = await app.inject({
      headers: authHeader('subscriber'),
      method: 'GET',
      url: '/v1/operator/matching-queue?countryCode=TG&limit=1',
    });
    const operator = await app.inject({
      headers: authHeader('operator'),
      method: 'GET',
      url: '/v1/operator/matching-queue?countryCode=TG&limit=1',
    });
    const workerRoute = await app.inject({
      headers: authHeader('worker'),
      method: 'GET',
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/route?date=2026-05-05',
    });

    expect(publicPricing.statusCode).toBe(200);
    expect(missingOperator.statusCode).toBe(401);
    expect(missingOperator.json()).toMatchObject({ code: 'core.auth.unauthorized' });
    expect(wrongRole.statusCode).toBe(403);
    expect(wrongRole.json()).toMatchObject({ code: 'core.auth.forbidden' });
    expect(operator.statusCode).toBe(200);
    expect(workerRoute.statusCode).toBe(200);
  });

  it('starts, verifies, and refreshes an OTP auth session', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const startResponse = await app.inject({
      method: 'POST',
      payload: {
        countryCode: 'TG',
        phoneNumber: '+22890123456',
      },
      url: '/v1/auth/otp/start',
    });
    const challenge = startResponse.json() as { challengeId: string; testCode: string };

    expect(startResponse.statusCode).toBe(201);
    expect(startResponse.json()).toMatchObject({
      phoneNumber: '+22890123456',
      provider: 'test',
      testCode: '123456',
    });

    const verifyResponse = await app.inject({
      method: 'POST',
      payload: {
        challengeId: challenge.challengeId,
        code: challenge.testCode,
        deviceId: 'ios-device-1',
        role: 'subscriber',
      },
      url: '/v1/auth/otp/verify',
    });

    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.json()).toMatchObject({
      accessToken: expect.any(String),
      accessTokenExpiresAt: expect.any(String),
      refreshToken: expect.any(String),
      refreshTokenExpiresAt: expect.any(String),
      role: 'subscriber',
      sessionId: expect.any(String),
      userId: expect.any(String),
    });

    const refreshResponse = await app.inject({
      method: 'POST',
      payload: {
        refreshToken: verifyResponse.json().refreshToken,
      },
      url: '/v1/auth/refresh',
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.json()).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      role: 'subscriber',
      userId: verifyResponse.json().userId,
    });
    expect(refreshResponse.json().refreshToken).not.toBe(verifyResponse.json().refreshToken);
  });

  it('registers app push device tokens for authenticated simulators', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const startResponse = await app.inject({
      method: 'POST',
      payload: {
        countryCode: 'TG',
        phoneNumber: '+22890123456',
      },
      url: '/v1/auth/otp/start',
    });
    const challenge = startResponse.json() as { challengeId: string; testCode: string };
    const verifyResponse = await app.inject({
      method: 'POST',
      payload: {
        challengeId: challenge.challengeId,
        code: challenge.testCode,
        deviceId: 'ios-simulator-1',
        role: 'subscriber',
      },
      url: '/v1/auth/otp/verify',
    });

    const registerResponse = await app.inject({
      headers: {
        authorization: `Bearer ${verifyResponse.json().accessToken}`,
      },
      method: 'POST',
      payload: {
        app: 'subscriber',
        deviceId: 'ios-simulator-1',
        environment: 'simulator',
        platform: 'ios',
        token: 'apns-simulator-token-1234567890',
      },
      url: '/v1/devices/push-token',
    });

    expect(registerResponse.statusCode).toBe(201);
    expect(registerResponse.json()).toMatchObject({
      app: 'subscriber',
      countryCode: 'TG',
      deviceId: 'ios-simulator-1',
      environment: 'simulator',
      platform: 'ios',
      role: 'subscriber',
      status: 'active',
      tokenPreview: 'apns-s...7890',
      userId: verifyResponse.json().userId,
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/operator/push-devices?countryCode=TG&role=subscriber&status=active&limit=10',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      filters: { role: 'subscriber', status: 'active' },
      items: [
        {
          app: 'subscriber',
          deviceId: 'ios-simulator-1',
          environment: 'simulator',
          platform: 'ios',
          role: 'subscriber',
        },
      ],
    });
  });

  it('creates signed upload targets for visit photos', async () => {
    const storage = createObjectStorageProviderStub();
    const app = createCoreApiApp({ objectStorageProvider: storage.provider });
    apps.add(app);

    const response = await app.inject({
      method: 'POST',
      payload: {
        byteSize: 128_000,
        contentType: 'image/jpeg',
        objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
      },
      url: '/v1/visits/44444444-4444-4444-8444-444444444444/photo-uploads',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      expiresAt: '2026-05-05T09:10:00.000Z',
      headers: { 'content-type': 'image/jpeg' },
      method: 'PUT',
      objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
      provider: 'local_signed_url',
      uploadUrl: 'http://storage.local/visits/44444444-4444-4444-8444-444444444444/before.jpg',
    });
    expect(storage.inputs).toHaveLength(1);
    expect(storage.inputs[0]).toMatchObject({
      byteSize: 128_000,
      contentType: 'image/jpeg',
      objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
    });
  });

  it('captures unhandled route errors with a safe response', async () => {
    const observability = createObservabilityProviderStub();
    const app = createCoreApiApp({ observabilityProvider: observability.provider });
    apps.add(app);
    app.get('/boom', async () => {
      throw new Error('database password leaked here');
    });

    const response = await app.inject({
      headers: { 'x-trace-id': 'trace_unhandled' },
      method: 'GET',
      url: '/boom',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'core.internal_error',
      message: 'Une erreur est survenue. Réessayez ou contactez le support.',
      traceId: 'trace_unhandled',
    });
    expect(observability.inputs).toHaveLength(1);
    expect(observability.inputs[0]).toMatchObject({
      request: { method: 'GET', url: '/boom' },
      traceId: 'trace_unhandled',
    });
  });

  it('reports closed-beta operating metrics from real records', async () => {
    const app = createCoreApiApp();
    apps.add(app);

    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Beta Worker',
        maxActiveSubscriptions: 10,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json();
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visitId = assignmentResponse.json().visits[0].visitId;

    await app.inject({
      method: 'POST',
      payload: {
        chargedAt: '2026-05-01T08:00:00.000Z',
        idempotencyKey: 'billing-beta-1',
        mockOutcome: 'succeeded',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/mock-charge`,
    });
    await app.inject({
      method: 'POST',
      payload: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        location: { latitude: 6.1319, longitude: 1.2228 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visitId}/check-in`,
    });
    await uploadVisitPhotos(app, visitId);
    await app.inject({
      method: 'POST',
      payload: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        location: { latitude: 6.1319, longitude: 1.2228 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visitId}/check-out`,
    });
    await app.inject({
      method: 'POST',
      payload: {
        createdAt: '2026-05-05T09:30:00.000Z',
        description: 'Beta worker support issue.',
        issueType: 'other',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visitId}/worker-issues`,
    });

    const metricsResponse = await app.inject({
      method: 'GET',
      url: '/v1/operator/beta-metrics?countryCode=TG',
    });

    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.json()).toMatchObject({
      countryCode: 'TG',
      disputes: { open: 0, total: 0 },
      nps: null,
      payments: { failed: 0, successRate: 1, succeeded: 1, total: 1 },
      subscribers: { active: 1, total: 1 },
      supportLoad: { openWorkerIssues: 1, totalWorkerIssues: 1 },
      visits: {
        averageDurationMinutes: 45,
        completed: 1,
        completionRate: 1,
        disputed: 0,
        totalClosed: 1,
      },
      workerSatisfaction: null,
    });
  });

  it('exposes push provider readiness without credential values', async () => {
    const app = createCoreApiApp({ repository: new InMemoryCoreRepository() });
    apps.add(app);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/operator/push-provider-readiness',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      environment: 'simulator',
      realSendEnabled: false,
      selectedProviderCanSend: true,
      selectedProvider: 'local_push_simulator',
      selectedProviderConfigured: true,
    });
    expect(response.body).not.toContain('secret-private-key');
  });

  it('exposes payment provider readiness without credential values', async () => {
    const app = createCoreApiApp({ repository: new InMemoryCoreRepository() });
    apps.add(app);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/operator/payment-provider-readiness',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      selectedProvider: 'mock',
      selectedProviderCanCharge: true,
      selectedProviderCanRefund: true,
    });
    expect(response.body).not.toContain('payment-secret');
  });

  it('rejects invalid OTP codes', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const startResponse = await app.inject({
      method: 'POST',
      payload: {
        countryCode: 'TG',
        phoneNumber: '+22890123456',
      },
      url: '/v1/auth/otp/start',
    });
    const challenge = startResponse.json() as { challengeId: string };
    const verifyResponse = await app.inject({
      method: 'POST',
      payload: {
        challengeId: challenge.challengeId,
        code: '000000',
        deviceId: 'ios-device-1',
        role: 'subscriber',
      },
      url: '/v1/auth/otp/verify',
    });

    expect(verifyResponse.statusCode).toBe(400);
    expect(verifyResponse.json()).toMatchObject({
      code: 'core.auth_otp_verify.invalid_request',
      message: 'OTP code is invalid.',
    });
  });

  it('creates a pending-match subscription and records a domain event', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const response = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      assignmentSlaHours: 4,
      countryCode: 'TG',
      currencyCode: 'XOF',
      monthlyPriceMinor: '2500',
      status: 'pending_match',
      tierCode: 'T1',
      visitsPerCycle: 1,
    });
    expect(repository.subscriptions).toHaveLength(1);
    expect(repository.subscriptions[0]?.events[0]?.eventType).toBe('SubscriptionCreated');
  });

  it('assigns a worker and generates the first four visits', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as {
      subscriberId: string;
      subscriptionId: string;
    };
    const response = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'active',
      subscriptionId: subscription.subscriptionId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(response.json().visits).toMatchObject([
      { scheduledDate: '2026-05-05', scheduledTimeWindow: 'morning', status: 'scheduled' },
      { scheduledDate: '2026-05-12', scheduledTimeWindow: 'morning', status: 'scheduled' },
      { scheduledDate: '2026-05-19', scheduledTimeWindow: 'morning', status: 'scheduled' },
      { scheduledDate: '2026-05-26', scheduledTimeWindow: 'morning', status: 'scheduled' },
    ]);
    expect(repository.assignments[0]?.events[0]?.eventType).toBe('SubscriberAssigned');
    expect(repository.assignmentDecisions[0]).toMatchObject({
      decision: 'assigned',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      reason: 'operator_selected_worker',
      subscriptionId: subscription.subscriptionId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.assignmentDecisions[0]?.events[0]).toMatchObject({
      aggregateType: 'assignment_decision',
      eventType: 'AssignmentDecisionRecorded',
      payload: {
        decision: 'assigned',
        reason: 'operator_selected_worker',
        subscriptionId: subscription.subscriptionId,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    });
  });

  it('records an operator-declined matching candidate without assigning', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });

    const response = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/assignment-decisions`,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      anchorDate: '2026-05-05',
      decision: 'declined',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      reason: 'operator_declined_candidate',
      subscriptionId: subscription.subscriptionId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.assignments).toHaveLength(0);
    expect(repository.assignmentDecisions[0]).toMatchObject({
      decision: 'declined',
      reason: 'operator_declined_candidate',
      subscriptionId: subscription.subscriptionId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.assignmentDecisions[0]?.events[0]).toMatchObject({
      aggregateType: 'assignment_decision',
      eventType: 'AssignmentDecisionRecorded',
      payload: {
        decision: 'declined',
        reason: 'operator_declined_candidate',
        subscriptionId: subscription.subscriptionId,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    });
  });

  it('lists audit events for replay with filters', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/assignment-decisions`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/operator/audit-events?countryCode=TG&eventType=AssignmentDecisionRecorded&limit=10',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      countryCode: 'TG',
      filters: {
        aggregateId: null,
        aggregateType: null,
        eventType: 'AssignmentDecisionRecorded',
      },
      items: [
        {
          actor: { role: 'operator', userId: '11111111-1111-4111-8111-111111111111' },
          aggregateType: 'assignment_decision',
          countryCode: 'TG',
          eventType: 'AssignmentDecisionRecorded',
          payload: {
            decision: 'declined',
            reason: 'operator_declined_candidate',
            subscriptionId: subscription.subscriptionId,
            workerId: '22222222-2222-4222-8222-222222222222',
          },
          traceId: expect.any(String),
        },
      ],
      limit: 10,
    });
    expect(response.json().items[0]).toMatchObject({
      eventId: expect.any(String),
      occurredAt: expect.any(String),
      recordedAt: expect.any(String),
    });
  });

  it('lists pending notification messages produced from domain events', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/operator/notifications?countryCode=TG&status=pending&limit=10',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      countryCode: 'TG',
      filters: {
        aggregateId: null,
        aggregateType: null,
        channel: null,
        status: 'pending',
        templateKey: null,
      },
      items: [
        {
          aggregateId: subscription.subscriptionId,
          aggregateType: 'subscription',
          channel: 'push',
          countryCode: 'TG',
          payload: {
            status: 'active',
            subscriptionId: subscription.subscriptionId,
            titleKey: 'notifications.subscriber.assignment_confirmed.title',
            workerId: '22222222-2222-4222-8222-222222222222',
          },
          recipientRole: 'subscriber',
          recipientUserId: null,
          status: 'pending',
          templateKey: 'subscriber.assignment.confirmed.v1',
        },
      ],
      limit: 10,
    });
    expect(response.json().items[0]).toMatchObject({
      availableAt: expect.any(String),
      createdAt: expect.any(String),
      eventId: expect.any(String),
      messageId: expect.any(String),
    });
  });

  it('delivers due notifications with the local provider', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const response = await app.inject({
      method: 'POST',
      payload: {
        countryCode: 'TG',
        deliveredAt: '2026-05-05T10:00:00.000Z',
        limit: 10,
      },
      url: '/v1/operator/notifications/deliver-due',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      countryCode: 'TG',
      deliveredAt: '2026-05-05T10:00:00.000Z',
      items: [
        {
          aggregateId: subscription.subscriptionId,
          attemptCount: 1,
          channel: 'push',
          failureReason: null,
          provider: 'local_push_simulator',
          recipientRole: 'subscriber',
          sentAt: '2026-05-05T10:00:00.000Z',
          status: 'sent',
          templateKey: 'subscriber.assignment.confirmed.v1',
        },
      ],
      limit: 10,
    });

    const pendingResponse = await app.inject({
      method: 'GET',
      url: '/v1/operator/notifications?countryCode=TG&status=pending&limit=10',
    });
    expect(pendingResponse.json().items).toHaveLength(0);
  });

  it('blocks assignment when a profiled worker cannot serve the service cell or has no capacity', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 1,
        serviceNeighborhoods: ['Agoe'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    const firstSubscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const firstSubscription = firstSubscriptionResponse.json() as { subscriptionId: string };

    const wrongCellResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${firstSubscription.subscriptionId}/assignment`,
    });

    expect(wrongCellResponse.statusCode).toBe(400);
    expect(wrongCellResponse.json()).toMatchObject({
      message: 'Worker does not serve the subscription service cell.',
    });
    expect(repository.assignmentDecisions[0]).toMatchObject({
      decision: 'rejected',
      reason: 'service_cell_mismatch',
      subscriptionId: firstSubscription.subscriptionId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.assignmentDecisions[0]?.events[0]).toMatchObject({
      eventType: 'AssignmentDecisionRecorded',
      payload: {
        decision: 'rejected',
        reason: 'service_cell_mismatch',
      },
    });

    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 1,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    const firstAssignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${firstSubscription.subscriptionId}/assignment`,
    });
    expect(firstAssignmentResponse.statusCode).toBe(200);

    const secondSubscriptionResponse = await app.inject({
      method: 'POST',
      payload: { ...validBody, phoneNumber: '+22890123457' },
      url: '/v1/subscriptions',
    });
    const secondSubscription = secondSubscriptionResponse.json() as { subscriptionId: string };
    const capacityResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${secondSubscription.subscriptionId}/assignment`,
    });

    expect(capacityResponse.statusCode).toBe(400);
    expect(capacityResponse.json()).toMatchObject({
      message: 'Worker has no remaining assignment capacity.',
    });
    expect(repository.assignmentDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decision: 'rejected',
          reason: 'capacity_exhausted',
          subscriptionId: secondSubscription.subscriptionId,
          workerId: '22222222-2222-4222-8222-222222222222',
        }),
      ]),
    );
  });

  it('returns subscription detail for the subscriber home screen', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${subscription.subscriptionId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      address: validBody.address,
      assignedWorker: {
        displayName: 'Worker 22222222',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      countryCode: 'TG',
      monthlyPriceMinor: '2500',
      phoneNumber: '+22890123456',
      schedulePreference: validBody.schedulePreference,
      status: 'active',
      subscriptionId: subscription.subscriptionId,
      tierCode: 'T1',
      upcomingVisits: [
        {
          scheduledDate: '2026-05-05',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        {
          scheduledDate: '2026-05-12',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        {
          scheduledDate: '2026-05-19',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        {
          scheduledDate: '2026-05-26',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
      ],
      visitsPerCycle: 1,
    });
    expect(response.json().subscriberId).toEqual(expect.any(String));
    expect(response.json().upcomingVisits[0].visitId).toEqual(expect.any(String));
  });

  it('lets subscribers reschedule and skip scheduled visits', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as {
      subscriberId: string;
      subscriptionId: string;
    };
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visits = assignmentResponse.json() as {
      visits: Array<{ visitId: string }>;
    };
    const firstVisit = visits.visits[0];
    const secondVisit = visits.visits[1];

    const rescheduleResponse = await app.inject({
      method: 'POST',
      payload: {
        scheduledDate: '2026-05-06',
        scheduledTimeWindow: 'afternoon',
        subscriberUserId: subscription.subscriberId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/visits/${firstVisit?.visitId}/reschedule`,
    });
    const skipResponse = await app.inject({
      method: 'POST',
      payload: {
        subscriberUserId: subscription.subscriberId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/visits/${secondVisit?.visitId}/skip`,
    });
    const detailResponse = await app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${subscription.subscriptionId}`,
    });

    expect(rescheduleResponse.statusCode).toBe(200);
    expect(rescheduleResponse.json()).toMatchObject({
      scheduledDate: '2026-05-06',
      scheduledTimeWindow: 'afternoon',
      status: 'scheduled',
      visitId: firstVisit?.visitId,
    });
    expect(skipResponse.statusCode).toBe(200);
    expect(skipResponse.json()).toMatchObject({
      status: 'cancelled',
      visitId: secondVisit?.visitId,
    });
    expect(detailResponse.json().upcomingVisits).toMatchObject([
      {
        scheduledDate: '2026-05-06',
        scheduledTimeWindow: 'afternoon',
        visitId: firstVisit?.visitId,
      },
      {
        scheduledDate: '2026-05-19',
        scheduledTimeWindow: 'morning',
      },
      {
        scheduledDate: '2026-05-26',
        scheduledTimeWindow: 'morning',
      },
    ]);
  });

  it('lets subscribers cancel subscriptions and clears upcoming scheduled visits', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as {
      subscriberId: string;
      subscriptionId: string;
    };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const cancelResponse = await app.inject({
      method: 'POST',
      payload: {
        cancelledAt: '2026-05-02T08:00:00.000Z',
        subscriberUserId: subscription.subscriberId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/cancel`,
    });
    const detailResponse = await app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${subscription.subscriptionId}`,
    });

    expect(cancelResponse.statusCode).toBe(200);
    expect(cancelResponse.json()).toMatchObject({
      cancelledAt: '2026-05-02T08:00:00.000Z',
      cancelledScheduledVisits: 4,
      status: 'cancelled',
      subscriptionId: subscription.subscriptionId,
    });
    expect(detailResponse.json()).toMatchObject({
      status: 'cancelled',
      upcomingVisits: [],
    });
  });

  it('lets subscribers change subscription tiers', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as {
      subscriberId: string;
      subscriptionId: string;
    };

    const tierResponse = await app.inject({
      method: 'POST',
      payload: {
        effectiveAt: '2026-05-02T08:00:00.000Z',
        subscriberUserId: subscription.subscriberId,
        tierCode: 'T2',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/tier`,
    });
    const detailResponse = await app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${subscription.subscriptionId}`,
    });

    expect(tierResponse.statusCode).toBe(200);
    expect(tierResponse.json()).toMatchObject({
      effectiveAt: '2026-05-02T08:00:00.000Z',
      monthlyPriceMinor: '4500',
      previousTierCode: 'T1',
      status: 'pending_match',
      subscriptionId: subscription.subscriptionId,
      tierCode: 'T2',
      visitsPerCycle: 2,
    });
    expect(detailResponse.json()).toMatchObject({
      monthlyPriceMinor: '4500',
      tierCode: 'T2',
      visitsPerCycle: 2,
    });
  });

  it('returns a worker daily route with subscriber and address context', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/route?date=2026-05-05',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      date: '2026-05-05',
      visits: [
        {
          address: validBody.address,
          scheduledDate: '2026-05-05',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          subscriberPhoneNumber: '+22890123456',
          subscriptionId: subscription.subscriptionId,
        },
      ],
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(response.json().visits[0].visitId).toEqual(expect.any(String));
  });

  it('requests and approves worker swaps for future scheduled visits', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi Koffi',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    const workerProfileResponse = await app.inject({
      method: 'GET',
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    expect(workerProfileResponse.statusCode).toBe(200);
    expect(workerProfileResponse.json()).toMatchObject({
      countryCode: 'TG',
      displayName: 'Akouvi Koffi',
      maxActiveSubscriptions: 12,
      serviceNeighborhoods: ['Tokoin'],
      status: 'active',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Dede Ametodji',
        maxActiveSubscriptions: 8,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/33333333-3333-4333-8333-333333333333/profile',
    });

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as {
      subscriberId: string;
      subscriptionId: string;
    };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const createResponse = await app.inject({
      method: 'POST',
      payload: {
        reason: 'Je souhaite changer de laveuse.',
        requestedAt: '2026-05-05T08:00:00.000Z',
        subscriberUserId: subscription.subscriberId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/worker-swap-requests`,
    });
    const request = createResponse.json() as { requestId: string };

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      currentWorkerId: '22222222-2222-4222-8222-222222222222',
      currentWorkerName: 'Akouvi Koffi',
      reason: 'Je souhaite changer de laveuse.',
      status: 'open',
      subscriberPhoneNumber: '+22890123456',
      subscriptionId: subscription.subscriptionId,
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/operator/worker-swap-requests?status=open&limit=10',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [{ requestId: request.requestId, status: 'open' }],
      limit: 10,
      status: 'open',
    });

    const candidateResponse = await app.inject({
      method: 'GET',
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/matching-candidates?limit=5`,
    });
    expect(candidateResponse.statusCode).toBe(200);
    expect(candidateResponse.json().candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: 'Dede Ametodji',
          workerId: '33333333-3333-4333-8333-333333333333',
        }),
      ]),
    );

    const resolveResponse = await app.inject({
      method: 'POST',
      payload: {
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        replacementWorkerId: '33333333-3333-4333-8333-333333333333',
        resolution: 'approved',
        resolutionNote: 'Remplacement accepte.',
        resolvedAt: '2026-05-05T09:00:00.000Z',
      },
      url: `/v1/operator/worker-swap-requests/${request.requestId}/resolve`,
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json()).toMatchObject({
      replacementWorkerId: '33333333-3333-4333-8333-333333333333',
      replacementWorkerName: 'Dede Ametodji',
      status: 'approved',
    });

    const routeResponse = await app.inject({
      method: 'GET',
      url: '/v1/workers/33333333-3333-4333-8333-333333333333/route?date=2026-05-05',
    });
    expect(routeResponse.json()).toMatchObject({
      visits: [{ subscriptionId: subscription.subscriptionId }],
      workerId: '33333333-3333-4333-8333-333333333333',
    });
  });

  it('tracks worker onboarding through activation', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const createResponse = await app.inject({
      method: 'POST',
      payload: {
        appliedAt: '2026-05-01T08:00:00.000Z',
        countryCode: 'TG',
        displayName: 'Akouvi Candidate',
        maxActiveSubscriptions: 10,
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        phoneNumber: '+22890123457',
        serviceNeighborhoods: ['Tokoin'],
        workerId: '55555555-5555-4555-8555-555555555555',
      },
      url: '/v1/operator/worker-onboarding-cases',
    });
    const onboardingCase = createResponse.json() as { caseId: string };

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      displayName: 'Akouvi Candidate',
      phoneNumber: '+22890123457',
      stage: 'application_received',
      workerId: '55555555-5555-4555-8555-555555555555',
    });

    const stages = [
      'cni_uploaded',
      'references_called',
      'casier_received',
      'training_scheduled',
      'uniform_issued',
      'activated',
    ] as const;

    for (const [index, stage] of stages.entries()) {
      const response = await app.inject({
        method: 'POST',
        payload: {
          note: `Stage ${stage}`,
          occurredAt: `2026-05-0${index + 2}T08:00:00.000Z`,
          operatorUserId: '11111111-1111-4111-8111-111111111111',
          stage,
        },
        url: `/v1/operator/worker-onboarding-cases/${onboardingCase.caseId}/advance`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ stage });
    }

    expect(repository.workerOnboardingCases[0]?.events[0]?.eventType).toBe(
      'WorkerOnboardingActivated',
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/operator/worker-onboarding-cases?stage=activated&limit=10',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [{ caseId: onboardingCase.caseId, notes: expect.any(Array), stage: 'activated' }],
      limit: 10,
      stage: 'activated',
    });
  });

  it('filters and blocks workers unavailable on the assignment date', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Unavailable Worker',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Available Worker',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/33333333-3333-4333-8333-333333333333/profile',
    });

    const unavailableResponse = await app.inject({
      method: 'POST',
      payload: {
        createdAt: '2026-05-01T08:00:00.000Z',
        date: '2026-05-05',
        reason: 'Medical appointment.',
      },
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/unavailability',
    });
    expect(unavailableResponse.statusCode).toBe(201);
    expect(unavailableResponse.json()).toMatchObject({
      date: '2026-05-05',
      reason: 'Medical appointment.',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };

    const candidateResponse = await app.inject({
      method: 'GET',
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/matching-candidates?anchorDate=2026-05-05&limit=10`,
    });
    expect(candidateResponse.statusCode).toBe(200);
    expect(candidateResponse.json().candidates).toEqual([
      expect.objectContaining({
        displayName: 'Available Worker',
        workerId: '33333333-3333-4333-8333-333333333333',
      }),
    ]);

    const blockedAssignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    expect(blockedAssignmentResponse.statusCode).toBe(400);
    expect(blockedAssignmentResponse.json()).toMatchObject({
      message: 'Worker is unavailable on the assignment anchor date.',
    });
    expect(repository.assignmentDecisions[0]).toMatchObject({
      decision: 'rejected',
      reason: 'worker_unavailable',
      subscriptionId: subscription.subscriptionId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '33333333-3333-4333-8333-333333333333',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    expect(assignmentResponse.statusCode).toBe(200);
    expect(repository.workerUnavailability[0]?.events[0]?.eventType).toBe(
      'WorkerMarkedUnavailable',
    );
  });

  it('requests and resolves monthly worker advances', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi Koffi',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });

    const createResponse = await app.inject({
      method: 'POST',
      payload: {
        amountMinor: '20000',
        month: '2026-05',
        reason: 'Avance mi-mois.',
        requestedAt: '2026-05-15T08:00:00.000Z',
      },
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/advance-requests',
    });
    const request = createResponse.json() as { requestId: string };

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      amount: { amountMinor: '20000', currencyCode: 'XOF' },
      month: '2026-05',
      reason: 'Avance mi-mois.',
      status: 'open',
      workerId: '22222222-2222-4222-8222-222222222222',
      workerName: 'Akouvi Koffi',
    });

    const duplicateResponse = await app.inject({
      method: 'POST',
      payload: {
        amountMinor: '10000',
        month: '2026-05',
        reason: 'Deuxieme avance.',
        requestedAt: '2026-05-16T08:00:00.000Z',
      },
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/advance-requests',
    });
    expect(duplicateResponse.statusCode).toBe(400);
    expect(duplicateResponse.json()).toMatchObject({
      message: 'Worker advance limit reached for this month.',
    });

    const listResponse = await app.inject({
      method: 'GET',
      url: '/v1/operator/worker-advance-requests?status=open&limit=10',
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [{ requestId: request.requestId, status: 'open' }],
      limit: 10,
      status: 'open',
    });

    const resolveResponse = await app.inject({
      method: 'POST',
      payload: {
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        resolution: 'approved',
        resolutionNote: 'Avance acceptee.',
        resolvedAt: '2026-05-15T09:00:00.000Z',
      },
      url: `/v1/operator/worker-advance-requests/${request.requestId}/resolve`,
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json()).toMatchObject({
      requestId: request.requestId,
      resolutionNote: 'Avance acceptee.',
      status: 'approved',
    });
    expect(repository.workerAdvanceRequests[0]?.events[0]?.eventType).toBe('WorkerAdvanceApproved');
    expect(repository.workerPayouts[0]).toMatchObject({
      advanceRequestId: request.requestId,
      amount: { amountMinor: 20000n, currencyCode: 'XOF' },
      payoutType: 'advance',
      status: 'paid',
    });

    const earningsAfterAdvanceResponse = await app.inject({
      method: 'GET',
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/earnings?month=2026-05',
    });
    expect(earningsAfterAdvanceResponse.statusCode).toBe(200);
    expect(earningsAfterAdvanceResponse.json()).toMatchObject({
      netDue: { amountMinor: '20000', currencyCode: 'XOF' },
      paidOutTotal: { amountMinor: '20000', currencyCode: 'XOF' },
      payoutHistory: [{ payoutType: 'advance', status: 'paid' }],
      total: { amountMinor: '40000', currencyCode: 'XOF' },
    });

    const payoutResponse = await app.inject({
      method: 'POST',
      payload: {
        month: '2026-05',
        note: 'Solde mensuel.',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        paidAt: '2026-05-31T18:00:00.000Z',
        providerReference: 'manual-test-1',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/monthly-payouts',
    });
    expect(payoutResponse.statusCode).toBe(201);
    expect(payoutResponse.json()).toMatchObject({
      amount: { amountMinor: '20000', currencyCode: 'XOF' },
      payoutType: 'monthly_settlement',
      provider: 'manual',
      providerReference: 'manual-test-1',
      status: 'paid',
    });

    const finalEarningsResponse = await app.inject({
      method: 'GET',
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/earnings?month=2026-05',
    });
    expect(finalEarningsResponse.json()).toMatchObject({
      netDue: { amountMinor: '0', currencyCode: 'XOF' },
      paidOutTotal: { amountMinor: '40000', currencyCode: 'XOF' },
    });
  });

  it('records worker monthly payout provider results', async () => {
    const { payoutInputs, provider } = createPayoutProviderStub();
    const repository = new InMemoryCoreRepository(undefined, provider);

    await repository.upsertWorkerProfile({
      countryCode: 'TG',
      displayName: 'Akouvi Koffi',
      maxActiveSubscriptions: 12,
      serviceNeighborhoods: ['Tokoin'],
      status: 'active',
      traceId: 'trace_worker_profile',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    const payout = await repository.createWorkerMonthlyPayout({
      month: '2026-05',
      note: 'Solde mensuel.',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      paidAt: new Date('2026-05-31T18:00:00.000Z'),
      providerReference: 'manual-ignored-by-real-provider',
      traceId: 'trace_worker_payout',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(payoutInputs).toHaveLength(1);
    expect(payoutInputs[0]).toMatchObject({
      amount: { amountMinor: 40000n, currencyCode: 'XOF' },
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      payoutType: 'monthly_settlement',
      periodMonth: '2026-05',
      providerReference: 'manual-ignored-by-real-provider',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(payout).toMatchObject({
      amount: { amountMinor: 40000n, currencyCode: 'XOF' },
      payoutType: 'monthly_settlement',
      provider: 'mobile_money_http',
      providerReference: 'mobile-money-payout-123',
      status: 'paid',
    });
    expect(payout.events[0]?.payload).toMatchObject({
      failureReason: null,
      provider: 'mobile_money_http',
      providerReference: 'mobile-money-payout-123',
      status: 'paid',
    });
  });

  it('records failed worker monthly payout attempts without reducing net due', async () => {
    const repository = new InMemoryCoreRepository(undefined, {
      async chargeSubscription(input) {
        return {
          provider: 'mock',
          providerReference: `mock_${input.idempotencyKey}`,
          status: input.mockOutcome,
        };
      },
      async payoutWorker() {
        throw new Error('mobile_money_payout_failed:503');
      },
      async refundPayment() {
        return {
          provider: 'manual',
          providerReference: null,
          status: 'issued',
        };
      },
    });

    await repository.upsertWorkerProfile({
      countryCode: 'TG',
      displayName: 'Akouvi Koffi',
      maxActiveSubscriptions: 12,
      serviceNeighborhoods: ['Tokoin'],
      status: 'active',
      traceId: 'trace_worker_profile',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    const payout = await repository.createWorkerMonthlyPayout({
      month: '2026-05',
      note: 'Solde mensuel.',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      paidAt: new Date('2026-05-31T18:00:00.000Z'),
      traceId: 'trace_worker_payout_failed',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    const earnings = await repository.getWorkerMonthlyEarnings({
      month: '2026-05',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(payout).toMatchObject({
      failureReason: 'mobile_money_payout_failed:503',
      provider: 'mobile_money_http',
      providerReference: null,
      status: 'failed',
    });
    expect(earnings).toMatchObject({
      netDue: { amountMinor: 40000n, currencyCode: 'XOF' },
      paidOutTotal: { amountMinor: 0n, currencyCode: 'XOF' },
      payoutHistory: [{ status: 'failed' }],
    });
  });

  it('charges subscriptions with mock payment idempotency and state changes', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const failedCharge = await app.inject({
      method: 'POST',
      payload: {
        chargedAt: '2026-05-01T08:00:00.000Z',
        idempotencyKey: 'billing-2026-05-fail',
        mockOutcome: 'failed',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/mock-charge`,
    });
    const retryFailedCharge = await app.inject({
      method: 'POST',
      payload: {
        chargedAt: '2026-05-01T08:00:00.000Z',
        idempotencyKey: 'billing-2026-05-fail',
        mockOutcome: 'failed',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/mock-charge`,
    });
    const recoveredCharge = await app.inject({
      method: 'POST',
      payload: {
        chargedAt: '2026-05-01T09:00:00.000Z',
        idempotencyKey: 'billing-2026-05-recovered',
        mockOutcome: 'succeeded',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/mock-charge`,
    });

    expect(failedCharge.statusCode).toBe(200);
    expect(failedCharge.json()).toMatchObject({
      amount: { amountMinor: '2500', currencyCode: 'XOF' },
      idempotencyKey: 'billing-2026-05-fail',
      provider: 'mock',
      status: 'failed',
      subscriptionStatus: 'payment_overdue',
    });
    expect(retryFailedCharge.json().paymentAttemptId).toBe(failedCharge.json().paymentAttemptId);
    expect(recoveredCharge.statusCode).toBe(200);
    expect(recoveredCharge.json()).toMatchObject({
      status: 'succeeded',
      subscriptionStatus: 'active',
    });
    expect(repository.paymentAttempts).toHaveLength(2);
    expect(repository.paymentAttempts[0]?.events[0]?.eventType).toBe('SubscriptionPaymentFailed');
    expect(repository.paymentAttempts[1]?.events[0]?.eventType).toBe(
      'SubscriptionPaymentSucceeded',
    );
  });

  it('ingests payment provider webhooks idempotently', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ paymentWebhookSecret: 'webhook-secret', repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const unauthorized = await app.inject({
      method: 'POST',
      payload: {},
      url: '/v1/payments/webhooks',
    });
    const failedPayment = await app.inject({
      headers: { 'x-payment-webhook-secret': 'webhook-secret' },
      method: 'POST',
      payload: {
        idempotencyKey: 'billing-2026-05-provider',
        provider: 'mobile_money_http',
        providerReference: 'provider-charge-123',
        receivedAt: '2026-05-01T08:00:00.000Z',
        status: 'failed',
        subscriptionId: subscription.subscriptionId,
      },
      url: '/v1/payments/webhooks',
    });
    const replay = await app.inject({
      headers: { 'x-payment-webhook-secret': 'webhook-secret' },
      method: 'POST',
      payload: {
        idempotencyKey: 'billing-2026-05-provider',
        provider: 'mobile_money_http',
        providerReference: 'provider-charge-123',
        receivedAt: '2026-05-01T08:00:00.000Z',
        status: 'failed',
        subscriptionId: subscription.subscriptionId,
      },
      url: '/v1/payments/webhooks',
    });
    const paymentAttempts = await app.inject({
      method: 'GET',
      url: '/v1/operator/payment-attempts?countryCode=TG&provider=mobile_money_http&status=failed',
    });
    const reconciliation = await app.inject({
      method: 'POST',
      payload: {
        checkedAt: '2026-05-01T10:00:00.000Z',
        countryCode: 'TG',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        provider: 'mobile_money_http',
      },
      url: '/v1/operator/payment-reconciliation-runs',
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(failedPayment.statusCode).toBe(200);
    expect(failedPayment.json()).toMatchObject({
      idempotencyKey: 'billing-2026-05-provider',
      provider: 'mobile_money_http',
      providerReference: 'provider-charge-123',
      status: 'failed',
      subscriptionStatus: 'payment_overdue',
    });
    expect(replay.json().paymentAttemptId).toBe(failedPayment.json().paymentAttemptId);
    expect(paymentAttempts.statusCode).toBe(200);
    expect(paymentAttempts.json()).toMatchObject({
      filters: { provider: 'mobile_money_http', status: 'failed' },
      items: [
        {
          countryCode: 'TG',
          provider: 'mobile_money_http',
          providerReference: 'provider-charge-123',
          status: 'failed',
        },
      ],
    });
    expect(reconciliation.statusCode).toBe(201);
    expect(reconciliation.json()).toMatchObject({
      issueCount: 1,
      issues: [
        {
          issueType: 'overdue_failed_payment',
          severity: 'warning',
        },
      ],
      provider: 'mobile_money_http',
      status: 'issues_found',
      totalFailedAttempts: 1,
      totalSucceededAttempts: 0,
    });
    expect(repository.paymentAttempts).toHaveLength(1);
    expect(repository.paymentReconciliationRuns).toHaveLength(1);
    expect(repository.paymentAttempts[0]?.events[0]?.actor).toEqual({
      role: 'system',
      userId: null,
    });
  });

  it('issues an operator refund for a successful payment attempt', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const charge = await app.inject({
      method: 'POST',
      payload: {
        chargedAt: '2026-05-01T08:00:00.000Z',
        idempotencyKey: 'billing-2026-05-success',
        mockOutcome: 'succeeded',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/mock-charge`,
    });
    const paymentAttempt = charge.json() as { paymentAttemptId: string };

    const refund = await app.inject({
      method: 'POST',
      payload: {
        amountMinor: '2500',
        issuedAt: '2026-05-02T08:00:00.000Z',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        reason: 'subscriber_goodwill',
      },
      url: `/v1/operator/payment-attempts/${paymentAttempt.paymentAttemptId}/refunds`,
    });
    const duplicate = await app.inject({
      method: 'POST',
      payload: {
        amountMinor: '2500',
        issuedAt: '2026-05-02T08:00:00.000Z',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        reason: 'subscriber_goodwill',
      },
      url: `/v1/operator/payment-attempts/${paymentAttempt.paymentAttemptId}/refunds`,
    });

    expect(refund.statusCode).toBe(201);
    expect(refund.json()).toMatchObject({
      amount: { amountMinor: '2500', currencyCode: 'XOF' },
      paymentAttemptId: paymentAttempt.paymentAttemptId,
      provider: 'manual',
      providerReference: null,
      reason: 'subscriber_goodwill',
      status: 'issued',
      subscriptionId: subscription.subscriptionId,
    });
    expect(duplicate.statusCode).toBe(400);
    expect(repository.paymentRefunds).toHaveLength(1);
    expect(repository.paymentRefunds[0]?.events[0]?.eventType).toBe('PaymentRefundIssued');

    const billingHistory = await app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${subscription.subscriptionId}/billing-history?limit=10`,
    });
    expect(billingHistory.statusCode).toBe(200);
    expect(billingHistory.json()).toMatchObject({
      items: [
        {
          amount: { amountMinor: '2500', currencyCode: 'XOF' },
          itemType: 'refund',
          paymentAttemptId: paymentAttempt.paymentAttemptId,
          reason: 'subscriber_goodwill',
          status: 'issued',
        },
        {
          amount: { amountMinor: '2500', currencyCode: 'XOF' },
          itemType: 'charge',
          paymentAttemptId: paymentAttempt.paymentAttemptId,
          reason: null,
          status: 'succeeded',
        },
      ],
      limit: 10,
      subscriptionId: subscription.subscriptionId,
    });

    const supportContext = await app.inject({
      method: 'GET',
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/support-context`,
    });
    expect(supportContext.statusCode).toBe(200);
    expect(supportContext.json()).toMatchObject({
      billingHistory: [
        { itemType: 'refund', status: 'issued' },
        { itemType: 'charge', status: 'succeeded' },
      ],
      disputes: [],
      subscription: {
        phoneNumber: '+22890123456',
        status: 'active',
        subscriptionId: subscription.subscriptionId,
      },
    });

    const supportMatches = await app.inject({
      method: 'GET',
      url: '/v1/operator/subscriber-support-matches?countryCode=TG&phoneNumber=90123456&limit=5',
    });
    expect(supportMatches.statusCode).toBe(200);
    expect(supportMatches.json()).toMatchObject({
      items: [
        {
          phoneNumber: '+22890123456',
          status: 'active',
          subscriptionId: subscription.subscriptionId,
        },
      ],
      limit: 5,
      phoneNumber: '90123456',
    });
  });

  it('lists pending subscriptions in the operator matching queue', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const firstSubscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    await app.inject({
      method: 'POST',
      payload: {
        ...validBody,
        phoneNumber: '+22890123457',
        schedulePreference: { dayOfWeek: 'wednesday', timeWindow: 'afternoon' },
        tierCode: 'T2',
      },
      url: '/v1/subscriptions',
    });
    const firstSubscription = firstSubscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${firstSubscription.subscriptionId}/assignment`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/operator/matching-queue?countryCode=TG&limit=10',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      countryCode: 'TG',
      items: [
        {
          address: validBody.address,
          monthlyPriceMinor: '4500',
          phoneNumber: '+22890123457',
          schedulePreference: { dayOfWeek: 'wednesday', timeWindow: 'afternoon' },
          status: 'pending_match',
          tierCode: 'T2',
          visitsPerCycle: 2,
        },
      ],
      limit: 10,
    });
    expect(response.json().items[0]).toMatchObject({
      assignmentDueAt: expect.any(String),
      queuedAt: expect.any(String),
      subscriberId: expect.any(String),
      subscriptionId: expect.any(String),
    });
  });

  it('rejects invalid matching queue limits', async () => {
    const app = createCoreApiApp();
    apps.add(app);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/operator/matching-queue?limit=0',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'core.matching_queue.invalid_request',
      message: 'limit must be an integer between 1 and 100.',
    });
  });

  it('upserts worker profiles and ranks matching candidates', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Tokoin', 'Be'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Ama',
        maxActiveSubscriptions: 12,
        serviceNeighborhoods: ['Agoe'],
        status: 'active',
      },
      url: '/v1/operator/workers/33333333-3333-4333-8333-333333333333/profile',
    });

    const response = await app.inject({
      method: 'GET',
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/matching-candidates?limit=5`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      candidates: [
        {
          activeSubscriptionCount: 0,
          capacityRemaining: 12,
          displayName: 'Akouvi',
          maxActiveSubscriptions: 12,
          score: 160,
          scoreReasons: ['service_neighborhood_match', 'capacity_available'],
          serviceNeighborhoods: ['Tokoin', 'Be'],
          workerId: '22222222-2222-4222-8222-222222222222',
        },
      ],
      limit: 5,
      subscriptionId: subscription.subscriptionId,
    });

    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/assignment-decisions`,
    });
    const refreshedResponse = await app.inject({
      method: 'GET',
      url: `/v1/operator/subscriptions/${subscription.subscriptionId}/matching-candidates?limit=5`,
    });

    expect(refreshedResponse.statusCode).toBe(200);
    expect(refreshedResponse.json()).toEqual({
      candidates: [],
      limit: 5,
      subscriptionId: subscription.subscriptionId,
    });
  });

  it('rejects invalid worker profile capacity', async () => {
    const app = createCoreApiApp();
    apps.add(app);

    const response = await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 0,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'core.worker_profile.invalid_request',
      message: 'maxActiveSubscriptions must be an integer between 1 and 100.',
    });
  });

  it('summarizes service-cell route capacity for operators', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    await app.inject({
      method: 'PUT',
      payload: {
        countryCode: 'TG',
        displayName: 'Akouvi',
        maxActiveSubscriptions: 2,
        serviceNeighborhoods: ['Tokoin'],
        status: 'active',
      },
      url: '/v1/operator/workers/22222222-2222-4222-8222-222222222222/profile',
    });
    await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/operator/service-cells?date=2026-05-05&limit=10',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      date: '2026-05-05',
      items: [
        {
          activeSubscriptions: 1,
          activeWorkers: 1,
          capacityRemaining: 1,
          scheduledVisits: 1,
          serviceCell: 'Tokoin',
          totalCapacity: 2,
          utilizationPercent: 50,
        },
      ],
      limit: 10,
    });
  });

  it('checks in and checks out a visit with bonus accrual', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visit = (assignmentResponse.json() as { visits: Array<{ visitId: string }> }).visits[0];

    const checkInResponse = await app.inject({
      method: 'POST',
      payload: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        location: { latitude: 6.1319, longitude: 1.2228 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-in`,
    });
    expect(checkInResponse.statusCode).toBe(200);
    expect(checkInResponse.json()).toMatchObject({
      checkedInAt: '2026-05-05T09:00:00.000Z',
      status: 'in_progress',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    const workerIssueResponse = await app.inject({
      method: 'POST',
      payload: {
        createdAt: '2026-05-05T09:10:00.000Z',
        description: 'Client absent au portail.',
        issueType: 'client_unavailable',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/worker-issues`,
    });

    expect(workerIssueResponse.statusCode).toBe(201);
    expect(workerIssueResponse.json()).toMatchObject({
      description: 'Client absent au portail.',
      issueType: 'client_unavailable',
      resolvedAt: null,
      status: 'open',
      subscriberPhoneNumber: '+22890123456',
      visitId: visit?.visitId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.workerIssueReports[0]?.events[0]?.eventType).toBe('WorkerIssueReported');

    const workerIssuesResponse = await app.inject({
      method: 'GET',
      url: '/v1/operator/worker-issues?status=open&limit=10',
    });
    expect(workerIssuesResponse.statusCode).toBe(200);
    const issue = (
      workerIssuesResponse.json() as {
        items: Array<{ issueId: string; status: string; subscriberPhoneNumber: string }>;
      }
    ).items[0];
    expect(issue).toMatchObject({
      status: 'open',
      subscriberPhoneNumber: '+22890123456',
    });

    const resolveWorkerIssueResponse = await app.inject({
      method: 'POST',
      payload: {
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        resolutionNote: 'Worker issue handled from ops console.',
        resolvedAt: '2026-05-05T09:20:00.000Z',
        status: 'acknowledged',
      },
      url: `/v1/operator/worker-issues/${issue?.issueId}/resolve`,
    });
    expect(resolveWorkerIssueResponse.statusCode).toBe(200);
    expect(resolveWorkerIssueResponse.json()).toMatchObject({
      handledByOperatorUserId: '11111111-1111-4111-8111-111111111111',
      resolutionNote: 'Worker issue handled from ops console.',
      resolvedAt: null,
      status: 'acknowledged',
    });
    expect(repository.workerIssueReports[0]?.events[0]?.eventType).toBe('WorkerIssueAcknowledged');

    await uploadVisitPhotos(app, visit?.visitId);

    const checkOutResponse = await app.inject({
      method: 'POST',
      payload: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        location: { latitude: 6.132, longitude: 1.223 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-out`,
    });

    expect(checkOutResponse.statusCode).toBe(200);
    expect(checkOutResponse.json()).toMatchObject({
      bonus: { amountMinor: '600', currencyCode: 'XOF' },
      checkedOutAt: '2026-05-05T09:45:00.000Z',
      status: 'completed',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.completedVisits[0]?.events[0]?.eventType).toBe('VisitCompleted');

    const ratingResponse = await app.inject({
      method: 'POST',
      payload: {
        comment: 'Service impeccable.',
        createdAt: '2026-05-05T10:00:00.000Z',
        rating: 5,
        subscriberUserId: subscription.subscriberId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/visits/${visit?.visitId}/rating`,
    });
    const detailResponse = await app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${subscription.subscriptionId}`,
    });

    expect(ratingResponse.statusCode).toBe(201);
    expect(ratingResponse.json()).toMatchObject({
      comment: 'Service impeccable.',
      rating: 5,
      visitId: visit?.visitId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(detailResponse.json().recentVisits).toMatchObject([
      {
        scheduledDate: '2026-05-05',
        status: 'completed',
        visitId: visit?.visitId,
      },
    ]);
    expect(repository.visitRatings[0]?.events[0]?.eventType).toBe('VisitRated');
  });

  it('lets operators mark scheduled visits no-show from live ops', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visit = (assignmentResponse.json() as { visits: Array<{ visitId: string }> }).visits[0];

    const response = await app.inject({
      method: 'POST',
      payload: {
        note: 'Client absent confirme par dispatch.',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        status: 'no_show',
        updatedAt: '2026-05-05T11:00:00.000Z',
      },
      url: `/v1/operator/visits/${visit?.visitId}/status`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      note: 'Client absent confirme par dispatch.',
      previousStatus: 'scheduled',
      status: 'no_show',
      subscriptionId: subscription.subscriptionId,
      updatedAt: '2026-05-05T11:00:00.000Z',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.operatorVisitStatusUpdates[0]?.events[0]).toMatchObject({
      actor: { role: 'operator', userId: '11111111-1111-4111-8111-111111111111' },
      eventType: 'OperatorVisitStatusUpdated',
      payload: {
        note: 'Client absent confirme par dispatch.',
        previousStatus: 'scheduled',
        status: 'no_show',
        subscriptionId: subscription.subscriptionId,
      },
    });

    const routeResponse = await app.inject({
      method: 'GET',
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/route?date=2026-05-05',
    });
    expect(routeResponse.statusCode).toBe(200);
    expect(routeResponse.json()).toMatchObject({
      visits: [expect.objectContaining({ status: 'no_show', visitId: visit?.visitId })],
    });
  });

  it('blocks far-away visit check-in unless the worker provides the fallback code', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visit = (
      assignmentResponse.json() as {
        visits: Array<{ fallbackCode: string; visitId: string }>;
      }
    ).visits[0];
    const farLocation = { latitude: 6.25, longitude: 1.35 };

    const blockedCheckInResponse = await app.inject({
      method: 'POST',
      payload: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        location: farLocation,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-in`,
    });

    expect(blockedCheckInResponse.statusCode).toBe(400);
    expect(blockedCheckInResponse.json()).toMatchObject({
      message: 'Visit location is outside the 100m check-in radius.',
    });

    const fallbackCheckInResponse = await app.inject({
      method: 'POST',
      payload: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        fallbackCode: visit?.fallbackCode,
        location: farLocation,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-in`,
    });

    expect(fallbackCheckInResponse.statusCode).toBe(200);
    expect(fallbackCheckInResponse.json()).toMatchObject({
      status: 'in_progress',
      visitId: visit?.visitId,
    });

    await uploadVisitPhotos(app, visit?.visitId);

    const fallbackCheckOutResponse = await app.inject({
      method: 'POST',
      payload: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        fallbackCode: visit?.fallbackCode,
        location: farLocation,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-out`,
    });

    expect(fallbackCheckOutResponse.statusCode).toBe(200);
    expect(fallbackCheckOutResponse.json()).toMatchObject({
      status: 'completed',
      visitId: visit?.visitId,
    });
  });

  it('requires before and after photos before checkout', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visit = (assignmentResponse.json() as { visits: Array<{ visitId: string }> }).visits[0];

    await app.inject({
      method: 'POST',
      payload: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        location: { latitude: 6.1319, longitude: 1.2228 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-in`,
    });

    const blockedCheckOutResponse = await app.inject({
      method: 'POST',
      payload: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        location: { latitude: 6.132, longitude: 1.223 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-out`,
    });

    expect(blockedCheckOutResponse.statusCode).toBe(400);
    expect(blockedCheckOutResponse.json()).toMatchObject({
      message: 'Visit requires before and after photos before checkout.',
    });

    await uploadVisitPhotos(app, visit?.visitId);

    const checkOutResponse = await app.inject({
      method: 'POST',
      payload: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        location: { latitude: 6.132, longitude: 1.223 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-out`,
    });

    expect(checkOutResponse.statusCode).toBe(200);
    expect(checkOutResponse.json()).toMatchObject({
      status: 'completed',
      visitId: visit?.visitId,
    });
  });

  it('lets subscribers file disputes and operators resolve them', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as {
      subscriberId: string;
      subscriptionId: string;
    };
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visit = (assignmentResponse.json() as { visits: Array<{ visitId: string }> }).visits[0];

    await app.inject({
      method: 'POST',
      payload: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        location: { latitude: 6.1319, longitude: 1.2228 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-in`,
    });
    await uploadVisitPhotos(app, visit?.visitId);
    await app.inject({
      method: 'POST',
      payload: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        location: { latitude: 6.132, longitude: 1.223 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-out`,
    });

    const disputeResponse = await app.inject({
      method: 'POST',
      payload: {
        createdAt: '2026-05-05T10:00:00.000Z',
        description: 'Chemise blanche abimee apres la visite.',
        issueType: 'damaged_item',
        subscriberUserId: subscription.subscriberId,
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/visits/${visit?.visitId}/disputes`,
    });
    const dispute = disputeResponse.json() as { disputeId: string };

    expect(disputeResponse.statusCode).toBe(201);
    expect(disputeResponse.json()).toMatchObject({
      createdAt: '2026-05-05T10:00:00.000Z',
      issueType: 'damaged_item',
      status: 'open',
      subscriptionId: subscription.subscriptionId,
      visitId: visit?.visitId,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(repository.supportDisputes[0]?.events[0]?.eventType).toBe('VisitDisputed');

    const listResponse = await app.inject({
      method: 'GET',
      url: `/v1/operator/disputes?status=open&subscriptionId=${subscription.subscriptionId}&limit=10`,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      items: [{ disputeId: dispute.disputeId, status: 'open' }],
      limit: 10,
      status: 'open',
      subscriptionId: subscription.subscriptionId,
    });

    const resolveResponse = await app.inject({
      method: 'POST',
      payload: {
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        resolution: 'resolved_for_subscriber',
        resolutionNote: 'Credit manuel applique.',
        resolvedAt: '2026-05-05T11:00:00.000Z',
        subscriberCreditAmountMinor: '2500',
      },
      url: `/v1/operator/disputes/${dispute.disputeId}/resolve`,
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json()).toMatchObject({
      disputeId: dispute.disputeId,
      resolvedAt: '2026-05-05T11:00:00.000Z',
      resolvedByOperatorUserId: '11111111-1111-4111-8111-111111111111',
      resolutionNote: 'Credit manuel applique.',
      status: 'resolved_for_subscriber',
      subscriberCredit: { amountMinor: '2500', currencyCode: 'XOF' },
    });
    expect(repository.supportCredits).toHaveLength(1);
    expect(repository.supportDisputes[0]?.events[0]?.eventType).toBe('DisputeResolved');
    expect(repository.supportDisputes[0]?.events[1]?.eventType).toBe('SubscriberCreditIssued');

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${subscription.subscriptionId}`,
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toMatchObject({
      supportCredits: [
        {
          amount: { amountMinor: '2500', currencyCode: 'XOF' },
          reason: 'Credit manuel applique.',
        },
      ],
    });
  });

  it('returns monthly worker earnings from completed visits', async () => {
    const repository = new InMemoryCoreRepository();
    const app = createCoreApiApp({ repository });
    apps.add(app);

    const subscriptionResponse = await app.inject({
      method: 'POST',
      payload: validBody,
      url: '/v1/subscriptions',
    });
    const subscription = subscriptionResponse.json() as { subscriptionId: string };
    const assignmentResponse = await app.inject({
      method: 'POST',
      payload: {
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/subscriptions/${subscription.subscriptionId}/assignment`,
    });
    const visit = (assignmentResponse.json() as { visits: Array<{ visitId: string }> }).visits[0];

    await app.inject({
      method: 'POST',
      payload: {
        checkedInAt: '2026-05-05T09:00:00.000Z',
        location: { latitude: 6.1319, longitude: 1.2228 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-in`,
    });
    await uploadVisitPhotos(app, visit?.visitId);
    await app.inject({
      method: 'POST',
      payload: {
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        location: { latitude: 6.132, longitude: 1.223 },
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      url: `/v1/visits/${visit?.visitId}/check-out`,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/workers/22222222-2222-4222-8222-222222222222/earnings?month=2026-05',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      completedVisits: 1,
      floor: { amountMinor: '40000', currencyCode: 'XOF' },
      month: '2026-05',
      netDue: { amountMinor: '40600', currencyCode: 'XOF' },
      paidOutTotal: { amountMinor: '0', currencyCode: 'XOF' },
      payoutHistory: [],
      total: { amountMinor: '40600', currencyCode: 'XOF' },
      visitBonusTotal: { amountMinor: '600', currencyCode: 'XOF' },
      workerId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('rejects invalid subscription payloads', async () => {
    const app = createCoreApiApp();
    apps.add(app);

    const response = await app.inject({
      method: 'POST',
      payload: { ...validBody, phoneNumber: '90123456' },
      url: '/v1/subscriptions',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'core.subscription.invalid_request',
      message: 'phoneNumber must be an E.164 phone number.',
    });
  });
});
