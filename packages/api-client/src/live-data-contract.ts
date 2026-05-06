import type { CoreApiOperationId } from './operations.js';

export type CountryCode = 'TG';
export type CurrencyCode = 'XOF';
export type DayOfWeek =
  | 'friday'
  | 'monday'
  | 'saturday'
  | 'sunday'
  | 'thursday'
  | 'tuesday'
  | 'wednesday';
export type TimeWindow = 'afternoon' | 'morning';
export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'paused'
  | 'payment_overdue'
  | 'pending_match'
  | 'ready_no_visit';
export type SubscriptionTierCode = 'T1' | 'T2';
export type SubscriptionPaymentProvider = 'flooz' | 'mixx';
export type VisitStatus =
  | 'cancelled'
  | 'completed'
  | 'disputed'
  | 'in_progress'
  | 'no_show'
  | 'scheduled';
export type AuthRole = 'operator' | 'subscriber' | 'worker';
export type PaymentAttemptStatus = 'failed' | 'succeeded';
export type NotificationChannel = 'in_app' | 'push' | 'sms' | 'whatsapp';
export type NotificationStatus = 'failed' | 'pending' | 'sent' | 'suppressed_quiet_hours';
export type DisputeStatus =
  | 'escalated'
  | 'open'
  | 'resolved_for_subscriber'
  | 'resolved_for_worker';
export type WorkerIssueType =
  | 'access_issue'
  | 'client_unavailable'
  | 'other'
  | 'safety_concern'
  | 'supplies_missing';

export interface MoneyDto {
  readonly amountMinor: string;
  readonly currencyCode: CurrencyCode;
}

export interface AddressDto {
  readonly gpsLatitude: number;
  readonly gpsLongitude: number;
  readonly landmark: string;
  readonly neighborhood: string;
}

export interface SchedulePreferenceDto {
  readonly dayOfWeek: DayOfWeek;
  readonly timeWindow: TimeWindow;
}

export interface SubscriptionPaymentMethodDto {
  readonly phoneNumber: string;
  readonly provider: SubscriptionPaymentProvider;
}

export interface AuthSessionDto {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: string;
  readonly role: AuthRole;
  readonly sessionId: string;
  readonly userId: string;
}

export interface OtpChallengeDto {
  readonly challengeId: string;
  readonly expiresAt: string;
  readonly phoneNumber: string;
  readonly provider: string;
  readonly testCode: string | null;
}

export interface SubscriberProfileDto {
  readonly avatarObjectKey: string | null;
  readonly countryCode: CountryCode;
  readonly createdAt: string;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly isAdultConfirmed: boolean;
  readonly lastName: string | null;
  readonly phoneNumber: string;
  readonly subscriberId: string;
  readonly updatedAt: string;
}

export interface LomePricingDto {
  readonly countryCode: CountryCode;
  readonly tiers: readonly {
    readonly code: SubscriptionTierCode;
    readonly monthlyPrice: MoneyDto;
    readonly nameKey: string;
    readonly visitsPerCycle: 1 | 2;
  }[];
}

export interface VisitSummaryDto {
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: TimeWindow;
  readonly status: VisitStatus;
  readonly visitId: string;
  readonly workerId: string | null;
}

export interface SubscriptionDetailDto {
  readonly address: AddressDto;
  readonly assignedWorker: {
    readonly averageRating: number | null;
    readonly completedVisitCount: number;
    readonly displayName: string;
    readonly disputeCount: number;
    readonly workerId: string;
  } | null;
  readonly countryCode: CountryCode;
  readonly monthlyPriceMinor: string;
  readonly paymentMethod: SubscriptionPaymentMethodDto | null;
  readonly phoneNumber: string;
  readonly recentVisits: readonly VisitSummaryDto[];
  readonly schedulePreference: SchedulePreferenceDto | null;
  readonly status: SubscriptionStatus;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly supportCredits: readonly {
    readonly amount: MoneyDto;
    readonly createdAt: string;
    readonly creditId: string;
    readonly reason: string;
  }[];
  readonly tierCode: SubscriptionTierCode;
  readonly upcomingVisits: readonly VisitSummaryDto[];
  readonly visitsPerCycle: 1 | 2;
}

