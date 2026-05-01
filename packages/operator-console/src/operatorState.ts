export type OperatorFeedback =
  | 'auditFiltered'
  | 'blocklistAdded'
  | 'disputeEscalated'
  | 'disputeResolved'
  | 'forcedUpdateToggled'
  | 'matchAccepted'
  | 'matchRejected'
  | 'paymentRetryQueued'
  | 'payoutBatchStarted'
  | 'payoutRetryQueued'
  | 'providerReadinessChecked'
  | 'refundIssued'
  | 'subscriberPrivacyHandled'
  | 'workerPrivacyHandled';

export interface OperatorState {
  readonly auditFilter: string;
  readonly blocklistCount: number;
  readonly disputes: {
    readonly escalated: number;
    readonly open: number;
    readonly resolved: number;
  };
  readonly lastFeedback: OperatorFeedback | null;
  readonly matching: {
    readonly acceptedMatchId: string | null;
    readonly rejectedMatchIds: readonly string[];
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
}

export type OperatorAction =
  | { readonly matchId: string; readonly type: 'matching/accept' }
  | { readonly matchId: string; readonly type: 'matching/reject' }
  | { readonly type: 'audit/filter' }
  | { readonly type: 'blocklist/add' }
  | { readonly type: 'dispute/escalate' }
  | { readonly type: 'dispute/resolve' }
  | { readonly type: 'payments/issueRefund' }
  | { readonly type: 'payments/retryFailedPayout' }
  | { readonly type: 'payments/retryRecovery' }
  | { readonly type: 'payments/startPayoutBatch' }
  | { readonly type: 'privacy/handleSubscriber' }
  | { readonly type: 'privacy/handleWorker' }
  | { readonly type: 'settings/checkReadiness' }
  | { readonly type: 'settings/toggleForcedUpdate' };

export const initialOperatorState = {
  auditFilter: '',
  blocklistCount: 2,
  disputes: {
    escalated: 0,
    open: 4,
    resolved: 0,
  },
  lastFeedback: null,
  matching: {
    acceptedMatchId: null,
    rejectedMatchIds: [],
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
} as const satisfies OperatorState;

export function operatorReducer(state: OperatorState, action: OperatorAction): OperatorState {
  if (action.type === 'matching/accept') {
    return {
      ...state,
      lastFeedback: 'matchAccepted',
      matching: {
        ...state.matching,
        acceptedMatchId: action.matchId,
        rejectedMatchIds: state.matching.rejectedMatchIds.filter(
          (matchId) => matchId !== action.matchId,
        ),
      },
    };
  }

  if (action.type === 'matching/reject') {
    return {
      ...state,
      lastFeedback: 'matchRejected',
      matching: {
        ...state.matching,
        acceptedMatchId:
          state.matching.acceptedMatchId === action.matchId ? null : state.matching.acceptedMatchId,
        rejectedMatchIds: state.matching.rejectedMatchIds.includes(action.matchId)
          ? state.matching.rejectedMatchIds
          : [...state.matching.rejectedMatchIds, action.matchId],
      },
    };
  }

  if (action.type === 'dispute/resolve') {
    return {
      ...state,
      disputes: {
        ...state.disputes,
        open: Math.max(0, state.disputes.open - 1),
        resolved: state.disputes.resolved + 1,
      },
      lastFeedback: 'disputeResolved',
    };
  }

  if (action.type === 'dispute/escalate') {
    return {
      ...state,
      disputes: {
        ...state.disputes,
        escalated: state.disputes.escalated + 1,
      },
      lastFeedback: 'disputeEscalated',
    };
  }

  if (action.type === 'payments/retryRecovery') {
    return {
      ...state,
      lastFeedback: 'paymentRetryQueued',
      payments: {
        ...state.payments,
        exceptions: Math.max(0, state.payments.exceptions - 1),
        retryQueued: state.payments.retryQueued + 1,
      },
    };
  }

  if (action.type === 'payments/issueRefund') {
    return {
      ...state,
      lastFeedback: 'refundIssued',
      payments: { ...state.payments, refundsIssued: state.payments.refundsIssued + 1 },
    };
  }

  if (action.type === 'payments/startPayoutBatch') {
    return {
      ...state,
      lastFeedback: 'payoutBatchStarted',
      payments: { ...state.payments, payoutBatchStarted: true },
    };
  }

  if (action.type === 'payments/retryFailedPayout') {
    return {
      ...state,
      lastFeedback: 'payoutRetryQueued',
      payments: {
        ...state.payments,
        failedPayouts: Math.max(0, state.payments.failedPayouts - 1),
      },
    };
  }

  if (action.type === 'privacy/handleSubscriber') {
    return {
      ...state,
      lastFeedback: 'subscriberPrivacyHandled',
      privacy: { ...state.privacy, subscriberHandled: true },
    };
  }

  if (action.type === 'privacy/handleWorker') {
    return {
      ...state,
      lastFeedback: 'workerPrivacyHandled',
      privacy: { ...state.privacy, workerHandled: true },
    };
  }

  if (action.type === 'blocklist/add') {
    return {
      ...state,
      blocklistCount: state.blocklistCount + 1,
      lastFeedback: 'blocklistAdded',
    };
  }

  if (action.type === 'audit/filter') {
    return { ...state, auditFilter: 'money + privacy + SOS', lastFeedback: 'auditFiltered' };
  }

  if (action.type === 'settings/checkReadiness') {
    return {
      ...state,
      lastFeedback: 'providerReadinessChecked',
      readiness: { ...state.readiness, lastChecked: 'just now' },
    };
  }

  if (action.type === 'settings/toggleForcedUpdate') {
    return {
      ...state,
      lastFeedback: 'forcedUpdateToggled',
      readiness: {
        ...state.readiness,
        forcedUpdateEnabled: !state.readiness.forcedUpdateEnabled,
      },
    };
  }

  return state;
}
