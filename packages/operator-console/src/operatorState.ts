import { DEMO_OPERATOR_CONSOLE_SNAPSHOT, type OperatorConsoleSnapshot } from '@washed/api-client';

export type OperatorFeedback =
  | 'auditFiltered'
  | 'blocklistAdded'
  | 'disputeEscalated'
  | 'disputeResolved'
  | 'forcedUpdateToggled'
  | 'loginOtpSent'
  | 'loginVerified'
  | 'matchAccepted'
  | 'matchRejected'
  | 'notificationsDelivered'
  | 'paymentRetryQueued'
  | 'payoutBatchStarted'
  | 'payoutRetryQueued'
  | 'providerReadinessChecked'
  | 'refundIssued'
  | 'reportExported'
  | 'routePlanApproved'
  | 'routeRiskAcknowledged'
  | 'subscriberPrivacyHandled'
  | 'workerPrivacyHandled';

export interface OperatorState extends OperatorConsoleSnapshot {
  readonly login: {
    readonly otpSent: boolean;
    readonly phone: string;
    readonly verified: boolean;
  };
  readonly lastFeedback: OperatorFeedback | null;
}

export type OperatorAction =
  | { readonly matchId: string; readonly type: 'matching/accept' }
  | { readonly matchId: string; readonly type: 'matching/reject' }
  | { readonly type: 'audit/filter' }
  | { readonly type: 'blocklist/add' }
  | { readonly type: 'dispute/escalate' }
  | { readonly type: 'dispute/resolve' }
  | { readonly phone: string; readonly type: 'login/sendOtp' }
  | { readonly type: 'login/verifyOtp' }
  | { readonly type: 'notifications/deliverDue' }
  | { readonly type: 'payments/issueRefund' }
  | { readonly type: 'payments/retryFailedPayout' }
  | { readonly type: 'payments/retryRecovery' }
  | { readonly type: 'payments/startPayoutBatch' }
  | { readonly type: 'privacy/handleSubscriber' }
  | { readonly type: 'privacy/handleWorker' }
  | { readonly type: 'reports/export' }
  | { readonly type: 'routePlanning/acknowledgeRisk' }
  | { readonly type: 'routePlanning/approveRoutes' }
  | { readonly type: 'settings/checkReadiness' }
  | { readonly type: 'settings/toggleForcedUpdate' };

export const initialOperatorState = {
  ...DEMO_OPERATOR_CONSOLE_SNAPSHOT,
  lastFeedback: null,
  login: {
    otpSent: false,
    phone: '+228 90 00 00 00',
    verified: false,
  },
} as const satisfies OperatorState;

export function operatorReducer(state: OperatorState, action: OperatorAction): OperatorState {
  if (action.type === 'login/sendOtp') {
    return {
      ...state,
      lastFeedback: 'loginOtpSent',
      login: {
        ...state.login,
        otpSent: true,
        phone: action.phone,
      },
    };
  }

  if (action.type === 'login/verifyOtp') {
    return {
      ...state,
      lastFeedback: 'loginVerified',
      login: {
        ...state.login,
        verified: true,
      },
    };
  }

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

  if (action.type === 'routePlanning/acknowledgeRisk') {
    return {
      ...state,
      lastFeedback: 'routeRiskAcknowledged',
      routePlanning: {
        ...state.routePlanning,
        overloadedRoutes: Math.max(0, state.routePlanning.overloadedRoutes - 1),
      },
    };
  }

  if (action.type === 'routePlanning/approveRoutes') {
    return {
      ...state,
      lastFeedback: 'routePlanApproved',
      routePlanning: {
        ...state.routePlanning,
        approvedRoutes: state.routePlanning.approvedRoutes + 1,
      },
    };
  }

  if (action.type === 'notifications/deliverDue') {
    return {
      ...state,
      lastFeedback: 'notificationsDelivered',
      notifications: {
        ...state.notifications,
        deliveredDue: state.notifications.deliveredDue + state.notifications.due,
        due: 0,
      },
    };
  }

  if (action.type === 'reports/export') {
    return {
      ...state,
      lastFeedback: 'reportExported',
      reports: { ...state.reports, exportedAt: 'just now' },
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
