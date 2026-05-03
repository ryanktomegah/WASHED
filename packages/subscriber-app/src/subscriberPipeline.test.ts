import { describe, expect, it } from 'vitest';

import { buildSubscriberPipeline } from './subscriberPipeline.js';
import { initialSubscriberState, subscriberReducer } from './subscriberState.js';

describe('subscriber pipeline', () => {
  it('prioritizes payment recovery before the next visit when the account is overdue', () => {
    const pipeline = buildSubscriberPipeline(initialSubscriberState);

    expect(pipeline.serviceStatus).toBe('paymentAttention');
    expect(pipeline.homeIntent).toBe('paymentRecovery');
    expect(pipeline.primaryAction).toMatchObject({
      labelFr: 'Régulariser le paiement',
      sheet: 'paymentRecovery',
    });
    expect(pipeline.messages[0]).toMatchObject({
      id: 'payment',
      needsAttention: true,
      target: { sheet: 'paymentRecovery' },
    });
  });

  it('returns Home to next-visit confidence after payment is recovered', () => {
    const recoveredState = subscriberReducer(initialSubscriberState, { type: 'payment/recover' });
    const pipeline = buildSubscriberPipeline(recoveredState);

    expect(pipeline.serviceStatus).toBe('active');
    expect(pipeline.homeIntent).toBe('nextVisitConfidence');
    expect(pipeline.primaryAction).toMatchObject({
      labelFr: 'Voir la visite',
      route: 'visit',
    });
  });

  it('moves Home into live tracking when the worker is en route', () => {
    const enRouteState = subscriberReducer(
      subscriberReducer(initialSubscriberState, { type: 'payment/recover' }),
      { type: 'visit/startTracking' },
    );
    const pipeline = buildSubscriberPipeline(enRouteState);

    expect(pipeline.serviceStatus).toBe('visitInMotion');
    expect(pipeline.homeIntent).toBe('liveTracking');
    expect(pipeline.primaryAction).toMatchObject({
      labelFr: 'Suivre la visite',
      route: 'visit',
    });
  });

  it('keeps billing, visit planning, and message destinations in one model', () => {
    const pipeline = buildSubscriberPipeline(initialSubscriberState);

    expect(pipeline.billing.balanceDueXof).toBe(4500);
    expect(pipeline.billing.retrySteps.at(-1)).toMatchObject({
      id: 'next',
      isCurrent: true,
      valueFr: '4 mai',
    });
    expect(pipeline.billing.ledger).toHaveLength(3);
    expect(pipeline.visitPlan.nextVisits[0]).toMatchObject({
      dateFr: 'mardi 5 mai',
      isNext: true,
    });
    expect(pipeline.messages.find((message) => message.id === 'operator')).toMatchObject({
      target: { route: 'visit' },
    });
  });
});
