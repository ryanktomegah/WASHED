import { randomUUID } from 'node:crypto';

import type { CountryCode } from '../tenancy/context.js';

export type ActorRole = 'subscriber' | 'worker' | 'operator' | 'system';

export interface ActorRef {
  readonly role: ActorRole;
  readonly userId: string | null;
}

export interface DomainEventInput<TPayload extends Record<string, unknown>> {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly actor: ActorRef;
  readonly countryCode: CountryCode;
  readonly eventType: string;
  readonly payload: TPayload;
  readonly traceId: string;
  readonly occurredAt?: Date;
}

export interface DomainEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> extends DomainEventInput<TPayload> {
  readonly eventId: string;
  readonly occurredAt: Date;
}

export function createDomainEvent<TPayload extends Record<string, unknown>>(
  input: DomainEventInput<TPayload>,
): DomainEvent<TPayload> {
  return {
    ...input,
    eventId: randomUUID(),
    occurredAt: input.occurredAt ?? new Date(),
  };
}
