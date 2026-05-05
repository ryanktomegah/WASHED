# Subscriber Support Contacts — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subscriber-facing support-ticket endpoints to `@washed/core-api` so the subscriber app's X-30/X-31/X-32 screens can stop reading `supportDemoData.ts` and write/read real tickets scoped to a subscription.

**Architecture:** New aggregate `support_contact`. Mirrors the existing `support_disputes` pattern (visit-scoped) but is general-purpose and subscriber-initiated. Three endpoints: create / list / detail. In-memory + Postgres repositories implement a shared interface. State is `open | resolved` (open at creation; operator-side resolution is out of scope for this plan and will be picked up in a follow-up). Domain event `SubscriberSupportContactOpened` is registered in the contract catalog and emitted on creation.

**Tech Stack:** Fastify, Postgres, TypeScript, Vitest. No new runtime dependencies.

**Non-goals (deferred to follow-up plans):**
- Operator-side resolution endpoint (`POST /v1/operator/support-contacts/:id/resolve`)
- Subscriber message replies and operator response thread
- Photo / file attachments
- Auto-trigger of notifications on ticket state change

---

## Verified baseline (2026-05-05)

- 34 migrations on disk; next number is `0035`.
- 63 routes registered in `app.ts`; no route currently matches `/support-contacts`. Only operator-side context helper exists at `app.ts:930` (`/v1/operator/subscriptions/:id/support-context`).
- Subscriber app screens X-29..X-32 exist and render from `packages/subscriber-app/src/screens/support/supportDemoData.ts`. Demo `SupportTicket` shape includes: `id, status('open'|'resolved'), title, summary, createdAgo, messages, attachments`.
- Demo categories: `'visit' | 'plan' | 'payment' | 'worker' | 'other'`.
- `support_disputes` migration at `0009_support_disputes.sql` is the closest schema analog.
- `buildCreatedDisputeRecord` at `repository.ts:3592` is the closest record-builder analog.
- `parseCreateDisputeBody` at `validation.ts:628` is the closest input-parser analog.
- `VisitDisputed` event registration at `domain-event-contracts.ts:127` is the closest event-contract analog.

---

## File structure

**Create:**
- `packages/core-api/migrations/0035_subscriber_support_contacts.sql` — table + indexes + CHECK constraints.

**Modify:**
- `packages/core-api/src/repository.ts` — add `SupportContactRecord` interface, `CreateSupportContactInput` / `ListSupportContactsInput` / `GetSupportContactInput` types, repository interface methods, in-memory implementation, `buildCreatedSupportContactRecord` builder.
- `packages/core-api/src/postgres-repository.ts` — implement `createSupportContact / listSupportContactsForSubscription / getSupportContact` against Postgres; add `insertSubscriberSupportContact` helper and `SupportContactRow` mapper.
- `packages/core-api/src/validation.ts` — add `parseCreateSupportContactBody`, `parseListSupportContactsRequest`, `parseGetSupportContactParams`; add `SUPPORT_CONTACT_CATEGORY_VALUES` and `SUPPORT_CONTACT_STATUS_VALUES` sets.
- `packages/core-api/src/app.ts` — register three routes; add `toSupportContactDto`.
- `packages/core-api/src/domain-event-contracts.ts` — register `SubscriberSupportContactOpened`.
- `packages/core-api/src/app.test.ts` — route tests for happy path + auth + invalid body.
- `packages/core-api/src/postgres-repository.test.ts` — Postgres persistence test.
- `packages/core-api/src/domain-event-contracts.test.ts` — contract validation test.
- `docs/api/core-api.openapi.json` — regenerate or hand-extend with the three new paths (snapshot script will tell us).

**No frontend changes in this plan.** Wiring `subscriber-app` to consume these endpoints is a separate plan.

---

## Data model

```
support_contacts (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  category TEXT NOT NULL,            -- visit | plan | payment | worker | other
  status TEXT NOT NULL,              -- open | resolved
  subject TEXT NOT NULL,             -- ≤120 chars; first-line summary
  body TEXT NOT NULL,                -- subscriber's initial message; ≤4000 chars
  opened_by_user_id UUID NOT NULL,
  resolved_by_operator_user_id UUID,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)

INDEX support_contacts_subscription_idx ON (subscription_id, created_at DESC)
INDEX support_contacts_status_idx ON (status, created_at DESC)
CHECK status IN ('open', 'resolved')
CHECK category IN ('visit', 'plan', 'payment', 'worker', 'other')
```

