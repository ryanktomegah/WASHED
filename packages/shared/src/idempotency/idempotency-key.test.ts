import { describe, expect, it } from 'vitest';

import { createIdempotencyKey } from './idempotency-key.js';

describe('createIdempotencyKey', () => {
  it('is deterministic for the same namespace and parts', () => {
    expect(createIdempotencyKey('billing', ['sub_1', '2026-04-29'])).toBe(
      createIdempotencyKey('billing', ['sub_1', '2026-04-29']),
    );
  });

  it('changes when any part changes', () => {
    expect(createIdempotencyKey('billing', ['sub_1', '2026-04-29'])).not.toBe(
      createIdempotencyKey('billing', ['sub_1', '2026-04-30']),
    );
  });

  it('rejects empty parts', () => {
    expect(() => createIdempotencyKey('billing', [])).toThrow(
      'Idempotency key requires at least one part.',
    );
  });
});
