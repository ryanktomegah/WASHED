export type DayOfWeek =
  | 'friday'
  | 'monday'
  | 'saturday'
  | 'sunday'
  | 'thursday'
  | 'tuesday'
  | 'wednesday';

export type TimeWindow = 'afternoon' | 'morning';

export interface ScheduledVisitPlan {
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
}

export interface GenerateScheduledVisitsInput {
  readonly anchorDate: string;
  readonly count: number;
  readonly dayOfWeek: DayOfWeek;
  readonly timeWindow: TimeWindow;
}

const DAY_INDEX_BY_NAME = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
} as const satisfies Record<DayOfWeek, number>;

export function generateScheduledVisits(
  input: GenerateScheduledVisitsInput,
): readonly ScheduledVisitPlan[] {
  if (!Number.isSafeInteger(input.count) || input.count <= 0) {
    throw new Error('Visit count must be a positive safe integer.');
  }

  const firstDate = nextDayOnOrAfter(parseIsoDate(input.anchorDate), input.dayOfWeek);
  const visits: ScheduledVisitPlan[] = [];

  for (let index = 0; index < input.count; index += 1) {
    const visitDate = new Date(firstDate);
    visitDate.setUTCDate(firstDate.getUTCDate() + index * 7);
    visits.push({
      scheduledDate: formatIsoDate(visitDate),
      scheduledTimeWindow: input.timeWindow,
    });
  }

  return visits;
}

function nextDayOnOrAfter(anchorDate: Date, dayOfWeek: DayOfWeek): Date {
  const targetDay = DAY_INDEX_BY_NAME[dayOfWeek];
  const daysUntilTarget = (targetDay - anchorDate.getUTCDay() + 7) % 7;
  const nextDate = new Date(anchorDate);
  nextDate.setUTCDate(anchorDate.getUTCDate() + daysUntilTarget);
  return nextDate;
}

function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new Error('Anchor date must use YYYY-MM-DD format.');
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || formatIsoDate(date) !== value) {
    throw new Error('Anchor date must be a valid calendar date.');
  }

  return date;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