export interface SubscriptionBillingItemDto {
  readonly amount: MoneyDto;
  readonly itemId: string;
  readonly itemType: 'charge' | 'refund';
  readonly occurredAt: string;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly reason: string | null;
  readonly refundId: string | null;
  readonly status: string;
  readonly subscriptionId: string;
}

export interface CurrentSubscriberSubscriptionDto {
  readonly subscription: SubscriptionDetailDto | null;
}

export interface CreatedSubscriptionDto {
  readonly assignmentSlaHours: number | null;
  readonly countryCode: CountryCode;
  readonly currencyCode: CurrencyCode;
  readonly monthlyPriceMinor: string;
  readonly paymentMethod: SubscriptionPaymentMethodDto | null;
  readonly status: SubscriptionStatus;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly tierCode: SubscriptionTierCode;
  readonly visitsPerCycle: 1 | 2;
}

export interface WorkerRouteDto {
  readonly date: string;
  readonly visits: readonly {
    readonly address: AddressDto;
    readonly scheduledDate: string;
    readonly scheduledTimeWindow: TimeWindow;
    readonly status: VisitStatus;
    readonly subscriberPhoneNumber: string;
    readonly subscriptionId: string;
    readonly visitId: string;
  }[];
  readonly workerId: string;
}

export interface WorkerProfileDto {
  readonly countryCode: CountryCode;
  readonly displayName: string;
  readonly maxActiveSubscriptions: number;
  readonly serviceNeighborhoods: readonly string[];
  readonly status: 'active' | 'applicant' | 'inactive' | 'onboarding' | 'suspended';
  readonly workerId: string;
}

export interface WorkerPayoutDto {
  readonly advanceRequestId: string | null;
  readonly amount: MoneyDto;
  readonly createdByOperatorUserId: string;
  readonly failureReason: string | null;
  readonly note: string;
  readonly paidAt: string;
  readonly payoutId: string;
  readonly payoutType: string;
  readonly periodMonth: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly status: 'failed' | 'paid';
  readonly workerId: string;
  readonly workerName: string | null;
}

export interface WorkerEarningsDto {
  readonly completedVisits: number;
  readonly floor: MoneyDto;
  readonly month: string;
  readonly netDue: MoneyDto;
  readonly paidOutTotal: MoneyDto;
  readonly payoutHistory: readonly WorkerPayoutDto[];
  readonly total: MoneyDto;
  readonly visitBonusTotal: MoneyDto;
  readonly workerId: string;
}

export interface WorkerIssueDto {
  readonly address: AddressDto | null;
  readonly createdAt: string;
  readonly description: string;
  readonly handledByOperatorUserId: string | null;
  readonly issueId: string;
  readonly issueType: WorkerIssueType;
  readonly resolutionNote: string | null;
  readonly resolvedAt: string | null;
  readonly scheduledDate: string | null;
  readonly scheduledTimeWindow: TimeWindow | null;
  readonly status: 'acknowledged' | 'open' | 'resolved';
  readonly subscriberPhoneNumber: string | null;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string;
}

export interface VisitPhotoDto {
  readonly byteSize: number;
  readonly capturedAt: string;
  readonly contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly objectKey: string;
  readonly photoId: string;
  readonly photoType: 'after' | 'before';
  readonly uploadedAt: string;
  readonly visitId: string;
  readonly workerId: string;
}

export interface CheckInVisitDto {
  readonly checkedInAt: string;
  readonly status: 'in_progress';
  readonly visitId: string;
  readonly workerId: string;
}

export interface CheckOutVisitDto {
  readonly bonus: MoneyDto;
  readonly checkedOutAt: string;
  readonly status: 'completed';
  readonly visitId: string;
  readonly workerId: string;
}

