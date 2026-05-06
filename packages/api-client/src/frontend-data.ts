import type { CoreApiOperationId } from './operations.js';

export type SubscriberVisitStage = 'arrived' | 'enRoute' | 'inProgress' | 'scheduled';
export type SubscriberVisitStatus = 'rescheduled' | 'scheduled' | 'skipped';
export type SubscriptionStatus = 'active' | 'cancelled';
export type SubscriptionPaymentStatus = 'current' | 'overdue' | 'recovered';
export type SubscriptionTierCode = 'T1' | 'T2';

export type WorkerVisitStep =
  | 'afterPhoto'
  | 'beforePhoto'
  | 'checkIn'
  | 'checkOut'
  | 'heading'
  | 'inVisit';

export interface SubscriberAppSnapshot {
  readonly inboxUnread: number;
  readonly nextVisit: {
    readonly cell: string;
    readonly startsAt: string;
    readonly status: SubscriberVisitStatus;
    readonly stage: SubscriberVisitStage;
    readonly window: string;
    readonly workerName: string;
  };
  readonly privacy: {
    readonly erasureRequested: boolean;
    readonly exportRequested: boolean;
  };
  readonly subscription: {
    readonly monthlyPriceXof: number;
    readonly paymentStatus: SubscriptionPaymentStatus;
    readonly skipCreditsRemaining: number;
    readonly status: SubscriptionStatus;
    readonly swapCreditsRemaining: number;
    readonly tier: SubscriptionTierCode;
  };
}

export interface WorkerAppSnapshot {
  readonly advanceRequested: boolean;
  readonly availabilityUnavailable: boolean;
  readonly activation: {
    readonly agreementAccepted: boolean;
    readonly payoutConfirmed: boolean;
    readonly serviceCellsConfirmed: boolean;
  };
  readonly dayComplete: boolean;
  readonly inboxUnread: number;
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
    readonly step: WorkerVisitStep;
  };
}

export interface OperatorConsoleSnapshot {
  readonly auditFilter: string;
  readonly blocklistCount: number;
  readonly disputes: {
    readonly escalated: number;
    readonly open: number;
    readonly resolved: number;
  };
  readonly matching: {
    readonly acceptedMatchId: string | null;
    readonly rejectedMatchIds: readonly string[];
  };
  readonly notifications: {
    readonly deliveredDue: number;
    readonly due: number;
    readonly failedDevices: number;
  };
  readonly payments: {
    readonly exceptions: number;
    readonly failedPayouts: number;
    readonly payoutBatchStarted: boolean;
    readonly refundsIssued: number;
    readonly retryQueued: number;
  };
  readonly privacy: {
    readonly subscriberHandled: boolean;
    readonly workerHandled: boolean;
  };
  readonly readiness: {
    readonly forcedUpdateEnabled: boolean;
    readonly lastChecked: string;
  };
  readonly reports: {
    readonly exportedAt: string | null;
    readonly kpiPeriod: string;
  };
  readonly routePlanning: {
    readonly approvedRoutes: number;
    readonly overloadedRoutes: number;
    readonly unavailableWorkers: number;
  };
}

export interface FrontendDataSource {
  readonly loadOperatorConsole: () => Promise<OperatorConsoleSnapshot>;
  readonly loadSubscriberApp: () => Promise<SubscriberAppSnapshot>;
  readonly loadWorkerApp: () => Promise<WorkerAppSnapshot>;
}

