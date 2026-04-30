import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  LOME_V1_WORKER_COMPENSATION,
  calculateWorkerMonthlyCompensation,
} from './worker-compensation.js';

describe('calculateWorkerMonthlyCompensation', () => {
  it('matches the full-month model-C target at 48 visits', () => {
    expect(calculateWorkerMonthlyCompensation(48).total.amountMinor).toBe(68_800n);
  });

  it('matches the slow-month model-C target at 24 visits', () => {
    expect(calculateWorkerMonthlyCompensation(24).total.amountMinor).toBe(54_400n);
  });

  it('rejects invalid visit counts', () => {
    expect(() => calculateWorkerMonthlyCompensation(-1)).toThrow(
      'Completed visits must be a non-negative safe integer.',
    );
    expect(() => calculateWorkerMonthlyCompensation(1.5)).toThrow(
      'Completed visits must be a non-negative safe integer.',
    );
  });

  it('always equals floor plus per-visit bonus', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000 }), (completedVisits) => {
        const pay = calculateWorkerMonthlyCompensation(completedVisits);
        const expected =
          LOME_V1_WORKER_COMPENSATION.guaranteedFloor.amountMinor +
          LOME_V1_WORKER_COMPENSATION.perCompletedVisitBonus.amountMinor * BigInt(completedVisits);

        expect(pay.total.amountMinor).toBe(expected);
      }),
    );
  });
});
