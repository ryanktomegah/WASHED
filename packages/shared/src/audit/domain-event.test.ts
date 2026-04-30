import { describe, expect, it } from 'vitest';

import { createDomainEvent } from './domain-event.js';

describe('createDomainEvent', () => {
  it('adds an event id and timestamp while preserving payload', () => {
    const event = createDomainEvent({
      actor: { role: 'system', userId: null },
      aggregateId: 'sub_123',
      aggregateType: 'subscription',
      countryCode: 'TG',
      eventType: 'SubscriptionCreated',
      payload: { tier: 'T1' },
      traceId: 'trace_123',
    });

    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.payload).toEqual({ tier: 'T1' });
  });
});
