import { LOME_V1_WORKER_COMPENSATION } from './worker-compensation.js';

export type VisitStatus =
  | 'cancelled'
  | 'completed'
  | 'disputed'
  | 'in_progress'
  | 'no_show'
  | 'scheduled';

export type VisitEvent = 'cancel' | 'check_in' | 'check_out' | 'dispute' | 'mark_no_show';

const TRANSITIONS: Record<VisitStatus, Partial<Record<VisitEvent, VisitStatus>>> = {
  cancelled: {},
  completed: {
    dispute: 'disputed',
  },
  disputed: {},
  in_progress: {
    check_out: 'completed',
    dispute: 'disputed',
  },
  no_show: {},
  scheduled: {
    cancel: 'cancelled',
    check_in: 'in_progress',
    dispute: 'disputed',
    mark_no_show: 'no_show',
  },
};

export interface CompleteVisitInput {
  readonly checkedInAt: Date;
  readonly checkedOutAt: Date;
}

export function transitionVisit(currentStatus: VisitStatus, event: VisitEvent): VisitStatus {
  const nextStatus = TRANSITIONS[currentStatus][event];

  if (nextStatus === undefined) {
    throw new Error(`Cannot apply visit event ${event} from status ${currentStatus}.`);
  }

  return nextStatus;
}

export function assertVisitCompletionAllowed(input: CompleteVisitInput): void {
  const elapsedMs = input.checkedOutAt.getTime() - input.checkedInAt.getTime();

  if (elapsedMs < 30 * 60 * 1000) {
    throw new Error('Visit checkout requires at least 30 minutes after check-in.');
  }
}

export function completedVisitBonus() {
  return LOME_V1_WORKER_COMPENSATION.perCompletedVisitBonus;
}
