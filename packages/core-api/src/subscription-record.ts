import { randomUUID } from 'node:crypto';

import { getLomeV1Tier } from '@washed/core-domain';
import { createDomainEvent, createRequestContext } from '@washed/shared';

import type { CreatedSubscriptionRecord, CreateSubscriptionInput } from './repository.js';

export function buildCreatedSubscriptionRecord(
  input: CreateSubscriptionInput,
): CreatedSubscriptionRecord {
  if (input.countryCode !== 'TG') {
    throw new Error('Only Togo launch subscriptions are supported right now.');
  }

  const context = createRequestContext({
    countryCode: input.countryCode,
    traceId: input.traceId,
  });
  const tier = getLomeV1Tier(input.tierCode);
  const subscriberId = randomUUID();
  const addressId = randomUUID();
  const subscriptionId = randomUUID();
  const createdAt = new Date();

  const subscriptionCreated = createDomainEvent({
    actor: { role: 'subscriber', userId: subscriberId },
    aggregateId: subscriptionId,
    aggregateType: 'subscription',
    countryCode: context.countryCode,
    eventType: 'SubscriptionCreated',
    payload: {
      addressId,
      preferredDayOfWeek: input.schedulePreference.dayOfWeek,
      preferredTimeWindow: input.schedulePreference.timeWindow,
      status: 'pending_match',
      subscriberId,
      tierCode: input.tierCode,
    },
    traceId: input.traceId,
  });

  return {
    addressId,
    countryCode: context.countryCode,
    createdAt,
    currencyCode: context.currencyCode,
    events: [subscriptionCreated],
    monthlyPriceMinor: tier.monthlyPrice.amountMinor,
    status: 'pending_match',
    subscriberId,
    subscriptionId,
    tierCode: tier.code,
    visitsPerCycle: tier.visitsPerCycle,
  };
}
