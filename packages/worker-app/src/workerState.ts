import {
  DEMO_WORKER_APP_SNAPSHOT,
  FRONTEND_OPERATION_IDS,
  type CoreApiOperationId,
  type WorkerIssueType,
  type WorkerVisitStep,
} from '@washed/api-client';

export type VisitStep = WorkerVisitStep;
export type WorkerSosReason = 'clientIssue' | 'danger' | 'medical';

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
  | 'locationCaptureFailed'
  | 'noShowQueued'
  | 'sosSubmitted'
  | 'syncComplete'
  | 'unavailableMarked'
  | 'visitInProgress';

export type WorkerOfflineActionKind =
  | 'planning.unavailable'
  | 'sos'
  | 'visit.after_photo'
  | 'visit.before_photo'
  | 'visit.check_in'
  | 'visit.check_out'
  | 'visit.issue'
  | 'visit.no_show';

export interface WorkerOfflineQueueItem {
  readonly createdAt: string;
  readonly id: string;
  readonly idempotencyKey: string;
  readonly kind: WorkerOfflineActionKind;
  readonly label: string;
  readonly operationId: CoreApiOperationId;
  readonly request: WorkerOfflineQueueRequest;
  readonly status: 'queued';
}

export interface WorkerOfflineQueueRequest {
  readonly body?: Record<string, unknown>;
  readonly pathParams: Record<string, string | number>;
}

