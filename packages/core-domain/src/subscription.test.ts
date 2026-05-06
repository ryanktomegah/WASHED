import { describe, expect, it } from 'vitest';

import { transitionSubscription } from './subscription.js';

describe('transitionSubscription', () => {
  it('activates a subscription after worker assignment', () => {
    expect(transitionSubscription('ready_no_visit', 'request_first_visit')).toBe('pending_match');
    expect(transitionSubscription('pending_match', 'assign_worker')).toBe('active');
  });

  it('keeps failed payment recoverable instead of cancelling immediately', () => {
    expect(transitionSubscription('active', 'payment_failed')).toBe('payment_overdue');
    expect(transitionSubscription('payment_overdue', 'payment_recovered')).toBe('active');
  });

  it('pauses active subscriptions and resumes them without losing the subscription', () => {
    expect(transitionSubscription('active', 'pause')).toBe('paused');
    expect(transitionSubscription('paused', 'resume')).toBe('active');
    expect(transitionSubscription('paused', 'cancel')).toBe('cancelled');
  });

  it('rejects impossible transitions', () => {
    expect(() => transitionSubscription('cancelled', 'resume')).toThrow(
      'Cannot apply subscription event resume from status cancelled.',
    );
  });
});
