export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'paused'
  | 'payment_overdue'
  | 'pending_match'
  | 'ready_no_visit';

export type SubscriptionEvent =
  | 'assign_worker'
  | 'cancel'
  | 'pause'
  | 'payment_failed'
  | 'payment_recovered'
  | 'request_first_visit'
  | 'resume';

const TRANSITIONS: Record<
  SubscriptionStatus,
  Partial<Record<SubscriptionEvent, SubscriptionStatus>>
> = {
  active: {
    cancel: 'cancelled',
    pause: 'paused',
    payment_failed: 'payment_overdue',
  },
  cancelled: {},
  paused: {
    cancel: 'cancelled',
    resume: 'active',
  },
  payment_overdue: {
    cancel: 'cancelled',
    payment_recovered: 'active',
    pause: 'paused',
  },
  pending_match: {
    assign_worker: 'active',
    cancel: 'cancelled',
    request_first_visit: 'pending_match',
  },
  ready_no_visit: {
    cancel: 'cancelled',
    request_first_visit: 'pending_match',
  },
};

export function transitionSubscription(
  currentStatus: SubscriptionStatus,
  event: SubscriptionEvent,
): SubscriptionStatus {
  const nextStatus = TRANSITIONS[currentStatus][event];

  if (nextStatus === undefined) {
    throw new Error(`Cannot apply subscription event ${event} from status ${currentStatus}.`);
  }

  return nextStatus;
}
