import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

import {
  buildOfflineQueueRequest,
  createLegacyOfflineQueue,
  initialWorkerState,
  type WorkerOfflineActionKind,
  type WorkerOfflineQueueItem,
  type WorkerOfflineQueueRequest,
  type WorkerState,
  type VisitStep,
} from './workerState.js';

const WORKER_STATE_STORAGE_KEY = 'washed.worker.local-state.v1';

export async function loadPersistedWorkerState(): Promise<WorkerState | null> {
  const raw = await readStorageValue();

  if (raw === null) {
    return null;
  }

  try {
    return sanitizePersistedState(JSON.parse(raw));
  } catch {
    await clearPersistedWorkerState();
    return null;
  }
}

export async function persistWorkerState(state: WorkerState): Promise<void> {
  await writeStorageValue(JSON.stringify(toPersistedState(state)));
}

export async function clearPersistedWorkerState(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: WORKER_STATE_STORAGE_KEY });
    return;
  }

  globalThis.localStorage?.removeItem(WORKER_STATE_STORAGE_KEY);
}

function toPersistedState(state: WorkerState): WorkerState {
  return {
    ...state,
    lastFeedback: null,
    sos: {
      ...state.sos,
      open: false,
    },
  };
}

async function readStorageValue(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    return (await Preferences.get({ key: WORKER_STATE_STORAGE_KEY })).value;
  }

  return globalThis.localStorage?.getItem(WORKER_STATE_STORAGE_KEY) ?? null;
}

async function writeStorageValue(value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: WORKER_STATE_STORAGE_KEY, value });
    return;
  }

  globalThis.localStorage?.setItem(WORKER_STATE_STORAGE_KEY, value);
}

function sanitizePersistedState(value: unknown): WorkerState | null {
  if (!isRecord(value)) {
    return null;
  }

  const offlineQueue = readOfflineQueue(value);

  return {
    advanceRequested: readBoolean(value.advanceRequested, initialWorkerState.advanceRequested),
    availabilityUnavailable: readBoolean(
      value.availabilityUnavailable,
      initialWorkerState.availabilityUnavailable,
    ),
    activation: {
      agreementAccepted: readNestedBoolean(
        value.activation,
        'agreementAccepted',
        initialWorkerState.activation.agreementAccepted,
      ),
      payoutConfirmed: readNestedBoolean(
        value.activation,
        'payoutConfirmed',
        initialWorkerState.activation.payoutConfirmed,
      ),
      serviceCellsConfirmed: readNestedBoolean(
        value.activation,
        'serviceCellsConfirmed',
        initialWorkerState.activation.serviceCellsConfirmed,
      ),
    },
    dayComplete: readBoolean(value.dayComplete, initialWorkerState.dayComplete),
    inboxUnread: readNumber(value.inboxUnread, initialWorkerState.inboxUnread),
    lastFeedback: null,
    offlineQueue,
    offlineQueueCount: offlineQueue.length,
    privacy: {
      erasureRequested: readNestedBoolean(
        value.privacy,
        'erasureRequested',
        initialWorkerState.privacy.erasureRequested,
      ),
      exportRequested: readNestedBoolean(
        value.privacy,
        'exportRequested',
        initialWorkerState.privacy.exportRequested,
      ),
    },
    sos: {
      incidentLogged: readNestedBoolean(
        value.sos,
        'incidentLogged',
        initialWorkerState.sos.incidentLogged,
      ),
      open: false,
    },
    visit: {
      afterPhotoCaptured: readNestedBoolean(
        value.visit,
        'afterPhotoCaptured',
        initialWorkerState.visit.afterPhotoCaptured,
      ),
      beforePhotoCaptured: readNestedBoolean(
        value.visit,
        'beforePhotoCaptured',
        initialWorkerState.visit.beforePhotoCaptured,
      ),
      issueReported: readNestedBoolean(
        value.visit,
        'issueReported',
        initialWorkerState.visit.issueReported,
      ),
      noShowDeclared: readNestedBoolean(
        value.visit,
        'noShowDeclared',
        initialWorkerState.visit.noShowDeclared,
      ),
      step: readVisitStep(value.visit),
    },
  };
}

function readOfflineQueue(value: Record<string, unknown>): readonly WorkerOfflineQueueItem[] {
  if (!Array.isArray(value.offlineQueue)) {
    return createLegacyOfflineQueue(
      readNumber(value.offlineQueueCount, initialWorkerState.offlineQueueCount),
    );
  }

  const queue = value.offlineQueue.flatMap((item, index): readonly WorkerOfflineQueueItem[] => {
    if (!isRecord(item)) {
      return [];
    }

    const kind = readOfflineActionKind(item.kind);
    const operationId = typeof item.operationId === 'string' ? item.operationId : null;

    if (kind === null || operationId === null) {
      return [];
    }

    return [
      {
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        id: typeof item.id === 'string' ? item.id : `worker-queue-imported-${index + 1}`,
        idempotencyKey:
          typeof item.idempotencyKey === 'string'
            ? item.idempotencyKey
            : `worker-akouvi:imported:${kind}:${index + 1}`,
        kind,
        label: typeof item.label === 'string' ? item.label : kind,
        operationId: operationId as WorkerOfflineQueueItem['operationId'],
        request: readOfflineQueueRequest(item, kind),
        status: 'queued',
      },
    ];
  });

  return queue.length === 0
    ? createLegacyOfflineQueue(
        readNumber(value.offlineQueueCount, initialWorkerState.offlineQueueCount),
      )
    : queue;
}

function readOfflineQueueRequest(
  value: Record<string, unknown>,
  kind: WorkerOfflineActionKind,
): WorkerOfflineQueueRequest {
  const request = value.request;

  if (!isRecord(request) || !isPathParams(request.pathParams)) {
    return buildOfflineQueueRequest(
      { kind },
      typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    );
  }

  return {
    ...(isRecord(request.body) ? { body: request.body } : {}),
    pathParams: request.pathParams,
  };
}

function isPathParams(value: unknown): value is Record<string, string | number> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (pathValue) => typeof pathValue === 'string' || typeof pathValue === 'number',
  );
}

function readNestedBoolean(value: unknown, key: string, fallback: boolean): boolean {
  if (!isRecord(value)) {
    return fallback;
  }

  return readBoolean(value[key], fallback);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readVisitStep(value: unknown): VisitStep {
  if (!isRecord(value)) {
    return initialWorkerState.visit.step;
  }

  return isVisitStep(value.step) ? value.step : initialWorkerState.visit.step;
}

function readOfflineActionKind(value: unknown): WorkerOfflineActionKind | null {
  return isOfflineActionKind(value) ? value : null;
}

function isOfflineActionKind(value: unknown): value is WorkerOfflineActionKind {
  return (
    value === 'planning.unavailable' ||
    value === 'sos' ||
    value === 'visit.after_photo' ||
    value === 'visit.before_photo' ||
    value === 'visit.check_in' ||
    value === 'visit.check_out' ||
    value === 'visit.issue' ||
    value === 'visit.no_show'
  );
}

function isVisitStep(value: unknown): value is VisitStep {
  return (
    value === 'afterPhoto' ||
    value === 'beforePhoto' ||
    value === 'checkIn' ||
    value === 'checkOut' ||
    value === 'heading' ||
    value === 'inVisit'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
