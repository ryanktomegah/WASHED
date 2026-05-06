import type { QueryResult, QueryResultRow } from 'pg';
import { describe, expect, it } from 'vitest';

import { hashOtpCode, hashRefreshToken } from './auth-crypto.js';
import type { PgPoolLike, PgTransactionClient } from './postgres-client.js';
import { PostgresCoreRepository } from './postgres-repository.js';
import type { CreateSubscriptionInput } from './repository.js';

const validInput: CreateSubscriptionInput = {
  address: {
    gpsLatitude: 6.1319,
    gpsLongitude: 1.2228,
    landmark: 'Pres de la pharmacie du quartier',
    neighborhood: 'Tokoin',
  },
  countryCode: 'TG',
  paymentMethod: {
    phoneNumber: '+22890123456',
    provider: 'mixx',
  },
  phoneNumber: '+22890123456',
  schedulePreference: {
    dayOfWeek: 'tuesday',
    timeWindow: 'morning',
  },
  tierCode: 'T2',
  traceId: 'trace_test',
};

describe('PostgresCoreRepository', () => {
  it('persists subscription creation and outbox event in one transaction', async () => {
    const client = new FakePgTransactionClient();
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const record = await repository.createSubscription(validInput);

    expect(record.status).toBe('pending_match');
    expect(record.monthlyPriceMinor).toBe(4500n);
    expect(client.releaseCalled).toBe(true);
    expect(client.queries.map((query) => normalizeSql(query.text))).toEqual([
      'BEGIN',
      'SELECT set_config($1, $2, true)',
      'INSERT INTO subscribers (id, country_code, locale, phone_number) VALUES ($1, $2, $3, $4) ON CONFLICT (country_code, phone_number) DO UPDATE SET updated_at = now() RETURNING id AS subscriber_id',
      'INSERT INTO subscriber_addresses ( id, subscriber_id, country_code, neighborhood, service_cell_key, landmark, gps_latitude, gps_longitude ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      'INSERT INTO subscriptions ( id, subscriber_id, address_id, country_code, currency_code, tier_code, status, visits_per_cycle, monthly_price_minor, preferred_day_of_week, preferred_time_window, payment_method_provider, payment_method_phone_number ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      'INSERT INTO audit_events ( id, country_code, aggregate_type, aggregate_id, event_type, payload, actor_role, actor_user_id, trace_id, occurred_at ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)',
      'INSERT INTO outbox_events ( id, country_code, aggregate_type, aggregate_id, event_type, payload, actor_role, actor_user_id, trace_id, occurred_at ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)',
      'COMMIT',
    ]);

    const auditQuery = client.queries.at(-3);
    expect(auditQuery?.values?.[4]).toBe('SubscriptionCreated');
    expect(JSON.parse(String(auditQuery?.values?.[5]))).toMatchObject({
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'mixx',
      },
      status: 'pending_match',
      tierCode: 'T2',
    });

    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('SubscriptionCreated');
    expect(JSON.parse(String(outboxQuery?.values?.[5]))).toMatchObject({
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'mixx',
      },
      status: 'pending_match',
      tierCode: 'T2',
    });
  });

  it('rolls back and releases the client when a write fails', async () => {
    const client = new FakePgTransactionClient(3);
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    await expect(repository.createSubscription(validInput)).rejects.toThrow('query failed');

    expect(client.releaseCalled).toBe(true);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('ROLLBACK');
    expect(client.queries.map((query) => normalizeSql(query.text))).not.toContain('COMMIT');
  });

  it('starts OTP challenges with a hashed test code', async () => {
    const client = new FakePgTransactionClient();
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const challenge = await repository.startOtpChallenge({
      countryCode: 'TG',
      phoneNumber: '+22890123456',
      traceId: 'trace_auth',
    });

    expect(challenge).toMatchObject({
      phoneNumber: '+22890123456',
      provider: 'test',
      testCode: '123456',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO auth_otp_challenges ( id, country_code, phone_number, code_hash, expires_at ) VALUES ($1, $2, $3, $4, $5)',
    );
    const insertChallengeQuery = client.queries.find((query) =>
      normalizeSql(query.text).startsWith('INSERT INTO auth_otp_challenges'),
    );
    expect(insertChallengeQuery?.values?.[1]).toBe('TG');
    expect(insertChallengeQuery?.values?.[2]).toBe('+22890123456');
    expect(insertChallengeQuery?.values?.[3]).toBe(
      hashOtpCode(String(challenge.challengeId), '123456'),
    );
  });

  it('verifies OTP challenges and creates auth sessions transactionally', async () => {
    const challengeId = '99999999-9999-4999-8999-999999999999';
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        attempts: 0,
        code_hash: hashOtpCode(challengeId, '123456'),
        consumed_at: null,
        country_code: 'TG',
        expires_at: new Date(Date.now() + 60_000),
        phone_number: '+22890123456',
      },
      {
        country_code: 'TG',
        phone_number: '+22890123456',
        role: 'subscriber',
        user_id: '77777777-7777-4777-8777-777777777777',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const session = await repository.verifyOtpChallenge({
      challengeId,
      code: '123456',
      deviceId: 'ios-device-1',
      role: 'subscriber',
      traceId: 'trace_verify',
    });

    expect(session).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      role: 'subscriber',
      sessionId: expect.any(String),
      userId: '77777777-7777-4777-8777-777777777777',
    });
    expect(client.releaseCalled).toBe(true);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE auth_otp_challenges SET consumed_at = now() WHERE id = $1',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO auth_sessions ( id, country_code, user_id, refresh_token_hash, device_id, expires_at ) VALUES ($1, $2, $3, $4, $5, $6)',
    );
  });

  it('rotates refresh tokens', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        device_id: 'ios-device-1',
        phone_number: '+22890123456',
        revoked_at: null,
        role: 'subscriber',
        session_expires_at: new Date(Date.now() + 60_000),
        session_id: '88888888-8888-4888-8888-888888888888',
        user_id: '77777777-7777-4777-8777-777777777777',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const session = await repository.refreshAuthSession({
      refreshToken: 'refresh_test_token',
      traceId: 'trace_refresh',
    });

    expect(session).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      role: 'subscriber',
      userId: '77777777-7777-4777-8777-777777777777',
    });
    const refreshSelectQuery = client.queries.find((query) =>
      normalizeSql(query.text).startsWith('SELECT session.device_id'),
    );
    expect(refreshSelectQuery?.values).toEqual([hashRefreshToken('refresh_test_token')]);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE auth_sessions SET revoked_at = now() WHERE id = $1',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('records mock payment failures and moves active subscriptions overdue', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        currency_code: 'XOF',
        monthly_price_minor: '2500',
        status: 'active',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const attempt = await repository.chargeSubscription({
      chargedAt: new Date('2026-05-01T08:00:00.000Z'),
      idempotencyKey: 'billing-2026-05-fail',
      mockOutcome: 'failed',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_payment',
    });

    expect(attempt).toMatchObject({
      amount: { amountMinor: 2500n, currencyCode: 'XOF' },
      idempotencyKey: 'billing-2026-05-fail',
      provider: 'mock',
      status: 'failed',
      subscriptionStatus: 'payment_overdue',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO payment_attempts ( id, subscription_id, country_code, amount_minor, currency_code, status, provider, provider_reference, idempotency_key, charged_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE subscriptions SET status = $1, updated_at = now() WHERE id = $2',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('records payment provider webhooks and moves active subscriptions overdue', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        currency_code: 'XOF',
        monthly_price_minor: '2500',
        status: 'active',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const attempt = await repository.ingestPaymentWebhook({
      idempotencyKey: 'billing-2026-05-provider',
      provider: 'mobile_money_http',
      providerReference: 'provider-charge-123',
      receivedAt: new Date('2026-05-01T08:00:00.000Z'),
      status: 'failed',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_payment_webhook',
    });

    expect(attempt).toMatchObject({
      amount: { amountMinor: 2500n, currencyCode: 'XOF' },
      idempotencyKey: 'billing-2026-05-provider',
      provider: 'mobile_money_http',
      providerReference: 'provider-charge-123',
      status: 'failed',
      subscriptionStatus: 'payment_overdue',
    });
    expect(attempt.events[0]?.actor).toEqual({ role: 'system', userId: null });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'SELECT attempt.id AS payment_attempt_id, attempt.subscription_id, attempt.country_code, attempt.amount_minor, attempt.currency_code, attempt.status, attempt.provider, attempt.provider_reference, attempt.idempotency_key, attempt.charged_at, subscription.status AS subscription_status FROM payment_attempts attempt INNER JOIN subscriptions subscription ON subscription.id = attempt.subscription_id WHERE attempt.provider = $1 AND attempt.provider_reference = $2 FOR UPDATE',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO payment_attempts ( id, subscription_id, country_code, amount_minor, currency_code, status, provider, provider_reference, idempotency_key, charged_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE subscriptions SET status = $1, updated_at = now() WHERE id = $2',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('returns existing payment attempts for repeated idempotency keys', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        amount_minor: '2500',
        charged_at: new Date('2026-05-01T08:00:00.000Z'),
        currency_code: 'XOF',
        idempotency_key: 'billing-2026-05-success',
        payment_attempt_id: '99999999-9999-4999-8999-999999999999',
        provider: 'mock',
        provider_reference: 'mock_99999999-9999-4999-8999-999999999999',
        status: 'succeeded',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        subscription_status: 'active',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const attempt = await repository.chargeSubscription({
      chargedAt: new Date('2026-05-01T08:00:00.000Z'),
      idempotencyKey: 'billing-2026-05-success',
      mockOutcome: 'succeeded',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_payment',
    });

    expect(attempt.paymentAttemptId).toBe('99999999-9999-4999-8999-999999999999');
    expect(attempt.events).toEqual([]);
    expect(
      client.queries.some((query) =>
        normalizeSql(query.text).startsWith('INSERT INTO payment_attempts'),
      ),
    ).toBe(false);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('records manual refunds for successful payment attempts', async () => {
    const client = new FakePgTransactionClient();
    client.configuredPaymentAttemptByIdRow = {
      amount_minor: '2500',
      charged_at: new Date('2026-05-01T08:00:00.000Z'),
      country_code: 'TG',
      currency_code: 'XOF',
      idempotency_key: 'billing-2026-05-success',
      payment_attempt_id: '99999999-9999-4999-8999-999999999999',
      provider: 'mock',
      provider_reference: 'mock_billing-2026-05-success',
      status: 'succeeded',
      subscription_id: '33333333-3333-4333-8333-333333333333',
      subscription_status: 'active',
    };
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const refund = await repository.issuePaymentRefund({
      amountMinor: 2500n,
      issuedAt: new Date('2026-05-02T08:00:00.000Z'),
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      paymentAttemptId: '99999999-9999-4999-8999-999999999999',
      reason: 'subscriber_goodwill',
      traceId: 'trace_payment_refund',
    });

    expect(refund).toMatchObject({
      amount: { amountMinor: 2500n, currencyCode: 'XOF' },
      countryCode: 'TG',
      paymentAttemptId: '99999999-9999-4999-8999-999999999999',
      provider: 'manual',
      providerReference: null,
      reason: 'subscriber_goodwill',
      status: 'issued',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
    });
    expect(refund.events[0]?.eventType).toBe('PaymentRefundIssued');
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'SELECT id AS refund_id, payment_attempt_id FROM payment_refunds WHERE payment_attempt_id = $1 FOR UPDATE',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO payment_refunds ( id, payment_attempt_id, subscription_id, country_code, amount_minor, currency_code, status, provider, provider_reference, reason, issued_by_operator_user_id, issued_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('records payment reconciliation runs with issues', async () => {
    const client = new FakePgTransactionClient();
    client.configuredPaymentReconciliationRows = [
      {
        amount_minor: '2500',
        charged_at: new Date('2026-05-01T08:00:00.000Z'),
        country_code: 'TG',
        currency_code: 'XOF',
        idempotency_key: 'billing-2026-05-fail',
        payment_attempt_id: '99999999-9999-4999-8999-999999999999',
        provider: 'mobile_money_http',
        provider_reference: 'provider-charge-123',
        refunded_amount_minor: '0',
        status: 'failed',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        subscription_status: 'payment_overdue',
      },
    ];
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const run = await repository.runPaymentReconciliation({
      checkedAt: new Date('2026-05-01T10:00:00.000Z'),
      countryCode: 'TG',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      provider: 'mobile_money_http',
      traceId: 'trace_reconciliation',
    });

    expect(run).toMatchObject({
      countryCode: 'TG',
      issues: [{ issueType: 'overdue_failed_payment', severity: 'warning' }],
      provider: 'mobile_money_http',
      status: 'issues_found',
      totalFailedAttempts: 1,
      totalSucceededAttempts: 0,
    });
    expect(run.events[0]?.eventType).toBe('PaymentReconciliationRunCompleted');
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO payment_reconciliation_runs ( id, country_code, provider, status, total_succeeded_attempts, total_failed_attempts, total_collected_minor, total_refunded_minor, currency_code, issue_count, issues, checked_by_operator_user_id, checked_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('assigns a worker, generates visits, and writes an assignment outbox event', async () => {
    const client = new FakePgTransactionClient(undefined, {
      country_code: 'TG',
      neighborhood: 'Tokoin',
      preferred_day_of_week: 'tuesday',
      preferred_time_window: 'morning',
      status: 'pending_match',
      visits_per_cycle: 1,
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const assignment = await repository.assignWorker({
      anchorDate: '2026-05-05',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_assignment',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(assignment.status).toBe('active');
    expect(assignment.visits.map((visit) => visit.scheduledDate)).toEqual(['2026-05-05']);
    expect(client.releaseCalled).toBe(true);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "UPDATE subscriptions SET assigned_worker_id = $1, assigned_at = now(), status = 'active', updated_at = now() WHERE id = $2",
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO assignment_decisions ( id, subscription_id, worker_id, operator_user_id, country_code, decision, anchor_date, reason ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id AS decision_id, subscription_id, worker_id, operator_user_id, country_code, decision, anchor_date::text AS anchor_date, reason, created_at',
    );
    expect(
      client.queries.filter((query) => normalizeSql(query.text).startsWith('INSERT INTO visits')),
    ).toHaveLength(1);

    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('SubscriberAssigned');
    expect(JSON.parse(String(outboxQuery?.values?.[5]))).toMatchObject({
      status: 'active',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    const notificationQuery = client.queries.find((query) =>
      normalizeSql(query.text).startsWith('INSERT INTO notification_messages'),
    );
    expect(notificationQuery?.values?.[2]).toBe('push');
    expect(notificationQuery?.values?.[3]).toBe('subscriber.assignment.confirmed.v1');
    expect(notificationQuery?.values?.[4]).toBe('subscriber');
    expect(notificationQuery?.values?.[6]).toBe('subscription');
    expect(notificationQuery?.values?.[7]).toBe('33333333-3333-4333-8333-333333333333');
    expect(JSON.parse(String(notificationQuery?.values?.[9]))).toMatchObject({
      status: 'active',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    const decisionOutboxQuery = client.queries.find(
      (query) =>
        normalizeSql(query.text).startsWith('INSERT INTO outbox_events') &&
        query.values?.[4] === 'AssignmentDecisionRecorded',
    );
    expect(JSON.parse(String(decisionOutboxQuery?.values?.[5]))).toMatchObject({
      decision: 'assigned',
      reason: 'operator_selected_worker',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('logs rejected assignment decisions without assigning when worker is outside the service cell', async () => {
    const client = new FakePgTransactionClient(undefined, {
      country_code: 'TG',
      neighborhood: 'Tokoin',
      preferred_day_of_week: 'tuesday',
      preferred_time_window: 'morning',
      status: 'pending_match',
    });
    client.configuredAssignmentWorkerRow = {
      active_subscription_count: 0,
      display_name: 'Agoe Worker',
      max_active_subscriptions: 4,
      service_neighborhoods: ['Agoe'],
      status: 'active',
    };
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    await expect(
      repository.assignWorker({
        anchorDate: '2026-05-05',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        traceId: 'trace_assignment_rejected',
        workerId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toThrow('Worker does not serve the subscription service cell.');

    const decisionQuery = client.queries.find((query) =>
      normalizeSql(query.text).startsWith('INSERT INTO assignment_decisions'),
    );
    expect(decisionQuery?.values?.[5]).toBe('rejected');
    expect(decisionQuery?.values?.[7]).toBe('service_cell_mismatch');
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('ROLLBACK');
    expect(
      client.queries.some((query) =>
        normalizeSql(query.text).startsWith('UPDATE subscriptions SET assigned_worker_id'),
      ),
    ).toBe(false);
    expect(
      client.queries.some((query) => normalizeSql(query.text).startsWith('INSERT INTO visits')),
    ).toBe(false);
    const decisionOutboxQuery = client.queries.find(
      (query) =>
        normalizeSql(query.text).startsWith('INSERT INTO outbox_events') &&
        query.values?.[4] === 'AssignmentDecisionRecorded',
    );
    expect(JSON.parse(String(decisionOutboxQuery?.values?.[5]))).toMatchObject({
      decision: 'rejected',
      reason: 'service_cell_mismatch',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.releaseCalled).toBe(true);
  });

  it('records declined assignment candidates without assigning a subscription', async () => {
    const client = new FakePgTransactionClient(undefined, {
      country_code: 'TG',
      neighborhood: 'Tokoin',
      preferred_day_of_week: 'tuesday',
      preferred_time_window: 'morning',
      status: 'pending_match',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const decision = await repository.declineAssignmentCandidate({
      anchorDate: '2026-05-05',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_assignment_declined',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(decision).toMatchObject({
      anchorDate: '2026-05-05',
      decision: 'declined',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      reason: 'operator_declined_candidate',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(decision.events[0]).toMatchObject({
      aggregateType: 'assignment_decision',
      eventType: 'AssignmentDecisionRecorded',
      payload: {
        decision: 'declined',
        reason: 'operator_declined_candidate',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    });
    const decisionQuery = client.queries.find((query) =>
      normalizeSql(query.text).startsWith('INSERT INTO assignment_decisions'),
    );
    expect(decisionQuery?.values?.[5]).toBe('declined');
    expect(decisionQuery?.values?.[7]).toBe('operator_declined_candidate');
    expect(
      client.queries.some(
        (query) =>
          normalizeSql(query.text).startsWith('INSERT INTO audit_events') &&
          query.values?.[4] === 'AssignmentDecisionRecorded',
      ),
    ).toBe(true);
    expect(
      client.queries.some(
        (query) =>
          normalizeSql(query.text).startsWith('INSERT INTO outbox_events') &&
          query.values?.[4] === 'AssignmentDecisionRecorded',
      ),
    ).toBe(true);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
    expect(
      client.queries.some((query) =>
        normalizeSql(query.text).startsWith('UPDATE subscriptions SET assigned_worker_id'),
      ),
    ).toBe(false);
    expect(
      client.queries.some((query) => normalizeSql(query.text).startsWith('INSERT INTO visits')),
    ).toBe(false);
    expect(client.releaseCalled).toBe(true);
  });

  it('checks in a visit transactionally', async () => {
    const client = new FakePgTransactionClient(undefined, undefined, {
      check_in_at: null,
      country_code: 'TG',
      fallback_code: '1234',
      gps_latitude: '6.131900',
      gps_longitude: '1.222800',
      status: 'scheduled',
      worker_id: '22222222-2222-4222-8222-222222222222',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const visit = await repository.checkInVisit({
      checkedInAt: new Date('2026-05-05T09:00:00.000Z'),
      location: { latitude: 6.1319, longitude: 1.2228 },
      traceId: 'trace_check_in',
      visitId: '44444444-4444-4444-8444-444444444444',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(visit.status).toBe('in_progress');
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "UPDATE visits SET check_in_at = $1, check_in_latitude = $2, check_in_longitude = $3, check_in_verification_method = $4, status = 'in_progress', updated_at = now() WHERE id = $5",
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('uploads visit photos transactionally', async () => {
    const client = new FakePgTransactionClient(undefined, undefined, {
      check_in_at: new Date('2026-05-05T09:00:00.000Z'),
      country_code: 'TG',
      fallback_code: '1234',
      gps_latitude: '6.131900',
      gps_longitude: '1.222800',
      status: 'in_progress',
      worker_id: '22222222-2222-4222-8222-222222222222',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const photo = await repository.uploadVisitPhoto({
      byteSize: 128_000,
      capturedAt: new Date('2026-05-05T09:05:00.000Z'),
      contentType: 'image/jpeg',
      objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
      photoType: 'before',
      traceId: 'trace_visit_photo',
      visitId: '44444444-4444-4444-8444-444444444444',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(photo).toMatchObject({
      byteSize: 128_000,
      contentType: 'image/jpeg',
      objectKey: 'visits/44444444-4444-4444-8444-444444444444/before.jpg',
      photoType: 'before',
      visitId: '44444444-4444-4444-8444-444444444444',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO visit_photos ( id, visit_id, worker_id, country_code, photo_type, object_key, content_type, byte_size, captured_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (visit_id, photo_type) DO UPDATE SET worker_id = EXCLUDED.worker_id, object_key = EXCLUDED.object_key, content_type = EXCLUDED.content_type, byte_size = EXCLUDED.byte_size, captured_at = EXCLUDED.captured_at, uploaded_at = now() RETURNING id AS photo_id, visit_id, worker_id, country_code, photo_type, object_key, content_type, byte_size, captured_at, uploaded_at',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
  });

  it('checks out a visit, accrues bonus, and writes completion outbox event', async () => {
    const client = new FakePgTransactionClient(undefined, undefined, {
      check_in_at: new Date('2026-05-05T09:00:00.000Z'),
      country_code: 'TG',
      fallback_code: '1234',
      gps_latitude: '6.131900',
      gps_longitude: '1.222800',
      status: 'in_progress',
      worker_id: '22222222-2222-4222-8222-222222222222',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const visit = await repository.checkOutVisit({
      checkedOutAt: new Date('2026-05-05T09:45:00.000Z'),
      location: { latitude: 6.132, longitude: 1.223 },
      traceId: 'trace_check_out',
      visitId: '44444444-4444-4444-8444-444444444444',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(visit.status).toBe('completed');
    expect(visit.bonus.amountMinor).toBe(600n);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "UPDATE visits SET check_out_at = $1, check_out_latitude = $2, check_out_longitude = $3, check_out_verification_method = $4, completed_at = $1, status = 'completed', updated_at = now() WHERE id = $5",
    );
    expect(
      client.queries.some((query) =>
        normalizeSql(query.text).startsWith('INSERT INTO worker_earning_ledger'),
      ),
    ).toBe(true);

    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('VisitCompleted');
    expect(JSON.parse(String(outboxQuery?.values?.[5]))).toMatchObject({
      bonusAmountMinor: '600',
      bonusCurrencyCode: 'XOF',
      checkedInAt: '2026-05-05T09:00:00.000Z',
      checkedOutAt: '2026-05-05T09:45:00.000Z',
      durationMinutes: 45,
      workerId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('reschedules a subscriber visit and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        scheduled_date: '2026-05-05',
        scheduled_time_window: 'morning',
        status: 'scheduled',
        subscriber_id: '55555555-5555-4555-8555-555555555555',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const visit = await repository.rescheduleVisit({
      scheduledDate: '2026-05-06',
      scheduledTimeWindow: 'afternoon',
      subscriberUserId: '55555555-5555-4555-8555-555555555555',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_reschedule',
      visitId: '44444444-4444-4444-8444-444444444444',
    });

    expect(visit).toMatchObject({
      scheduledDate: '2026-05-06',
      scheduledTimeWindow: 'afternoon',
      status: 'scheduled',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE visits SET scheduled_date = $1, scheduled_time_window = $2, updated_at = now() WHERE id = $3',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('VisitRescheduled');
  });

  it('skips a subscriber visit and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        scheduled_date: '2026-05-05',
        scheduled_time_window: 'morning',
        status: 'scheduled',
        subscriber_id: '55555555-5555-4555-8555-555555555555',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const visit = await repository.skipVisit({
      subscriberUserId: '55555555-5555-4555-8555-555555555555',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_skip',
      visitId: '44444444-4444-4444-8444-444444444444',
    });

    expect(visit).toMatchObject({
      status: 'cancelled',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE visits SET status = $1, updated_at = now() WHERE id = $2',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('VisitSkipped');
  });

  it('rejects subscriber visit changes for non-owning Postgres subscribers', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        scheduled_date: '2026-05-05',
        scheduled_time_window: 'morning',
        status: 'scheduled',
        subscriber_id: '55555555-5555-4555-8555-555555555555',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    await expect(
      repository.rescheduleVisit({
        scheduledDate: '2026-05-06',
        scheduledTimeWindow: 'afternoon',
        subscriberUserId: '88888888-8888-4888-8888-888888888888',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        traceId: 'trace_reschedule_owner',
        visitId: '44444444-4444-4444-8444-444444444444',
      }),
    ).rejects.toThrow('Subscription was not found.');
    expect(client.queries.map((query) => normalizeSql(query.text))).not.toContain(
      'UPDATE visits SET scheduled_date = $1, scheduled_time_window = $2, updated_at = now() WHERE id = $3',
    );
  });

  it('updates operator visit status and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        scheduled_date: '2026-05-05',
        scheduled_time_window: 'morning',
        status: 'scheduled',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const visit = await repository.updateOperatorVisitStatus({
      note: 'Client absent confirme par operations.',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      status: 'no_show',
      traceId: 'trace_operator_visit_status',
      updatedAt: new Date('2026-05-05T11:00:00.000Z'),
      visitId: '44444444-4444-4444-8444-444444444444',
    });

    expect(visit).toMatchObject({
      previousStatus: 'scheduled',
      status: 'no_show',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE visits SET status = $1, updated_at = now() WHERE id = $2',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('OperatorVisitStatusUpdated');
    expect(JSON.parse(String(outboxQuery?.values?.[5]))).toMatchObject({
      note: 'Client absent confirme par operations.',
      previousStatus: 'scheduled',
      status: 'no_show',
    });
  });

  it('creates support disputes, marks visits disputed, and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        status: 'completed',
        subscriber_id: '55555555-5555-4555-8555-555555555555',
        subscriber_phone_number: '+22890123456',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const dispute = await repository.createDispute({
      createdAt: new Date('2026-05-05T10:00:00.000Z'),
      description: 'Chemise blanche abimee apres la visite.',
      issueType: 'damaged_item',
      subscriberUserId: '55555555-5555-4555-8555-555555555555',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_dispute',
      visitId: '44444444-4444-4444-8444-444444444444',
    });

    expect(dispute).toMatchObject({
      issueType: 'damaged_item',
      status: 'open',
      subscriberPhoneNumber: '+22890123456',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO support_disputes ( id, subscription_id, visit_id, country_code, issue_type, status, description, opened_by_user_id, resolved_by_operator_user_id, resolution_note, created_at, resolved_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE visits SET status = $1, updated_at = now() WHERE id = $2',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('VisitDisputed');
  });

  it('lists operator disputes with subscriber and worker context', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [
        {
          country_code: 'TG',
          created_at: new Date('2026-05-05T10:00:00.000Z'),
          description: 'Chemise blanche abimee apres la visite.',
          dispute_id: '66666666-6666-4666-8666-666666666666',
          issue_type: 'damaged_item',
          opened_by_user_id: '55555555-5555-4555-8555-555555555555',
          resolution_note: null,
          resolved_at: null,
          resolved_by_operator_user_id: null,
          status: 'open',
          subscriber_phone_number: '+22890123456',
          subscription_id: '33333333-3333-4333-8333-333333333333',
          visit_id: '44444444-4444-4444-8444-444444444444',
          worker_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const disputes = await repository.listOperatorDisputes({
      limit: 10,
      status: 'open',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
    });

    expect(disputes).toEqual([
      {
        countryCode: 'TG',
        createdAt: new Date('2026-05-05T10:00:00.000Z'),
        description: 'Chemise blanche abimee apres la visite.',
        disputeId: '66666666-6666-4666-8666-666666666666',
        events: [],
        issueType: 'damaged_item',
        openedByUserId: '55555555-5555-4555-8555-555555555555',
        resolvedAt: null,
        resolvedByOperatorUserId: null,
        resolutionNote: null,
        status: 'open',
        subscriberCredit: null,
        subscriberCreditId: null,
        subscriberPhoneNumber: '+22890123456',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        visitId: '44444444-4444-4444-8444-444444444444',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    ]);
    expect(valuesForQuery(client.queries, 'SELECT dispute.id AS dispute_id')).toEqual([
      'open',
      '33333333-3333-4333-8333-333333333333',
      10,
    ]);
  });

  it('resolves support disputes and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        created_at: new Date('2026-05-05T10:00:00.000Z'),
        description: 'Chemise blanche abimee apres la visite.',
        dispute_id: '66666666-6666-4666-8666-666666666666',
        issue_type: 'damaged_item',
        opened_by_user_id: '55555555-5555-4555-8555-555555555555',
        resolution_note: null,
        resolved_at: null,
        resolved_by_operator_user_id: null,
        status: 'open',
        subscriber_phone_number: '+22890123456',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const dispute = await repository.resolveDispute({
      disputeId: '66666666-6666-4666-8666-666666666666',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      resolution: 'resolved_for_subscriber',
      resolutionNote: 'Credit manuel applique.',
      resolvedAt: new Date('2026-05-05T11:00:00.000Z'),
      subscriberCreditAmountMinor: 2500n,
      traceId: 'trace_resolve_dispute',
    });

    expect(dispute).toMatchObject({
      disputeId: '66666666-6666-4666-8666-666666666666',
      resolutionNote: 'Credit manuel applique.',
      status: 'resolved_for_subscriber',
      subscriberCredit: { amountMinor: 2500n, currencyCode: 'XOF' },
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE support_disputes SET status = $1, resolved_by_operator_user_id = $2, resolution_note = $3, resolved_at = $4, updated_at = now() WHERE id = $5',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO support_credits ( id, dispute_id, subscription_id, country_code, amount_minor, currency_code, reason, issued_by_operator_user_id, created_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    );
    const outboxEvents = client.queries
      .filter((query) => normalizeSql(query.text).startsWith('INSERT INTO outbox_events'))
      .map((query) => query.values?.[4]);
    expect(outboxEvents).toContain('DisputeResolved');
    expect(outboxEvents).toContain('SubscriberCreditIssued');
  });

  it('records worker issue reports and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        gps_latitude: '6.1319',
        gps_longitude: '1.2228',
        landmark: 'Ops demo seed',
        neighborhood: 'Tokoin',
        scheduled_date: '2026-05-05',
        scheduled_time_window: 'morning',
        subscriber_phone_number: '+22890123456',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const issue = await repository.reportWorkerIssue({
      createdAt: new Date('2026-05-05T09:10:00.000Z'),
      description: 'Client absent au portail.',
      issueType: 'client_unavailable',
      traceId: 'trace_worker_issue',
      visitId: '44444444-4444-4444-8444-444444444444',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(issue).toMatchObject({
      issueType: 'client_unavailable',
      scheduledDate: '2026-05-05',
      status: 'open',
      subscriberPhoneNumber: '+22890123456',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO worker_issue_reports ( id, visit_id, subscription_id, worker_id, country_code, issue_type, status, description, created_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('WorkerIssueReported');
  });

  it('lists worker issues with route and subscriber context', async () => {
    const client = new FakePgTransactionClient();
    client.configuredOperatorWorkerIssueRows = [
      {
        country_code: 'TG',
        created_at: new Date('2026-05-05T09:10:00.000Z'),
        description: 'Client absent au portail.',
        gps_latitude: '6.1319',
        gps_longitude: '1.2228',
        handled_by_operator_user_id: null,
        issue_id: '77777777-7777-4777-8777-777777777777',
        issue_type: 'client_unavailable',
        landmark: 'Ops demo seed',
        neighborhood: 'Tokoin',
        resolution_note: null,
        resolved_at: null,
        scheduled_date: '2026-05-05',
        scheduled_time_window: 'morning',
        status: 'open',
        subscriber_phone_number: '+22890123456',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        visit_id: '44444444-4444-4444-8444-444444444444',
        worker_id: '22222222-2222-4222-8222-222222222222',
      },
    ];
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const issues = await repository.listWorkerIssues({ limit: 10, status: 'open' });

    expect(issues).toEqual([
      {
        address: {
          gpsLatitude: 6.1319,
          gpsLongitude: 1.2228,
          landmark: 'Ops demo seed',
          neighborhood: 'Tokoin',
        },
        countryCode: 'TG',
        createdAt: new Date('2026-05-05T09:10:00.000Z'),
        description: 'Client absent au portail.',
        events: [],
        handledByOperatorUserId: null,
        issueId: '77777777-7777-4777-8777-777777777777',
        issueType: 'client_unavailable',
        resolutionNote: null,
        resolvedAt: null,
        scheduledDate: '2026-05-05',
        scheduledTimeWindow: 'morning',
        status: 'open',
        subscriberPhoneNumber: '+22890123456',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        visitId: '44444444-4444-4444-8444-444444444444',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    ]);
    expect(valuesForQuery(client.queries, 'SELECT issue.id AS issue_id')).toEqual(['open', 10]);
  });

  it('resolves worker issues and writes an outbox event', async () => {
    const client = new FakePgTransactionClient();
    client.configuredWorkerIssueResolutionRow = {
      country_code: 'TG',
      created_at: new Date('2026-05-05T09:10:00.000Z'),
      description: 'Client absent au portail.',
      gps_latitude: '6.1319',
      gps_longitude: '1.2228',
      handled_by_operator_user_id: null,
      issue_id: '77777777-7777-4777-8777-777777777777',
      issue_type: 'client_unavailable',
      landmark: 'Ops demo seed',
      neighborhood: 'Tokoin',
      resolution_note: null,
      resolved_at: null,
      scheduled_date: '2026-05-05',
      scheduled_time_window: 'morning',
      status: 'open',
      subscriber_phone_number: '+22890123456',
      subscription_id: '33333333-3333-4333-8333-333333333333',
      visit_id: '44444444-4444-4444-8444-444444444444',
      worker_id: '22222222-2222-4222-8222-222222222222',
    };
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const issue = await repository.resolveWorkerIssue({
      issueId: '77777777-7777-4777-8777-777777777777',
      operatorUserId: '11111111-1111-4111-8111-111111111111',
      resolutionNote: 'Pris en charge.',
      resolvedAt: new Date('2026-05-05T09:20:00.000Z'),
      status: 'acknowledged',
      traceId: 'trace_worker_issue_resolve',
    });

    expect(issue).toMatchObject({
      handledByOperatorUserId: '11111111-1111-4111-8111-111111111111',
      issueId: '77777777-7777-4777-8777-777777777777',
      resolutionNote: 'Pris en charge.',
      resolvedAt: null,
      status: 'acknowledged',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE worker_issue_reports SET status = $1, handled_by_operator_user_id = $2, resolution_note = $3, resolved_at = $4, updated_at = now() WHERE id = $5',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('WorkerIssueAcknowledged');
  });

  it('cancels subscriptions, cancels scheduled visits, and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(undefined, {
      country_code: 'TG',
      status: 'active',
      subscriber_id: '55555555-5555-4555-8555-555555555555',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const subscription = await repository.cancelSubscription({
      cancelledAt: new Date('2026-05-02T08:00:00.000Z'),
      subscriberUserId: '55555555-5555-4555-8555-555555555555',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_cancel',
    });

    expect(subscription).toMatchObject({
      cancelledScheduledVisits: 4,
      status: 'cancelled',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "UPDATE visits SET status = 'cancelled', updated_at = now() WHERE subscription_id = $1 AND status = 'scheduled'",
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE subscriptions SET status = $1, updated_at = now() WHERE id = $2',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('SubscriptionCancelled');
    expect(JSON.parse(String(outboxQuery?.values?.[5]))).toMatchObject({
      cancelledScheduledVisits: 4,
      status: 'cancelled',
    });
  });

  it('rejects subscription status changes for non-owning Postgres subscribers', async () => {
    const client = new FakePgTransactionClient(undefined, {
      country_code: 'TG',
      status: 'active',
      subscriber_id: '55555555-5555-4555-8555-555555555555',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    await expect(
      repository.cancelSubscription({
        cancelledAt: new Date('2026-05-02T08:00:00.000Z'),
        subscriberUserId: '88888888-8888-4888-8888-888888888888',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        traceId: 'trace_cancel_owner',
      }),
    ).rejects.toThrow('Subscription was not found.');
    expect(client.queries.map((query) => normalizeSql(query.text))).not.toContain(
      'UPDATE subscriptions SET status = $1, updated_at = now() WHERE id = $2',
    );
  });

  it('changes subscription tiers and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(undefined, {
      country_code: 'TG',
      status: 'active',
      subscriber_id: '55555555-5555-4555-8555-555555555555',
      tier_code: 'T1',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const subscription = await repository.changeSubscriptionTier({
      effectiveAt: new Date('2026-05-02T08:00:00.000Z'),
      subscriberUserId: '55555555-5555-4555-8555-555555555555',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      tierCode: 'T2',
      traceId: 'trace_tier',
    });

    expect(subscription).toMatchObject({
      monthlyPriceMinor: 4500n,
      previousTierCode: 'T1',
      status: 'active',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      tierCode: 'T2',
      visitsPerCycle: 2,
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE subscriptions SET tier_code = $1, visits_per_cycle = $2, monthly_price_minor = $3, updated_at = now() WHERE id = $4',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('SubscriptionTierChanged');
    expect(JSON.parse(String(outboxQuery?.values?.[5]))).toMatchObject({
      monthlyPriceMinor: '4500',
      previousTierCode: 'T1',
      tierCode: 'T2',
      visitsPerCycle: 2,
    });
  });

  it('updates subscription payment methods and writes an outbox event', async () => {
    const client = new FakePgTransactionClient(undefined, {
      country_code: 'TG',
      status: 'active',
      subscriber_id: '55555555-5555-4555-8555-555555555555',
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const subscription = await repository.updateSubscriptionPaymentMethod({
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'flooz',
      },
      subscriberUserId: '55555555-5555-4555-8555-555555555555',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      traceId: 'trace_payment_method',
      updatedAt: new Date('2026-05-02T09:00:00.000Z'),
    });

    expect(subscription).toMatchObject({
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'flooz',
      },
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      updatedAt: new Date('2026-05-02T09:00:00.000Z'),
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE subscriptions SET payment_method_provider = $1, payment_method_phone_number = $2, updated_at = now() WHERE id = $3',
    );
    const outboxQuery = client.queries.at(-2);
    expect(outboxQuery?.values?.[4]).toBe('SubscriptionPaymentMethodUpdated');
    expect(JSON.parse(String(outboxQuery?.values?.[5]))).toMatchObject({
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'flooz',
      },
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      updatedAt: '2026-05-02T09:00:00.000Z',
    });
  });

  it('reads monthly worker earnings from completed visit ledger rows', async () => {
    const client = new FakePgTransactionClient(undefined, undefined, undefined, {
      completed_visits: 3,
    });
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const earnings = await repository.getWorkerMonthlyEarnings({
      month: '2026-05',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(earnings).toMatchObject({
      completedVisits: 3,
      month: '2026-05',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(earnings.floor.amountMinor).toBe(40000n);
    expect(earnings.visitBonusTotal.amountMinor).toBe(1800n);
    expect(earnings.total.amountMinor).toBe(41800n);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "SELECT COUNT(*)::int AS completed_visits FROM worker_earning_ledger ledger INNER JOIN visits visit ON visit.id = ledger.visit_id WHERE ledger.worker_id = $1 AND ledger.reason = 'completed_visit_bonus' AND visit.completed_at >= $2 AND visit.completed_at < $3",
    );
    expect(valuesForQuery(client.queries, 'SELECT COUNT(*)::int AS completed_visits')).toEqual([
      '22222222-2222-4222-8222-222222222222',
      new Date('2026-05-01T00:00:00.000Z'),
      new Date('2026-06-01T00:00:00.000Z'),
    ]);
  });

  it('reads worker daily route visits with subscriber and address context', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [
        {
          gps_latitude: '6.131900',
          gps_longitude: '1.222800',
          landmark: 'Pres de la pharmacie du quartier',
          neighborhood: 'Tokoin',
          scheduled_date: '2026-05-05',
          scheduled_time_window: 'morning',
          status: 'scheduled',
          subscriber_phone_number: '+22890123456',
          subscription_id: '33333333-3333-4333-8333-333333333333',
          visit_id: '44444444-4444-4444-8444-444444444444',
        },
      ],
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const route = await repository.getWorkerRoute({
      date: '2026-05-05',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(route).toEqual({
      date: '2026-05-05',
      visits: [
        {
          address: {
            gpsLatitude: 6.1319,
            gpsLongitude: 1.2228,
            landmark: 'Pres de la pharmacie du quartier',
            neighborhood: 'Tokoin',
          },
          scheduledDate: '2026-05-05',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          subscriberPhoneNumber: '+22890123456',
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          visitId: '44444444-4444-4444-8444-444444444444',
        },
      ],
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "SELECT visit.id AS visit_id, visit.subscription_id, visit.status, visit.scheduled_date::text AS scheduled_date, visit.scheduled_time_window, subscriber.phone_number AS subscriber_phone_number, address.neighborhood, address.landmark, address.gps_latitude, address.gps_longitude FROM visits visit INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id INNER JOIN subscriber_addresses address ON address.id = subscription.address_id WHERE visit.worker_id = $1 AND visit.scheduled_date = $2 ORDER BY CASE visit.scheduled_time_window WHEN 'morning' THEN 0 WHEN 'afternoon' THEN 1 ELSE 2 END, visit.id ASC",
    );
    expect(valuesForQuery(client.queries, 'SELECT visit.id AS visit_id')).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '2026-05-05',
    ]);
  });

  it('reads subscription detail with assigned worker and upcoming visits', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        assigned_worker_display_name: 'Akouvi',
        assigned_worker_id: '22222222-2222-4222-8222-222222222222',
        country_code: 'TG',
        gps_latitude: '6.131900',
        gps_longitude: '1.222800',
        landmark: 'Pres de la pharmacie du quartier',
        monthly_price_minor: '2500',
        neighborhood: 'Tokoin',
        payment_method_phone_number: '+22890123456',
        payment_method_provider: 'mixx',
        phone_number: '+22890123456',
        preferred_day_of_week: 'tuesday',
        preferred_time_window: 'morning',
        status: 'active',
        subscriber_id: '55555555-5555-4555-8555-555555555555',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        tier_code: 'T1',
        visits_per_cycle: 1,
      },
      [
        {
          scheduled_date: '2026-05-05',
          scheduled_time_window: 'morning',
          status: 'scheduled',
          visit_id: '44444444-4444-4444-8444-444444444444',
          worker_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
    );
    client.configuredSubscriptionSupportCreditRows = [
      {
        amount_minor: '2500',
        created_at: new Date('2026-05-05T11:00:00.000Z'),
        credit_id: '88888888-8888-4888-8888-888888888888',
        currency_code: 'XOF',
        reason: 'Credit manuel applique.',
      },
    ];
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const detail = await repository.getSubscriptionDetail({
      subscriptionId: '33333333-3333-4333-8333-333333333333',
    });

    expect(detail).toEqual({
      address: {
        gpsLatitude: 6.1319,
        gpsLongitude: 1.2228,
        landmark: 'Pres de la pharmacie du quartier',
        neighborhood: 'Tokoin',
      },
      assignedWorker: {
        averageRating: null,
        completedVisitCount: 0,
        displayName: 'Akouvi',
        disputeCount: 0,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      countryCode: 'TG',
      monthlyPriceMinor: 2500n,
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'mixx',
      },
      phoneNumber: '+22890123456',
      recentVisits: [],
      schedulePreference: { dayOfWeek: 'tuesday', timeWindow: 'morning' },
      status: 'active',
      subscriberId: '55555555-5555-4555-8555-555555555555',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
      supportCredits: [
        {
          amount: { amountMinor: 2500n, currencyCode: 'XOF' },
          createdAt: new Date('2026-05-05T11:00:00.000Z'),
          creditId: '88888888-8888-4888-8888-888888888888',
          reason: 'Credit manuel applique.',
        },
      ],
      tierCode: 'T1',
      upcomingVisits: [
        {
          scheduledDate: '2026-05-05',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          visitId: '44444444-4444-4444-8444-444444444444',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
      ],
      visitsPerCycle: 1,
    });
    expect(
      client.queries
        .map((query) => normalizeSql(query.text))
        .some(
          (query) =>
            query.startsWith(
              'SELECT subscription.id AS subscription_id, subscription.subscriber_id, subscription.country_code',
            ) && query.includes('assigned_worker_average_rating'),
        ),
    ).toBe(true);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "SELECT id AS visit_id, status, scheduled_date::text AS scheduled_date, scheduled_time_window, worker_id FROM visits WHERE subscription_id = $1 AND status IN ('scheduled', 'in_progress') ORDER BY scheduled_date ASC, CASE scheduled_time_window WHEN 'morning' THEN 0 WHEN 'afternoon' THEN 1 ELSE 2 END, id ASC LIMIT 4",
    );
  });

  it('lists pending subscriptions for operator matching', async () => {
    const client = new FakePgTransactionClient(undefined, undefined, undefined, undefined, [
      {
        assignment_due_at: new Date('2026-05-01T12:00:00.000Z'),
        country_code: 'TG',
        gps_latitude: '6.131900',
        gps_longitude: '1.222800',
        landmark: 'Pres de la pharmacie du quartier',
        monthly_price_minor: '4500',
        neighborhood: 'Tokoin',
        phone_number: '+22890123456',
        preferred_day_of_week: 'tuesday',
        preferred_time_window: 'morning',
        queued_at: new Date('2026-05-01T08:00:00.000Z'),
        status: 'pending_match',
        subscriber_id: '55555555-5555-4555-8555-555555555555',
        subscription_id: '33333333-3333-4333-8333-333333333333',
        tier_code: 'T2',
        visits_per_cycle: 2,
      },
    ]);
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const queue = await repository.listMatchingQueue({ countryCode: 'TG', limit: 25 });

    expect(queue).toEqual([
      {
        address: {
          gpsLatitude: 6.1319,
          gpsLongitude: 1.2228,
          landmark: 'Pres de la pharmacie du quartier',
          neighborhood: 'Tokoin',
        },
        assignmentDueAt: new Date('2026-05-01T12:00:00.000Z'),
        countryCode: 'TG',
        monthlyPriceMinor: 4500n,
        phoneNumber: '+22890123456',
        queuedAt: new Date('2026-05-01T08:00:00.000Z'),
        schedulePreference: { dayOfWeek: 'tuesday', timeWindow: 'morning' },
        status: 'pending_match',
        subscriberId: '55555555-5555-4555-8555-555555555555',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        tierCode: 'T2',
        visitsPerCycle: 2,
      },
    ]);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "SELECT subscription.id AS subscription_id, subscription.subscriber_id, subscriber.phone_number, subscription.country_code, subscription.tier_code, subscription.visits_per_cycle, subscription.monthly_price_minor, subscription.preferred_day_of_week, subscription.preferred_time_window, subscription.status, subscription.created_at AS queued_at, subscription.created_at + interval '4 hours' AS assignment_due_at, address.neighborhood, address.landmark, address.gps_latitude, address.gps_longitude FROM subscriptions subscription INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id INNER JOIN subscriber_addresses address ON address.id = subscription.address_id WHERE subscription.country_code = $1 AND subscription.status = 'pending_match' AND subscription.preferred_day_of_week IS NOT NULL AND subscription.preferred_time_window IS NOT NULL ORDER BY subscription.created_at ASC LIMIT $2",
    );
    expect(valuesForQuery(client.queries, 'SELECT subscription.id AS subscription_id')).toEqual([
      'TG',
      25,
    ]);
  });

  it('lists audit events in replay order with filters', async () => {
    const client = new FakePgTransactionClient();
    client.configuredAuditRows = [
      {
        actor_role: 'operator',
        actor_user_id: '11111111-1111-4111-8111-111111111111',
        aggregate_id: '99999999-9999-4999-8999-999999999999',
        aggregate_type: 'assignment_decision',
        country_code: 'TG',
        event_id: '88888888-8888-4888-8888-888888888888',
        event_type: 'AssignmentDecisionRecorded',
        occurred_at: new Date('2026-05-01T10:00:00.000Z'),
        payload: {
          decision: 'declined',
          reason: 'operator_declined_candidate',
        },
        recorded_at: new Date('2026-05-01T10:00:01.000Z'),
        trace_id: 'trace_audit',
      },
    ];
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const events = await repository.listAuditEvents({
      countryCode: 'TG',
      eventType: 'AssignmentDecisionRecorded',
      limit: 25,
    });

    expect(events).toEqual([
      {
        actor: { role: 'operator', userId: '11111111-1111-4111-8111-111111111111' },
        aggregateId: '99999999-9999-4999-8999-999999999999',
        aggregateType: 'assignment_decision',
        countryCode: 'TG',
        eventId: '88888888-8888-4888-8888-888888888888',
        eventType: 'AssignmentDecisionRecorded',
        occurredAt: new Date('2026-05-01T10:00:00.000Z'),
        payload: {
          decision: 'declined',
          reason: 'operator_declined_candidate',
        },
        recordedAt: new Date('2026-05-01T10:00:01.000Z'),
        traceId: 'trace_audit',
      },
    ]);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'SELECT id AS event_id, country_code, aggregate_type, aggregate_id, event_type, payload, actor_role, actor_user_id, trace_id, occurred_at, recorded_at FROM audit_events WHERE country_code = $1 AND ($2::text IS NULL OR aggregate_type = $2) AND ($3::uuid IS NULL OR aggregate_id = $3) AND ($4::text IS NULL OR event_type = $4) ORDER BY occurred_at ASC, id ASC LIMIT $5',
    );
    expect(valuesForQuery(client.queries, 'SELECT id AS event_id')).toEqual([
      'TG',
      null,
      null,
      'AssignmentDecisionRecorded',
      25,
    ]);
  });

  it('lists notification messages with operator filters', async () => {
    const client = new FakePgTransactionClient();
    client.configuredNotificationRows = [
      {
        aggregate_id: '33333333-3333-4333-8333-333333333333',
        aggregate_type: 'subscription',
        available_at: new Date('2026-05-01T10:00:00.000Z'),
        channel: 'push',
        country_code: 'TG',
        created_at: new Date('2026-05-01T10:00:01.000Z'),
        event_id: '88888888-8888-4888-8888-888888888888',
        failure_reason: null,
        attempt_count: 0,
        last_attempt_at: null,
        message_id: '77777777-7777-4777-8777-777777777777',
        payload: {
          status: 'active',
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        provider: null,
        provider_reference: null,
        recipient_role: 'subscriber',
        recipient_user_id: null,
        sent_at: null,
        status: 'pending',
        template_key: 'subscriber.assignment.confirmed.v1',
      },
    ];
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const messages = await repository.listNotificationMessages({
      countryCode: 'TG',
      limit: 25,
      status: 'pending',
    });

    expect(messages).toEqual([
      {
        aggregateId: '33333333-3333-4333-8333-333333333333',
        aggregateType: 'subscription',
        attemptCount: 0,
        availableAt: new Date('2026-05-01T10:00:00.000Z'),
        channel: 'push',
        countryCode: 'TG',
        createdAt: new Date('2026-05-01T10:00:01.000Z'),
        eventId: '88888888-8888-4888-8888-888888888888',
        failureReason: null,
        lastAttemptAt: null,
        messageId: '77777777-7777-4777-8777-777777777777',
        payload: {
          status: 'active',
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        provider: null,
        providerReference: null,
        recipientRole: 'subscriber',
        recipientUserId: null,
        sentAt: null,
        status: 'pending',
        templateKey: 'subscriber.assignment.confirmed.v1',
      },
    ]);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'SELECT id AS message_id, country_code, channel, template_key, recipient_role, recipient_user_id, aggregate_type, aggregate_id, event_id, payload, status, provider, provider_reference, attempt_count, available_at, created_at, last_attempt_at, sent_at, failure_reason FROM notification_messages WHERE country_code = $1 AND ($2::text IS NULL OR status = $2) AND ($3::text IS NULL OR channel = $3) AND ($4::text IS NULL OR template_key = $4) AND ($5::text IS NULL OR aggregate_type = $5) AND ($6::uuid IS NULL OR aggregate_id = $6) ORDER BY available_at ASC, id ASC LIMIT $7',
    );
    expect(valuesForQuery(client.queries, 'SELECT id AS message_id')).toEqual([
      'TG',
      'pending',
      null,
      null,
      null,
      null,
      25,
    ]);
  });

  it('delivers due notification messages transactionally with the local provider', async () => {
    const client = new FakePgTransactionClient();
    client.configuredNotificationRows = [
      {
        aggregate_id: '33333333-3333-4333-8333-333333333333',
        aggregate_type: 'subscription',
        attempt_count: 0,
        available_at: new Date('2026-05-01T10:00:00.000Z'),
        channel: 'push',
        country_code: 'TG',
        created_at: new Date('2026-05-01T10:00:01.000Z'),
        event_id: '88888888-8888-4888-8888-888888888888',
        failure_reason: null,
        last_attempt_at: null,
        message_id: '77777777-7777-4777-8777-777777777777',
        payload: {
          status: 'active',
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        provider: null,
        provider_reference: null,
        recipient_role: 'subscriber',
        recipient_user_id: null,
        sent_at: null,
        status: 'pending',
        template_key: 'subscriber.assignment.confirmed.v1',
      },
    ];
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const messages = await repository.deliverDueNotificationMessages({
      countryCode: 'TG',
      deliveredAt: new Date('2026-05-01T10:05:00.000Z'),
      limit: 10,
    });

    expect(messages).toEqual([
      {
        aggregateId: '33333333-3333-4333-8333-333333333333',
        aggregateType: 'subscription',
        attemptCount: 1,
        availableAt: new Date('2026-05-01T10:00:00.000Z'),
        channel: 'push',
        countryCode: 'TG',
        createdAt: new Date('2026-05-01T10:00:01.000Z'),
        eventId: '88888888-8888-4888-8888-888888888888',
        failureReason: null,
        lastAttemptAt: new Date('2026-05-01T10:05:00.000Z'),
        messageId: '77777777-7777-4777-8777-777777777777',
        payload: {
          status: 'active',
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        provider: 'local_push_simulator',
        providerReference: 'local_push_77777777-7777-4777-8777-777777777777',
        recipientRole: 'subscriber',
        recipientUserId: null,
        sentAt: new Date('2026-05-01T10:05:00.000Z'),
        status: 'sent',
        templateKey: 'subscriber.assignment.confirmed.v1',
      },
    ]);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('BEGIN');
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "SELECT id AS message_id, country_code, channel, template_key, recipient_role, recipient_user_id, aggregate_type, aggregate_id, event_id, payload, status, provider, provider_reference, attempt_count, available_at, created_at, last_attempt_at, sent_at, failure_reason FROM notification_messages WHERE country_code = $1 AND status = 'pending' AND available_at <= $2 ORDER BY available_at ASC, id ASC LIMIT $3 FOR UPDATE SKIP LOCKED",
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'UPDATE notification_messages SET status = $1, provider = $2, provider_reference = $3, attempt_count = $4, last_attempt_at = $5, sent_at = $6, failure_reason = $7, available_at = $8 WHERE id = $9 RETURNING id AS message_id, country_code, channel, template_key, recipient_role, recipient_user_id, aggregate_type, aggregate_id, event_id, payload, status, provider, provider_reference, attempt_count, available_at, created_at, last_attempt_at, sent_at, failure_reason',
    );
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain('COMMIT');
    expect(client.releaseCalled).toBe(true);
  });

  it('registers push device tokens for app clients', async () => {
    const client = new FakePgTransactionClient();
    const repository = new PostgresCoreRepository(new FakePgPool(client));
    const registeredAt = new Date('2026-05-01T10:00:00.000Z');

    const device = await repository.registerPushDevice({
      app: 'subscriber',
      countryCode: 'TG',
      deviceId: 'ios-simulator-1',
      environment: 'simulator',
      platform: 'ios',
      registeredAt,
      role: 'subscriber',
      token: 'apns-simulator-token-1234567890',
      userId: '77777777-7777-4777-8777-777777777777',
    });

    expect(device).toMatchObject({
      app: 'subscriber',
      countryCode: 'TG',
      deviceId: 'ios-simulator-1',
      environment: 'simulator',
      lastRegisteredAt: registeredAt,
      platform: 'ios',
      role: 'subscriber',
      status: 'active',
      token: 'apns-simulator-token-1234567890',
      userId: '77777777-7777-4777-8777-777777777777',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "INSERT INTO push_device_tokens ( id, country_code, user_id, role, app, platform, environment, device_id, token, status, last_registered_at ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10) ON CONFLICT (user_id, device_id) DO UPDATE SET country_code = excluded.country_code, role = excluded.role, app = excluded.app, platform = excluded.platform, environment = excluded.environment, token = excluded.token, status = 'active', last_registered_at = excluded.last_registered_at, updated_at = now() RETURNING id AS push_device_id, country_code, user_id, role, app, platform, environment, device_id, token, status, last_registered_at, created_at, updated_at",
    );
  });

  it('lists push device tokens for operator inspection', async () => {
    const client = new FakePgTransactionClient();
    client.configuredPushDeviceRows = [
      {
        app: 'subscriber',
        country_code: 'TG',
        created_at: new Date('2026-05-01T10:00:00.000Z'),
        device_id: 'ios-simulator-1',
        environment: 'simulator',
        last_registered_at: new Date('2026-05-01T10:05:00.000Z'),
        platform: 'ios',
        push_device_id: '66666666-6666-4666-8666-666666666666',
        role: 'subscriber',
        status: 'active',
        token: 'apns-simulator-token-1234567890',
        updated_at: new Date('2026-05-01T10:05:00.000Z'),
        user_id: '77777777-7777-4777-8777-777777777777',
      },
    ];
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const devices = await repository.listPushDevices({
      countryCode: 'TG',
      limit: 25,
      role: 'subscriber',
      status: 'active',
    });

    expect(devices).toEqual([
      {
        app: 'subscriber',
        countryCode: 'TG',
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        deviceId: 'ios-simulator-1',
        environment: 'simulator',
        lastRegisteredAt: new Date('2026-05-01T10:05:00.000Z'),
        platform: 'ios',
        pushDeviceId: '66666666-6666-4666-8666-666666666666',
        role: 'subscriber',
        status: 'active',
        token: 'apns-simulator-token-1234567890',
        updatedAt: new Date('2026-05-01T10:05:00.000Z'),
        userId: '77777777-7777-4777-8777-777777777777',
      },
    ]);
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'SELECT id AS push_device_id, country_code, user_id, role, app, platform, environment, device_id, token, status, last_registered_at, created_at, updated_at FROM push_device_tokens WHERE country_code = $1 AND ($2::text IS NULL OR role = $2) AND ($3::text IS NULL OR status = $3) ORDER BY last_registered_at DESC, id ASC LIMIT $4',
    );
    expect(valuesForQuery(client.queries, 'SELECT id AS push_device_id')).toEqual([
      'TG',
      'subscriber',
      'active',
      25,
    ]);
  });

  it('upserts worker dispatch profiles', async () => {
    const client = new FakePgTransactionClient();
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const worker = await repository.upsertWorkerProfile({
      countryCode: 'TG',
      displayName: 'Akouvi',
      maxActiveSubscriptions: 12,
      serviceNeighborhoods: ['Tokoin', 'Be'],
      status: 'active',
      workerId: '22222222-2222-4222-8222-222222222222',
    });

    expect(worker).toEqual({
      countryCode: 'TG',
      displayName: 'Akouvi',
      maxActiveSubscriptions: 12,
      serviceNeighborhoods: ['Tokoin', 'Be'],
      status: 'active',
      workerId: '22222222-2222-4222-8222-222222222222',
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      'INSERT INTO workers ( id, country_code, display_name, status, service_neighborhoods, max_active_subscriptions ) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET country_code = excluded.country_code, display_name = excluded.display_name, status = excluded.status, service_neighborhoods = excluded.service_neighborhoods, max_active_subscriptions = excluded.max_active_subscriptions, updated_at = now()',
    );
    const upsertWorkerQuery = client.queries.find((query) =>
      normalizeSql(query.text).startsWith('INSERT INTO workers'),
    );
    expect(upsertWorkerQuery?.values).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'TG',
      'Akouvi',
      'active',
      ['Tokoin', 'Be'],
      12,
    ]);
  });

  it('ranks active worker candidates for a pending subscription', async () => {
    const client = new FakePgTransactionClient(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        country_code: 'TG',
        neighborhood: 'Tokoin',
      },
      [
        {
          active_subscription_count: 1,
          display_name: 'Ama',
          max_active_subscriptions: 4,
          service_neighborhoods: ['Tokoin'],
          worker_id: '33333333-3333-4333-8333-333333333333',
        },
        {
          active_subscription_count: 0,
          display_name: 'Akouvi',
          max_active_subscriptions: 12,
          service_neighborhoods: ['Tokoin', 'Be'],
          worker_id: '22222222-2222-4222-8222-222222222222',
        },
      ],
    );
    const repository = new PostgresCoreRepository(new FakePgPool(client));

    const candidates = await repository.listMatchingCandidates({
      limit: 2,
      subscriptionId: '33333333-3333-4333-8333-333333333333',
    });

    expect(candidates.map((candidate) => candidate.workerId)).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    ]);
    expect(candidates[0]).toMatchObject({
      activeSubscriptionCount: 0,
      capacityRemaining: 12,
      score: 160,
      scoreReasons: ['service_neighborhood_match', 'capacity_available'],
    });
    expect(client.queries.map((query) => normalizeSql(query.text))).toContain(
      "SELECT subscription.country_code, address.neighborhood FROM subscriptions subscription INNER JOIN subscriber_addresses address ON address.id = subscription.address_id WHERE subscription.id = $1 AND subscription.status IN ('active', 'pending_match')",
    );
    expect(
      client.queries
        .map((query) => normalizeSql(query.text))
        .some(
          (query) =>
            query.startsWith('SELECT worker.id AS worker_id') &&
            query.includes('worker_service_cells') &&
            query.includes(
              'COUNT(DISTINCT active_subscription.id)::int AS active_subscription_count',
            ),
        ),
    ).toBe(true);
  });
});

interface RecordedQuery {
  readonly text: string;
  readonly values?: readonly unknown[];
}

class FakePgPool implements PgPoolLike {
  public constructor(private readonly client: FakePgTransactionClient) {}

  public async connect(): Promise<PgTransactionClient> {
    return this.client;
  }

  public async end(): Promise<void> {}

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>> {
    return this.client.query<T>(text, values);
  }
}

class FakePgTransactionClient implements PgTransactionClient {
  public configuredOperatorWorkerIssueRows?: readonly QueryResultRow[];
  public configuredSubscriptionSupportCreditRows?: readonly QueryResultRow[];
  public configuredAssignmentWorkerRow?: QueryResultRow;
  public configuredAuditRows?: readonly QueryResultRow[];
  public configuredNotificationRows?: readonly QueryResultRow[];
  public configuredPaymentAttemptByIdRow?: QueryResultRow;
  public configuredPaymentReconciliationRows?: readonly QueryResultRow[];
  public configuredPaymentRefundRow?: QueryResultRow;
  public configuredPushDeviceRows?: readonly QueryResultRow[];
  public configuredPushTokenRows?: readonly QueryResultRow[];
  public configuredWorkerUnavailableOnDate = false;
  public configuredWorkerIssueResolutionRow?: QueryResultRow;
  public readonly queries: RecordedQuery[] = [];
  public releaseCalled = false;

  public constructor(
    private readonly failOnQueryNumber?: number,
    private readonly subscriptionRow?: QueryResultRow,
    private readonly visitRow?: QueryResultRow,
    private readonly earningsRow?: QueryResultRow,
    private readonly matchingRows?: readonly QueryResultRow[],
    private readonly candidateSubscriptionRow?: QueryResultRow,
    private readonly candidateRows?: readonly QueryResultRow[],
    private readonly authChallengeRow?: QueryResultRow,
    private readonly authUserRow?: QueryResultRow,
    private readonly authSessionRow?: QueryResultRow,
    private readonly paymentSubscriptionRow?: QueryResultRow,
    private readonly paymentAttemptRow?: QueryResultRow,
    private readonly workerRouteRows?: readonly QueryResultRow[],
    private readonly subscriptionDetailRow?: QueryResultRow,
    private readonly subscriptionUpcomingVisitRows?: readonly QueryResultRow[],
    private readonly subscriberVisitChangeRow?: QueryResultRow,
    private readonly disputeVisitRow?: QueryResultRow,
    private readonly operatorDisputeRows?: readonly QueryResultRow[],
    private readonly disputeResolutionRow?: QueryResultRow,
    private readonly subscriptionRecentVisitRows?: readonly QueryResultRow[],
    private readonly ratingVisitRow?: QueryResultRow,
    private readonly workerIssueVisitRow?: QueryResultRow,
    private readonly operatorWorkerIssueRows?: readonly QueryResultRow[],
    private readonly workerIssueResolutionRow?: QueryResultRow,
    private readonly assignmentWorkerRow?: QueryResultRow,
    private readonly workerUnavailableOnDate = false,
  ) {}

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>> {
    this.queries.push({ text, values });

    if (this.failOnQueryNumber === this.queries.length) {
      throw new Error('query failed');
    }

    if (normalizeSql(text).startsWith('SELECT country_code, currency_code')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.paymentSubscriptionRow === undefined ? 0 : 1,
        rows: this.paymentSubscriptionRow === undefined ? [] : [this.paymentSubscriptionRow as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT attempt.id AS payment_attempt_id')) {
      if (normalizeSql(text).includes('refunded_amount_minor')) {
        const rows = this.configuredPaymentReconciliationRows ?? [];
        return {
          command: 'SELECT',
          fields: [],
          oid: 0,
          rowCount: rows.length,
          rows: rows as T[],
        };
      }

      if (normalizeSql(text).includes('WHERE attempt.id = $1')) {
        return {
          command: 'SELECT',
          fields: [],
          oid: 0,
          rowCount: this.configuredPaymentAttemptByIdRow === undefined ? 0 : 1,
          rows:
            this.configuredPaymentAttemptByIdRow === undefined
              ? []
              : [this.configuredPaymentAttemptByIdRow as T],
        };
      }

      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.paymentAttemptRow === undefined ? 0 : 1,
        rows: this.paymentAttemptRow === undefined ? [] : [this.paymentAttemptRow as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT id AS refund_id')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.configuredPaymentRefundRow === undefined ? 0 : 1,
        rows:
          this.configuredPaymentRefundRow === undefined
            ? []
            : [this.configuredPaymentRefundRow as T],
      };
    }

    if (normalizeSql(text).startsWith('INSERT INTO subscribers')) {
      return {
        command: 'INSERT',
        fields: [],
        oid: 0,
        rowCount: 1,
        rows: [{ subscriber_id: values?.[0] } as T],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT country_code') ||
      (normalizeSql(text).startsWith('SELECT subscription.country_code') &&
        normalizeSql(text).includes('subscription.preferred_day_of_week'))
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.subscriptionRow === undefined ? 0 : 1,
        rows: this.subscriptionRow === undefined ? [] : [this.subscriptionRow as T],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT EXISTS') &&
      normalizeSql(text).includes('FROM worker_unavailability')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: 1,
        rows: [
          { exists: this.configuredWorkerUnavailableOnDate || this.workerUnavailableOnDate } as T,
        ],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT EXISTS') &&
      normalizeSql(text).includes('FROM workers')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: 1,
        rows: [{ exists: true } as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT worker.display_name')) {
      const row = this.configuredAssignmentWorkerRow ?? this.assignmentWorkerRow;
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: row === undefined ? 0 : 1,
        rows: row === undefined ? [] : [row as T],
      };
    }

    if (normalizeSql(text).startsWith("UPDATE visits SET status = 'cancelled'")) {
      return {
        command: 'UPDATE',
        fields: [],
        oid: 0,
        rowCount: 4,
        rows: [],
      };
    }

    if (normalizeSql(text).startsWith('SELECT visit.check_in_at')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.visitRow === undefined ? 0 : 1,
        rows: this.visitRow === undefined ? [] : [this.visitRow as T],
      };
    }

    if (normalizeSql(text).startsWith('INSERT INTO assignment_decisions')) {
      return {
        command: 'INSERT',
        fields: [],
        oid: 0,
        rowCount: 1,
        rows: [
          {
            anchor_date: values?.[6],
            country_code: values?.[4],
            created_at: new Date('2026-05-01T10:00:00.000Z'),
            decision: values?.[5],
            decision_id: values?.[0],
            operator_user_id: values?.[3],
            reason: values?.[7],
            subscription_id: values?.[1],
            worker_id: values?.[2],
          } as T,
        ],
      };
    }

    if (normalizeSql(text).startsWith('INSERT INTO visit_photos')) {
      return {
        command: 'INSERT',
        fields: [],
        oid: 0,
        rowCount: 1,
        rows: [
          {
            byte_size: values?.[7],
            captured_at: values?.[8],
            content_type: values?.[6],
            country_code: values?.[3],
            object_key: values?.[5],
            photo_id: values?.[0],
            photo_type: values?.[4],
            uploaded_at: new Date('2026-05-05T09:06:00.000Z'),
            visit_id: values?.[1],
            worker_id: values?.[2],
          } as T,
        ],
      };
    }

    if (normalizeSql(text).startsWith('SELECT photo_type FROM visit_photos')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: 2,
        rows: [{ photo_type: 'before' } as T, { photo_type: 'after' } as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT COUNT(*)::int AS completed_visits')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.earningsRow === undefined ? 0 : 1,
        rows: this.earningsRow === undefined ? [] : [this.earningsRow as T],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT visit.id AS visit_id') &&
      normalizeSql(text).includes('address.gps_latitude') &&
      normalizeSql(text).includes('FOR UPDATE OF visit')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.workerIssueVisitRow === undefined ? 0 : 1,
        rows: this.workerIssueVisitRow === undefined ? [] : [this.workerIssueVisitRow as T],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT visit.id AS visit_id') &&
      normalizeSql(text).includes('visit.scheduled_date') &&
      normalizeSql(text).includes('FOR UPDATE OF visit')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.subscriberVisitChangeRow === undefined ? 0 : 1,
        rows:
          this.subscriberVisitChangeRow === undefined ? [] : [this.subscriberVisitChangeRow as T],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT visit.id AS visit_id') &&
      normalizeSql(text).includes('subscription.subscriber_id') &&
      normalizeSql(text).includes('FOR UPDATE OF visit')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.ratingVisitRow === undefined ? 0 : 1,
        rows: this.ratingVisitRow === undefined ? [] : [this.ratingVisitRow as T],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT issue.id AS issue_id') &&
      normalizeSql(text).includes('WHERE issue.id = $1')
    ) {
      const row = this.configuredWorkerIssueResolutionRow ?? this.workerIssueResolutionRow;
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: row === undefined ? 0 : 1,
        rows: row === undefined ? [] : [row as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT issue.id AS issue_id')) {
      const rows = this.configuredOperatorWorkerIssueRows ?? this.operatorWorkerIssueRows ?? [];
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows: rows as T[],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT visit.id AS visit_id') &&
      normalizeSql(text).includes('subscriber.phone_number AS subscriber_phone_number') &&
      normalizeSql(text).includes('FOR UPDATE')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.disputeVisitRow === undefined ? 0 : 1,
        rows: this.disputeVisitRow === undefined ? [] : [this.disputeVisitRow as T],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT dispute.id AS dispute_id') &&
      normalizeSql(text).includes('WHERE dispute.id = $1')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.disputeResolutionRow === undefined ? 0 : 1,
        rows: this.disputeResolutionRow === undefined ? [] : [this.disputeResolutionRow as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT dispute.id AS dispute_id')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.operatorDisputeRows?.length ?? 0,
        rows: (this.operatorDisputeRows ?? []) as T[],
      };
    }

    if (normalizeSql(text).startsWith('SELECT id AS event_id')) {
      const rows = this.configuredAuditRows ?? [];
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows: rows as T[],
      };
    }

    if (normalizeSql(text).startsWith('SELECT id AS message_id')) {
      const rows = this.configuredNotificationRows ?? [];
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows: rows as T[],
      };
    }

    if (normalizeSql(text).startsWith('INSERT INTO push_device_tokens')) {
      const row = {
        app: values?.[4],
        country_code: values?.[1],
        created_at: new Date('2026-05-01T10:00:00.000Z'),
        device_id: values?.[7],
        environment: values?.[6],
        last_registered_at: values?.[9],
        platform: values?.[5],
        push_device_id: values?.[0],
        role: values?.[3],
        status: 'active',
        token: values?.[8],
        updated_at: new Date('2026-05-01T10:00:00.000Z'),
        user_id: values?.[2],
      };
      return {
        command: 'INSERT',
        fields: [],
        oid: 0,
        rowCount: 1,
        rows: [row as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT id AS push_device_id')) {
      const rows = this.configuredPushDeviceRows ?? [];
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows: rows as T[],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT token FROM push_device_tokens') ||
      normalizeSql(text).startsWith('SELECT push_device.token')
    ) {
      const rows = this.configuredPushTokenRows ?? [];
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows: rows as T[],
      };
    }

    if (normalizeSql(text).startsWith('UPDATE notification_messages')) {
      const current = this.configuredNotificationRows?.[0];
      const row =
        current === undefined
          ? undefined
          : {
              ...current,
              attempt_count: values?.[3],
              available_at: values?.[7],
              failure_reason: values?.[6],
              last_attempt_at: values?.[4],
              provider: values?.[1],
              provider_reference: values?.[2],
              sent_at: values?.[5],
              status: values?.[0],
            };
      return {
        command: 'UPDATE',
        fields: [],
        oid: 0,
        rowCount: row === undefined ? 0 : 1,
        rows: row === undefined ? [] : [row as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT visit.id AS visit_id')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.workerRouteRows?.length ?? 0,
        rows: (this.workerRouteRows ?? []) as T[],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT id AS visit_id, subscription_id, country_code') &&
      !normalizeSql(text).includes('scheduled_date::text AS scheduled_date')
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.ratingVisitRow === undefined ? 0 : 1,
        rows: this.ratingVisitRow === undefined ? [] : [this.ratingVisitRow as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT id AS visit_id, subscription_id, country_code')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.subscriberVisitChangeRow === undefined ? 0 : 1,
        rows:
          this.subscriberVisitChangeRow === undefined ? [] : [this.subscriberVisitChangeRow as T],
      };
    }

    if (
      normalizeSql(text).startsWith(
        'SELECT subscription.id AS subscription_id, subscription.subscriber_id, subscription.country_code',
      )
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.subscriptionDetailRow === undefined ? 0 : 1,
        rows: this.subscriptionDetailRow === undefined ? [] : [this.subscriptionDetailRow as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT id AS credit_id')) {
      const rows = this.configuredSubscriptionSupportCreditRows ?? [];
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: rows.length,
        rows: rows as T[],
      };
    }

    if (
      normalizeSql(text).startsWith('SELECT id AS visit_id') &&
      normalizeSql(text).includes("status IN ('cancelled', 'completed', 'disputed', 'no_show')")
    ) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.subscriptionRecentVisitRows?.length ?? 0,
        rows: (this.subscriptionRecentVisitRows ?? []) as T[],
      };
    }

    if (normalizeSql(text).startsWith('SELECT id AS visit_id')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.subscriptionUpcomingVisitRows?.length ?? 0,
        rows: (this.subscriptionUpcomingVisitRows ?? []) as T[],
      };
    }

    if (normalizeSql(text).startsWith('SELECT subscription.id AS subscription_id')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.matchingRows?.length ?? 0,
        rows: (this.matchingRows ?? []) as T[],
      };
    }

    if (normalizeSql(text).startsWith('SELECT subscription.country_code')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.candidateSubscriptionRow === undefined ? 0 : 1,
        rows:
          this.candidateSubscriptionRow === undefined ? [] : [this.candidateSubscriptionRow as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT worker.id AS worker_id')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.candidateRows?.length ?? 0,
        rows: (this.candidateRows ?? []) as T[],
      };
    }

    if (normalizeSql(text).startsWith('SELECT attempts')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.authChallengeRow === undefined ? 0 : 1,
        rows: this.authChallengeRow === undefined ? [] : [this.authChallengeRow as T],
      };
    }

    if (normalizeSql(text).startsWith('INSERT INTO auth_users')) {
      return {
        command: 'INSERT',
        fields: [],
        oid: 0,
        rowCount: this.authUserRow === undefined ? 0 : 1,
        rows: this.authUserRow === undefined ? [] : [this.authUserRow as T],
      };
    }

    if (normalizeSql(text).startsWith('SELECT session.device_id')) {
      return {
        command: 'SELECT',
        fields: [],
        oid: 0,
        rowCount: this.authSessionRow === undefined ? 0 : 1,
        rows: this.authSessionRow === undefined ? [] : [this.authSessionRow as T],
      };
    }

    return {
      command: 'SELECT',
      fields: [],
      oid: 0,
      rowCount: 0,
      rows: [],
    };
  }

  public release(): void {
    this.releaseCalled = true;
  }
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/gu, ' ').trim();
}

function valuesForQuery(
  queries: readonly RecordedQuery[],
  normalizedPrefix: string,
): readonly unknown[] | undefined {
  return queries.find((query) => normalizeSql(query.text).startsWith(normalizedPrefix))?.values;
}
