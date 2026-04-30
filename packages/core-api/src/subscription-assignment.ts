import { randomInt, randomUUID } from 'node:crypto';

import { generateScheduledVisits, type DayOfWeek, type TimeWindow } from '@washed/core-domain';
import { createDomainEvent, type CountryCode } from '@washed/shared';

import type { AssignedSubscriptionRecord, AssignWorkerInput } from './repository.js';

export interface BuildAssignedSubscriptionRecordInput extends AssignWorkerInput {
  readonly countryCode: CountryCode;
  readonly schedulePreference: {
    readonly dayOfWeek: DayOfWeek;
    readonly timeWindow: TimeWindow;
  };
}

export function buildAssignedSubscriptionRecord(
  input: BuildAssignedSubscriptionRecordInput,
): AssignedSubscriptionRecord {
  const visits = generateScheduledVisits({
    anchorDate: input.anchorDate,
    count: 4,
    dayOfWeek: input.schedulePreference.dayOfWeek,
    timeWindow: input.schedulePreference.timeWindow,
  }).map((visit) => ({
    fallbackCode: randomInt(0, 10_000).toString().padStart(4, '0'),
    scheduledDate: visit.scheduledDate,
    scheduledTimeWindow: visit.scheduledTimeWindow,
    status: 'scheduled' as const,
    visitId: randomUUID(),
    workerId: input.workerId,
  }));

  const subscriberAssigned = createDomainEvent({
    actor: { role: 'operator', userId: input.operatorUserId },
    aggregateId: input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType: 'SubscriberAssigned',
    payload: {
      generatedVisitIds: visits.map((visit) => visit.visitId),
      status: 'active',
      workerId: input.workerId,
    },
    traceId: input.traceId,
  });

  return {
    events: [subscriberAssigned],
    status: 'active',
    subscriptionId: input.subscriptionId,
    visits,
    workerId: input.workerId,
  };
}
