import { createDomainEvent } from '@washed/shared';
import { describe, expect, it } from 'vitest';

import { assertCoreDomainEventContract } from './domain-event-contracts.js';

describe('assertCoreDomainEventContract', () => {
  it.each([
    {
      actor: { role: 'subscriber' as const, userId: '55555555-5555-4555-8555-555555555555' },
      aggregateId: '33333333-3333-4333-8333-333333333333',
      aggregateType: 'subscription',
      eventType: 'SubscriptionCreated',
      payload: {
        addressId: '44444444-4444-4444-8444-444444444444',
        preferredDayOfWeek: 'tuesday',
        preferredTimeWindow: 'morning',
        status: 'pending_match',
        subscriberId: '55555555-5555-4555-8555-555555555555',
        tierCode: 'T1',
      },
    },
    {
      actor: { role: 'operator' as const, userId: '11111111-1111-4111-8111-111111111111' },
      aggregateId: '33333333-3333-4333-8333-333333333333',
      aggregateType: 'subscription',
      eventType: 'SubscriberAssigned',
      payload: {
        generatedVisitIds: ['44444444-4444-4444-8444-444444444444'],
        status: 'active',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    },
    {
      actor: { role: 'operator' as const, userId: '11111111-1111-4111-8111-111111111111' },
      aggregateId: '33333333-3333-4333-8333-333333333333',
      aggregateType: 'subscription',
      eventType: 'SubscriptionPaymentFailed',
      payload: {
        amountMinor: '2500',
        currencyCode: 'XOF',
        idempotencyKey: 'billing-2026-05-fail',
        paymentAttemptId: '77777777-7777-4777-8777-777777777777',
        provider: 'mock',
        providerReference: 'mock_77777777-7777-4777-8777-777777777777',
        status: 'failed',
        subscriptionStatus: 'payment_overdue',
      },
    },
    {
      actor: { role: 'system' as const, userId: null },
      aggregateId: '33333333-3333-4333-8333-333333333333',
      aggregateType: 'subscription',
      eventType: 'SubscriptionPaymentSucceeded',
      payload: {
        amountMinor: '2500',
        currencyCode: 'XOF',
        idempotencyKey: 'billing-2026-05-success',
        paymentAttemptId: '77777777-7777-4777-8777-777777777777',
        provider: 'mobile_money_http',
        providerReference: 'provider-charge-123',
        status: 'succeeded',
        subscriptionStatus: 'active',
      },
    },
    {
      actor: { role: 'operator' as const, userId: '11111111-1111-4111-8111-111111111111' },
      aggregateId: '88888888-8888-4888-8888-888888888888',
      aggregateType: 'payment_reconciliation_run',
      eventType: 'PaymentReconciliationRunCompleted',
      payload: {
        issueCount: 1,
        provider: 'mobile_money_http',
        reconciliationRunId: '88888888-8888-4888-8888-888888888888',
        status: 'issues_found',
        totalCollectedMinor: '0',
        totalFailedAttempts: 1,
        totalRefundedMinor: '0',
        totalSucceededAttempts: 0,
      },
    },
    {
      actor: { role: 'operator' as const, userId: '11111111-1111-4111-8111-111111111111' },
      aggregateId: '88888888-8888-4888-8888-888888888888',
      aggregateType: 'payment_refund',
      eventType: 'PaymentRefundIssued',
      payload: {
        amountMinor: '2500',
        currencyCode: 'XOF',
        paymentAttemptId: '77777777-7777-4777-8777-777777777777',
        provider: 'manual',
        providerReference: null,
        reason: 'subscriber_goodwill',
        refundId: '88888888-8888-4888-8888-888888888888',
        status: 'issued',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
      },
    },
    {
      actor: { role: 'operator' as const, userId: '11111111-1111-4111-8111-111111111111' },
      aggregateId: '33333333-3333-4333-8333-333333333333',
      aggregateType: 'subscription',
      eventType: 'SubscriberPrivacyRequestRecorded',
      payload: {
        auditEventCount: 3,
        billingItemCount: 1,
        disputeCount: 0,
        notificationCount: 1,
        reason: 'subscriber requested account deletion',
        requestId: '88888888-8888-4888-8888-888888888888',
        requestType: 'erasure',
        retainedRecordTypes: ['payment_attempts_and_refunds', 'audit_events'],
        subscriberId: '55555555-5555-4555-8555-555555555555',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
      },
    },
    {
      actor: { role: 'worker' as const, userId: '22222222-2222-4222-8222-222222222222' },
      aggregateId: '44444444-4444-4444-8444-444444444444',
      aggregateType: 'visit',
      eventType: 'VisitCompleted',
      payload: {
        bonusAmountMinor: '600',
        bonusCurrencyCode: 'XOF',
        checkedInAt: '2026-05-05T09:00:00.000Z',
        checkedOutAt: '2026-05-05T09:45:00.000Z',
        durationMinutes: 45,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    },
  ])('accepts the $eventType payload contract', (input) => {
    const event = createDomainEvent({
      ...input,
      countryCode: 'TG',
      traceId: `trace_${input.eventType}`,
    });

    expect(() => assertCoreDomainEventContract(event)).not.toThrow();
  });

  it('accepts the AssignmentDecisionRecorded payload contract', () => {
    const event = createDomainEvent({
      actor: { role: 'operator', userId: '11111111-1111-4111-8111-111111111111' },
      aggregateId: '99999999-9999-4999-8999-999999999999',
      aggregateType: 'assignment_decision',
      countryCode: 'TG',
      eventType: 'AssignmentDecisionRecorded',
      payload: {
        anchorDate: '2026-05-05',
        decision: 'declined',
        decisionId: '99999999-9999-4999-8999-999999999999',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        reason: 'operator_declined_candidate',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      traceId: 'trace_assignment_decision',
    });

    expect(() => assertCoreDomainEventContract(event)).not.toThrow();
  });

  it('rejects AssignmentDecisionRecorded payload drift', () => {
    const event = createDomainEvent({
      actor: { role: 'operator', userId: '11111111-1111-4111-8111-111111111111' },
      aggregateId: '99999999-9999-4999-8999-999999999999',
      aggregateType: 'assignment_decision',
      countryCode: 'TG',
      eventType: 'AssignmentDecisionRecorded',
      payload: {
        anchorDate: '2026-05-05',
        decision: 'ignored',
        decisionId: '99999999-9999-4999-8999-999999999999',
        operatorUserId: '11111111-1111-4111-8111-111111111111',
        reason: 'operator_declined_candidate',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      traceId: 'trace_assignment_decision',
    });

    expect(() => assertCoreDomainEventContract(event)).toThrow(
      'payload.decision is not supported.',
    );
  });

  it('rejects critical event aggregate drift', () => {
    const event = createDomainEvent({
      actor: { role: 'worker', userId: '22222222-2222-4222-8222-222222222222' },
      aggregateId: '44444444-4444-4444-8444-444444444444',
      aggregateType: 'subscription',
      countryCode: 'TG',
      eventType: 'VisitCompleted',
      payload: {
        bonusAmountMinor: '600',
        bonusCurrencyCode: 'XOF',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      traceId: 'trace_visit_completed',
    });

    expect(() => assertCoreDomainEventContract(event)).toThrow(
      'VisitCompleted aggregateType must be visit.',
    );
  });

  it('rejects unknown event types before audit persistence', () => {
    const event = createDomainEvent({
      actor: { role: 'system', userId: null },
      aggregateId: '33333333-3333-4333-8333-333333333333',
      aggregateType: 'subscription',
      countryCode: 'TG',
      eventType: 'UnregisteredEvent',
      payload: {},
      traceId: 'trace_unknown',
    });

    expect(() => assertCoreDomainEventContract(event)).toThrow(
      'UnregisteredEvent is not registered in the core event contract catalog.',
    );
  });

  it('rejects registered event payloads that miss required keys', () => {
    const event = createDomainEvent({
      actor: { role: 'worker', userId: '22222222-2222-4222-8222-222222222222' },
      aggregateId: '44444444-4444-4444-8444-444444444444',
      aggregateType: 'visit',
      countryCode: 'TG',
      eventType: 'WorkerIssueReported',
      payload: {
        description: 'Client unavailable.',
        issueId: '99999999-9999-4999-8999-999999999999',
        issueType: 'client_unavailable',
        status: 'open',
        workerId: '22222222-2222-4222-8222-222222222222',
      },
      traceId: 'trace_worker_issue',
    });

    expect(() => assertCoreDomainEventContract(event)).toThrow(
      'WorkerIssueReported payload.subscriptionId is required.',
    );
  });
});
