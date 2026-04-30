import { describe, expect, it } from 'vitest';

import { DomainError, isDomainError } from './domain-error.js';

describe('DomainError', () => {
  it('carries machine and localized-message metadata', () => {
    const error = new DomainError('Payment provider timed out', {
      category: 'system_recoverable',
      code: 'payment.provider_timeout',
      details: { provider: 'mock' },
      userMessageKey: 'errors.payment.retry',
    });

    expect(isDomainError(error)).toBe(true);
    expect(error.category).toBe('system_recoverable');
    expect(error.code).toBe('payment.provider_timeout');
    expect(error.userMessageKey).toBe('errors.payment.retry');
  });
});
