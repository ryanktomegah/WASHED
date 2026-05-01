import { DEMO_WORKER_APP_SNAPSHOT, type WorkerVisitStep } from '@washed/api-client';

export type VisitStep = WorkerVisitStep;

export type WorkerFeedback =
  | 'activationCompleted'
  | 'advanceRequested'
  | 'afterPhotoQueued'
  | 'beforePhotoQueued'
  | 'checkInQueued'
  | 'checkOutQueued'
  | 'dayMarkedComplete'
  | 'erasureRequested'
  | 'exportRequested'
  | 'issueQueued'
  | 'noShowQueued'
  | 'sosSubmitted'
  | 'syncComplete'
  | 'unavailableMarked'
  | 'visitInProgress';

export interface WorkerState {
  readonly advanceRequested: boolean;
  readonly availabilityUnavailable: boolean;
  readonly activation: {
    readonly agreementAccepted: boolean;
    readonly payoutConfirmed: boolean;
    readonly serviceCellsConfirmed: boolean;
  };
  readonly dayComplete: boolean;
  readonly inboxUnread: number;
  readonly lastFeedback: WorkerFeedback | null;
  readonly offlineQueueCount: number;
  readonly privacy: {
    readonly erasureRequested: boolean;
    readonly exportRequested: boolean;
  };
  readonly sos: {
    readonly incidentLogged: boolean;
    readonly open: boolean;
  };
  readonly visit: {
    readonly afterPhotoCaptured: boolean;
    readonly beforePhotoCaptured: boolean;
    readonly issueReported: boolean;
    readonly noShowDeclared: boolean;
    readonly step: VisitStep;
  };
}

export type WorkerAction =
  | { readonly step: VisitStep; readonly type: 'visit/setStep' }
  | { readonly type: 'activation/complete' }
  | { readonly type: 'day/complete' }
  | { readonly type: 'earnings/requestAdvance' }
  | { readonly type: 'planning/markUnavailable' }
  | { readonly type: 'privacy/erasure' }
  | { readonly type: 'privacy/export' }
  | { readonly type: 'sos/close' }
  | { readonly type: 'sos/confirm' }
  | { readonly type: 'sos/open' }
  | { readonly type: 'sync/complete' }
  | { readonly type: 'visit/declareNoShow' }
  | { readonly type: 'visit/reportIssue' };

export const initialWorkerState = {
  ...DEMO_WORKER_APP_SNAPSHOT,
  lastFeedback: null,
} as const satisfies WorkerState;

function queueAction(state: WorkerState): number {
  return state.offlineQueueCount + 1;
}

export function workerReducer(state: WorkerState, action: WorkerAction): WorkerState {
  if (action.type === 'sync/complete') {
    return { ...state, lastFeedback: 'syncComplete', offlineQueueCount: 0 };
  }

  if (action.type === 'activation/complete') {
    return {
      ...state,
      activation: {
        agreementAccepted: true,
        payoutConfirmed: true,
        serviceCellsConfirmed: true,
      },
      lastFeedback: 'activationCompleted',
    };
  }

  if (action.type === 'visit/setStep') {
    if (action.step === 'checkIn') {
      return {
        ...state,
        lastFeedback: 'checkInQueued',
        offlineQueueCount: queueAction(state),
        visit: { ...state.visit, step: 'checkIn' },
      };
    }

    if (action.step === 'beforePhoto') {
      return {
        ...state,
        lastFeedback: 'beforePhotoQueued',
        offlineQueueCount: queueAction(state),
        visit: { ...state.visit, beforePhotoCaptured: true, step: 'beforePhoto' },
      };
    }

    if (action.step === 'inVisit') {
      return {
        ...state,
        lastFeedback: 'visitInProgress',
        visit: { ...state.visit, step: 'inVisit' },
      };
    }

    if (action.step === 'afterPhoto') {
      return {
        ...state,
        lastFeedback: 'afterPhotoQueued',
        offlineQueueCount: queueAction(state),
        visit: { ...state.visit, afterPhotoCaptured: true, step: 'afterPhoto' },
      };
    }

    if (action.step === 'checkOut') {
      return {
        ...state,
        lastFeedback: 'checkOutQueued',
        offlineQueueCount: queueAction(state),
        visit: { ...state.visit, step: 'checkOut' },
      };
    }

    return { ...state, visit: { ...state.visit, step: action.step } };
  }

  if (action.type === 'visit/declareNoShow') {
    return {
      ...state,
      lastFeedback: 'noShowQueued',
      offlineQueueCount: queueAction(state),
      visit: { ...state.visit, noShowDeclared: true },
    };
  }

  if (action.type === 'visit/reportIssue') {
    return {
      ...state,
      lastFeedback: 'issueQueued',
      offlineQueueCount: queueAction(state),
      visit: { ...state.visit, issueReported: true },
    };
  }

  if (action.type === 'sos/open') {
    return { ...state, sos: { ...state.sos, open: true } };
  }

  if (action.type === 'sos/close') {
    return { ...state, sos: { ...state.sos, open: false } };
  }

  if (action.type === 'sos/confirm') {
    return {
      ...state,
      lastFeedback: 'sosSubmitted',
      offlineQueueCount: queueAction(state),
      sos: { incidentLogged: true, open: false },
    };
  }

  if (action.type === 'planning/markUnavailable') {
    return {
      ...state,
      availabilityUnavailable: true,
      lastFeedback: 'unavailableMarked',
      offlineQueueCount: queueAction(state),
    };
  }

  if (action.type === 'earnings/requestAdvance') {
    return { ...state, advanceRequested: true, lastFeedback: 'advanceRequested' };
  }

  if (action.type === 'privacy/export') {
    return {
      ...state,
      lastFeedback: 'exportRequested',
      privacy: { ...state.privacy, exportRequested: true },
    };
  }

  if (action.type === 'privacy/erasure') {
    return {
      ...state,
      lastFeedback: 'erasureRequested',
      privacy: { ...state.privacy, erasureRequested: true },
    };
  }

  if (action.type === 'day/complete') {
    return { ...state, dayComplete: true, lastFeedback: 'dayMarkedComplete' };
  }

  return state;
}