export interface WorkerVisitLocationProof {
  readonly capturedAt: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface WorkerVisitPhotoProof {
  readonly capturedAt: string;
  readonly path: string;
}

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
  readonly offlineQueue: readonly WorkerOfflineQueueItem[];
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
  | {
      readonly locationProof?: WorkerVisitLocationProof;
      readonly photoProof?: WorkerVisitPhotoProof;
      readonly step: VisitStep;
      readonly type: 'visit/setStep';
    }
  | { readonly type: 'activation/complete' }
  | { readonly type: 'day/complete' }
  | { readonly type: 'earnings/requestAdvance' }
  | { readonly type: 'planning/markUnavailable' }
  | { readonly type: 'privacy/erasure' }
  | { readonly type: 'privacy/export' }
  | { readonly type: 'sos/close' }
  | { readonly reason: WorkerSosReason; readonly reasonLabel: string; readonly type: 'sos/confirm' }
  | { readonly type: 'sos/open' }
  | { readonly state: WorkerState; readonly type: 'state/hydrate' }
  | { readonly type: 'sync/complete' }
  | { readonly type: 'visit/declareNoShow' }
  | { readonly type: 'visit/reportIssue' };

export const WORKER_APP_DEMO_IDS = {
  visitId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  workerId: '22222222-2222-4222-8222-222222222222',
} as const;

export const initialWorkerState = {
  ...DEMO_WORKER_APP_SNAPSHOT,
  lastFeedback: null,
  offlineQueue: [],
  offlineQueueCount: 0,
} as const satisfies WorkerState;

export function createLegacyOfflineQueue(count: number): readonly WorkerOfflineQueueItem[] {
  return Array.from({ length: count }, (_value, index) =>
    createQueueItem(index + 1, {
      kind: index % 2 === 0 ? 'visit.before_photo' : 'visit.issue',
      label:
        index === 0
          ? 'Photo avant · Esi A.'
          : index === 1
            ? 'Signalement terrain · Esi A.'
            : 'Pointage sortie · Mawuli B.',
      operationId:
        index === 2
          ? FRONTEND_OPERATION_IDS.worker.checkOut
          : index === 1
            ? FRONTEND_OPERATION_IDS.worker.reportIssue
            : FRONTEND_OPERATION_IDS.worker.recordPhoto,
    }),
  );
}

function queueAction(
  state: WorkerState,
  input: WorkerOfflineQueueInput,
): Pick<WorkerState, 'offlineQueue' | 'offlineQueueCount'> {
  const offlineQueue = [
    ...state.offlineQueue,
    createQueueItem(state.offlineQueue.length + 1, input),
  ];

  return {
    offlineQueue,
    offlineQueueCount: offlineQueue.length,
  };
}

function createQueueItem(sequence: number, input: WorkerOfflineQueueInput): WorkerOfflineQueueItem {
  const createdAt =
    input.locationProof?.capturedAt ?? input.photoProof?.capturedAt ?? new Date().toISOString();

  return {
    createdAt,
    id: `worker-queue-${String(sequence).padStart(4, '0')}`,
    idempotencyKey: `worker-akouvi:visit-ama-2026-05-05-0900:${input.kind}:${sequence}`,
    kind: input.kind,
    label: input.label,
    operationId: input.operationId,
    request: buildOfflineQueueRequest(input, createdAt, sequence),
    status: 'queued',
  };
}

type WorkerOfflineQueueInput = Omit<
  WorkerOfflineQueueItem,
  'createdAt' | 'id' | 'idempotencyKey' | 'request' | 'status'
> & {
  readonly description?: string;
  readonly issueType?: WorkerIssueType;
  readonly locationProof?: WorkerVisitLocationProof | undefined;
  readonly photoProof?: WorkerVisitPhotoProof | undefined;
};

export function buildOfflineQueueRequest(
  input: Pick<WorkerOfflineQueueInput, 'kind'> & Partial<WorkerOfflineQueueInput>,
  createdAt: string,
  sequence = 1,
): WorkerOfflineQueueRequest {
  if (input.kind === 'planning.unavailable') {
    return {
      body: {
        createdAt,
        date: '2026-05-06',
        reason: 'Indisponible marquée dans l’app travailleuse.',
      },
      pathParams: { workerId: WORKER_APP_DEMO_IDS.workerId },
    };
  }

  const visitPathParams = { visitId: WORKER_APP_DEMO_IDS.visitId };

  if (input.kind === 'visit.check_in' || input.kind === 'visit.check_out') {
    const location = input.locationProof ?? {
      latitude: 6.1319,
      longitude: 1.2228,
    };

    return {
      body: {
        [input.kind === 'visit.check_in' ? 'checkedInAt' : 'checkedOutAt']: createdAt,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        workerId: WORKER_APP_DEMO_IDS.workerId,
      },
      pathParams: visitPathParams,
    };
  }

  if (input.kind === 'visit.before_photo' || input.kind === 'visit.after_photo') {
    const photoType = input.kind === 'visit.before_photo' ? 'before' : 'after';

    return {
      body: {
        byteSize: 128_000,
        capturedAt: createdAt,
        contentType: 'image/jpeg',
        objectKey: `visits/${WORKER_APP_DEMO_IDS.visitId}/${photoType}-${sequence}.jpg`,
        photoType,
        workerId: WORKER_APP_DEMO_IDS.workerId,
      },
      pathParams: visitPathParams,
    };
  }

  return {
    body: {
      createdAt,
      description:
        input.description ??
        (input.kind === 'sos'
          ? "Alerte SOS déclenchée depuis l'app travailleuse."
          : input.kind === 'visit.no_show'
            ? 'Foyer absent au moment de la visite.'
            : 'Signalement terrain envoyé depuis la visite.'),
      issueType:
        input.issueType ??
        (input.kind === 'visit.no_show'
          ? 'client_unavailable'
          : input.kind === 'sos'
            ? 'safety_concern'
            : 'other'),
      workerId: WORKER_APP_DEMO_IDS.workerId,
    },
    pathParams: visitPathParams,
  };
}

export function workerReducer(state: WorkerState, action: WorkerAction): WorkerState {
  if (action.type === 'state/hydrate') {
    return action.state;
  }

  if (action.type === 'sync/complete') {
    return { ...state, lastFeedback: 'syncComplete', offlineQueue: [], offlineQueueCount: 0 };
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
      const queued = queueAction(state, {
        kind: 'visit.check_in',
        label: 'Pointage arrivée · Ama K.',
        locationProof: action.locationProof,
        operationId: FRONTEND_OPERATION_IDS.worker.checkIn,
      });

      return {
        ...state,
        ...queued,
        lastFeedback: 'checkInQueued',
        visit: { ...state.visit, step: 'checkIn' },
      };
    }

    if (action.step === 'beforePhoto') {
      const queued = queueAction(state, {
        kind: 'visit.before_photo',
        label: 'Photo avant · Ama K.',
        operationId: FRONTEND_OPERATION_IDS.worker.recordPhoto,
        photoProof: action.photoProof,
      });

      return {
        ...state,
        ...queued,
        lastFeedback: 'beforePhotoQueued',
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
      const queued = queueAction(state, {
        kind: 'visit.after_photo',
        label: 'Photo après · Ama K.',
        operationId: FRONTEND_OPERATION_IDS.worker.recordPhoto,
        photoProof: action.photoProof,
      });

      return {
        ...state,
        ...queued,
        lastFeedback: 'afterPhotoQueued',
        visit: { ...state.visit, afterPhotoCaptured: true, step: 'afterPhoto' },
      };
    }

    if (action.step === 'checkOut') {
      const queued = queueAction(state, {
        kind: 'visit.check_out',
        label: 'Pointage sortie · Ama K.',
        locationProof: action.locationProof,
        operationId: FRONTEND_OPERATION_IDS.worker.checkOut,
      });

      return {
        ...state,
        ...queued,
        lastFeedback: 'checkOutQueued',
        visit: { ...state.visit, step: 'checkOut' },
      };
    }

    return { ...state, visit: { ...state.visit, step: action.step } };
  }

  if (action.type === 'visit/declareNoShow') {
    const queued = queueAction(state, {
      kind: 'visit.no_show',
      label: 'Absence foyer · Ama K.',
      operationId: FRONTEND_OPERATION_IDS.worker.reportIssue,
    });

    return {
      ...state,
      ...queued,
      lastFeedback: 'noShowQueued',
      visit: { ...state.visit, noShowDeclared: true },
    };
  }

  if (action.type === 'visit/reportIssue') {
    const queued = queueAction(state, {
      kind: 'visit.issue',
      label: 'Signalement terrain · Ama K.',
      operationId: FRONTEND_OPERATION_IDS.worker.reportIssue,
    });

    return {
      ...state,
      ...queued,
      lastFeedback: 'issueQueued',
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
    const queued = queueAction(state, {
      description: `SOS immédiat · ${action.reasonLabel}. Le bureau doit rappeler dans 30 secondes.`,
      kind: 'sos',
      label: `SOS · ${action.reasonLabel}`,
      operationId: FRONTEND_OPERATION_IDS.worker.reportIssue,
    });

    return {
      ...state,
      ...queued,
      lastFeedback: 'sosSubmitted',
      sos: { incidentLogged: true, open: false },
    };
  }

  if (action.type === 'planning/markUnavailable') {
    const queued = queueAction(state, {
      kind: 'planning.unavailable',
      label: 'Indisponibilité planning · semaine du 4 mai',
      operationId: FRONTEND_OPERATION_IDS.worker.createUnavailability,
    });

    return {
      ...state,
      ...queued,
      availabilityUnavailable: true,
      lastFeedback: 'unavailableMarked',
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
