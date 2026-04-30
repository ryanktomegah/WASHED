import { describe, expect, it } from 'vitest';

import {
  assertVisitCompletionAllowed,
  completedVisitBonus,
  transitionVisit,
} from './visit-lifecycle.js';

describe('visit lifecycle', () => {
  it('transitions scheduled visits through check-in and checkout', () => {
    expect(transitionVisit('scheduled', 'check_in')).toBe('in_progress');
    expect(transitionVisit('in_progress', 'check_out')).toBe('completed');
  });

  it('lets subscribers cancel scheduled visits', () => {
    expect(transitionVisit('scheduled', 'cancel')).toBe('cancelled');
  });

  it('lets subscribers dispute completed visits', () => {
    expect(transitionVisit('completed', 'dispute')).toBe('disputed');
  });

  it('rejects impossible transitions', () => {
    expect(() => transitionVisit('scheduled', 'check_out')).toThrow(
      'Cannot apply visit event check_out from status scheduled.',
    );
  });

  it('requires at least 30 minutes before checkout', () => {
    expect(() =>
      assertVisitCompletionAllowed({
        checkedInAt: new Date('2026-05-05T09:00:00.000Z'),
        checkedOutAt: new Date('2026-05-05T09:29:59.000Z'),
      }),
    ).toThrow('Visit checkout requires at least 30 minutes after check-in.');

    expect(() =>
      assertVisitCompletionAllowed({
        checkedInAt: new Date('2026-05-05T09:00:00.000Z'),
        checkedOutAt: new Date('2026-05-05T09:30:00.000Z'),
      }),
    ).not.toThrow();
  });

  it('uses the launch worker completed-visit bonus', () => {
    expect(completedVisitBonus().amountMinor).toBe(600n);
    expect(completedVisitBonus().currencyCode).toBe('XOF');
  });
});