export interface WorkerUnavailabilityDto {
  readonly createdAt: string;
  readonly date: string;
  readonly reason: string;
  readonly unavailabilityId: string;
  readonly workerId: string;
}

export interface PaymentAttemptDto {
  readonly amount: MoneyDto;
  readonly chargedAt: string;
  readonly countryCode?: CountryCode;
  readonly idempotencyKey: string;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string;
  readonly status: PaymentAttemptStatus;
  readonly subscriptionId: string;
  readonly subscriptionStatus: SubscriptionStatus;
}

export interface NotificationMessageDto {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly attemptCount: number;
  readonly availableAt: string;
  readonly channel: NotificationChannel;
  readonly countryCode: CountryCode;
  readonly createdAt: string;
  readonly eventId: string;
  readonly failureReason: string | null;
  readonly lastAttemptAt: string | null;
  readonly messageId: string;
  readonly payload: Record<string, unknown>;
  readonly provider: string | null;
  readonly providerReference: string | null;
  readonly recipientRole: AuthRole;
  readonly recipientUserId: string | null;
  readonly sentAt: string | null;
  readonly status: NotificationStatus;
  readonly templateKey: string;
}

export interface DisputeDto {
  readonly createdAt: string;
  readonly description: string;
  readonly disputeId: string;
  readonly issueType: 'damaged_item' | 'missing_item' | 'other' | 'worker_no_show';
  readonly openedByUserId: string;
  readonly resolvedAt: string | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly status: DisputeStatus;
  readonly subscriberCredit: MoneyDto | null;
  readonly subscriberCreditId: string | null;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string | null;
}

export interface BetaMetricsDto {
  readonly countryCode: CountryCode;
  readonly disputes: {
    readonly escalated: number;
    readonly open: number;
    readonly resolvedForSubscriber: number;
    readonly resolvedForWorker: number;
    readonly total: number;
  };
  readonly generatedAt: string;
  readonly nps: number | null;
  readonly payments: {
    readonly failed: number;
    readonly successRate: number | null;
    readonly succeeded: number;
    readonly total: number;
  };
  readonly refunds: {
    readonly total: number;
    readonly totalAmountMinor: string;
  };
  readonly subscribers: {
    readonly active: number;
    readonly cancelled: number;
    readonly paymentOverdue: number;
    readonly pendingMatch: number;
    readonly total: number;
  };
  readonly supportLoad: {
    readonly openWorkerIssues: number;
    readonly resolvedWorkerIssues: number;
    readonly totalWorkerIssues: number;
  };
  readonly visits: {
    readonly averageDurationMinutes: number | null;
    readonly cancelled: number;
    readonly completed: number;
    readonly completionRate: number | null;
    readonly disputed: number;
    readonly noShow: number;
    readonly skipped: number;
    readonly totalClosed: number;
  };
  readonly workerEarnings: {
    readonly failedPayouts: number;
    readonly paidPayouts: number;
    readonly totalPaidMinor: string;
  };
  readonly workerSatisfaction: number | null;
}