---

## Type contracts

```ts
export type SupportContactCategory = 'visit' | 'plan' | 'payment' | 'worker' | 'other';
export type SupportContactStatus = 'open' | 'resolved';

export interface SupportContactRecord {
  readonly contactId: string;
  readonly subscriptionId: string;
  readonly countryCode: CountryCode;
  readonly category: SupportContactCategory;
  readonly status: SupportContactStatus;
  readonly subject: string;
  readonly body: string;
  readonly openedByUserId: string;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
  readonly events: readonly DomainEvent[];
}

export interface CreateSupportContactInput {
  readonly subscriptionId: string;
  readonly category: SupportContactCategory;
  readonly subject: string;
  readonly body: string;
  readonly subscriberUserId: string;
  readonly createdAt: Date;
  readonly traceId: string;
}

export interface ListSupportContactsInput {
  readonly subscriptionId: string;
  readonly limit: number;             // 1..100, default 20
  readonly status?: SupportContactStatus;
}

export interface GetSupportContactInput {
  readonly subscriptionId: string;
  readonly contactId: string;
}
```

---

## HTTP surface

```
POST /v1/subscriptions/:subscriptionId/support-contacts
  body: { category, subject, body, subscriberUserId, createdAt }
  201 -> SupportContactDto
  404 -> if subscription doesn't exist (uses existing assertion pattern)
  400 -> validation failure (code: 'core.support_contact_create.invalid_request')

GET /v1/subscriptions/:subscriptionId/support-contacts?limit=20&status=open
  200 -> { items: SupportContactDto[], limit, status, subscriptionId }
  400 -> validation failure (code: 'core.support_contact_list.invalid_request')

GET /v1/subscriptions/:subscriptionId/support-contacts/:contactId
  200 -> SupportContactDto
  404 -> if contact doesn't exist or doesn't belong to subscription
  400 -> validation failure (code: 'core.support_contact_get.invalid_request')
```

DTO matches the record but with `Date -> ISO string` and drops `events`.

---

## Tasks

### Task 1: Register the domain event contract

**Files:**
- Modify: `packages/core-api/src/domain-event-contracts.ts`
- Test: `packages/core-api/src/domain-event-contracts.test.ts`

- [ ] **Step 1: Write the failing contract test**

Add to `domain-event-contracts.test.ts`:

```ts
it('accepts a well-formed SubscriberSupportContactOpened event', () => {
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: '11111111-1111-4111-8111-111111111111' },
    aggregateId: '22222222-2222-4222-8222-222222222222',
    aggregateType: 'support_contact',
    countryCode: 'TG',
    eventType: 'SubscriberSupportContactOpened',
    payload: {
      category: 'visit',
      contactId: '22222222-2222-4222-8222-222222222222',
      subject: 'Damaged sweater',
      subscriptionId: '33333333-3333-4333-8333-333333333333',
    },
    traceId: '44444444-4444-4444-8444-444444444444',
  });
  expect(() => assertDomainEventMatchesContract(event)).not.toThrow();
});

it('rejects SubscriberSupportContactOpened with missing payload key', () => {
  expect(() =>
    assertDomainEventMatchesContract(
      createDomainEvent({
        actor: { role: 'subscriber', userId: '11111111-1111-4111-8111-111111111111' },
        aggregateId: '22222222-2222-4222-8222-222222222222',
        aggregateType: 'support_contact',
        countryCode: 'TG',
        eventType: 'SubscriberSupportContactOpened',
        payload: { contactId: '22222222-2222-4222-8222-222222222222' },
        traceId: '44444444-4444-4444-8444-444444444444',
      }),
    ),
  ).toThrow(/payload/);
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm --filter @washed/core-api exec vitest run src/domain-event-contracts.test.ts
```
Expected: 2 failing tests with "Unknown event type SubscriberSupportContactOpened".

- [ ] **Step 3: Add the contract entry**

In `domain-event-contracts.ts`, append after the `DisputeResolved` entry (around line 145):