export const FRONTEND_OPERATION_IDS = {
  operator: {
    assignWorker: 'assignSubscriptionWorker',
    createPayout: 'createOperatorWorkerMonthlyPayout',
    declineCandidate: 'declineAssignmentCandidate',
    getMetrics: 'getOperatorBetaMetrics',
    getReadiness: 'getReadiness',
    issueRefund: 'issueOperatorPaymentRefund',
    listAuditEvents: 'listOperatorAuditEvents',
    listDisputes: 'listOperatorDisputes',
    listMatchingQueue: 'listOperatorMatchingQueue',
    listNotifications: 'listOperatorNotifications',
    listPaymentAttempts: 'listOperatorPaymentAttempts',
    listPushDevices: 'listOperatorPushDevices',
    listServiceCells: 'listOperatorServiceCells',
    listWorkerUnavailability: 'listWorkerUnavailability',
    resolveDispute: 'resolveOperatorDispute',
    sendDueNotifications: 'deliverDueOperatorNotifications',
  },
  subscriber: {
    cancelSubscription: 'cancelCurrentSubscriberSubscription',
    changeTier: 'changeCurrentSubscriberSubscriptionTier',
    createSubscription: 'createCurrentSubscriberSubscription',
    createSupportContact: 'createCurrentSubscriberSupportContact',
    getSupportContact: 'getCurrentSubscriberSupportContact',
    getSubscription: 'getCurrentSubscriberSubscription',
    listSupportContacts: 'listCurrentSubscriberSupportContacts',
    rateVisit: 'rateCurrentSubscriberVisit',
    registerPushDevice: 'registerPushDevice',
    reportVisitIssue: 'createCurrentSubscriberVisitDispute',
    requestWorkerSwap: 'createCurrentSubscriberWorkerSwapRequest',
    rescheduleVisit: 'rescheduleCurrentSubscriberVisit',
    skipVisit: 'skipCurrentSubscriberVisit',
  },
  worker: {
    checkIn: 'checkInVisit',
    checkOut: 'checkOutVisit',
    createAdvanceRequest: 'createWorkerAdvanceRequest',
    createPhotoUpload: 'createVisitPhotoUpload',
    createUnavailability: 'createWorkerUnavailability',
    getEarnings: 'getWorkerEarnings',
    getProfile: 'getWorkerProfile',
    getRoute: 'getWorkerRoute',
    recordPhoto: 'recordVisitPhoto',
    reportIssue: 'reportWorkerIssue',
  },
} as const satisfies Record<string, Record<string, CoreApiOperationId>>;

export const DEMO_SUBSCRIBER_APP_SNAPSHOT = {
  inboxUnread: 2,
  nextVisit: {
    cell: 'Cellule Adidogomé',
    startsAt: '2026-05-05T09:00:00.000Z',
    status: 'scheduled',
    stage: 'scheduled',
    window: '9-11',
    workerName: 'Akouvi',
  },
  privacy: {
    erasureRequested: false,
    exportRequested: false,
  },
  subscription: {
    monthlyPriceXof: 4500,
    paymentStatus: 'overdue',
    skipCreditsRemaining: 2,
    status: 'active',
    swapCreditsRemaining: 2,
    tier: 'T2',
  },
} as const satisfies SubscriberAppSnapshot;

export const DEMO_WORKER_APP_SNAPSHOT = {
  advanceRequested: false,
  availabilityUnavailable: false,
  activation: {
    agreementAccepted: false,
    payoutConfirmed: true,
    serviceCellsConfirmed: true,
  },
  dayComplete: false,
  inboxUnread: 3,
  offlineQueueCount: 3,
  privacy: {
    erasureRequested: false,
    exportRequested: false,
  },
  sos: {
    incidentLogged: false,
    open: false,
  },
  visit: {
    afterPhotoCaptured: false,
    beforePhotoCaptured: false,
    issueReported: false,
    noShowDeclared: false,
    step: 'heading',
  },
} as const satisfies WorkerAppSnapshot;

export const DEMO_OPERATOR_CONSOLE_SNAPSHOT = {
  auditFilter: '',
  blocklistCount: 2,
  disputes: {
    escalated: 0,
    open: 4,
    resolved: 0,
  },
  matching: {
    acceptedMatchId: null,
    rejectedMatchIds: [],
  },
  notifications: {
    deliveredDue: 0,
    due: 6,
    failedDevices: 2,
  },
  payments: {
    exceptions: 4,
    failedPayouts: 1,
    payoutBatchStarted: false,
    refundsIssued: 0,
    retryQueued: 0,
  },
  privacy: {
    subscriberHandled: false,
    workerHandled: false,
  },
  readiness: {
    forcedUpdateEnabled: false,
    lastChecked: 'not checked',
  },
  reports: {
    exportedAt: null,
    kpiPeriod: 'May closed beta',
  },
  routePlanning: {
    approvedRoutes: 0,
    overloadedRoutes: 2,
    unavailableWorkers: 1,
  },
} as const satisfies OperatorConsoleSnapshot;

export function createDemoFrontendDataSource(): FrontendDataSource {
  return {
    async loadOperatorConsole(): Promise<OperatorConsoleSnapshot> {
      return cloneSnapshot(DEMO_OPERATOR_CONSOLE_SNAPSHOT);
    },
    async loadSubscriberApp(): Promise<SubscriberAppSnapshot> {
      return cloneSnapshot(DEMO_SUBSCRIBER_APP_SNAPSHOT);
    },
    async loadWorkerApp(): Promise<WorkerAppSnapshot> {
      return cloneSnapshot(DEMO_WORKER_APP_SNAPSHOT);
    },
  };
}

function cloneSnapshot<TSnapshot>(snapshot: TSnapshot): TSnapshot {
  return structuredClone(snapshot);
}