export interface CoreApiLiveOperationMap {
  readonly checkInVisit: {
    readonly body: {
      readonly checkedInAt: string;
      readonly fallbackCode?: string;
      readonly location: { readonly latitude: number; readonly longitude: number };
      readonly workerId: string;
    };
    readonly pathParams: { readonly visitId: string };
    readonly response: CheckInVisitDto;
  };
  readonly checkOutVisit: {
    readonly body: {
      readonly checkedOutAt: string;
      readonly fallbackCode?: string;
      readonly location: { readonly latitude: number; readonly longitude: number };
      readonly workerId: string;
    };
    readonly pathParams: { readonly visitId: string };
    readonly response: CheckOutVisitDto;
  };
  readonly createWorkerUnavailability: {
    readonly body: {
      readonly createdAt: string;
      readonly date: string;
      readonly reason: string;
    };
    readonly pathParams: { readonly workerId: string };
    readonly response: WorkerUnavailabilityDto;
  };
  readonly createCurrentSubscriberSubscription: {
    readonly body: {
      readonly address: AddressDto;
      readonly paymentMethod: SubscriptionPaymentMethodDto;
      readonly schedulePreference?: SchedulePreferenceDto;
      readonly tierCode: SubscriptionTierCode;
    };
    readonly response: CreatedSubscriptionDto;
  };
  readonly cancelCurrentSubscriberSubscription: {
    readonly body: { readonly cancelledAt: string };
    readonly response: SubscriptionDetailDto;
  };
  readonly changeCurrentSubscriberSubscriptionTier: {
    readonly body: {
      readonly effectiveAt: string;
      readonly tierCode: SubscriptionTierCode;
    };
    readonly response: SubscriptionDetailDto;
  };
  readonly updateCurrentSubscriberPaymentMethod: {
    readonly body: {
      readonly paymentMethod: SubscriptionPaymentMethodDto;
      readonly updatedAt: string;
    };
    readonly response: SubscriptionDetailDto;
  };
  readonly getCurrentSubscriberSubscription: {
    readonly response: CurrentSubscriberSubscriptionDto;
  };
  readonly getOperatorBetaMetrics: {
    readonly query?: { readonly countryCode?: CountryCode };
    readonly response: BetaMetricsDto;
  };
  readonly getSubscriptionDetail: {
    readonly pathParams: { readonly subscriptionId: string };
    readonly response: SubscriptionDetailDto;
  };
  readonly getWorkerEarnings: {
    readonly pathParams: { readonly workerId: string };
    readonly query: { readonly month: string };
    readonly response: WorkerEarningsDto;
  };
  readonly getWorkerProfile: {
    readonly pathParams: { readonly workerId: string };
    readonly response: WorkerProfileDto;
  };
  readonly getWorkerRoute: {
    readonly pathParams: { readonly workerId: string };
    readonly query: { readonly date: string };
    readonly response: WorkerRouteDto;
  };
  readonly getSubscriberProfile: {
    readonly response: SubscriberProfileDto;
  };
  readonly listLomePricing: { readonly response: LomePricingDto };
  readonly listOperatorDisputes: {
    readonly query?: {
      readonly limit?: number;
      readonly status?: DisputeStatus;
      readonly subscriptionId?: string;
    };
    readonly response: {
      readonly filters: {
        readonly status: DisputeStatus | null;
        readonly subscriptionId: string | null;
      };
      readonly items: readonly DisputeDto[];
      readonly limit: number;
    };
  };
  readonly listOperatorMatchingQueue: {
    readonly query?: { readonly countryCode?: CountryCode; readonly limit?: number };
    readonly response: {
      readonly countryCode: CountryCode;
      readonly items: readonly {
        readonly address: AddressDto;
        readonly assignmentDueAt: string;
        readonly monthlyPriceMinor: string;
        readonly phoneNumber: string;
        readonly queuedAt: string;
        readonly schedulePreference: SchedulePreferenceDto;
        readonly status: 'pending_match';
        readonly subscriberId: string;
        readonly subscriptionId: string;
        readonly tierCode: SubscriptionTierCode;
        readonly visitsPerCycle: 1 | 2;
      }[];
      readonly limit: number;
    };
  };
  readonly listOperatorNotifications: {
    readonly query?: {
      readonly aggregateId?: string;
      readonly aggregateType?: string;
      readonly channel?: NotificationChannel;
      readonly countryCode?: CountryCode;
      readonly limit?: number;
      readonly status?: NotificationStatus;
      readonly templateKey?: string;
    };
    readonly response: {
      readonly countryCode: CountryCode;
      readonly filters: {
        readonly aggregateId: string | null;
        readonly aggregateType: string | null;
        readonly channel: NotificationChannel | null;
        readonly status: NotificationStatus | null;
        readonly templateKey: string | null;
      };
      readonly items: readonly NotificationMessageDto[];
      readonly limit: number;
    };
  };
  readonly listOperatorPaymentAttempts: {
    readonly query?: {
      readonly countryCode?: CountryCode;
      readonly limit?: number;
      readonly provider?: string;
      readonly status?: PaymentAttemptStatus;
    };
    readonly response: {
      readonly countryCode: CountryCode;
      readonly filters: {
        readonly provider: string | null;
        readonly status: PaymentAttemptStatus | null;
      };
      readonly items: readonly (PaymentAttemptDto & { readonly countryCode: CountryCode })[];
      readonly limit: number;
    };
  };
  readonly listOperatorServiceCells: {
    readonly query?: { readonly date?: string; readonly limit?: number };
    readonly response: {
      readonly date: string;
      readonly items: readonly {
        readonly activeSubscriptions: number;
        readonly activeWorkers: number;
        readonly capacityRemaining: number;
        readonly completedVisits: number;
        readonly inProgressVisits: number;
        readonly scheduledVisits: number;
        readonly serviceCell: string;
        readonly totalCapacity: number;
        readonly utilizationPercent: number;
      }[];
      readonly limit: number;
    };
  };
  readonly listSubscriptionBillingHistory: {
    readonly pathParams: { readonly subscriptionId: string };
    readonly query?: { readonly limit?: number };
    readonly response: {
      readonly items: readonly SubscriptionBillingItemDto[];
      readonly limit: number;
      readonly subscriptionId: string;
    };
  };
  readonly listCurrentSubscriberSubscriptionBillingHistory: {
    readonly query?: { readonly limit?: number };
    readonly response: {
      readonly items: readonly SubscriptionBillingItemDto[];
      readonly limit: number;
      readonly subscriptionId: string;
    };
  };
  readonly pauseCurrentSubscriberSubscription: {
    readonly body: { readonly pausedAt: string };
    readonly response: SubscriptionDetailDto;
  };
  readonly recordVisitPhoto: {
    readonly body: {
      readonly byteSize: number;
      readonly capturedAt: string;
      readonly contentType: VisitPhotoDto['contentType'];
      readonly objectKey: string;
      readonly photoType: VisitPhotoDto['photoType'];
      readonly workerId: string;
    };
    readonly pathParams: { readonly visitId: string };
    readonly response: VisitPhotoDto;
  };
  readonly refreshAuthSession: {
    readonly body: { readonly refreshToken: string };
    readonly response: AuthSessionDto;
  };
  readonly requestCurrentSubscriberFirstVisit: {
    readonly body: {
      readonly requestedAt: string;
      readonly schedulePreference: SchedulePreferenceDto;
    };
    readonly response: SubscriptionDetailDto;
  };
  readonly resumeCurrentSubscriberSubscription: {
    readonly body: { readonly resumedAt: string };
    readonly response: SubscriptionDetailDto;
  };
  readonly reportWorkerIssue: {
    readonly body: {
      readonly createdAt: string;
      readonly description: string;
      readonly issueType: WorkerIssueType;
      readonly workerId: string;
    };
    readonly pathParams: { readonly visitId: string };
    readonly response: WorkerIssueDto;
  };
  readonly startOtpChallenge: {
    readonly body: { readonly countryCode: CountryCode; readonly phoneNumber: string };
    readonly response: OtpChallengeDto;
  };
  readonly upsertSubscriberProfile: {
    readonly body: {
      readonly avatarObjectKey?: string;
      readonly email?: string;
      readonly firstName: string;
      readonly isAdultConfirmed: boolean;
      readonly lastName: string;
    };
    readonly response: SubscriberProfileDto;
  };
  readonly verifyOtpChallenge: {
    readonly body: {
      readonly challengeId: string;
      readonly code: string;
      readonly deviceId: string;
      readonly role: AuthRole;
    };
    readonly response: AuthSessionDto;
  };
}

export type CoreApiLiveOperationId = Extract<keyof CoreApiLiveOperationMap, CoreApiOperationId>;