```ts
  [
    'SubscriberSupportContactOpened',
    {
      actorRole: 'subscriber',
      aggregateType: 'support_contact',
      requiredPayloadKeys: ['category', 'contactId', 'subject', 'subscriptionId'],
    },
  ],
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
pnpm --filter @washed/core-api exec vitest run src/domain-event-contracts.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core-api/src/domain-event-contracts.ts packages/core-api/src/domain-event-contracts.test.ts
git commit -m "feat(core-api): register SubscriberSupportContactOpened event contract"
```

---

### Task 2: Create the migration

**Files:**
- Create: `packages/core-api/migrations/0035_subscriber_support_contacts.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE support_contacts (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  opened_by_user_id UUID NOT NULL,
  resolved_by_operator_user_id UUID,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_contacts_category_check CHECK (
    category IN ('visit', 'plan', 'payment', 'worker', 'other')
  ),
  CONSTRAINT support_contacts_status_check CHECK (
    status IN ('open', 'resolved')
  ),
  CONSTRAINT support_contacts_subject_length CHECK (char_length(subject) BETWEEN 1 AND 120),
  CONSTRAINT support_contacts_body_length CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX support_contacts_subscription_idx ON support_contacts(subscription_id, created_at DESC);
CREATE INDEX support_contacts_status_idx ON support_contacts(status, created_at DESC);
```

- [ ] **Step 2: Validate the migration**

```bash
pnpm migrations:check
```
Expected: PASS (script verifies migration ordering / format).

- [ ] **Step 3: Commit**

```bash
git add packages/core-api/migrations/0035_subscriber_support_contacts.sql
git commit -m "feat(core-api): add support_contacts migration"
```

---

### Task 3: Add types, in-memory repository methods, and record builder

**Files:**
- Modify: `packages/core-api/src/repository.ts`

- [ ] **Step 1: Add type contracts**

Insert after the `DisputeRecord` interface (around `repository.ts:823`):

```ts
export type SupportContactCategory = 'visit' | 'plan' | 'payment' | 'worker' | 'other';
export type SupportContactStatus = 'open' | 'resolved';

export interface SupportContactRecord {
  readonly contactId: string;
  readonly subscriptionId: string;
  readonly countryCode: CountryCode;
  readonly category: SupportContactCategory;
  readonly status: SupportContactStatus;
  readonly subject: string;
  readonly body: string;
  readonly openedByUserId: string;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
  readonly events: readonly DomainEvent[];
}

export interface CreateSupportContactInput {
  readonly subscriptionId: string;
  readonly category: SupportContactCategory;
  readonly subject: string;
  readonly body: string;
  readonly subscriberUserId: string;
  readonly createdAt: Date;
  readonly traceId: string;
}

export interface ListSupportContactsInput {
  readonly subscriptionId: string;
  readonly limit: number;
  readonly status?: SupportContactStatus;
}

export interface GetSupportContactInput {
  readonly subscriptionId: string;
  readonly contactId: string;
}
```

- [ ] **Step 2: Add interface methods**

In the `Repository` interface (after `resolveDispute` declaration around `repository.ts:1162`), add:

```ts
  createSupportContact(input: CreateSupportContactInput): Promise<SupportContactRecord>;
  listSupportContactsForSubscription(
    input: ListSupportContactsInput,
  ): Promise<readonly SupportContactRecord[]>;
  getSupportContact(input: GetSupportContactInput): Promise<SupportContactRecord | null>;
```

- [ ] **Step 3: Add the record builder**

Append after `buildResolvedDisputeRecord` (after `repository.ts:3640+` section ends):

```ts
export function buildCreatedSupportContactRecord(input: {
  readonly countryCode: CountryCode;
  readonly input: CreateSupportContactInput;
}): SupportContactRecord {
  const contactId = randomUUID();
  const event = createDomainEvent({
    actor: { role: 'subscriber', userId: input.input.subscriberUserId },
    aggregateId: contactId,
    aggregateType: 'support_contact',
    countryCode: input.countryCode,
    eventType: 'SubscriberSupportContactOpened',
    payload: {
      category: input.input.category,
      contactId,
      subject: input.input.subject,
      subscriptionId: input.input.subscriptionId,
    },
    traceId: input.input.traceId,
  });

  return {
    contactId,
    subscriptionId: input.input.subscriptionId,
    countryCode: input.countryCode,
    category: input.input.category,
    status: 'open',
    subject: input.input.subject,
    body: input.input.body,
    openedByUserId: input.input.subscriberUserId,
    resolvedByOperatorUserId: null,
    resolutionNote: null,
    createdAt: input.input.createdAt,
    resolvedAt: null,
    events: [event],
  };
}
```

