import { randomUUID } from 'node:crypto';

import { getLomeV1Tier } from '@washed/core-domain';
import { createDomainEvent, createRequestContext } from '@washed/shared';

import type { CreatedSubscriptionRecord, CreateSubscriptionInput } from './repository.js';

export function buildCreatedSubscriptionRecord(
  input: CreateSubscriptionInput,
  subscriberId: string = randomUUID(),
): CreatedSubscriptionRecord {
  if (input.countryCode !== 'TG') {
    throw new Error('Only Togo launch subscriptions are supported right now.');
  }

  const context = createRequestContext({
    countryCode: input.countryCode,
    traceId: input.traceId,
  });
  const tier = getLomeV1Tier(input.tierCode);
  const addressId = randomUUID();
  const subscriptionId = randomUUID();
  const createdAt = new Date();
  const status = input.schedulePreference === undefined ? 'ready_no_visit' : 'pending_match';

  const subscriptionCreated = createDomainEvent({
    actor: { role: 'subscriber', userId: subscriberId },
    aggregateId: subscriptionId,
    aggregateType: 'subscription',
    countryCode: context.countryCode,
    eventType: 'SubscriptionCreated',
    payload: {
      addressId,
      paymentMethod: input.paymentMethod ?? null,
      ...(input.schedulePreference === undefined
        ? {}
        : {
            preferredDayOfWeek: input.schedulePreference.dayOfWeek,
            preferredTimeWindow: input.schedulePreference.timeWindow,
          }),
      status,
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
    paymentMethod: input.paymentMethod ?? null,
    status,
    subscriberId,
    subscriptionId,
    tierCode: tier.code,
    visitsPerCycle: tier.visitsPerCycle,
  };
}
