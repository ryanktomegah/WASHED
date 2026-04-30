export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'paused'
  | 'payment_overdue'
  | 'pending_match';

export type SubscriptionEvent =
  | 'assign_worker'
  | 'cancel'
  | 'pause'
  | 'payment_failed'
  | 'payment_recovered'
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