- [ ] **Step 4: Add storage and method bodies to InMemoryRepository**

Add a new array field next to `supportDisputes` (around `repository.ts:1297`):

```ts
  public readonly supportContacts: SupportContactRecord[] = [];
```

Add the three methods, e.g. immediately after `resolveDispute` in the class:

```ts
  public async createSupportContact(
    input: CreateSupportContactInput,
  ): Promise<SupportContactRecord> {
    const subscription = this.subscriptionState.get(input.subscriptionId);
    if (subscription === undefined) {
      throw new Error('Subscription was not found.');
    }

    const record = buildCreatedSupportContactRecord({
      countryCode: subscription.countryCode,
      input,
    });
    this.supportContacts.push(record);
    return record;
  }

  public async listSupportContactsForSubscription(
    input: ListSupportContactsInput,
  ): Promise<readonly SupportContactRecord[]> {
    return this.supportContacts
      .filter((contact) => contact.subscriptionId === input.subscriptionId)
      .filter((contact) => input.status === undefined || contact.status === input.status)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, input.limit);
  }

  public async getSupportContact(
    input: GetSupportContactInput,
  ): Promise<SupportContactRecord | null> {
    const contact = this.supportContacts.find(
      (candidate) =>
        candidate.contactId === input.contactId &&
        candidate.subscriptionId === input.subscriptionId,
    );
    return contact ?? null;
  }
```

(Confirm `subscriptionState` is the correct field name by reading the in-memory class around `repository.ts:1297`. If the class actually uses `subscriptions` or another name, use that and update step instructions inline before committing.)

- [ ] **Step 5: Run typecheck**

```bash
pnpm --filter @washed/core-api typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core-api/src/repository.ts
git commit -m "feat(core-api): add support-contact types, in-memory repo, record builder"
```

---

### Task 4: Add validation parsers

**Files:**
- Modify: `packages/core-api/src/validation.ts`

- [ ] **Step 1: Add value sets near other value-set constants (top of file)**

```ts
const SUPPORT_CONTACT_CATEGORY_VALUES = [
  'other',
  'payment',
  'plan',
  'visit',
  'worker',
] as const satisfies readonly SupportContactCategory[];

const SUPPORT_CONTACT_STATUS_VALUES = ['open', 'resolved'] as const satisfies readonly SupportContactStatus[];
```

(Place these next to `DISPUTE_ISSUE_TYPE_VALUES` / similar; verify naming pattern by grep.)

- [ ] **Step 2: Add `parseCreateSupportContactBody` after `parseCreateDisputeBody`**

```ts
export function parseCreateSupportContactBody(
  subscriptionId: string,
  body: unknown,
  traceId: string,
): CreateSupportContactInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }
  if (!isRecord(body)) {
    throw new Error('Request body must be an object.');
  }

  const subject = readString(body, 'subject');
  if (subject.length < 1 || subject.length > 120) {
    throw new Error('subject must be between 1 and 120 characters.');
  }
  const text = readString(body, 'body');
  if (text.length < 1 || text.length > 4000) {
    throw new Error('body must be between 1 and 4000 characters.');
  }

  return {
    body: text,
    category: readLiteral<SupportContactCategory>(
      body,
      'category',
      SUPPORT_CONTACT_CATEGORY_VALUES,
    ),
    createdAt: readIsoDateTime(body, 'createdAt'),
    subject,
    subscriberUserId: readUuid(body, 'subscriberUserId'),
    subscriptionId,
    traceId,
  };
}
```

- [ ] **Step 3: Add `parseListSupportContactsRequest`**

```ts
export function parseListSupportContactsRequest(
  subscriptionId: string,
  query: unknown,
): ListSupportContactsInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }
  const record = isRecord(query) ? query : {};
  const limit = parseLimit(record, 1, 100, 20);
  const statusValue = readOptionalLiteral<SupportContactStatus>(
    record,
    'status',
    SUPPORT_CONTACT_STATUS_VALUES,
  );

  const base: ListSupportContactsInput = { subscriptionId, limit };
  return statusValue === undefined ? base : { ...base, status: statusValue };
}
```

