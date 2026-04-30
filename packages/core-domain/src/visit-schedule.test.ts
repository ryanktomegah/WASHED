import { describe, expect, it } from 'vitest';

import { generateScheduledVisits } from './visit-schedule.js';

describe('generateScheduledVisits', () => {
  it('starts on the requested weekday when anchor already matches', () => {
    expect(
      generateScheduledVisits({
        anchorDate: '2026-05-05',
        count: 4,
        dayOfWeek: 'tuesday',
        timeWindow: 'morning',
      }),
    ).toEqual([
      { scheduledDate: '2026-05-05', scheduledTimeWindow: 'morning' },
      { scheduledDate: '2026-05-12', scheduledTimeWindow: 'morning' },
      { scheduledDate: '2026-05-19', scheduledTimeWindow: 'morning' },
      { scheduledDate: '2026-05-26', scheduledTimeWindow: 'morning' },
    ]);
  });

  it('rolls forward to the next requested weekday', () => {
    expect(
      generateScheduledVisits({
        anchorDate: '2026-05-06',
        count: 2,
        dayOfWeek: 'friday',
        timeWindow: 'afternoon',
      }),
    ).toEqual([
      { scheduledDate: '2026-05-08', scheduledTimeWindow: 'afternoon' },
      { scheduledDate: '2026-05-15', scheduledTimeWindow: 'afternoon' },
    ]);
  });

  it('rejects invalid dates and counts', () => {
    expect(() =>
      generateScheduledVisits({
        anchorDate: '2026-99-99',
        count: 1,
        dayOfWeek: 'monday',
        timeWindow: 'morning',
      }),
    ).toThrow('Anchor date must be a valid calendar date.');

    expect(() =>
      generateScheduledVisits({
        anchorDate: '2026-05-01',
        count: 0,
        dayOfWeek: 'monday',
        timeWindow: 'morning',
      }),
    ).toThrow('Visit count must be a positive safe integer.');
  });
});