(Use `parseLimit` if it already exists in the file; if not, inline the bounds check using `readOptionalBoundedInteger`. Verify by grep before writing.)

- [ ] **Step 4: Add `parseGetSupportContactParams`**

```ts
export function parseGetSupportContactParams(
  subscriptionId: string,
  contactId: string,
): GetSupportContactInput {
  if (!isUuid(subscriptionId)) {
    throw new Error('subscriptionId must be a UUID.');
  }
  if (!isUuid(contactId)) {
    throw new Error('contactId must be a UUID.');
  }
  return { subscriptionId, contactId };
}
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm --filter @washed/core-api typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/core-api/src/validation.ts
git commit -m "feat(core-api): add support-contact request parsers"
```

---

### Task 5: Add the routes (TDD: tests first)

**Files:**
- Modify: `packages/core-api/src/app.ts`
- Test: `packages/core-api/src/app.test.ts`

- [ ] **Step 1: Add the failing route tests**

Find an existing route-test block (search for "creates a dispute" or similar) and append a parallel block:

```ts
describe('subscriber support contacts', () => {
  it('creates a support contact and returns 201 with a DTO', async () => {
    const harness = await buildAppWithSeededSubscription();   // helper used by other dispute tests
    const response = await harness.app.inject({
      method: 'POST',
      url: `/v1/subscriptions/${harness.subscriptionId}/support-contacts`,
      payload: {
        body: 'My red sweater bled onto two white shirts.',
        category: 'visit',
        createdAt: '2026-05-05T09:00:00.000Z',
        subject: 'Damaged sweater',
        subscriberUserId: harness.subscriberUserId,
      },
    });
    expect(response.statusCode).toBe(201);
    const dto = response.json();
    expect(dto).toMatchObject({
      category: 'visit',
      status: 'open',
      subject: 'Damaged sweater',
      subscriptionId: harness.subscriptionId,
    });
    expect(dto.contactId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects an unknown category with 400', async () => {
    const harness = await buildAppWithSeededSubscription();
    const response = await harness.app.inject({
      method: 'POST',
      url: `/v1/subscriptions/${harness.subscriptionId}/support-contacts`,
      payload: {
        body: 'whatever',
        category: 'totally-not-real',
        createdAt: '2026-05-05T09:00:00.000Z',
        subject: 'x',
        subscriberUserId: harness.subscriberUserId,
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: 'core.support_contact_create.invalid_request',
    });
  });

  it('lists contacts most-recent-first scoped to the subscription', async () => {
    const harness = await buildAppWithSeededSubscription();
    for (const subject of ['First', 'Second']) {
      await harness.app.inject({
        method: 'POST',
        url: `/v1/subscriptions/${harness.subscriptionId}/support-contacts`,
        payload: {
          body: 'msg',
          category: 'other',
          createdAt: subject === 'First' ? '2026-05-04T09:00:00.000Z' : '2026-05-05T09:00:00.000Z',
          subject,
          subscriberUserId: harness.subscriberUserId,
        },
      });
    }
    const response = await harness.app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${harness.subscriptionId}/support-contacts?limit=10`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().items.map((item: { subject: string }) => item.subject)).toEqual([
      'Second',
      'First',
    ]);
  });

  it('returns 200 with the matching contact on detail fetch', async () => {
    const harness = await buildAppWithSeededSubscription();
    const created = await harness.app.inject({
      method: 'POST',
      url: `/v1/subscriptions/${harness.subscriptionId}/support-contacts`,
      payload: {
        body: 'msg',
        category: 'other',
        createdAt: '2026-05-05T09:00:00.000Z',
        subject: 'detail-test',
        subscriberUserId: harness.subscriberUserId,
      },
    });
    const contactId = created.json().contactId as string;
    const detail = await harness.app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${harness.subscriptionId}/support-contacts/${contactId}`,
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ contactId, subject: 'detail-test' });
  });

  it('returns 404 when fetching a contact that does not belong to the subscription', async () => {
    const harness = await buildAppWithSeededSubscription();
    const otherId = '99999999-9999-4999-8999-999999999999';
    const detail = await harness.app.inject({
      method: 'GET',
      url: `/v1/subscriptions/${harness.subscriptionId}/support-contacts/${otherId}`,
    });
    expect(detail.statusCode).toBe(404);
  });
});
```

If `buildAppWithSeededSubscription` doesn't already exist as a helper, **inline the necessary setup** using the same boot pattern other dispute tests use. Search `app.test.ts` for `buildAppWith` or `seedSubscription` first; reuse before duplicating.

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm --filter @washed/core-api exec vitest run src/app.test.ts -t "subscriber support contacts"
```
Expected: 5 failing with 404 / route-not-registered.

- [ ] **Step 3: Add the routes in `app.ts`**

Find the existing route registration block where dispute / rating routes are registered (around `app.ts:1292+`). After `parseRateVisitBody` route, add:

```ts
  app.post('/v1/subscriptions/:subscriptionId/support-contacts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseCreateSupportContactBody(
        params.subscriptionId ?? '',
        request.body,
        parsedTraceId,
      );
      const record = await repository.createSupportContact(input);
      return reply.code(201).send(toSupportContactDto(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return reply.code(400).send({
        code: 'core.support_contact_create.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriptions/:subscriptionId/support-contacts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseListSupportContactsRequest(params.subscriptionId ?? '', request.query);
      const items = await repository.listSupportContactsForSubscription(input);
      return reply.code(200).send({
        items: items.map(toSupportContactDto),
        limit: input.limit,
        status: input.status ?? null,
        subscriptionId: input.subscriptionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return reply.code(400).send({
        code: 'core.support_contact_list.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get(
    '/v1/subscriptions/:subscriptionId/support-contacts/:contactId',
    async (request, reply) => {
      const traceId = request.headers['x-trace-id'];
      const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
      const params = request.params as { subscriptionId?: string; contactId?: string };

      try {
        const input = parseGetSupportContactParams(
          params.subscriptionId ?? '',
          params.contactId ?? '',
        );
        const record = await repository.getSupportContact(input);
        if (record === null) {
          return reply.code(404).send({
            code: 'core.support_contact_get.not_found',
            message: 'Support contact was not found.',
            traceId: parsedTraceId,
          });
        }
        return reply.code(200).send(toSupportContactDto(record));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';
        return reply.code(400).send({
          code: 'core.support_contact_get.invalid_request',
          message,
          traceId: parsedTraceId,
        });
      }
    },
  );
```

- [ ] **Step 4: Add the DTO mapper next to `toDisputeDto`**

```ts
function toSupportContactDto(record: SupportContactRecord) {
  return {
    body: record.body,
    category: record.category,
    contactId: record.contactId,
    countryCode: record.countryCode,
    createdAt: record.createdAt.toISOString(),
    openedByUserId: record.openedByUserId,
    resolutionNote: record.resolutionNote,
    resolvedAt: record.resolvedAt === null ? null : record.resolvedAt.toISOString(),
    resolvedByOperatorUserId: record.resolvedByOperatorUserId,
    status: record.status,
    subject: record.subject,
    subscriptionId: record.subscriptionId,
  };
}
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
pnpm --filter @washed/core-api exec vitest run src/app.test.ts -t "subscriber support contacts"
```
Expected: 5 passing.

- [ ] **Step 6: Run the full core-api suite**

```bash
pnpm --filter @washed/core-api test
```
Expected: PASS (regression check).

- [ ] **Step 7: Commit**

```bash
git add packages/core-api/src/app.ts packages/core-api/src/app.test.ts
git commit -m "feat(core-api): add subscriber support-contact routes (create/list/detail)"
```

---

### Task 6: Implement Postgres repository methods

**Files:**
- Modify: `packages/core-api/src/postgres-repository.ts`
- Test: `packages/core-api/src/postgres-repository.test.ts`

- [ ] **Step 1: Add Postgres test cases**

Find the existing `createDispute` Postgres test (search file). Append a parallel block:

```ts
describe('support contacts (postgres)', () => {
  it('persists a created contact and reads it back via list and getById', async () => {
    const ctx = await seedPostgresSubscription();   // existing helper
    const created = await ctx.repository.createSupportContact({
      body: 'red sweater bled',
      category: 'visit',
      createdAt: new Date('2026-05-05T09:00:00.000Z'),
      subject: 'Damaged sweater',
      subscriberUserId: ctx.subscriberUserId,
      subscriptionId: ctx.subscriptionId,
      traceId: '11111111-1111-4111-8111-111111111111',
    });

    const list = await ctx.repository.listSupportContactsForSubscription({
      limit: 10,
      subscriptionId: ctx.subscriptionId,
    });
    expect(list.map((c) => c.contactId)).toContain(created.contactId);

    const fetched = await ctx.repository.getSupportContact({
      contactId: created.contactId,
      subscriptionId: ctx.subscriptionId,
    });
    expect(fetched?.subject).toBe('Damaged sweater');
  });

  it('filters by status and returns null for a contact that does not belong to the subscription', async () => {
    const ctx = await seedPostgresSubscription();
    const otherSubscriptionId = '88888888-8888-4888-8888-888888888888';
    const fetched = await ctx.repository.getSupportContact({
      contactId: '99999999-9999-4999-8999-999999999999',
      subscriptionId: otherSubscriptionId,
    });
    expect(fetched).toBeNull();
  });
});
```

(If `seedPostgresSubscription` doesn't exist, copy the inline-setup pattern from the dispute Postgres test — search for "createDispute" in this file.)

- [ ] **Step 2: Run tests to confirm failure**

```bash
pnpm --filter @washed/core-api exec vitest run src/postgres-repository.test.ts -t "support contacts"
```
Expected: failure on `repository.createSupportContact is not a function`.

- [ ] **Step 3: Add Postgres methods on the repository class**

After the existing `createDispute` method in `postgres-repository.ts`, add:

```ts
  public async createSupportContact(
    input: CreateSupportContactInput,
  ): Promise<SupportContactRecord> {
    return this.client.transaction(async (client) => {
      const subscriptionRow = await selectSubscriptionForUpdate(client, input.subscriptionId);
      if (subscriptionRow === undefined) {
        throw new Error('Subscription was not found.');
      }
      const record = buildCreatedSupportContactRecord({
        countryCode: subscriptionRow.country_code as CountryCode,
        input,
      });
      await insertSubscriberSupportContact(client, record);
      await persistDomainEvents(client, record.events);
      return record;
    });
  }

  public async listSupportContactsForSubscription(
    input: ListSupportContactsInput,
  ): Promise<readonly SupportContactRecord[]> {
    return this.client.run(async (client) => {
      const rows = await selectSupportContacts(client, input);
      return rows.map(rowToSupportContactRecord);
    });
  }

  public async getSupportContact(
    input: GetSupportContactInput,
  ): Promise<SupportContactRecord | null> {
    return this.client.run(async (client) => {
      const row = await selectSupportContactById(client, input);
      return row === undefined ? null : rowToSupportContactRecord(row);
    });
  }
```

(Names of helpers — `selectSubscriptionForUpdate`, `persistDomainEvents`, `client.transaction`, `client.run` — must match what the existing dispute implementation uses. Verify by reading `createDispute` Postgres impl around line 1374 first; mimic exactly.)

- [ ] **Step 4: Add SQL helpers and row mapper**

After `insertSupportDispute` (around line 5044), add:

```ts
interface SupportContactRow {
  readonly id: string;
  readonly subscription_id: string;
  readonly country_code: string;
  readonly category: SupportContactCategory;
  readonly status: SupportContactStatus;
  readonly subject: string;
  readonly body: string;
  readonly opened_by_user_id: string;
  readonly resolved_by_operator_user_id: string | null;
  readonly resolution_note: string | null;
  readonly created_at: Date;
  readonly resolved_at: Date | null;
}

async function insertSubscriberSupportContact(
  client: PgClient,
  record: SupportContactRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO support_contacts (
        id,
        subscription_id,
        country_code,
        category,
        status,
        subject,
        body,
        opened_by_user_id,
        resolved_by_operator_user_id,
        resolution_note,
        created_at,
        resolved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      record.contactId,
      record.subscriptionId,
      record.countryCode,
      record.category,
      record.status,
      record.subject,
      record.body,
      record.openedByUserId,
      record.resolvedByOperatorUserId,
      record.resolutionNote,
      record.createdAt,
      record.resolvedAt,
    ],
  );
}

async function selectSupportContacts(
  client: PgClient,
  input: ListSupportContactsInput,
): Promise<readonly SupportContactRow[]> {
  const filters: string[] = ['subscription_id = $1'];
  const params: unknown[] = [input.subscriptionId];
  if (input.status !== undefined) {
    params.push(input.status);
    filters.push(`status = $${params.length}`);
  }
  params.push(input.limit);
  const limitIndex = params.length;
  const result = await client.query<SupportContactRow>(
    `
      SELECT id, subscription_id, country_code, category, status, subject, body,
             opened_by_user_id, resolved_by_operator_user_id, resolution_note,
             created_at, resolved_at
      FROM support_contacts
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${limitIndex}
    `,
    params,
  );
  return result.rows;
}

async function selectSupportContactById(
  client: PgClient,
  input: GetSupportContactInput,
): Promise<SupportContactRow | undefined> {
  const result = await client.query<SupportContactRow>(
    `
      SELECT id, subscription_id, country_code, category, status, subject, body,
             opened_by_user_id, resolved_by_operator_user_id, resolution_note,
             created_at, resolved_at
      FROM support_contacts
      WHERE id = $1 AND subscription_id = $2
    `,
    [input.contactId, input.subscriptionId],
  );
  return result.rows[0];
}

function rowToSupportContactRecord(row: SupportContactRow): SupportContactRecord {
  return {
    contactId: row.id,
    subscriptionId: row.subscription_id,
    countryCode: row.country_code as CountryCode,
    category: row.category,
    status: row.status,
    subject: row.subject,
    body: row.body,
    openedByUserId: row.opened_by_user_id,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    events: [],
  };
}
```

- [ ] **Step 5: Run Postgres tests**

```bash
./scripts/dev/up.sh   # if not already running
DATABASE_URL=postgres://washed:washed@localhost:5432/washed pnpm --filter @washed/core-api migrate
pnpm --filter @washed/core-api exec vitest run src/postgres-repository.test.ts -t "support contacts"
```
Expected: PASS.

- [ ] **Step 6: Run the full core-api suite**

```bash
pnpm --filter @washed/core-api test
```
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/core-api/src/postgres-repository.ts packages/core-api/src/postgres-repository.test.ts
git commit -m "feat(core-api): persist subscriber support contacts in Postgres"
```

---

### Task 7: Refresh OpenAPI snapshot

**Files:**
- Modify: `docs/api/core-api.openapi.json`

- [ ] **Step 1: Run the OpenAPI snapshot check**

```bash
pnpm openapi:check
```

If the script regenerates a snapshot from runtime, follow its instructions; if it expects a hand-edited file, add the three new paths matching the style of existing `/v1/subscriptions/.../disputes` entries.

- [ ] **Step 2: Run typecheck + full test suite from repo root**

```bash
pnpm typecheck && pnpm test
```
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add docs/api/core-api.openapi.json
git commit -m "docs(api): add support-contact paths to OpenAPI snapshot"
```

---

### Task 8: Final verification + push

- [ ] **Step 1: Full repo gate**

```bash
pnpm typecheck
pnpm test
pnpm migrations:check
pnpm openapi:check
```
Expected: all green.

- [ ] **Step 2: Push**

```bash
git push origin HEAD
```

---

## Self-review checklist

- ✅ Spec coverage: every section of the data model + HTTP surface maps to a numbered task.
- ✅ No placeholders / "TBD" markers.
- ✅ Type names consistent: `SupportContactRecord`, `SupportContactCategory`, `SupportContactStatus`, `CreateSupportContactInput`, `ListSupportContactsInput`, `GetSupportContactInput` used uniformly across types, repo, validation, routes, Postgres.
- ✅ All file paths absolute or unambiguously rooted in repo.
- ✅ Each step shows the actual code or command, not a description.

## Open questions / explicit deferrals

1. **Operator resolution endpoint** — out of scope. Subscribers can create/read tickets; resolution requires a follow-up plan (`/v1/operator/support-contacts/:id/resolve`).
2. **Reply thread** — out of scope. Demo data has `messages: []`; the API returns the initial body only. Reply path is a follow-up plan.
3. **Notifications on ticket creation** — out of scope. The domain event is registered and emitted; notification auto-trigger is the next plan in the queue.
4. **Idempotency keys** — not added in v1; ticket creation is rare and double-submit risk is low. Can add later if abuse is observed.
