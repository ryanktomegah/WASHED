import { randomUUID } from 'node:crypto';

import {
  assertVisitCompletionAllowed,
  calculateWorkerMonthlyCompensation,
  completedVisitBonus,
  transitionSubscription,
  transitionVisit,
  type SubscriptionTierCode,
  type SubscriptionStatus,
  type TimeWindow,
  type VisitStatus,
} from '@washed/core-domain';
import { createDomainEvent, money, type DomainEvent, type Money } from '@washed/shared';

import { hashOtpCode, hashRefreshToken, safeHashEqual } from './auth-crypto.js';
import { issueAuthTokens } from './auth-tokens.js';
import { assertCoreDomainEventContract } from './domain-event-contracts.js';
import { deliverNotificationMessageLocally } from './notification-delivery.js';
import { buildNotificationMessagesForEvent } from './notification-templates.js';
import { createOtpProvider, type OtpProvider } from './otp-provider.js';
import { createPaymentProvider, type PaymentProvider } from './payment-provider.js';
import type {
  AssignmentDecisionRecord,
  AssignedSubscriptionRecord,
  AssignWorkerInput,
  AuditEventRecord,
  AuthSessionRecord,
  CancelledSubscriptionRecord,
  CancelSubscriptionInput,
  ChangedSubscriptionTierRecord,
  ChangeSubscriptionTierInput,
  ChargeSubscriptionInput,
  CheckedInVisitRecord,
  CheckInVisitInput,
  CheckOutVisitInput,
  CompletedVisitRecord,
  CoreRepository,
  CreatedSubscriptionRecord,
  DeclineAssignmentCandidateInput,
  DeliverDueNotificationMessagesInput,
  CreateWorkerOnboardingCaseInput,
  CreateWorkerMonthlyPayoutInput,
  CreateWorkerAdvanceRequestInput,
  CreateWorkerUnavailabilityInput,
  CreateSubscriptionInput,
  CreateWorkerSwapRequestInput,
  CreateDisputeInput,
  DisputeRecord,
  DisputeStatus,
  GetWorkerMonthlyEarningsInput,
  GetWorkerRouteInput,
  GetSubscriptionDetailInput,
  IngestPaymentWebhookInput,
  RunPaymentReconciliationInput,
  ListAuditEventsInput,
  ListWorkerPayoutsInput,
  ListWorkerOnboardingCasesInput,
  ListWorkerUnavailabilityInput,
  ListWorkerAdvanceRequestsInput,
  ListOperatorDisputesInput,
  ListServiceCellsInput,
  ListWorkerSwapRequestsInput,
  ListWorkerIssuesInput,
  ListMatchingQueueInput,
  ListMatchingCandidatesInput,
  MatchingCandidateRecord,
  MatchingQueueItemRecord,
  ListNotificationMessagesInput,
  ListPaymentAttemptsInput,
  ListSubscriberSupportMatchesInput,
  ListSubscriptionBillingInput,
  ListPushDevicesInput,
  IssuePaymentRefundInput,
  PaymentAttemptRecord,
  PaymentAttemptSummaryRecord,
  PaymentRefundRecord,
  PaymentReconciliationRunRecord,
  SubscriptionBillingItemRecord,
  SubscriberSupportMatchRecord,
  NotificationMessageRecord,
  OperatorVisitStatusRecord,
  PushDeviceRecord,
  RateVisitInput,
  RefreshAuthSessionInput,
  RegisterPushDeviceInput,
  ReportWorkerIssueInput,
  AdvanceWorkerOnboardingCaseInput,
  ResolveDisputeInput,
  ResolveWorkerAdvanceRequestInput,
  ResolveWorkerSwapRequestInput,
  ResolveWorkerIssueInput,
  RescheduleVisitInput,
  RescheduledVisitRecord,
  SkipVisitInput,
  SkippedVisitRecord,
  StartedOtpChallengeRecord,
  StartOtpChallengeInput,
  ServiceCellCapacityRecord,
  SupportCreditRecord,
  UploadVisitPhotoInput,
  UpdateOperatorVisitStatusInput,
  UpsertWorkerProfileInput,
  VerifyOtpChallengeInput,
  VisitLocationInput,
  VisitPhotoRecord,
  VisitRatingRecord,
  WorkerAdvanceRequestRecord,
  WorkerAdvanceRequestStatus,
  WorkerPayoutRecord,
  WorkerPayoutStatus,
  WorkerPayoutType,
  WorkerIssueReportRecord,
  WorkerIssueStatus,
  WorkerSwapRequestRecord,
  WorkerSwapRequestStatus,
  WorkerProfileRecord,
  WorkerMonthlyEarningsRecord,
  WorkerOnboardingCaseRecord,
  WorkerOnboardingNoteRecord,
  WorkerOnboardingStage,
  WorkerUnavailabilityRecord,
  WorkerRouteRecord,
  SubscriptionDetailRecord,
} from './repository.js';
import {
  buildCancelledSubscriptionRecord,
  buildChangedSubscriptionTierRecord,
  buildAdvancedWorkerOnboardingCaseRecord,
  buildCreatedDisputeRecord,
  buildCreatedWorkerOnboardingCaseRecord,
  buildCreatedWorkerAdvanceRequestRecord,
  buildCreatedWorkerSwapRequestRecord,
  buildRescheduledVisitRecord,
  buildResolvedDisputeRecord,
  buildResolvedWorkerAdvanceRequestRecord,
  buildResolvedWorkerSwapRequestRecord,
  buildResolvedWorkerIssueRecord,
  buildSkippedVisitRecord,
  buildOperatorVisitStatusRecord,
  buildSupportCreditRecord,
  buildVisitRatingRecord,
  buildWorkerIssueReportRecord,
  buildWorkerPayoutRecord,
  buildWorkerUnavailabilityRecord,
  buildPaymentRefundRecord,
  buildPaymentReconciliationRunRecord,
} from './repository.js';
import type { PgClient, PgPoolLike } from './postgres-client.js';
import { buildAssignedSubscriptionRecord } from './subscription-assignment.js';
import { buildCreatedSubscriptionRecord } from './subscription-record.js';

export class PostgresCoreRepository implements CoreRepository {
  public constructor(
    private readonly pool: PgPoolLike,
    private readonly otpProvider: OtpProvider = createOtpProvider(),
    private readonly paymentProvider: PaymentProvider = createPaymentProvider(),
  ) {}

  public async health(): Promise<'ok'> {
    await this.pool.query('SELECT 1');
    return 'ok';
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreatedSubscriptionRecord> {
    const record = buildCreatedSubscriptionRecord(input);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await insertSubscriber(client, input, record);
      await insertSubscriberAddress(client, input, record);
      await insertSubscription(client, input, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async startOtpChallenge(
    input: StartOtpChallengeInput,
  ): Promise<StartedOtpChallengeRecord> {
    const challengeId = randomUUID();
    const delivery = await this.otpProvider.startChallenge(input);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.pool.query(
      `
        INSERT INTO auth_otp_challenges (
          id,
          country_code,
          phone_number,
          code_hash,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        challengeId,
        input.countryCode,
        input.phoneNumber,
        hashOtpCode(challengeId, delivery.code),
        expiresAt,
      ],
    );

    return {
      challengeId,
      expiresAt,
      phoneNumber: input.phoneNumber,
      provider: delivery.provider,
      testCode: delivery.testCode,
    };
  }

  public async verifyOtpChallenge(input: VerifyOtpChallengeInput): Promise<AuthSessionRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const challenge = await selectOtpChallengeForVerification(client, input.challengeId);

      if (challenge === undefined) {
        throw new Error('OTP challenge was not found.');
      }

      if (challenge.consumed_at !== null) {
        throw new Error('OTP challenge was already used.');
      }

      if (challenge.expires_at.getTime() <= Date.now()) {
        throw new Error('OTP challenge has expired.');
      }

      if (challenge.attempts >= 5) {
        throw new Error('OTP challenge has too many failed attempts.');
      }

      if (!safeHashEqual(challenge.code_hash, hashOtpCode(input.challengeId, input.code))) {
        await incrementOtpChallengeAttempts(client, input.challengeId);
        throw new Error('OTP code is invalid.');
      }

      await consumeOtpChallenge(client, input.challengeId);
      const user = await upsertAuthUser(client, challenge, input.role);
      const session = await insertAuthSession(client, user, input.deviceId);
      await client.query('COMMIT');
      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async refreshAuthSession(input: RefreshAuthSessionInput): Promise<AuthSessionRecord> {
    const client = await this.pool.connect();
    const refreshTokenHash = hashRefreshToken(input.refreshToken);

    try {
      await client.query('BEGIN');
      const currentSession = await selectAuthSessionForRefresh(client, refreshTokenHash);

      if (currentSession === undefined) {
        throw new Error('Refresh token is invalid.');
      }

      if (currentSession.revoked_at !== null) {
        throw new Error('Refresh token is invalid.');
      }

      if (currentSession.session_expires_at.getTime() <= Date.now()) {
        throw new Error('Refresh token has expired.');
      }

      await revokeAuthSession(client, currentSession.session_id);
      const session = await insertAuthSession(
        client,
        {
          phone_number: currentSession.phone_number,
          role: currentSession.role,
          user_id: currentSession.user_id,
        },
        currentSession.device_id,
      );
      await client.query('COMMIT');
      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async chargeSubscription(input: ChargeSubscriptionInput): Promise<PaymentAttemptRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const existingAttempt = await selectPaymentAttemptByIdempotencyKey(
        client,
        input.idempotencyKey,
      );

      if (existingAttempt !== undefined) {
        await client.query('COMMIT');
        return mapPaymentAttemptRow(existingAttempt);
      }

      const subscription = await selectSubscriptionForPayment(client, input.subscriptionId);

      if (subscription === undefined) {
        throw new Error('Subscription was not found.');
      }

      if (subscription.status !== 'active' && subscription.status !== 'payment_overdue') {
        throw new Error(`Subscription cannot be charged from status ${subscription.status}.`);
      }

      const amount = money(BigInt(subscription.monthly_price_minor), subscription.currency_code);
      const charge = await this.paymentProvider.chargeSubscription({
        amount,
        chargedAt: input.chargedAt,
        idempotencyKey: input.idempotencyKey,
        mockOutcome: input.mockOutcome,
        operatorUserId: input.operatorUserId,
        subscriptionId: input.subscriptionId,
        traceId: input.traceId,
      });
      const subscriptionStatus = nextPaymentSubscriptionStatus(subscription.status, charge.status);
      const attempt = buildPaymentAttemptRecord({
        actor: { role: 'operator', userId: input.operatorUserId },
        amount,
        charge,
        chargedAt: input.chargedAt,
        countryCode: subscription.country_code,
        idempotencyKey: input.idempotencyKey,
        subscriptionId: input.subscriptionId,
        subscriptionStatus,
        traceId: input.traceId,
      });

      await insertPaymentAttempt(client, attempt);

      if (subscriptionStatus !== subscription.status) {
        await updateSubscriptionPaymentStatus(client, input.subscriptionId, subscriptionStatus);
      }

      await insertOutboxEvents(client, attempt.events);
      await client.query('COMMIT');
      return attempt;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async ingestPaymentWebhook(
    input: IngestPaymentWebhookInput,
  ): Promise<PaymentAttemptRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const existingAttempt =
        (await selectPaymentAttemptByIdempotencyKey(client, input.idempotencyKey)) ??
        (await selectPaymentAttemptByProviderReference(
          client,
          input.provider,
          input.providerReference,
        ));

      if (existingAttempt !== undefined) {
        await client.query('COMMIT');
        return mapPaymentAttemptRow(existingAttempt);
      }

      const subscription = await selectSubscriptionForPayment(client, input.subscriptionId);

      if (subscription === undefined) {
        throw new Error('Subscription was not found.');
      }

      if (subscription.status !== 'active' && subscription.status !== 'payment_overdue') {
        throw new Error(`Subscription cannot be charged from status ${subscription.status}.`);
      }

      const amount = money(BigInt(subscription.monthly_price_minor), subscription.currency_code);
      const subscriptionStatus = nextPaymentSubscriptionStatus(subscription.status, input.status);
      const attempt = buildPaymentAttemptRecord({
        actor: { role: 'system', userId: null },
        amount,
        charge: {
          provider: input.provider,
          providerReference: input.providerReference,
          status: input.status,
        },
        chargedAt: input.receivedAt,
        countryCode: subscription.country_code,
        idempotencyKey: input.idempotencyKey,
        subscriptionId: input.subscriptionId,
        subscriptionStatus,
        traceId: input.traceId,
      });

      await insertPaymentAttempt(client, attempt);

      if (subscriptionStatus !== subscription.status) {
        await updateSubscriptionPaymentStatus(client, input.subscriptionId, subscriptionStatus);
      }

      await insertOutboxEvents(client, attempt.events);
      await client.query('COMMIT');
      return attempt;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async assignWorker(input: AssignWorkerInput): Promise<AssignedSubscriptionRecord> {
    const client = await this.pool.connect();
    let rejectedDecision:
      | {
          readonly countryCode: 'TG';
          readonly reason: AssignmentDecisionRecord['reason'];
        }
      | undefined;

    try {
      await client.query('BEGIN');
      const subscription = await selectSubscriptionForAssignment(client, input.subscriptionId);

      if (subscription === undefined) {
        throw new Error('Subscription was not found.');
      }

      if (subscription.status !== 'pending_match') {
        throw new Error(`Subscription cannot be assigned from status ${subscription.status}.`);
      }

      if (await isWorkerUnavailableOnDate(client, input.workerId, input.anchorDate)) {
        rejectedDecision = {
          countryCode: subscription.country_code,
          reason: 'worker_unavailable',
        };
        throw new Error('Worker is unavailable on the assignment anchor date.');
      }

      const worker = await selectWorkerForAssignment(client, input.workerId);

      if (worker !== undefined) {
        try {
          assertWorkerCanTakeAssignment({
            activeSubscriptionCount: worker.active_subscription_count,
            subscriptionNeighborhood: subscription.neighborhood,
            worker: {
              countryCode: subscription.country_code,
              displayName: worker.display_name,
              maxActiveSubscriptions: worker.max_active_subscriptions,
              serviceNeighborhoods: worker.service_neighborhoods,
              status: worker.status,
              workerId: input.workerId,
            },
          });
        } catch (error) {
          rejectedDecision = {
            countryCode: subscription.country_code,
            reason: assignmentRejectionReason(error),
          };
          throw error;
        }
      }

      const assignment = buildAssignedSubscriptionRecord({
        ...input,
        countryCode: subscription.country_code,
        schedulePreference: {
          dayOfWeek: subscription.preferred_day_of_week,
          timeWindow: subscription.preferred_time_window,
        },
      });

      await upsertWorkerPlaceholder(client, subscription.country_code, input.workerId);
      await updateSubscriptionAssignment(client, input);
      const decision = await insertAssignmentDecision(client, subscription.country_code, input, {
        decision: 'assigned',
        reason: 'operator_selected_worker',
      });
      await insertVisits(client, subscription.country_code, input.subscriptionId, assignment);
      await insertOutboxEvents(client, [...decision.events, ...assignment.events]);
      await client.query('COMMIT');
      return assignment;
    } catch (error) {
      await client.query('ROLLBACK');

      if (rejectedDecision !== undefined) {
        try {
          await client.query('BEGIN');
          const decision = await insertAssignmentDecision(
            client,
            rejectedDecision.countryCode,
            input,
            {
              decision: 'rejected',
              reason: rejectedDecision.reason,
            },
          );
          await insertOutboxEvents(client, decision.events);
          await client.query('COMMIT');
        } catch {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Preserve the assignment failure as the caller-visible error.
          }
          // Assignment failure should remain the caller-visible error.
        }
      }

      throw error;
    } finally {
      client.release();
    }
  }

  public async declineAssignmentCandidate(
    input: DeclineAssignmentCandidateInput,
  ): Promise<AssignmentDecisionRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const subscription = await selectSubscriptionForAssignment(client, input.subscriptionId);

      if (subscription === undefined) {
        throw new Error('Subscription was not found.');
      }

      if (subscription.status !== 'pending_match') {
        throw new Error(
          `Subscription cannot record assignment decisions from status ${subscription.status}.`,
        );
      }

      if (!(await workerExists(client, input.workerId))) {
        throw new Error('Worker was not found.');
      }

      const decision = await insertAssignmentDecision(client, subscription.country_code, input, {
        decision: 'declined',
        reason: 'operator_declined_candidate',
      });
      await insertOutboxEvents(client, decision.events);
      await client.query('COMMIT');
      return decision;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async createWorkerAdvanceRequest(
    input: CreateWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const worker = await selectWorkerForAdvanceRequest(client, input.workerId);

      if (worker === undefined) {
        throw new Error('Worker was not found.');
      }

      assertWorkerAdvanceAmountAllowed(input.amountMinor);

      const requestCount = await countWorkerAdvanceRequestsForMonth(
        client,
        input.workerId,
        input.month,
      );

      if (requestCount > 0) {
        throw new Error('Worker advance limit reached for this month.');
      }

      const record = buildCreatedWorkerAdvanceRequestRecord({
        countryCode: worker.country_code,
        input,
        workerName: worker.display_name,
      });

      await insertWorkerAdvanceRequest(client, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listWorkerAdvanceRequests(
    input: ListWorkerAdvanceRequestsInput,
  ): Promise<readonly WorkerAdvanceRequestRecord[]> {
    const rows = await selectWorkerAdvanceRequests(this.pool, input);

    return rows.map(mapWorkerAdvanceRequestRow);
  }

  public async createWorkerMonthlyPayout(
    input: CreateWorkerMonthlyPayoutInput,
  ): Promise<WorkerPayoutRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const worker = await selectWorkerForPayout(client, input.workerId);

      if (worker === undefined) {
        throw new Error('Worker was not found.');
      }

      const earnings = await this.getWorkerMonthlyEarnings(input);

      if (earnings.netDue.amountMinor < 1n) {
        throw new Error('Worker monthly payout has no remaining balance.');
      }

      const payoutProviderResult = await this.createMonthlyPayoutProviderResult(
        input,
        earnings.netDue,
      );

      const record = buildWorkerPayoutRecord({
        amount: earnings.netDue,
        countryCode: worker.country_code,
        input,
        payoutType: 'monthly_settlement',
        providerResult: payoutProviderResult,
        workerName: worker.display_name,
      });

      await insertWorkerPayout(client, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listWorkerPayouts(
    input: ListWorkerPayoutsInput,
  ): Promise<readonly WorkerPayoutRecord[]> {
    const rows = await selectWorkerPayouts(this.pool, input);

    return rows.map(mapWorkerPayoutRow);
  }

  private async createMonthlyPayoutProviderResult(
    input: CreateWorkerMonthlyPayoutInput,
    amount: Money,
  ): Promise<
    | Awaited<ReturnType<PaymentProvider['payoutWorker']>>
    | {
        readonly failureReason: string;
        readonly provider: 'mobile_money_http';
        readonly providerReference: string | null;
        readonly status: 'failed';
      }
  > {
    try {
      return await this.paymentProvider.payoutWorker({
        amount,
        operatorUserId: input.operatorUserId,
        paidAt: input.paidAt,
        payoutType: 'monthly_settlement',
        periodMonth: input.month,
        ...(input.providerReference === undefined
          ? {}
          : { providerReference: input.providerReference }),
        traceId: input.traceId,
        workerId: input.workerId,
      });
    } catch (error) {
      return {
        failureReason:
          error instanceof Error && error.message.trim().length > 0
            ? error.message.slice(0, 240)
            : 'worker_payout_provider_failed',
        provider: 'mobile_money_http',
        providerReference: input.providerReference ?? null,
        status: 'failed',
      };
    }
  }

  public async issuePaymentRefund(input: IssuePaymentRefundInput): Promise<PaymentRefundRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const existingRefund = await selectPaymentRefundByPaymentAttemptId(
        client,
        input.paymentAttemptId,
      );

      if (existingRefund !== undefined) {
        throw new Error('Payment attempt already has a refund.');
      }

      const attempt = await selectPaymentAttemptById(client, input.paymentAttemptId);

      if (attempt === undefined) {
        throw new Error('Payment attempt was not found.');
      }

      if (attempt.status !== 'succeeded') {
        throw new Error('Only successful payment attempts can be refunded.');
      }

      if (input.amountMinor <= 0n || input.amountMinor > BigInt(attempt.amount_minor)) {
        throw new Error('Refund amount must be positive and no greater than the payment amount.');
      }

      const amount = money(input.amountMinor, attempt.currency_code);
      const refundResult = await this.paymentProvider.refundPayment({
        amount,
        issuedAt: input.issuedAt,
        operatorUserId: input.operatorUserId,
        paymentAttemptId: input.paymentAttemptId,
        paymentProvider: attempt.provider,
        paymentProviderReference: attempt.provider_reference,
        reason: input.reason,
        subscriptionId: attempt.subscription_id,
        traceId: input.traceId,
      });
      const refund = buildPaymentRefundRecord({
        countryCode: attempt.country_code,
        input,
        paymentAttempt: mapPaymentAttemptRow(attempt),
        refund: refundResult,
      });

      await insertPaymentRefund(client, refund);
      await insertOutboxEvents(client, refund.events);
      await client.query('COMMIT');
      return refund;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async runPaymentReconciliation(
    input: RunPaymentReconciliationInput,
  ): Promise<PaymentReconciliationRunRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const rows = await selectPaymentReconciliationRows(client, input);
      const paymentAttempts = rows.map((row) => ({
        ...mapPaymentAttemptRow(row),
        countryCode: row.country_code,
      }));
      const refundTotals = new Map(
        rows.map((row) => [
          row.payment_attempt_id,
          money(BigInt(row.refunded_amount_minor), row.currency_code),
        ]),
      );
      const run = buildPaymentReconciliationRunRecord({
        input,
        paymentAttempts,
        refundTotals,
      });

      await insertPaymentReconciliationRun(client, run);
      await insertOutboxEvents(client, run.events);
      await client.query('COMMIT');
      return run;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async resolveWorkerAdvanceRequest(
    input: ResolveWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const request = await selectWorkerAdvanceRequestForResolution(client, input.requestId);

      if (request === undefined) {
        throw new Error('Worker advance request was not found.');
      }

      if (request.status !== 'open') {
        throw new Error(`Worker advance request cannot be resolved from status ${request.status}.`);
      }

      const record = buildResolvedWorkerAdvanceRequestRecord({
        input,
        request: mapWorkerAdvanceRequestRow(request),
      });

      await updateWorkerAdvanceRequestResolution(client, input);
      if (input.resolution === 'approved') {
        const payoutProviderResult = await this.paymentProvider.payoutWorker({
          amount: record.amount,
          operatorUserId: input.operatorUserId,
          paidAt: input.resolvedAt,
          payoutType: 'advance',
          periodMonth: record.month,
          traceId: input.traceId,
          workerId: record.workerId,
        });
        const payout = buildWorkerPayoutRecord({
          advanceRequestId: record.requestId,
          amount: record.amount,
          countryCode: record.countryCode,
          input: {
            month: record.month,
            note: input.resolutionNote,
            operatorUserId: input.operatorUserId,
            paidAt: input.resolvedAt,
            traceId: input.traceId,
            workerId: record.workerId,
          },
          payoutType: 'advance',
          providerResult: payoutProviderResult,
          ...(record.workerName === undefined ? {} : { workerName: record.workerName }),
        });
        await insertWorkerPayout(client, payout);
        await insertOutboxEvents(client, [...record.events, ...payout.events]);
      } else {
        await insertOutboxEvents(client, record.events);
      }
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async createWorkerSwapRequest(
    input: CreateWorkerSwapRequestInput,
  ): Promise<WorkerSwapRequestRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const subscription = await selectSubscriptionForWorkerSwapRequest(
        client,
        input.subscriptionId,
      );

      if (subscription === undefined) {
        throw new Error('Subscription was not found.');
      }

      if (subscription.status !== 'active') {
        throw new Error(`Worker swap cannot be requested from status ${subscription.status}.`);
      }

      if (subscription.assigned_worker_id === null) {
        throw new Error('Subscription does not have an assigned worker.');
      }

      const quarterStart = getUtcQuarterStart(input.requestedAt);
      const requestCount = await countWorkerSwapRequestsSince(
        client,
        input.subscriptionId,
        quarterStart,
      );

      if (requestCount >= 2) {
        throw new Error('Worker swap limit reached for this quarter.');
      }

      const hasOpenRequest = await hasOpenWorkerSwapRequest(client, input.subscriptionId);

      if (hasOpenRequest) {
        throw new Error('A worker swap request is already open.');
      }

      const record = buildCreatedWorkerSwapRequestRecord({
        countryCode: subscription.country_code,
        currentWorkerId: subscription.assigned_worker_id,
        input,
        subscriberId: subscription.subscriber_id,
        subscriberPhoneNumber: subscription.phone_number,
        ...(subscription.assigned_worker_display_name === null
          ? {}
          : { currentWorkerName: subscription.assigned_worker_display_name }),
      });

      await insertWorkerSwapRequest(client, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listWorkerSwapRequests(
    input: ListWorkerSwapRequestsInput,
  ): Promise<readonly WorkerSwapRequestRecord[]> {
    const rows = await selectWorkerSwapRequests(this.pool, input);
    return rows.map(mapWorkerSwapRequestRow);
  }

  public async resolveWorkerSwapRequest(
    input: ResolveWorkerSwapRequestInput,
  ): Promise<WorkerSwapRequestRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const request = await selectWorkerSwapRequestForResolution(client, input.requestId);

      if (request === undefined) {
        throw new Error('Worker swap request was not found.');
      }

      if (request.status !== 'open') {
        throw new Error(`Worker swap request cannot be resolved from status ${request.status}.`);
      }

      if (input.resolution === 'approved' && input.replacementWorkerId === undefined) {
        throw new Error('replacementWorkerId is required when approving a worker swap.');
      }

      const replacementWorker =
        input.replacementWorkerId === undefined
          ? undefined
          : await selectWorkerForSwapReplacement(client, input.replacementWorkerId);

      if (input.resolution === 'approved' && replacementWorker === undefined) {
        throw new Error('Replacement worker was not found.');
      }

      const record = buildResolvedWorkerSwapRequestRecord({
        input,
        request: mapWorkerSwapRequestRow(request),
        ...(replacementWorker === undefined
          ? {}
          : { replacementWorkerName: replacementWorker.display_name }),
      });

      await updateWorkerSwapRequestResolution(client, input);
      if (input.resolution === 'approved' && input.replacementWorkerId !== undefined) {
        await updateSubscriptionWorkerSwap(
          client,
          request.subscription_id,
          input.replacementWorkerId,
        );
        await updateScheduledVisitsWorkerSwap(
          client,
          request.subscription_id,
          input.replacementWorkerId,
        );
      }
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelledSubscriptionRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const subscription = await selectSubscriptionForCancellation(client, input.subscriptionId);

      if (subscription === undefined) {
        throw new Error('Subscription was not found.');
      }

      const status = transitionSubscription(subscription.status, 'cancel');
      if (status !== 'cancelled') {
        throw new Error(`Expected cancelled subscription status, received ${status}.`);
      }

      const cancelledScheduledVisits = await cancelScheduledSubscriptionVisits(
        client,
        input.subscriptionId,
      );
      const record = buildCancelledSubscriptionRecord({
        cancelledScheduledVisits,
        countryCode: subscription.country_code,
        input,
        status,
      });

      await updateSubscriptionCancellationStatus(client, input.subscriptionId, status);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async changeSubscriptionTier(
    input: ChangeSubscriptionTierInput,
  ): Promise<ChangedSubscriptionTierRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const subscription = await selectSubscriptionForTierChange(client, input.subscriptionId);

      if (subscription === undefined) {
        throw new Error('Subscription was not found.');
      }

      assertSubscriptionCanChangeTier(subscription.status);
      const record = buildChangedSubscriptionTierRecord({
        countryCode: subscription.country_code,
        input,
        previousTierCode: subscription.tier_code,
        status: subscription.status,
      });

      await updateSubscriptionTier(client, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async checkInVisit(input: CheckInVisitInput): Promise<CheckedInVisitRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForLifecycle(client, input.visitId);

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      assertVisitWorker(visit.worker_id, input.workerId);
      assertVisitLocationVerified({
        fallbackCode: input.fallbackCode,
        location: input.location,
        target: {
          latitude: Number(visit.gps_latitude),
          longitude: Number(visit.gps_longitude),
        },
        visitFallbackCode: visit.fallback_code,
      });
      transitionVisit(visit.status, 'check_in');
      await updateVisitCheckIn(client, input, visit.fallback_code);
      await client.query('COMMIT');

      return {
        checkedInAt: input.checkedInAt,
        status: 'in_progress',
        visitId: input.visitId,
        workerId: input.workerId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async uploadVisitPhoto(input: UploadVisitPhotoInput): Promise<VisitPhotoRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForLifecycle(client, input.visitId);

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      assertVisitWorker(visit.worker_id, input.workerId);

      const event = createDomainEvent({
        actor: { role: 'worker', userId: input.workerId },
        aggregateId: input.visitId,
        aggregateType: 'visit',
        countryCode: visit.country_code,
        eventType: 'VisitPhotoUploaded',
        payload: {
          byteSize: input.byteSize,
          contentType: input.contentType,
          objectKey: input.objectKey,
          photoType: input.photoType,
          workerId: input.workerId,
        },
        traceId: input.traceId,
      });
      const photo = await upsertVisitPhoto(client, input, visit.country_code);
      await insertOutboxEvents(client, [event]);
      await client.query('COMMIT');

      return {
        ...photo,
        events: [event],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async checkOutVisit(input: CheckOutVisitInput): Promise<CompletedVisitRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForLifecycle(client, input.visitId);

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      if (visit.check_in_at === null) {
        throw new Error('Visit has not been checked in.');
      }

      assertVisitWorker(visit.worker_id, input.workerId);
      transitionVisit(visit.status, 'check_out');
      assertVisitLocationVerified({
        fallbackCode: input.fallbackCode,
        location: input.location,
        target: {
          latitude: Number(visit.gps_latitude),
          longitude: Number(visit.gps_longitude),
        },
        visitFallbackCode: visit.fallback_code,
      });
      assertVisitCompletionAllowed({
        checkedInAt: visit.check_in_at,
        checkedOutAt: input.checkedOutAt,
      });
      await assertVisitPhotosReady(client, input.visitId);

      const bonus = completedVisitBonus();
      const event = createDomainEvent({
        actor: { role: 'worker', userId: input.workerId },
        aggregateId: input.visitId,
        aggregateType: 'visit',
        countryCode: visit.country_code,
        eventType: 'VisitCompleted',
        payload: {
          bonusAmountMinor: bonus.amountMinor.toString(),
          bonusCurrencyCode: bonus.currencyCode,
          checkedInAt: visit.check_in_at.toISOString(),
          checkedOutAt: input.checkedOutAt.toISOString(),
          durationMinutes: durationMinutes(visit.check_in_at, input.checkedOutAt),
          workerId: input.workerId,
        },
        traceId: input.traceId,
      });

      await updateVisitCheckOut(client, input, visit.fallback_code);
      await insertWorkerCompletedVisitBonus(client, visit.country_code, input, event.eventId);
      await insertOutboxEvents(client, [event]);
      await client.query('COMMIT');

      return {
        bonus,
        checkedInAt: visit.check_in_at,
        checkedOutAt: input.checkedOutAt,
        durationMinutes: durationMinutes(visit.check_in_at, input.checkedOutAt),
        events: [event],
        status: 'completed',
        visitId: input.visitId,
        workerId: input.workerId,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async rescheduleVisit(input: RescheduleVisitInput): Promise<RescheduledVisitRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForSubscriberChange(
        client,
        input.subscriptionId,
        input.visitId,
      );

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      if (visit.status !== 'scheduled') {
        throw new Error(`Visit cannot be rescheduled from status ${visit.status}.`);
      }

      const record = buildRescheduledVisitRecord({
        countryCode: visit.country_code,
        currentScheduledDate: visit.scheduled_date,
        currentScheduledTimeWindow: visit.scheduled_time_window,
        input,
        workerId: visit.worker_id,
      });

      await updateVisitSchedule(client, input);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async skipVisit(input: SkipVisitInput): Promise<SkippedVisitRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForSubscriberChange(
        client,
        input.subscriptionId,
        input.visitId,
      );

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      const status = transitionVisit(visit.status, 'cancel');
      if (status !== 'cancelled') {
        throw new Error(`Expected cancelled visit status, received ${status}.`);
      }
      const record = buildSkippedVisitRecord({
        countryCode: visit.country_code,
        input,
        scheduledDate: visit.scheduled_date,
        scheduledTimeWindow: visit.scheduled_time_window,
        status,
        workerId: visit.worker_id,
      });

      await updateVisitStatus(client, input.visitId, status);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async updateOperatorVisitStatus(
    input: UpdateOperatorVisitStatusInput,
  ): Promise<OperatorVisitStatusRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForOperatorStatusUpdate(client, input.visitId);

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      const previousStatus = visit.status;
      const status = transitionVisit(
        previousStatus,
        input.status === 'no_show' ? 'mark_no_show' : 'cancel',
      );

      if (status !== input.status) {
        throw new Error(`Expected ${input.status} visit status, received ${status}.`);
      }

      const record = buildOperatorVisitStatusRecord({
        countryCode: visit.country_code,
        input,
        previousStatus,
        scheduledDate: visit.scheduled_date,
        scheduledTimeWindow: visit.scheduled_time_window,
        status,
        subscriptionId: visit.subscription_id,
        workerId: visit.worker_id,
      });

      await updateVisitStatus(client, input.visitId, status);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async createDispute(input: CreateDisputeInput): Promise<DisputeRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForDispute(client, input.subscriptionId, input.visitId);

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      const status = transitionVisit(visit.status, 'dispute');
      const record = buildCreatedDisputeRecord({
        countryCode: visit.country_code,
        input,
        subscriberPhoneNumber: visit.subscriber_phone_number,
        workerId: visit.worker_id,
      });

      await insertSupportDispute(client, record);
      await updateVisitStatus(client, input.visitId, status);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listOperatorDisputes(
    input: ListOperatorDisputesInput,
  ): Promise<readonly DisputeRecord[]> {
    const rows = await selectOperatorDisputes(this.pool, input);
    return rows.map(mapDisputeRow);
  }

  public async resolveDispute(input: ResolveDisputeInput): Promise<DisputeRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const dispute = await selectDisputeForResolution(client, input.disputeId);

      if (dispute === undefined) {
        throw new Error('Dispute was not found.');
      }

      if (dispute.status !== 'open') {
        throw new Error(`Dispute cannot be resolved from status ${dispute.status}.`);
      }

      const record = buildResolvedDisputeRecord({
        dispute: mapDisputeRow(dispute),
        input,
      });
      const credit = buildSupportCreditRecord(record, input);

      await updateSupportDisputeResolution(client, input);
      if (credit !== null) {
        await insertSupportCredit(client, credit, record.countryCode);
      }
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async rateVisit(input: RateVisitInput): Promise<VisitRatingRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForRating(client, input.subscriptionId, input.visitId);

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      if (visit.status !== 'completed' && visit.status !== 'disputed') {
        throw new Error(`Visit cannot be rated from status ${visit.status}.`);
      }

      const record = buildVisitRatingRecord({
        countryCode: visit.country_code,
        input,
        workerId: visit.worker_id,
      });

      await insertVisitRating(client, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async reportWorkerIssue(input: ReportWorkerIssueInput): Promise<WorkerIssueReportRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const visit = await selectVisitForWorkerIssue(client, input.visitId);

      if (visit === undefined) {
        throw new Error('Visit was not found.');
      }

      assertVisitWorker(visit.worker_id, input.workerId);
      const record = buildWorkerIssueReportRecord({
        address: {
          gpsLatitude: Number(visit.gps_latitude),
          gpsLongitude: Number(visit.gps_longitude),
          landmark: visit.landmark,
          neighborhood: visit.neighborhood,
        },
        countryCode: visit.country_code,
        input,
        scheduledDate: visit.scheduled_date,
        scheduledTimeWindow: visit.scheduled_time_window,
        subscriberPhoneNumber: visit.subscriber_phone_number,
        subscriptionId: visit.subscription_id,
      });

      await insertWorkerIssueReport(client, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listWorkerIssues(
    input: ListWorkerIssuesInput,
  ): Promise<readonly WorkerIssueReportRecord[]> {
    const rows = await selectWorkerIssues(this.pool, input);
    return rows.map(mapWorkerIssueRow);
  }

  public async resolveWorkerIssue(
    input: ResolveWorkerIssueInput,
  ): Promise<WorkerIssueReportRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const issue = await selectWorkerIssueForResolution(client, input.issueId);

      if (issue === undefined) {
        throw new Error('Worker issue was not found.');
      }

      if (issue.status === 'resolved') {
        throw new Error('Worker issue is already resolved.');
      }

      const record = buildResolvedWorkerIssueRecord({
        input,
        issue: mapWorkerIssueRow(issue),
      });

      await updateWorkerIssueResolution(client, input);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async getWorkerMonthlyEarnings(
    input: GetWorkerMonthlyEarningsInput,
  ): Promise<WorkerMonthlyEarningsRecord> {
    const { endExclusive, startInclusive } = getUtcMonthRange(input.month);
    const result = await this.pool.query<WorkerMonthlyEarningsRow>(
      `
        SELECT COUNT(*)::int AS completed_visits
        FROM worker_earning_ledger ledger
        INNER JOIN visits visit ON visit.id = ledger.visit_id
        WHERE ledger.worker_id = $1
          AND ledger.reason = 'completed_visit_bonus'
          AND visit.completed_at >= $2
          AND visit.completed_at < $3
      `,
      [input.workerId, startInclusive, endExclusive],
    );
    const completedVisits = Number(result.rows[0]?.completed_visits ?? 0);
    const compensation = calculateWorkerMonthlyCompensation(completedVisits);
    const payoutHistory = await this.listWorkerPayouts({
      limit: 100,
      month: input.month,
      workerId: input.workerId,
    });
    const paidOutTotal = money(
      payoutHistory.reduce(
        (total, payout) => (payout.status === 'paid' ? total + payout.amount.amountMinor : total),
        0n,
      ),
      compensation.total.currencyCode,
    );

    return {
      completedVisits: compensation.completedVisits,
      floor: compensation.floor,
      month: input.month,
      netDue: money(compensation.total.amountMinor - paidOutTotal.amountMinor, 'XOF'),
      paidOutTotal,
      payoutHistory,
      total: compensation.total,
      visitBonusTotal: compensation.visitBonusTotal,
      workerId: input.workerId,
    };
  }

  public async getWorkerRoute(input: GetWorkerRouteInput): Promise<WorkerRouteRecord> {
    const result = await this.pool.query<WorkerRouteRow>(
      `
        SELECT
          visit.id AS visit_id,
          visit.subscription_id,
          visit.status,
          visit.scheduled_date::text AS scheduled_date,
          visit.scheduled_time_window,
          subscriber.phone_number AS subscriber_phone_number,
          address.neighborhood,
          address.landmark,
          address.gps_latitude,
          address.gps_longitude
        FROM visits visit
        INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
        INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
        INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
        WHERE visit.worker_id = $1
          AND visit.scheduled_date = $2
        ORDER BY
          CASE visit.scheduled_time_window
            WHEN 'morning' THEN 0
            WHEN 'afternoon' THEN 1
            ELSE 2
          END,
          visit.id ASC
      `,
      [input.workerId, input.date],
    );

    return {
      date: input.date,
      visits: result.rows.map((row) => ({
        address: {
          gpsLatitude: Number(row.gps_latitude),
          gpsLongitude: Number(row.gps_longitude),
          landmark: row.landmark,
          neighborhood: row.neighborhood,
        },
        scheduledDate: row.scheduled_date,
        scheduledTimeWindow: row.scheduled_time_window,
        status: row.status,
        subscriberPhoneNumber: row.subscriber_phone_number,
        subscriptionId: row.subscription_id,
        visitId: row.visit_id,
      })),
      workerId: input.workerId,
    };
  }

  public async getSubscriptionDetail(
    input: GetSubscriptionDetailInput,
  ): Promise<SubscriptionDetailRecord> {
    const detail = await selectSubscriptionDetail(this.pool, input.subscriptionId);

    if (detail === undefined) {
      throw new Error('Subscription was not found.');
    }

    const visits = await selectSubscriptionUpcomingVisits(this.pool, input.subscriptionId);
    const recentVisits = await selectSubscriptionRecentVisits(this.pool, input.subscriptionId);
    const supportCredits = await selectSubscriptionSupportCredits(this.pool, input.subscriptionId);

    return {
      address: {
        gpsLatitude: Number(detail.gps_latitude),
        gpsLongitude: Number(detail.gps_longitude),
        landmark: detail.landmark,
        neighborhood: detail.neighborhood,
      },
      assignedWorker:
        detail.assigned_worker_id === null
          ? null
          : {
              averageRating:
                detail.assigned_worker_average_rating == null
                  ? null
                  : Number(detail.assigned_worker_average_rating),
              completedVisitCount: detail.assigned_worker_completed_visit_count ?? 0,
              displayName:
                detail.assigned_worker_display_name ??
                `Worker ${detail.assigned_worker_id.slice(0, 8)}`,
              disputeCount: detail.assigned_worker_dispute_count ?? 0,
              workerId: detail.assigned_worker_id,
            },
      countryCode: detail.country_code,
      monthlyPriceMinor: BigInt(detail.monthly_price_minor),
      phoneNumber: detail.phone_number,
      schedulePreference: {
        dayOfWeek: detail.preferred_day_of_week,
        timeWindow: detail.preferred_time_window,
      },
      status: detail.status,
      subscriberId: detail.subscriber_id,
      subscriptionId: detail.subscription_id,
      recentVisits: recentVisits.map((visit) => ({
        scheduledDate: visit.scheduled_date,
        scheduledTimeWindow: visit.scheduled_time_window,
        status: visit.status,
        visitId: visit.visit_id,
        workerId: visit.worker_id,
      })),
      tierCode: detail.tier_code,
      supportCredits: supportCredits.map((credit) => ({
        amount: money(BigInt(credit.amount_minor), credit.currency_code),
        createdAt: credit.created_at,
        creditId: credit.credit_id,
        reason: credit.reason,
      })),
      upcomingVisits: visits.map((visit) => ({
        scheduledDate: visit.scheduled_date,
        scheduledTimeWindow: visit.scheduled_time_window,
        status: visit.status,
        visitId: visit.visit_id,
        workerId: visit.worker_id,
      })),
      visitsPerCycle: detail.visits_per_cycle,
    };
  }

  public async upsertWorkerProfile(input: UpsertWorkerProfileInput): Promise<WorkerProfileRecord> {
    await this.pool.query(
      `
        INSERT INTO workers (
          id,
          country_code,
          display_name,
          status,
          service_neighborhoods,
          max_active_subscriptions
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE
        SET
          country_code = excluded.country_code,
          display_name = excluded.display_name,
          status = excluded.status,
          service_neighborhoods = excluded.service_neighborhoods,
          max_active_subscriptions = excluded.max_active_subscriptions,
          updated_at = now()
      `,
      [
        input.workerId,
        input.countryCode,
        input.displayName,
        input.status,
        input.serviceNeighborhoods,
        input.maxActiveSubscriptions,
      ],
    );

    return {
      countryCode: input.countryCode,
      displayName: input.displayName,
      maxActiveSubscriptions: input.maxActiveSubscriptions,
      serviceNeighborhoods: [...input.serviceNeighborhoods],
      status: input.status,
      workerId: input.workerId,
    };
  }

  public async getWorkerProfile(workerId: string): Promise<WorkerProfileRecord> {
    const worker = await selectWorkerProfile(this.pool, workerId);

    if (worker === undefined) {
      throw new Error('Worker profile was not found.');
    }

    return worker;
  }

  public async createWorkerOnboardingCase(
    input: CreateWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await upsertWorkerForOnboarding(client, input);
      const record = buildCreatedWorkerOnboardingCaseRecord(input);
      await insertWorkerOnboardingCase(client, record);
      await insertWorkerOnboardingNotes(client, record.caseId, record.notes);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listWorkerOnboardingCases(
    input: ListWorkerOnboardingCasesInput,
  ): Promise<readonly WorkerOnboardingCaseRecord[]> {
    const rows = await selectWorkerOnboardingCases(this.pool, input);

    return Promise.all(rows.map((row) => mapWorkerOnboardingCaseRow(this.pool, row)));
  }

  public async advanceWorkerOnboardingCase(
    input: AdvanceWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const row = await selectWorkerOnboardingCaseForUpdate(client, input.caseId);

      if (row === undefined) {
        throw new Error('Worker onboarding case was not found.');
      }

      const current = await mapWorkerOnboardingCaseRow(client, row);
      const record = buildAdvancedWorkerOnboardingCaseRecord({ input, record: current });
      await updateWorkerOnboardingCaseStage(client, record);
      await insertWorkerOnboardingNotes(client, record.caseId, [record.notes.at(-1)!]);
      if (record.stage === 'activated') {
        await updateWorkerStatus(client, record.workerId, 'active');
      } else if (record.stage === 'rejected') {
        await updateWorkerStatus(client, record.workerId, 'inactive');
      } else {
        await updateWorkerStatus(client, record.workerId, 'onboarding');
      }
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async createWorkerUnavailability(
    input: CreateWorkerUnavailabilityInput,
  ): Promise<WorkerUnavailabilityRecord> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      if (!(await workerExists(client, input.workerId))) {
        throw new Error('Worker was not found.');
      }

      if (await isWorkerUnavailableOnDate(client, input.workerId, input.date)) {
        throw new Error('Worker unavailability already exists for this date.');
      }

      const record = buildWorkerUnavailabilityRecord(input);
      await insertWorkerUnavailability(client, record);
      await insertOutboxEvents(client, record.events);
      await client.query('COMMIT');
      return record;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async listWorkerUnavailability(
    input: ListWorkerUnavailabilityInput,
  ): Promise<readonly WorkerUnavailabilityRecord[]> {
    const rows = await selectWorkerUnavailability(this.pool, input);

    return rows.map(mapWorkerUnavailabilityRow);
  }

  public async listMatchingQueue(
    input: ListMatchingQueueInput,
  ): Promise<readonly MatchingQueueItemRecord[]> {
    const result = await this.pool.query<MatchingQueueRow>(
      `
        SELECT
          subscription.id AS subscription_id,
          subscription.subscriber_id,
          subscriber.phone_number,
          subscription.country_code,
          subscription.tier_code,
          subscription.visits_per_cycle,
          subscription.monthly_price_minor,
          subscription.preferred_day_of_week,
          subscription.preferred_time_window,
          subscription.status,
          subscription.created_at AS queued_at,
          subscription.created_at + interval '4 hours' AS assignment_due_at,
          address.neighborhood,
          address.landmark,
          address.gps_latitude,
          address.gps_longitude
        FROM subscriptions subscription
        INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
        INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
        WHERE subscription.country_code = $1
          AND subscription.status = 'pending_match'
        ORDER BY subscription.created_at ASC
        LIMIT $2
      `,
      [input.countryCode, input.limit],
    );

    return result.rows.map((row) => ({
      address: {
        gpsLatitude: Number(row.gps_latitude),
        gpsLongitude: Number(row.gps_longitude),
        landmark: row.landmark,
        neighborhood: row.neighborhood,
      },
      assignmentDueAt: row.assignment_due_at,
      countryCode: row.country_code,
      monthlyPriceMinor: BigInt(row.monthly_price_minor),
      phoneNumber: row.phone_number,
      queuedAt: row.queued_at,
      schedulePreference: {
        dayOfWeek: row.preferred_day_of_week,
        timeWindow: row.preferred_time_window,
      },
      status: 'pending_match',
      subscriberId: row.subscriber_id,
      subscriptionId: row.subscription_id,
      tierCode: row.tier_code,
      visitsPerCycle: row.visits_per_cycle,
    }));
  }

  public async listMatchingCandidates(
    input: ListMatchingCandidatesInput,
  ): Promise<readonly MatchingCandidateRecord[]> {
    const subscription = await selectSubscriptionForCandidates(this.pool, input.subscriptionId);

    if (subscription === undefined) {
      throw new Error('Subscription was not found.');
    }

    const result = await this.pool.query<MatchingCandidateRow>(
      `
        SELECT
          worker.id AS worker_id,
          worker.display_name,
          worker.service_neighborhoods,
          worker.max_active_subscriptions,
          COUNT(active_subscription.id)::int AS active_subscription_count
        FROM workers worker
        LEFT JOIN subscriptions active_subscription
          ON active_subscription.assigned_worker_id = worker.id
          AND active_subscription.status = 'active'
        WHERE worker.country_code = $1
          AND worker.status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM assignment_decisions declined_decision
            WHERE declined_decision.subscription_id = $4
              AND declined_decision.worker_id = worker.id
              AND declined_decision.decision = 'declined'
          )
          AND (
            $3::date IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM worker_unavailability unavailable
              WHERE unavailable.worker_id = worker.id
                AND unavailable.unavailable_date = $3
            )
          )
          AND EXISTS (
            SELECT 1
            FROM unnest(worker.service_neighborhoods) service_neighborhood
            WHERE lower(service_neighborhood) = lower($2)
          )
        GROUP BY
          worker.id,
          worker.display_name,
          worker.service_neighborhoods,
          worker.max_active_subscriptions
        HAVING COUNT(active_subscription.id) < worker.max_active_subscriptions
        ORDER BY
          COUNT(active_subscription.id) ASC,
          worker.display_name ASC
      `,
      [
        subscription.country_code,
        subscription.neighborhood,
        input.anchorDate ?? null,
        input.subscriptionId,
      ],
    );

    return result.rows
      .map((row) =>
        toMatchingCandidate(
          {
            countryCode: subscription.country_code,
            displayName: row.display_name,
            maxActiveSubscriptions: row.max_active_subscriptions,
            serviceNeighborhoods: row.service_neighborhoods,
            status: 'active',
            workerId: row.worker_id,
          },
          row.active_subscription_count,
        ),
      )
      .sort(compareMatchingCandidates)
      .slice(0, input.limit);
  }

  public async listServiceCells(
    input: ListServiceCellsInput,
  ): Promise<readonly ServiceCellCapacityRecord[]> {
    const result = await this.pool.query<ServiceCellCapacityRow>(
      `
        WITH worker_cells AS (
          SELECT
            lower(service_cell) AS cell_key,
            min(service_cell) AS service_cell,
            COUNT(worker.id)::int AS active_workers,
            COALESCE(SUM(worker.max_active_subscriptions), 0)::int AS total_capacity
          FROM workers worker
          CROSS JOIN LATERAL unnest(worker.service_neighborhoods) AS service_cell
          WHERE worker.status = 'active'
          GROUP BY lower(service_cell)
        ),
        subscription_cells AS (
          SELECT
            lower(address.neighborhood) AS cell_key,
            COUNT(subscription.id)::int AS active_subscriptions
          FROM subscriptions subscription
          INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
          WHERE subscription.status = 'active'
          GROUP BY lower(address.neighborhood)
        ),
        visit_cells AS (
          SELECT
            lower(address.neighborhood) AS cell_key,
            COUNT(*) FILTER (WHERE visit.status = 'scheduled')::int AS scheduled_visits,
            COUNT(*) FILTER (WHERE visit.status = 'in_progress')::int AS in_progress_visits,
            COUNT(*) FILTER (WHERE visit.status = 'completed')::int AS completed_visits
          FROM visits visit
          INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
          INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
          WHERE visit.scheduled_date = $1
          GROUP BY lower(address.neighborhood)
        ),
        all_cells AS (
          SELECT cell_key FROM worker_cells
          UNION
          SELECT cell_key FROM subscription_cells
          UNION
          SELECT cell_key FROM visit_cells
        )
        SELECT
          COALESCE(worker_cells.service_cell, initcap(all_cells.cell_key)) AS service_cell,
          COALESCE(worker_cells.active_workers, 0)::int AS active_workers,
          COALESCE(worker_cells.total_capacity, 0)::int AS total_capacity,
          COALESCE(subscription_cells.active_subscriptions, 0)::int AS active_subscriptions,
          COALESCE(visit_cells.scheduled_visits, 0)::int AS scheduled_visits,
          COALESCE(visit_cells.in_progress_visits, 0)::int AS in_progress_visits,
          COALESCE(visit_cells.completed_visits, 0)::int AS completed_visits
        FROM all_cells
        LEFT JOIN worker_cells ON worker_cells.cell_key = all_cells.cell_key
        LEFT JOIN subscription_cells ON subscription_cells.cell_key = all_cells.cell_key
        LEFT JOIN visit_cells ON visit_cells.cell_key = all_cells.cell_key
        ORDER BY
          CASE
            WHEN COALESCE(worker_cells.total_capacity, 0) = 0 THEN 0
            ELSE COALESCE(subscription_cells.active_subscriptions, 0)::numeric / worker_cells.total_capacity
          END DESC,
          COALESCE(subscription_cells.active_subscriptions, 0) DESC,
          service_cell ASC
        LIMIT $2
      `,
      [input.date, input.limit],
    );

    return result.rows.map((row) => toServiceCellCapacityRecord(row));
  }

  public async listAuditEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]> {
    const result = await this.pool.query<AuditEventRow>(
      `
        SELECT
          id AS event_id,
          country_code,
          aggregate_type,
          aggregate_id,
          event_type,
          payload,
          actor_role,
          actor_user_id,
          trace_id,
          occurred_at,
          recorded_at
        FROM audit_events
        WHERE country_code = $1
          AND ($2::text IS NULL OR aggregate_type = $2)
          AND ($3::uuid IS NULL OR aggregate_id = $3)
          AND ($4::text IS NULL OR event_type = $4)
        ORDER BY occurred_at ASC, id ASC
        LIMIT $5
      `,
      [
        input.countryCode,
        input.aggregateType ?? null,
        input.aggregateId ?? null,
        input.eventType ?? null,
        input.limit,
      ],
    );

    return result.rows.map((row) => ({
      actor: { role: row.actor_role, userId: row.actor_user_id },
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      countryCode: row.country_code,
      eventId: row.event_id,
      eventType: row.event_type,
      occurredAt: row.occurred_at,
      payload: row.payload,
      recordedAt: row.recorded_at,
      traceId: row.trace_id,
    }));
  }

  public async listPaymentAttempts(
    input: ListPaymentAttemptsInput,
  ): Promise<readonly PaymentAttemptSummaryRecord[]> {
    const result = await this.pool.query<PaymentAttemptSummaryRow>(
      `
        SELECT
          attempt.id AS payment_attempt_id,
          attempt.subscription_id,
          subscription.country_code,
          attempt.amount_minor,
          attempt.currency_code,
          attempt.status,
          attempt.provider,
          attempt.provider_reference,
          attempt.idempotency_key,
          attempt.charged_at,
          subscription.status AS subscription_status
        FROM payment_attempts attempt
        INNER JOIN subscriptions subscription ON subscription.id = attempt.subscription_id
        WHERE subscription.country_code = $1
          AND ($2::text IS NULL OR attempt.provider = $2)
          AND ($3::text IS NULL OR attempt.status = $3)
        ORDER BY attempt.charged_at DESC, attempt.id DESC
        LIMIT $4
      `,
      [input.countryCode, input.provider ?? null, input.status ?? null, input.limit],
    );

    return result.rows.map((row) => ({
      ...mapPaymentAttemptRow(row),
      countryCode: row.country_code,
    }));
  }

  public async listSubscriberSupportMatches(
    input: ListSubscriberSupportMatchesInput,
  ): Promise<readonly SubscriberSupportMatchRecord[]> {
    const result = await this.pool.query<SubscriberSupportMatchRow>(
      `
        SELECT
          subscription.id AS subscription_id,
          subscription.subscriber_id,
          subscriber.phone_number,
          subscription.country_code,
          subscription.tier_code,
          subscription.status
        FROM subscriptions subscription
        INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
        WHERE subscription.country_code = $1
          AND ($2::text IS NULL OR subscriber.phone_number ILIKE '%' || $2 || '%')
        ORDER BY subscription.created_at DESC, subscription.id DESC
        LIMIT $3
      `,
      [input.countryCode, input.phoneNumber ?? null, input.limit],
    );

    return result.rows.map((row) => ({
      countryCode: row.country_code,
      phoneNumber: row.phone_number,
      status: row.status,
      subscriberId: row.subscriber_id,
      subscriptionId: row.subscription_id,
      tierCode: row.tier_code,
    }));
  }

  public async listSubscriptionBilling(
    input: ListSubscriptionBillingInput,
  ): Promise<readonly SubscriptionBillingItemRecord[]> {
    const [chargeRows, refundRows] = await Promise.all([
      selectPaymentAttemptsForSubscription(this.pool, input.subscriptionId),
      selectPaymentRefundsForSubscription(this.pool, input.subscriptionId),
    ]);
    const charges = chargeRows.map(
      (attempt): SubscriptionBillingItemRecord => ({
        amount: money(BigInt(attempt.amount_minor), attempt.currency_code),
        itemId: attempt.payment_attempt_id,
        itemType: 'charge',
        occurredAt: attempt.charged_at,
        paymentAttemptId: attempt.payment_attempt_id,
        provider: attempt.provider,
        providerReference: attempt.provider_reference,
        reason: null,
        refundId: null,
        status: attempt.status,
        subscriptionId: attempt.subscription_id,
      }),
    );
    const refunds = refundRows.map(
      (refund): SubscriptionBillingItemRecord => ({
        amount: money(BigInt(refund.amount_minor), refund.currency_code),
        itemId: refund.refund_id,
        itemType: 'refund',
        occurredAt: refund.issued_at,
        paymentAttemptId: refund.payment_attempt_id,
        provider: refund.provider,
        providerReference: refund.provider_reference,
        reason: refund.reason,
        refundId: refund.refund_id,
        status: refund.status,
        subscriptionId: refund.subscription_id,
      }),
    );

    return [...charges, ...refunds]
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          right.itemId.localeCompare(left.itemId),
      )
      .slice(0, input.limit);
  }

  public async listNotificationMessages(
    input: ListNotificationMessagesInput,
  ): Promise<readonly NotificationMessageRecord[]> {
    const result = await this.pool.query<NotificationMessageRow>(
      `
        SELECT
          id AS message_id,
          country_code,
          channel,
          template_key,
          recipient_role,
          recipient_user_id,
          aggregate_type,
          aggregate_id,
          event_id,
          payload,
          status,
          provider,
          provider_reference,
          attempt_count,
          available_at,
          created_at,
          last_attempt_at,
          sent_at,
          failure_reason
        FROM notification_messages
        WHERE country_code = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR channel = $3)
          AND ($4::text IS NULL OR template_key = $4)
          AND ($5::text IS NULL OR aggregate_type = $5)
          AND ($6::uuid IS NULL OR aggregate_id = $6)
        ORDER BY available_at ASC, id ASC
        LIMIT $7
      `,
      [
        input.countryCode,
        input.status ?? null,
        input.channel ?? null,
        input.templateKey ?? null,
        input.aggregateType ?? null,
        input.aggregateId ?? null,
        input.limit,
      ],
    );

    return result.rows.map(mapNotificationMessageRow);
  }

  public async registerPushDevice(input: RegisterPushDeviceInput): Promise<PushDeviceRecord> {
    const result = await this.pool.query<PushDeviceRow>(
      `
        INSERT INTO push_device_tokens (
          id,
          country_code,
          user_id,
          role,
          app,
          platform,
          environment,
          device_id,
          token,
          status,
          last_registered_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10)
        ON CONFLICT (user_id, device_id) DO UPDATE
        SET
          country_code = excluded.country_code,
          role = excluded.role,
          app = excluded.app,
          platform = excluded.platform,
          environment = excluded.environment,
          token = excluded.token,
          status = 'active',
          last_registered_at = excluded.last_registered_at,
          updated_at = now()
        RETURNING
          id AS push_device_id,
          country_code,
          user_id,
          role,
          app,
          platform,
          environment,
          device_id,
          token,
          status,
          last_registered_at,
          created_at,
          updated_at
      `,
      [
        randomUUID(),
        input.countryCode,
        input.userId,
        input.role,
        input.app,
        input.platform,
        input.environment,
        input.deviceId,
        input.token,
        input.registeredAt,
      ],
    );
    const row = result.rows[0];

    if (row === undefined) {
      throw new Error('Push device could not be registered.');
    }

    return mapPushDeviceRow(row);
  }

  public async listPushDevices(input: ListPushDevicesInput): Promise<readonly PushDeviceRecord[]> {
    const result = await this.pool.query<PushDeviceRow>(
      `
        SELECT
          id AS push_device_id,
          country_code,
          user_id,
          role,
          app,
          platform,
          environment,
          device_id,
          token,
          status,
          last_registered_at,
          created_at,
          updated_at
        FROM push_device_tokens
        WHERE country_code = $1
          AND ($2::text IS NULL OR role = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY last_registered_at DESC, id ASC
        LIMIT $4
      `,
      [input.countryCode, input.role ?? null, input.status ?? null, input.limit],
    );

    return result.rows.map(mapPushDeviceRow);
  }

  public async deliverDueNotificationMessages(
    input: DeliverDueNotificationMessagesInput,
  ): Promise<readonly NotificationMessageRecord[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query<NotificationMessageRow>(
        `
          SELECT
            id AS message_id,
            country_code,
            channel,
            template_key,
            recipient_role,
            recipient_user_id,
            aggregate_type,
            aggregate_id,
            event_id,
            payload,
            status,
            provider,
            provider_reference,
            attempt_count,
            available_at,
            created_at,
            last_attempt_at,
            sent_at,
            failure_reason
          FROM notification_messages
          WHERE country_code = $1
            AND status = 'pending'
            AND available_at <= $2
          ORDER BY available_at ASC, id ASC
          LIMIT $3
          FOR UPDATE SKIP LOCKED
        `,
        [input.countryCode, input.deliveredAt, input.limit],
      );
      const delivered: NotificationMessageRecord[] = [];

      for (const row of result.rows) {
        const message = mapNotificationMessageRow(row);
        const updated = await deliverNotificationMessageLocally({
          deliveredAt: input.deliveredAt,
          message,
          pushTokens: await selectPushTokensForNotificationMessage(client, message),
        });
        delivered.push(await updateNotificationDelivery(client, updated));
      }

      await client.query('COMMIT');
      return delivered;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

interface ServiceCellCapacityRow {
  readonly active_subscriptions: number;
  readonly active_workers: number;
  readonly completed_visits: number;
  readonly in_progress_visits: number;
  readonly scheduled_visits: number;
  readonly service_cell: string;
  readonly total_capacity: number;
}

interface MatchingCandidateRow {
  readonly active_subscription_count: number;
  readonly display_name: string;
  readonly max_active_subscriptions: number;
  readonly service_neighborhoods: string[];
  readonly worker_id: string;
}

interface OtpChallengeRow {
  readonly attempts: number;
  readonly code_hash: string;
  readonly consumed_at: Date | null;
  readonly country_code: 'TG';
  readonly expires_at: Date;
  readonly phone_number: string;
}

interface AuthUserRow {
  readonly phone_number: string;
  readonly role: 'operator' | 'subscriber' | 'worker';
  readonly user_id: string;
}

interface AuthRefreshSessionRow {
  readonly device_id: string;
  readonly phone_number: string;
  readonly revoked_at: Date | null;
  readonly role: 'operator' | 'subscriber' | 'worker';
  readonly session_expires_at: Date;
  readonly session_id: string;
  readonly user_id: string;
}

interface PaymentSubscriptionRow {
  readonly country_code: 'TG';
  readonly currency_code: 'XOF';
  readonly monthly_price_minor: string;
  readonly status: SubscriptionStatus;
}

interface PaymentAttemptRow {
  readonly amount_minor: string;
  readonly charged_at: Date;
  readonly currency_code: 'XOF';
  readonly idempotency_key: string;
  readonly payment_attempt_id: string;
  readonly provider: string;
  readonly provider_reference: string;
  readonly status: 'failed' | 'succeeded';
  readonly subscription_id: string;
  readonly subscription_status: SubscriptionStatus;
}

interface PaymentAttemptSummaryRow extends PaymentAttemptRow {
  readonly country_code: 'TG';
}

interface SubscriberSupportMatchRow {
  readonly country_code: 'TG';
  readonly phone_number: string;
  readonly status: SubscriptionStatus;
  readonly subscriber_id: string;
  readonly subscription_id: string;
  readonly tier_code: SubscriptionTierCode;
}

interface PaymentReconciliationRow extends PaymentAttemptSummaryRow {
  readonly refunded_amount_minor: string;
}

interface PaymentRefundRow {
  readonly payment_attempt_id: string;
  readonly refund_id: string;
}

interface PaymentRefundBillingRow {
  readonly amount_minor: string;
  readonly currency_code: 'XOF';
  readonly issued_at: Date;
  readonly payment_attempt_id: string;
  readonly provider: string;
  readonly provider_reference: string | null;
  readonly reason: string;
  readonly refund_id: string;
  readonly status: 'issued';
  readonly subscription_id: string;
}

interface CandidateSubscriptionRow {
  readonly country_code: 'TG';
  readonly neighborhood: string;
}

interface MatchingQueueRow {
  readonly assignment_due_at: Date;
  readonly country_code: 'TG';
  readonly gps_latitude: string;
  readonly gps_longitude: string;
  readonly landmark: string;
  readonly monthly_price_minor: string;
  readonly neighborhood: string;
  readonly phone_number: string;
  readonly preferred_day_of_week:
    | 'friday'
    | 'monday'
    | 'saturday'
    | 'sunday'
    | 'thursday'
    | 'tuesday'
    | 'wednesday';
  readonly preferred_time_window: 'afternoon' | 'morning';
  readonly queued_at: Date;
  readonly status: 'pending_match';
  readonly subscriber_id: string;
  readonly subscription_id: string;
  readonly tier_code: 'T1' | 'T2';
  readonly visits_per_cycle: 1 | 2;
}

interface WorkerMonthlyEarningsRow {
  readonly completed_visits: number;
}

interface WorkerAdvanceRequestRow {
  readonly amount_minor: string;
  readonly country_code: 'TG';
  readonly currency_code: 'XOF';
  readonly month: string;
  readonly reason: string;
  readonly requested_at: Date;
  readonly request_id: string;
  readonly resolved_at: Date | null;
  readonly resolved_by_operator_user_id: string | null;
  readonly resolution_note: string | null;
  readonly status: WorkerAdvanceRequestStatus;
  readonly worker_id: string;
  readonly worker_name: string;
}

interface WorkerAdvanceRequestWorkerRow {
  readonly country_code: 'TG';
  readonly display_name: string;
  readonly worker_id: string;
}

interface WorkerPayoutRow {
  readonly advance_request_id: string | null;
  readonly amount_minor: string;
  readonly country_code: 'TG';
  readonly created_by_operator_user_id: string;
  readonly currency_code: 'XOF';
  readonly note: string;
  readonly paid_at: Date;
  readonly payout_id: string;
  readonly payout_type: WorkerPayoutType;
  readonly period_month: string;
  readonly provider: 'manual' | 'mobile_money_http';
  readonly provider_reference: string | null;
  readonly status: WorkerPayoutStatus;
  readonly failure_reason: string | null;
  readonly worker_id: string;
  readonly worker_name: string;
}

interface WorkerOnboardingCaseRow {
  readonly applied_at: Date;
  readonly case_id: string;
  readonly country_code: 'TG';
  readonly display_name: string;
  readonly max_active_subscriptions: number;
  readonly phone_number: string;
  readonly service_neighborhoods: string[];
  readonly stage: WorkerOnboardingStage;
  readonly updated_at: Date;
  readonly worker_id: string;
}

interface WorkerOnboardingNoteRow {
  readonly created_at: Date;
  readonly note: string;
  readonly operator_user_id: string;
  readonly stage: WorkerOnboardingStage;
}

interface WorkerUnavailabilityRow {
  readonly created_at: Date;
  readonly reason: string;
  readonly unavailable_date: string;
  readonly unavailability_id: string;
  readonly worker_id: string;
}

interface WorkerRouteRow {
  readonly gps_latitude: string;
  readonly gps_longitude: string;
  readonly landmark: string;
  readonly neighborhood: string;
  readonly scheduled_date: string;
  readonly scheduled_time_window: 'afternoon' | 'morning';
  readonly status: 'cancelled' | 'completed' | 'disputed' | 'in_progress' | 'no_show' | 'scheduled';
  readonly subscriber_phone_number: string;
  readonly subscription_id: string;
  readonly visit_id: string;
}

interface SubscriptionDetailRow {
  readonly assigned_worker_average_rating: string | null;
  readonly assigned_worker_completed_visit_count: number;
  readonly assigned_worker_display_name: string | null;
  readonly assigned_worker_dispute_count: number;
  readonly assigned_worker_id: string | null;
  readonly country_code: 'TG';
  readonly gps_latitude: string;
  readonly gps_longitude: string;
  readonly landmark: string;
  readonly monthly_price_minor: string;
  readonly neighborhood: string;
  readonly phone_number: string;
  readonly preferred_day_of_week:
    | 'friday'
    | 'monday'
    | 'saturday'
    | 'sunday'
    | 'thursday'
    | 'tuesday'
    | 'wednesday';
  readonly preferred_time_window: 'afternoon' | 'morning';
  readonly status: SubscriptionStatus;
  readonly subscriber_id: string;
  readonly subscription_id: string;
  readonly tier_code: 'T1' | 'T2';
  readonly visits_per_cycle: 1 | 2;
}

interface WorkerSwapSubscriptionRow {
  readonly assigned_worker_display_name: string | null;
  readonly assigned_worker_id: string | null;
  readonly country_code: 'TG';
  readonly phone_number: string;
  readonly status: SubscriptionStatus;
  readonly subscriber_id: string;
}

interface WorkerSwapRequestRow {
  readonly country_code: 'TG';
  readonly current_worker_id: string;
  readonly current_worker_name: string | null;
  readonly reason: string;
  readonly replacement_worker_id: string | null;
  readonly replacement_worker_name: string | null;
  readonly requested_at: Date;
  readonly request_id: string;
  readonly resolved_at: Date | null;
  readonly resolved_by_operator_user_id: string | null;
  readonly resolution_note: string | null;
  readonly status: WorkerSwapRequestStatus;
  readonly subscriber_id: string;
  readonly subscriber_phone_number: string;
  readonly subscription_id: string;
}

interface WorkerSwapReplacementRow {
  readonly display_name: string;
  readonly worker_id: string;
}

interface SubscriptionUpcomingVisitRow {
  readonly scheduled_date: string;
  readonly scheduled_time_window: 'afternoon' | 'morning';
  readonly status: 'cancelled' | 'completed' | 'disputed' | 'in_progress' | 'no_show' | 'scheduled';
  readonly visit_id: string;
  readonly worker_id: string | null;
}

interface SubscriptionSupportCreditRow {
  readonly amount_minor: string;
  readonly created_at: Date;
  readonly credit_id: string;
  readonly currency_code: 'XOF';
  readonly reason: string;
}

async function selectSubscriptionDetail(
  client: PgClient,
  subscriptionId: string,
): Promise<SubscriptionDetailRow | undefined> {
  const result = await client.query<SubscriptionDetailRow>(
    `
      SELECT
        subscription.id AS subscription_id,
        subscription.subscriber_id,
        subscription.country_code,
        subscription.tier_code,
        subscription.status,
        subscription.visits_per_cycle,
        subscription.monthly_price_minor,
        subscription.preferred_day_of_week,
        subscription.preferred_time_window,
        subscriber.phone_number,
        address.neighborhood,
        address.landmark,
        address.gps_latitude,
        address.gps_longitude,
        worker.id AS assigned_worker_id,
        worker.display_name AS assigned_worker_display_name,
        (
          SELECT COUNT(*)::int
          FROM visits completed_visit
          WHERE completed_visit.worker_id = worker.id
            AND completed_visit.status = 'completed'
        ) AS assigned_worker_completed_visit_count,
        (
          SELECT AVG(rating.rating)::text
          FROM visit_ratings rating
          INNER JOIN visits rated_visit ON rated_visit.id = rating.visit_id
          WHERE rated_visit.worker_id = worker.id
        ) AS assigned_worker_average_rating,
        (
          SELECT COUNT(*)::int
          FROM support_disputes dispute
          INNER JOIN visits disputed_visit ON disputed_visit.id = dispute.visit_id
          WHERE disputed_visit.worker_id = worker.id
        ) AS assigned_worker_dispute_count
      FROM subscriptions subscription
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      LEFT JOIN workers worker ON worker.id = subscription.assigned_worker_id
      WHERE subscription.id = $1
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function selectSubscriptionUpcomingVisits(
  client: PgClient,
  subscriptionId: string,
): Promise<readonly SubscriptionUpcomingVisitRow[]> {
  const result = await client.query<SubscriptionUpcomingVisitRow>(
    `
      SELECT
        id AS visit_id,
        status,
        scheduled_date::text AS scheduled_date,
        scheduled_time_window,
        worker_id
      FROM visits
      WHERE subscription_id = $1
        AND status IN ('scheduled', 'in_progress')
      ORDER BY
        scheduled_date ASC,
        CASE scheduled_time_window
          WHEN 'morning' THEN 0
          WHEN 'afternoon' THEN 1
          ELSE 2
        END,
        id ASC
      LIMIT 4
    `,
    [subscriptionId],
  );

  return result.rows;
}

async function selectSubscriptionRecentVisits(
  client: PgClient,
  subscriptionId: string,
): Promise<readonly SubscriptionUpcomingVisitRow[]> {
  const result = await client.query<SubscriptionUpcomingVisitRow>(
    `
      SELECT
        id AS visit_id,
        status,
        scheduled_date::text AS scheduled_date,
        scheduled_time_window,
        worker_id
      FROM visits
      WHERE subscription_id = $1
        AND status IN ('cancelled', 'completed', 'disputed', 'no_show')
      ORDER BY
        scheduled_date DESC,
        CASE scheduled_time_window
          WHEN 'afternoon' THEN 0
          WHEN 'morning' THEN 1
          ELSE 2
        END,
        id ASC
      LIMIT 4
    `,
    [subscriptionId],
  );

  return result.rows;
}

async function selectSubscriptionSupportCredits(
  client: PgClient,
  subscriptionId: string,
): Promise<readonly SubscriptionSupportCreditRow[]> {
  const result = await client.query<SubscriptionSupportCreditRow>(
    `
      SELECT
        id AS credit_id,
        amount_minor,
        currency_code,
        reason,
        created_at
      FROM support_credits
      WHERE subscription_id = $1
      ORDER BY created_at DESC, id ASC
      LIMIT 10
    `,
    [subscriptionId],
  );

  return result.rows;
}

interface VisitLifecycleRow {
  readonly check_in_at: Date | null;
  readonly country_code: 'TG';
  readonly fallback_code: string | null;
  readonly gps_latitude: string;
  readonly gps_longitude: string;
  readonly status: 'cancelled' | 'completed' | 'disputed' | 'in_progress' | 'no_show' | 'scheduled';
  readonly worker_id: string;
}

interface VisitPhotoRow {
  readonly byte_size: number;
  readonly captured_at: Date;
  readonly content_type: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly country_code: 'TG';
  readonly object_key: string;
  readonly photo_id: string;
  readonly photo_type: 'after' | 'before';
  readonly uploaded_at: Date;
  readonly visit_id: string;
  readonly worker_id: string;
}

interface SubscriberVisitChangeRow {
  readonly country_code: 'TG';
  readonly scheduled_date: string;
  readonly scheduled_time_window: 'afternoon' | 'morning';
  readonly status: VisitStatus;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string;
}

interface DisputeVisitRow {
  readonly country_code: 'TG';
  readonly status: VisitStatus;
  readonly subscriber_phone_number: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string | null;
}

interface RatingVisitRow {
  readonly country_code: 'TG';
  readonly status: VisitStatus;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string | null;
}

interface WorkerIssueVisitRow {
  readonly country_code: 'TG';
  readonly gps_latitude: string;
  readonly gps_longitude: string;
  readonly landmark: string;
  readonly neighborhood: string;
  readonly scheduled_date: string;
  readonly scheduled_time_window: TimeWindow;
  readonly subscriber_phone_number: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string;
}

interface WorkerIssueRow {
  readonly country_code: 'TG';
  readonly created_at: Date;
  readonly description: string;
  readonly gps_latitude: string;
  readonly gps_longitude: string;
  readonly handled_by_operator_user_id: string | null;
  readonly issue_id: string;
  readonly issue_type: WorkerIssueReportRecord['issueType'];
  readonly landmark: string;
  readonly neighborhood: string;
  readonly resolution_note: string | null;
  readonly resolved_at: Date | null;
  readonly scheduled_date: string;
  readonly scheduled_time_window: TimeWindow;
  readonly status: WorkerIssueStatus;
  readonly subscriber_phone_number: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string;
}

interface DisputeRow {
  readonly credit_amount_minor?: string | null;
  readonly credit_currency_code?: 'XOF' | null;
  readonly credit_id?: string | null;
  readonly country_code: 'TG';
  readonly created_at: Date;
  readonly description: string;
  readonly dispute_id: string;
  readonly issue_type: 'damaged_item' | 'missing_item' | 'other' | 'worker_no_show';
  readonly opened_by_user_id: string;
  readonly resolution_note: string | null;
  readonly resolved_at: Date | null;
  readonly resolved_by_operator_user_id: string | null;
  readonly status: DisputeStatus;
  readonly subscriber_phone_number?: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string | null;
}

interface SubscriptionAssignmentRow {
  readonly country_code: 'TG';
  readonly neighborhood: string;
  readonly preferred_day_of_week:
    | 'friday'
    | 'monday'
    | 'saturday'
    | 'sunday'
    | 'thursday'
    | 'tuesday'
    | 'wednesday';
  readonly preferred_time_window: 'afternoon' | 'morning';
  readonly status: string;
}

interface SubscriptionCancellationRow {
  readonly country_code: 'TG';
  readonly status: SubscriptionStatus;
}

interface SubscriptionTierChangeRow {
  readonly country_code: 'TG';
  readonly status: SubscriptionStatus;
  readonly tier_code: 'T1' | 'T2';
}

interface AssignmentWorkerRow {
  readonly active_subscription_count: number;
  readonly display_name: string;
  readonly max_active_subscriptions: number;
  readonly service_neighborhoods: string[];
  readonly status: WorkerProfileRecord['status'];
}

interface AssignmentDecisionRow {
  readonly anchor_date: string;
  readonly country_code: AssignmentDecisionRecord['countryCode'];
  readonly created_at: Date;
  readonly decision: AssignmentDecisionRecord['decision'];
  readonly decision_id: string;
  readonly operator_user_id: string;
  readonly reason: AssignmentDecisionRecord['reason'];
  readonly subscription_id: string;
  readonly worker_id: string;
}

interface AuditEventRow {
  readonly actor_role: AuditEventRecord['actor']['role'];
  readonly actor_user_id: string | null;
  readonly aggregate_id: string;
  readonly aggregate_type: string;
  readonly country_code: AuditEventRecord['countryCode'];
  readonly event_id: string;
  readonly event_type: string;
  readonly occurred_at: Date;
  readonly payload: Record<string, unknown>;
  readonly recorded_at: Date;
  readonly trace_id: string;
}

interface NotificationMessageRow {
  readonly aggregate_id: string;
  readonly aggregate_type: string;
  readonly attempt_count: number;
  readonly available_at: Date;
  readonly channel: NotificationMessageRecord['channel'];
  readonly country_code: NotificationMessageRecord['countryCode'];
  readonly created_at: Date;
  readonly event_id: string;
  readonly failure_reason: string | null;
  readonly last_attempt_at: Date | null;
  readonly message_id: string;
  readonly payload: Record<string, unknown>;
  readonly provider: string | null;
  readonly provider_reference: string | null;
  readonly recipient_role: NotificationMessageRecord['recipientRole'];
  readonly recipient_user_id: string | null;
  readonly sent_at: Date | null;
  readonly status: NotificationMessageRecord['status'];
  readonly template_key: string;
}

interface PushDeviceRow {
  readonly app: PushDeviceRecord['app'];
  readonly country_code: PushDeviceRecord['countryCode'];
  readonly created_at: Date;
  readonly device_id: string;
  readonly environment: PushDeviceRecord['environment'];
  readonly last_registered_at: Date;
  readonly platform: PushDeviceRecord['platform'];
  readonly push_device_id: string;
  readonly role: PushDeviceRecord['role'];
  readonly status: PushDeviceRecord['status'];
  readonly token: string;
  readonly updated_at: Date;
  readonly user_id: string;
}

async function selectSubscriptionForAssignment(
  client: PgClient,
  subscriptionId: string,
): Promise<SubscriptionAssignmentRow | undefined> {
  const result = await client.query<SubscriptionAssignmentRow>(
    `
      SELECT
        subscription.country_code,
        address.neighborhood,
        subscription.preferred_day_of_week,
        subscription.preferred_time_window,
        subscription.status
      FROM subscriptions subscription
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      WHERE subscription.id = $1
      FOR UPDATE
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function selectWorkerForAssignment(
  client: PgClient,
  workerId: string,
): Promise<AssignmentWorkerRow | undefined> {
  const result = await client.query<AssignmentWorkerRow>(
    `
      SELECT
        worker.display_name,
        worker.status,
        worker.service_neighborhoods,
        worker.max_active_subscriptions,
        COUNT(active_subscription.id)::int AS active_subscription_count
      FROM workers worker
      LEFT JOIN subscriptions active_subscription
        ON active_subscription.assigned_worker_id = worker.id
        AND active_subscription.status = 'active'
      WHERE worker.id = $1
      GROUP BY
        worker.id,
        worker.display_name,
        worker.status,
        worker.service_neighborhoods,
        worker.max_active_subscriptions
    `,
    [workerId],
  );

  return result.rows[0];
}

async function selectWorkerProfile(
  client: PgClient,
  workerId: string,
): Promise<WorkerProfileRecord | undefined> {
  const result = await client.query<{
    readonly country_code: WorkerProfileRecord['countryCode'];
    readonly display_name: string;
    readonly max_active_subscriptions: number;
    readonly service_neighborhoods: readonly string[];
    readonly status: WorkerProfileRecord['status'];
    readonly worker_id: string;
  }>(
    `
      SELECT
        id AS worker_id,
        country_code,
        display_name,
        status,
        service_neighborhoods,
        max_active_subscriptions
      FROM workers
      WHERE id = $1
    `,
    [workerId],
  );
  const row = result.rows[0];

  return row === undefined
    ? undefined
    : {
        countryCode: row.country_code,
        displayName: row.display_name,
        maxActiveSubscriptions: row.max_active_subscriptions,
        serviceNeighborhoods: [...row.service_neighborhoods],
        status: row.status,
        workerId: row.worker_id,
      };
}

async function selectSubscriptionForCancellation(
  client: PgClient,
  subscriptionId: string,
): Promise<SubscriptionCancellationRow | undefined> {
  const result = await client.query<SubscriptionCancellationRow>(
    `
      SELECT
        country_code,
        status
      FROM subscriptions
      WHERE id = $1
      FOR UPDATE
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function selectSubscriptionForTierChange(
  client: PgClient,
  subscriptionId: string,
): Promise<SubscriptionTierChangeRow | undefined> {
  const result = await client.query<SubscriptionTierChangeRow>(
    `
      SELECT
        country_code,
        status,
        tier_code
      FROM subscriptions
      WHERE id = $1
      FOR UPDATE
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function selectOtpChallengeForVerification(
  client: PgClient,
  challengeId: string,
): Promise<OtpChallengeRow | undefined> {
  const result = await client.query<OtpChallengeRow>(
    `
      SELECT
        attempts,
        code_hash,
        consumed_at,
        country_code,
        expires_at,
        phone_number
      FROM auth_otp_challenges
      WHERE id = $1
      FOR UPDATE
    `,
    [challengeId],
  );

  return result.rows[0];
}

async function incrementOtpChallengeAttempts(client: PgClient, challengeId: string): Promise<void> {
  await client.query(
    `
      UPDATE auth_otp_challenges
      SET attempts = attempts + 1
      WHERE id = $1
    `,
    [challengeId],
  );
}

async function consumeOtpChallenge(client: PgClient, challengeId: string): Promise<void> {
  await client.query(
    `
      UPDATE auth_otp_challenges
      SET consumed_at = now()
      WHERE id = $1
    `,
    [challengeId],
  );
}

async function upsertAuthUser(
  client: PgClient,
  challenge: OtpChallengeRow,
  role: 'operator' | 'subscriber' | 'worker',
): Promise<AuthUserRow> {
  const result = await client.query<AuthUserRow>(
    `
      INSERT INTO auth_users (
        id,
        country_code,
        phone_number,
        role
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (country_code, phone_number) DO UPDATE
      SET updated_at = now()
      RETURNING
        id AS user_id,
        phone_number,
        role
    `,
    [randomUUID(), challenge.country_code, challenge.phone_number, role],
  );

  const user = result.rows[0];

  if (user === undefined) {
    throw new Error('Auth user could not be created.');
  }

  return user;
}

async function insertAuthSession(
  client: PgClient,
  user: AuthUserRow,
  deviceId: string,
): Promise<AuthSessionRecord> {
  const sessionId = randomUUID();
  const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const tokens = issueAuthTokens({
    phoneNumber: user.phone_number,
    role: user.role,
    sessionId,
    userId: user.user_id,
  });

  await client.query(
    `
      INSERT INTO auth_sessions (
        id,
        user_id,
        refresh_token_hash,
        device_id,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      sessionId,
      user.user_id,
      hashRefreshToken(tokens.refreshToken),
      deviceId,
      refreshTokenExpiresAt,
    ],
  );

  return {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshToken: tokens.refreshToken,
    refreshTokenExpiresAt,
    role: user.role,
    sessionId,
    userId: user.user_id,
  };
}

async function selectAuthSessionForRefresh(
  client: PgClient,
  refreshTokenHash: string,
): Promise<AuthRefreshSessionRow | undefined> {
  const result = await client.query<AuthRefreshSessionRow>(
    `
      SELECT
        session.device_id,
        session.expires_at AS session_expires_at,
        session.id AS session_id,
        session.revoked_at,
        auth_user.id AS user_id,
        auth_user.phone_number,
        auth_user.role
      FROM auth_sessions session
      INNER JOIN auth_users auth_user ON auth_user.id = session.user_id
      WHERE session.refresh_token_hash = $1
      FOR UPDATE
    `,
    [refreshTokenHash],
  );

  return result.rows[0];
}

async function revokeAuthSession(client: PgClient, sessionId: string): Promise<void> {
  await client.query(
    `
      UPDATE auth_sessions
      SET revoked_at = now()
      WHERE id = $1
    `,
    [sessionId],
  );
}

async function selectPaymentAttemptByIdempotencyKey(
  client: PgClient,
  idempotencyKey: string,
): Promise<PaymentAttemptRow | undefined> {
  const result = await client.query<PaymentAttemptRow>(
    `
      SELECT
        attempt.id AS payment_attempt_id,
        attempt.subscription_id,
        attempt.amount_minor,
        attempt.currency_code,
        attempt.status,
        attempt.provider,
        attempt.provider_reference,
        attempt.idempotency_key,
        attempt.charged_at,
        subscription.status AS subscription_status
      FROM payment_attempts attempt
      INNER JOIN subscriptions subscription ON subscription.id = attempt.subscription_id
      WHERE attempt.idempotency_key = $1
      FOR UPDATE
    `,
    [idempotencyKey],
  );

  return result.rows[0];
}

async function selectPaymentAttemptByProviderReference(
  client: PgClient,
  provider: string,
  providerReference: string,
): Promise<PaymentAttemptRow | undefined> {
  const result = await client.query<PaymentAttemptRow>(
    `
      SELECT
        attempt.id AS payment_attempt_id,
        attempt.subscription_id,
        attempt.amount_minor,
        attempt.currency_code,
        attempt.status,
        attempt.provider,
        attempt.provider_reference,
        attempt.idempotency_key,
        attempt.charged_at,
        subscription.status AS subscription_status
      FROM payment_attempts attempt
      INNER JOIN subscriptions subscription ON subscription.id = attempt.subscription_id
      WHERE attempt.provider = $1
        AND attempt.provider_reference = $2
      FOR UPDATE
    `,
    [provider, providerReference],
  );

  return result.rows[0];
}

async function selectPaymentAttemptById(
  client: PgClient,
  paymentAttemptId: string,
): Promise<PaymentAttemptSummaryRow | undefined> {
  const result = await client.query<PaymentAttemptSummaryRow>(
    `
      SELECT
        attempt.id AS payment_attempt_id,
        attempt.subscription_id,
        subscription.country_code,
        attempt.amount_minor,
        attempt.currency_code,
        attempt.status,
        attempt.provider,
        attempt.provider_reference,
        attempt.idempotency_key,
        attempt.charged_at,
        subscription.status AS subscription_status
      FROM payment_attempts attempt
      INNER JOIN subscriptions subscription ON subscription.id = attempt.subscription_id
      WHERE attempt.id = $1
      FOR UPDATE
    `,
    [paymentAttemptId],
  );

  return result.rows[0];
}

async function selectPaymentAttemptsForSubscription(
  client: PgClient,
  subscriptionId: string,
): Promise<readonly PaymentAttemptRow[]> {
  const result = await client.query<PaymentAttemptRow>(
    `
      SELECT
        attempt.id AS payment_attempt_id,
        attempt.subscription_id,
        attempt.amount_minor,
        attempt.currency_code,
        attempt.status,
        attempt.provider,
        attempt.provider_reference,
        attempt.idempotency_key,
        attempt.charged_at,
        subscription.status AS subscription_status
      FROM payment_attempts attempt
      INNER JOIN subscriptions subscription ON subscription.id = attempt.subscription_id
      WHERE attempt.subscription_id = $1
      ORDER BY attempt.charged_at DESC, attempt.id DESC
    `,
    [subscriptionId],
  );

  return result.rows;
}

async function selectPaymentRefundsForSubscription(
  client: PgClient,
  subscriptionId: string,
): Promise<readonly PaymentRefundBillingRow[]> {
  const result = await client.query<PaymentRefundBillingRow>(
    `
      SELECT
        refund.id AS refund_id,
        refund.payment_attempt_id,
        refund.subscription_id,
        refund.amount_minor,
        refund.currency_code,
        refund.status,
        refund.provider,
        refund.provider_reference,
        refund.reason,
        refund.issued_at
      FROM payment_refunds refund
      WHERE refund.subscription_id = $1
      ORDER BY refund.issued_at DESC, refund.id DESC
    `,
    [subscriptionId],
  );

  return result.rows;
}

async function selectPaymentRefundByPaymentAttemptId(
  client: PgClient,
  paymentAttemptId: string,
): Promise<PaymentRefundRow | undefined> {
  const result = await client.query<PaymentRefundRow>(
    `
      SELECT
        id AS refund_id,
        payment_attempt_id
      FROM payment_refunds
      WHERE payment_attempt_id = $1
      FOR UPDATE
    `,
    [paymentAttemptId],
  );

  return result.rows[0];
}

async function selectPaymentReconciliationRows(
  client: PgClient,
  input: RunPaymentReconciliationInput,
): Promise<readonly PaymentReconciliationRow[]> {
  const result = await client.query<PaymentReconciliationRow>(
    `
      SELECT
        attempt.id AS payment_attempt_id,
        attempt.subscription_id,
        subscription.country_code,
        attempt.amount_minor,
        attempt.currency_code,
        attempt.status,
        attempt.provider,
        attempt.provider_reference,
        attempt.idempotency_key,
        attempt.charged_at,
        subscription.status AS subscription_status,
        COALESCE(SUM(refund.amount_minor), 0)::text AS refunded_amount_minor
      FROM payment_attempts attempt
      INNER JOIN subscriptions subscription ON subscription.id = attempt.subscription_id
      LEFT JOIN payment_refunds refund ON refund.payment_attempt_id = attempt.id
      WHERE subscription.country_code = $1
        AND ($2::text IS NULL OR attempt.provider = $2)
      GROUP BY
        attempt.id,
        subscription.country_code,
        subscription.status
      ORDER BY attempt.charged_at DESC, attempt.id DESC
    `,
    [input.countryCode, input.provider ?? null],
  );

  return result.rows;
}

async function selectSubscriptionForPayment(
  client: PgClient,
  subscriptionId: string,
): Promise<PaymentSubscriptionRow | undefined> {
  const result = await client.query<PaymentSubscriptionRow>(
    `
      SELECT
        country_code,
        currency_code,
        monthly_price_minor,
        status
      FROM subscriptions
      WHERE id = $1
      FOR UPDATE
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function insertPaymentAttempt(
  client: PgClient,
  attempt: PaymentAttemptRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO payment_attempts (
        id,
        subscription_id,
        amount_minor,
        currency_code,
        status,
        provider,
        provider_reference,
        idempotency_key,
        charged_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      attempt.paymentAttemptId,
      attempt.subscriptionId,
      attempt.amount.amountMinor.toString(),
      attempt.amount.currencyCode,
      attempt.status,
      attempt.provider,
      attempt.providerReference,
      attempt.idempotencyKey,
      attempt.chargedAt,
    ],
  );
}

async function insertPaymentRefund(client: PgClient, refund: PaymentRefundRecord): Promise<void> {
  await client.query(
    `
      INSERT INTO payment_refunds (
        id,
        payment_attempt_id,
        subscription_id,
        country_code,
        amount_minor,
        currency_code,
        status,
        provider,
        provider_reference,
        reason,
        issued_by_operator_user_id,
        issued_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      refund.refundId,
      refund.paymentAttemptId,
      refund.subscriptionId,
      refund.countryCode,
      refund.amount.amountMinor.toString(),
      refund.amount.currencyCode,
      refund.status,
      refund.provider,
      refund.providerReference,
      refund.reason,
      refund.operatorUserId,
      refund.issuedAt,
    ],
  );
}

async function insertPaymentReconciliationRun(
  client: PgClient,
  run: PaymentReconciliationRunRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO payment_reconciliation_runs (
        id,
        country_code,
        provider,
        status,
        total_succeeded_attempts,
        total_failed_attempts,
        total_collected_minor,
        total_refunded_minor,
        currency_code,
        issue_count,
        issues,
        checked_by_operator_user_id,
        checked_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
    `,
    [
      run.reconciliationRunId,
      run.countryCode,
      run.provider,
      run.status,
      run.totalSucceededAttempts,
      run.totalFailedAttempts,
      run.totalCollected.amountMinor.toString(),
      run.totalRefunded.amountMinor.toString(),
      run.totalCollected.currencyCode,
      run.issues.length,
      JSON.stringify(run.issues.map(toPaymentReconciliationIssueJson)),
      run.operatorUserId,
      run.checkedAt,
    ],
  );
}

function toPaymentReconciliationIssueJson(
  issue: PaymentReconciliationRunRecord['issues'][number],
): Record<string, unknown> {
  return {
    amount: {
      amountMinor: issue.amount.amountMinor.toString(),
      currencyCode: issue.amount.currencyCode,
    },
    issueType: issue.issueType,
    paymentAttemptId: issue.paymentAttemptId,
    refundedAmount: {
      amountMinor: issue.refundedAmount.amountMinor.toString(),
      currencyCode: issue.refundedAmount.currencyCode,
    },
    severity: issue.severity,
    subscriptionId: issue.subscriptionId,
  };
}

async function updateSubscriptionPaymentStatus(
  client: PgClient,
  subscriptionId: string,
  status: SubscriptionStatus,
): Promise<void> {
  await client.query(
    `
      UPDATE subscriptions
      SET status = $1, updated_at = now()
      WHERE id = $2
    `,
    [status, subscriptionId],
  );
}

async function selectSubscriptionForWorkerSwapRequest(
  client: PgClient,
  subscriptionId: string,
): Promise<WorkerSwapSubscriptionRow | undefined> {
  const result = await client.query<WorkerSwapSubscriptionRow>(
    `
      SELECT
        subscription.country_code,
        subscription.status,
        subscription.subscriber_id,
        subscription.assigned_worker_id,
        subscriber.phone_number,
        worker.display_name AS assigned_worker_display_name
      FROM subscriptions subscription
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      LEFT JOIN workers worker ON worker.id = subscription.assigned_worker_id
      WHERE subscription.id = $1
      FOR UPDATE OF subscription
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function countWorkerSwapRequestsSince(
  client: PgClient,
  subscriptionId: string,
  since: Date,
): Promise<number> {
  const result = await client.query<{ readonly request_count: string }>(
    `
      SELECT COUNT(*)::int AS request_count
      FROM worker_swap_requests
      WHERE subscription_id = $1
        AND requested_at >= $2
    `,
    [subscriptionId, since],
  );

  return Number(result.rows[0]?.request_count ?? 0);
}

async function selectWorkerForAdvanceRequest(
  client: PgClient,
  workerId: string,
): Promise<WorkerAdvanceRequestWorkerRow | undefined> {
  const result = await client.query<WorkerAdvanceRequestWorkerRow>(
    `
      SELECT id AS worker_id, country_code, display_name
      FROM workers
      WHERE id = $1
        AND status = 'active'
      FOR UPDATE
    `,
    [workerId],
  );

  return result.rows[0];
}

async function selectWorkerForPayout(
  client: PgClient,
  workerId: string,
): Promise<WorkerAdvanceRequestWorkerRow | undefined> {
  const result = await client.query<WorkerAdvanceRequestWorkerRow>(
    `
      SELECT id AS worker_id, country_code, display_name
      FROM workers
      WHERE id = $1
        AND status = 'active'
      FOR UPDATE
    `,
    [workerId],
  );

  return result.rows[0];
}

async function countWorkerAdvanceRequestsForMonth(
  client: PgClient,
  workerId: string,
  month: string,
): Promise<number> {
  const result = await client.query<{ readonly request_count: string }>(
    `
      SELECT COUNT(*)::int AS request_count
      FROM worker_advance_requests
      WHERE worker_id = $1
        AND month = $2
    `,
    [workerId, month],
  );

  return Number(result.rows[0]?.request_count ?? 0);
}

async function insertWorkerAdvanceRequest(
  client: PgClient,
  record: WorkerAdvanceRequestRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_advance_requests (
        id,
        worker_id,
        country_code,
        month,
        amount_minor,
        currency_code,
        status,
        reason,
        requested_at,
        resolved_at,
        resolved_by_operator_user_id,
        resolution_note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      record.requestId,
      record.workerId,
      record.countryCode,
      record.month,
      record.amount.amountMinor.toString(),
      record.amount.currencyCode,
      record.status,
      record.reason,
      record.requestedAt,
      record.resolvedAt,
      record.resolvedByOperatorUserId,
      record.resolutionNote,
    ],
  );
}

async function selectWorkerAdvanceRequests(
  client: PgClient,
  input: ListWorkerAdvanceRequestsInput,
): Promise<readonly WorkerAdvanceRequestRow[]> {
  const result = await client.query<WorkerAdvanceRequestRow>(
    `
      SELECT
        request.id AS request_id,
        request.worker_id,
        request.country_code,
        request.month,
        request.amount_minor::text AS amount_minor,
        request.currency_code,
        request.status,
        request.reason,
        request.requested_at,
        request.resolved_at,
        request.resolved_by_operator_user_id,
        request.resolution_note,
        worker.display_name AS worker_name
      FROM worker_advance_requests request
      INNER JOIN workers worker ON worker.id = request.worker_id
      WHERE ($1::text IS NULL OR request.status = $1)
        AND ($2::uuid IS NULL OR request.worker_id = $2)
        AND ($3::text IS NULL OR request.month = $3)
      ORDER BY request.requested_at DESC, request.id ASC
      LIMIT $4
    `,
    [input.status ?? null, input.workerId ?? null, input.month ?? null, input.limit],
  );

  return result.rows;
}

async function selectWorkerAdvanceRequestForResolution(
  client: PgClient,
  requestId: string,
): Promise<WorkerAdvanceRequestRow | undefined> {
  const result = await client.query<WorkerAdvanceRequestRow>(
    `
      SELECT
        request.id AS request_id,
        request.worker_id,
        request.country_code,
        request.month,
        request.amount_minor::text AS amount_minor,
        request.currency_code,
        request.status,
        request.reason,
        request.requested_at,
        request.resolved_at,
        request.resolved_by_operator_user_id,
        request.resolution_note,
        worker.display_name AS worker_name
      FROM worker_advance_requests request
      INNER JOIN workers worker ON worker.id = request.worker_id
      WHERE request.id = $1
      FOR UPDATE OF request
    `,
    [requestId],
  );

  return result.rows[0];
}

async function updateWorkerAdvanceRequestResolution(
  client: PgClient,
  input: ResolveWorkerAdvanceRequestInput,
): Promise<void> {
  await client.query(
    `
      UPDATE worker_advance_requests
      SET
        status = $1,
        resolved_by_operator_user_id = $2,
        resolution_note = $3,
        resolved_at = $4,
        updated_at = now()
      WHERE id = $5
    `,
    [
      input.resolution,
      input.operatorUserId,
      input.resolutionNote,
      input.resolvedAt,
      input.requestId,
    ],
  );
}

async function hasOpenWorkerSwapRequest(
  client: PgClient,
  subscriptionId: string,
): Promise<boolean> {
  const result = await client.query<{ readonly exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM worker_swap_requests
        WHERE subscription_id = $1
          AND status = 'open'
      )
    `,
    [subscriptionId],
  );

  return result.rows[0]?.exists ?? false;
}

async function insertWorkerSwapRequest(
  client: PgClient,
  record: WorkerSwapRequestRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_swap_requests (
        id,
        subscription_id,
        subscriber_id,
        country_code,
        current_worker_id,
        replacement_worker_id,
        status,
        reason,
        resolved_by_operator_user_id,
        resolution_note,
        requested_at,
        resolved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      record.requestId,
      record.subscriptionId,
      record.subscriberId,
      record.countryCode,
      record.currentWorkerId,
      record.replacementWorkerId,
      record.status,
      record.reason,
      record.resolvedByOperatorUserId,
      record.resolutionNote,
      record.requestedAt,
      record.resolvedAt,
    ],
  );
}

async function selectWorkerSwapRequests(
  client: PgClient,
  input: ListWorkerSwapRequestsInput,
): Promise<readonly WorkerSwapRequestRow[]> {
  const result = await client.query<WorkerSwapRequestRow>(
    `
      SELECT
        request.id AS request_id,
        request.subscription_id,
        request.subscriber_id,
        request.country_code,
        request.current_worker_id,
        request.replacement_worker_id,
        request.status,
        request.reason,
        request.resolved_by_operator_user_id,
        request.resolution_note,
        request.requested_at,
        request.resolved_at,
        subscriber.phone_number AS subscriber_phone_number,
        current_worker.display_name AS current_worker_name,
        replacement_worker.display_name AS replacement_worker_name
      FROM worker_swap_requests request
      INNER JOIN subscribers subscriber ON subscriber.id = request.subscriber_id
      INNER JOIN workers current_worker ON current_worker.id = request.current_worker_id
      LEFT JOIN workers replacement_worker ON replacement_worker.id = request.replacement_worker_id
      WHERE ($1::text IS NULL OR request.status = $1)
      ORDER BY request.requested_at DESC, request.id ASC
      LIMIT $2
    `,
    [input.status ?? null, input.limit],
  );

  return result.rows;
}

async function selectWorkerSwapRequestForResolution(
  client: PgClient,
  requestId: string,
): Promise<WorkerSwapRequestRow | undefined> {
  const result = await client.query<WorkerSwapRequestRow>(
    `
      SELECT
        request.id AS request_id,
        request.subscription_id,
        request.subscriber_id,
        request.country_code,
        request.current_worker_id,
        request.replacement_worker_id,
        request.status,
        request.reason,
        request.resolved_by_operator_user_id,
        request.resolution_note,
        request.requested_at,
        request.resolved_at,
        subscriber.phone_number AS subscriber_phone_number,
        current_worker.display_name AS current_worker_name,
        replacement_worker.display_name AS replacement_worker_name
      FROM worker_swap_requests request
      INNER JOIN subscribers subscriber ON subscriber.id = request.subscriber_id
      INNER JOIN workers current_worker ON current_worker.id = request.current_worker_id
      LEFT JOIN workers replacement_worker ON replacement_worker.id = request.replacement_worker_id
      WHERE request.id = $1
      FOR UPDATE OF request
    `,
    [requestId],
  );

  return result.rows[0];
}

async function insertWorkerPayout(client: PgClient, record: WorkerPayoutRecord): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_payouts (
        id,
        worker_id,
        country_code,
        payout_type,
        period_month,
        amount_minor,
        currency_code,
        status,
        provider,
        provider_reference,
        failure_reason,
        note,
        paid_at,
        created_by_operator_user_id,
        advance_request_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `,
    [
      record.payoutId,
      record.workerId,
      record.countryCode,
      record.payoutType,
      record.periodMonth,
      record.amount.amountMinor.toString(),
      record.amount.currencyCode,
      record.status,
      record.provider,
      record.providerReference,
      record.failureReason,
      record.note,
      record.paidAt,
      record.createdByOperatorUserId,
      record.advanceRequestId,
    ],
  );
}

async function selectWorkerPayouts(
  client: PgClient,
  input: ListWorkerPayoutsInput,
): Promise<readonly WorkerPayoutRow[]> {
  const result = await client.query<WorkerPayoutRow>(
    `
      SELECT
        payout.id AS payout_id,
        payout.worker_id,
        payout.country_code,
        payout.payout_type,
        payout.period_month,
        payout.amount_minor::text AS amount_minor,
        payout.currency_code,
        payout.status,
        payout.provider,
        payout.provider_reference,
        payout.failure_reason,
        payout.note,
        payout.paid_at,
        payout.created_by_operator_user_id,
        payout.advance_request_id,
        worker.display_name AS worker_name
      FROM worker_payouts payout
      INNER JOIN workers worker ON worker.id = payout.worker_id
      WHERE ($1::uuid IS NULL OR payout.worker_id = $1)
        AND ($2::text IS NULL OR payout.period_month = $2)
      ORDER BY payout.paid_at DESC, payout.id ASC
      LIMIT $3
    `,
    [input.workerId ?? null, input.month ?? null, input.limit],
  );

  return result.rows;
}

async function upsertWorkerForOnboarding(
  client: PgClient,
  input: CreateWorkerOnboardingCaseInput,
): Promise<void> {
  await client.query(
    `
      INSERT INTO workers (
        id,
        country_code,
        display_name,
        status,
        service_neighborhoods,
        max_active_subscriptions
      )
      VALUES ($1, $2, $3, 'applicant', $4, $5)
      ON CONFLICT (id) DO UPDATE
      SET
        country_code = excluded.country_code,
        display_name = excluded.display_name,
        status = 'applicant',
        service_neighborhoods = excluded.service_neighborhoods,
        max_active_subscriptions = excluded.max_active_subscriptions,
        updated_at = now()
    `,
    [
      input.workerId,
      input.countryCode,
      input.displayName,
      input.serviceNeighborhoods,
      input.maxActiveSubscriptions,
    ],
  );
}

async function insertWorkerOnboardingCase(
  client: PgClient,
  record: WorkerOnboardingCaseRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_onboarding_cases (
        id,
        worker_id,
        country_code,
        phone_number,
        stage,
        applied_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      record.caseId,
      record.workerId,
      record.countryCode,
      record.phoneNumber,
      record.stage,
      record.appliedAt,
      record.updatedAt,
    ],
  );
}

async function insertWorkerOnboardingNotes(
  client: PgClient,
  caseId: string,
  notes: readonly WorkerOnboardingNoteRecord[],
): Promise<void> {
  for (const note of notes) {
    await client.query(
      `
        INSERT INTO worker_onboarding_notes (
          id,
          case_id,
          stage,
          note,
          operator_user_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [randomUUID(), caseId, note.stage, note.note, note.operatorUserId, note.createdAt],
    );
  }
}

async function selectWorkerOnboardingCases(
  client: PgClient,
  input: ListWorkerOnboardingCasesInput,
): Promise<readonly WorkerOnboardingCaseRow[]> {
  const result = await client.query<WorkerOnboardingCaseRow>(
    `
      SELECT
        onboarding.id AS case_id,
        onboarding.worker_id,
        onboarding.country_code,
        onboarding.phone_number,
        onboarding.stage,
        onboarding.applied_at,
        onboarding.updated_at,
        worker.display_name,
        worker.service_neighborhoods,
        worker.max_active_subscriptions
      FROM worker_onboarding_cases onboarding
      INNER JOIN workers worker ON worker.id = onboarding.worker_id
      WHERE ($1::text IS NULL OR onboarding.stage = $1)
      ORDER BY onboarding.updated_at DESC, onboarding.id ASC
      LIMIT $2
    `,
    [input.stage ?? null, input.limit],
  );

  return result.rows;
}

async function selectWorkerOnboardingCaseForUpdate(
  client: PgClient,
  caseId: string,
): Promise<WorkerOnboardingCaseRow | undefined> {
  const result = await client.query<WorkerOnboardingCaseRow>(
    `
      SELECT
        onboarding.id AS case_id,
        onboarding.worker_id,
        onboarding.country_code,
        onboarding.phone_number,
        onboarding.stage,
        onboarding.applied_at,
        onboarding.updated_at,
        worker.display_name,
        worker.service_neighborhoods,
        worker.max_active_subscriptions
      FROM worker_onboarding_cases onboarding
      INNER JOIN workers worker ON worker.id = onboarding.worker_id
      WHERE onboarding.id = $1
      FOR UPDATE OF onboarding
    `,
    [caseId],
  );

  return result.rows[0];
}

async function selectWorkerOnboardingNotes(
  client: PgClient,
  caseId: string,
): Promise<readonly WorkerOnboardingNoteRow[]> {
  const result = await client.query<WorkerOnboardingNoteRow>(
    `
      SELECT stage, note, operator_user_id, created_at
      FROM worker_onboarding_notes
      WHERE case_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [caseId],
  );

  return result.rows;
}

async function updateWorkerOnboardingCaseStage(
  client: PgClient,
  record: WorkerOnboardingCaseRecord,
): Promise<void> {
  await client.query(
    `
      UPDATE worker_onboarding_cases
      SET stage = $1, updated_at = $2
      WHERE id = $3
    `,
    [record.stage, record.updatedAt, record.caseId],
  );
}

async function updateWorkerStatus(
  client: PgClient,
  workerId: string,
  status: WorkerProfileRecord['status'],
): Promise<void> {
  await client.query(
    `
      UPDATE workers
      SET status = $1, updated_at = now()
      WHERE id = $2
    `,
    [status, workerId],
  );
}

async function workerExists(client: PgClient, workerId: string): Promise<boolean> {
  const result = await client.query<{ readonly exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM workers
        WHERE id = $1
      )
    `,
    [workerId],
  );

  return result.rows[0]?.exists ?? false;
}

async function isWorkerUnavailableOnDate(
  client: PgClient,
  workerId: string,
  date: string,
): Promise<boolean> {
  const result = await client.query<{ readonly exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM worker_unavailability
        WHERE worker_id = $1
          AND unavailable_date = $2
      )
    `,
    [workerId, date],
  );

  return result.rows[0]?.exists ?? false;
}

async function insertWorkerUnavailability(
  client: PgClient,
  record: WorkerUnavailabilityRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_unavailability (
        id,
        worker_id,
        unavailable_date,
        reason,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [record.unavailabilityId, record.workerId, record.date, record.reason, record.createdAt],
  );
}

async function selectWorkerUnavailability(
  client: PgClient,
  input: ListWorkerUnavailabilityInput,
): Promise<readonly WorkerUnavailabilityRow[]> {
  const result = await client.query<WorkerUnavailabilityRow>(
    `
      SELECT
        id AS unavailability_id,
        worker_id,
        unavailable_date::text AS unavailable_date,
        reason,
        created_at
      FROM worker_unavailability
      WHERE worker_id = $1
        AND ($2::date IS NULL OR unavailable_date >= $2)
        AND ($3::date IS NULL OR unavailable_date <= $3)
      ORDER BY unavailable_date ASC, created_at ASC
      LIMIT $4
    `,
    [input.workerId, input.dateFrom ?? null, input.dateTo ?? null, input.limit],
  );

  return result.rows;
}

async function selectWorkerForSwapReplacement(
  client: PgClient,
  workerId: string,
): Promise<WorkerSwapReplacementRow | undefined> {
  const result = await client.query<WorkerSwapReplacementRow>(
    `
      SELECT id AS worker_id, display_name
      FROM workers
      WHERE id = $1
        AND status = 'active'
    `,
    [workerId],
  );

  return result.rows[0];
}

async function updateWorkerSwapRequestResolution(
  client: PgClient,
  input: ResolveWorkerSwapRequestInput,
): Promise<void> {
  await client.query(
    `
      UPDATE worker_swap_requests
      SET
        status = $1,
        replacement_worker_id = $2,
        resolved_by_operator_user_id = $3,
        resolution_note = $4,
        resolved_at = $5,
        updated_at = now()
      WHERE id = $6
    `,
    [
      input.resolution,
      input.replacementWorkerId ?? null,
      input.operatorUserId,
      input.resolutionNote,
      input.resolvedAt,
      input.requestId,
    ],
  );
}

async function updateSubscriptionWorkerSwap(
  client: PgClient,
  subscriptionId: string,
  replacementWorkerId: string,
): Promise<void> {
  await client.query(
    `
      UPDATE subscriptions
      SET
        assigned_worker_id = $1,
        assigned_at = now(),
        updated_at = now()
      WHERE id = $2
    `,
    [replacementWorkerId, subscriptionId],
  );
}

async function updateScheduledVisitsWorkerSwap(
  client: PgClient,
  subscriptionId: string,
  replacementWorkerId: string,
): Promise<void> {
  await client.query(
    `
      UPDATE visits
      SET
        worker_id = $1,
        updated_at = now()
      WHERE subscription_id = $2
        AND status = 'scheduled'
    `,
    [replacementWorkerId, subscriptionId],
  );
}

async function updateSubscriptionCancellationStatus(
  client: PgClient,
  subscriptionId: string,
  status: 'cancelled',
): Promise<void> {
  await client.query(
    `
      UPDATE subscriptions
      SET status = $1, updated_at = now()
      WHERE id = $2
    `,
    [status, subscriptionId],
  );
}

async function updateSubscriptionTier(
  client: PgClient,
  record: ChangedSubscriptionTierRecord,
): Promise<void> {
  await client.query(
    `
      UPDATE subscriptions
      SET
        tier_code = $1,
        visits_per_cycle = $2,
        monthly_price_minor = $3,
        updated_at = now()
      WHERE id = $4
    `,
    [
      record.tierCode,
      record.visitsPerCycle,
      record.monthlyPriceMinor.toString(),
      record.subscriptionId,
    ],
  );
}

async function cancelScheduledSubscriptionVisits(
  client: PgClient,
  subscriptionId: string,
): Promise<number> {
  const result = await client.query(
    `
      UPDATE visits
      SET status = 'cancelled', updated_at = now()
      WHERE subscription_id = $1
        AND status = 'scheduled'
    `,
    [subscriptionId],
  );

  return result.rowCount ?? 0;
}

function mapPaymentAttemptRow(row: PaymentAttemptRow): PaymentAttemptRecord {
  return {
    amount: money(BigInt(row.amount_minor), row.currency_code),
    chargedAt: row.charged_at,
    events: [],
    idempotencyKey: row.idempotency_key,
    paymentAttemptId: row.payment_attempt_id,
    provider: row.provider,
    providerReference: row.provider_reference,
    status: row.status,
    subscriptionId: row.subscription_id,
    subscriptionStatus: row.subscription_status,
  };
}

async function selectSubscriptionForCandidates(
  client: PgClient,
  subscriptionId: string,
): Promise<CandidateSubscriptionRow | undefined> {
  const result = await client.query<CandidateSubscriptionRow>(
    `
      SELECT
        subscription.country_code,
        address.neighborhood
      FROM subscriptions subscription
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      WHERE subscription.id = $1
        AND subscription.status IN ('active', 'pending_match')
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function selectVisitForLifecycle(
  client: PgClient,
  visitId: string,
): Promise<VisitLifecycleRow | undefined> {
  const result = await client.query<VisitLifecycleRow>(
    `
      SELECT
        visit.check_in_at,
        visit.country_code,
        visit.fallback_code,
        address.gps_latitude,
        address.gps_longitude,
        visit.status,
        visit.worker_id
      FROM visits visit
      INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      WHERE visit.id = $1
      FOR UPDATE OF visit
    `,
    [visitId],
  );

  return result.rows[0];
}

async function selectVisitForSubscriberChange(
  client: PgClient,
  subscriptionId: string,
  visitId: string,
): Promise<SubscriberVisitChangeRow | undefined> {
  const result = await client.query<SubscriberVisitChangeRow>(
    `
      SELECT
        id AS visit_id,
        subscription_id,
        country_code,
        status,
        worker_id,
        scheduled_date::text AS scheduled_date,
        scheduled_time_window
      FROM visits
      WHERE id = $1
        AND subscription_id = $2
      FOR UPDATE
    `,
    [visitId, subscriptionId],
  );

  return result.rows[0];
}

async function selectVisitForOperatorStatusUpdate(
  client: PgClient,
  visitId: string,
): Promise<SubscriberVisitChangeRow | undefined> {
  const result = await client.query<SubscriberVisitChangeRow>(
    `
      SELECT
        id AS visit_id,
        subscription_id,
        country_code,
        status,
        worker_id,
        scheduled_date::text AS scheduled_date,
        scheduled_time_window
      FROM visits
      WHERE id = $1
      FOR UPDATE
    `,
    [visitId],
  );

  return result.rows[0];
}

async function selectVisitForDispute(
  client: PgClient,
  subscriptionId: string,
  visitId: string,
): Promise<DisputeVisitRow | undefined> {
  const result = await client.query<DisputeVisitRow>(
    `
      SELECT
        visit.id AS visit_id,
        visit.subscription_id,
        visit.country_code,
        visit.status,
        visit.worker_id,
        subscriber.phone_number AS subscriber_phone_number
      FROM visits visit
      INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      WHERE visit.id = $1
        AND visit.subscription_id = $2
      FOR UPDATE
    `,
    [visitId, subscriptionId],
  );

  return result.rows[0];
}

async function selectVisitForRating(
  client: PgClient,
  subscriptionId: string,
  visitId: string,
): Promise<RatingVisitRow | undefined> {
  const result = await client.query<RatingVisitRow>(
    `
      SELECT
        id AS visit_id,
        subscription_id,
        country_code,
        status,
        worker_id
      FROM visits
      WHERE id = $1
        AND subscription_id = $2
      FOR UPDATE
    `,
    [visitId, subscriptionId],
  );

  return result.rows[0];
}

async function selectVisitForWorkerIssue(
  client: PgClient,
  visitId: string,
): Promise<WorkerIssueVisitRow | undefined> {
  const result = await client.query<WorkerIssueVisitRow>(
    `
      SELECT
        visit.id AS visit_id,
        visit.subscription_id,
        visit.country_code,
        visit.worker_id,
        visit.scheduled_date::text AS scheduled_date,
        visit.scheduled_time_window,
        subscriber.phone_number AS subscriber_phone_number,
        address.gps_latitude,
        address.gps_longitude,
        address.landmark,
        address.neighborhood
      FROM visits visit
      INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      WHERE visit.id = $1
      FOR UPDATE OF visit
    `,
    [visitId],
  );

  return result.rows[0];
}

async function insertWorkerIssueReport(
  client: PgClient,
  record: WorkerIssueReportRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_issue_reports (
        id,
        visit_id,
        subscription_id,
        worker_id,
        country_code,
        issue_type,
        status,
        description,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      record.issueId,
      record.visitId,
      record.subscriptionId,
      record.workerId,
      record.countryCode,
      record.issueType,
      record.status,
      record.description,
      record.createdAt,
    ],
  );
}

async function selectWorkerIssues(
  client: PgClient,
  input: ListWorkerIssuesInput,
): Promise<readonly WorkerIssueRow[]> {
  const result = await client.query<WorkerIssueRow>(
    `
      SELECT
        issue.id AS issue_id,
        issue.visit_id,
        issue.subscription_id,
        issue.worker_id,
        issue.country_code,
        issue.issue_type,
        issue.status,
        issue.description,
        issue.created_at,
        issue.resolved_at,
        issue.handled_by_operator_user_id,
        issue.resolution_note,
        visit.scheduled_date::text AS scheduled_date,
        visit.scheduled_time_window,
        subscriber.phone_number AS subscriber_phone_number,
        address.gps_latitude,
        address.gps_longitude,
        address.landmark,
        address.neighborhood
      FROM worker_issue_reports issue
      INNER JOIN visits visit ON visit.id = issue.visit_id
      INNER JOIN subscriptions subscription ON subscription.id = issue.subscription_id
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      WHERE ($1::text IS NULL OR issue.status = $1)
      ORDER BY issue.created_at DESC, issue.id ASC
      LIMIT $2
    `,
    [input.status ?? null, input.limit],
  );

  return result.rows;
}

async function selectWorkerIssueForResolution(
  client: PgClient,
  issueId: string,
): Promise<WorkerIssueRow | undefined> {
  const result = await client.query<WorkerIssueRow>(
    `
      SELECT
        issue.id AS issue_id,
        issue.visit_id,
        issue.subscription_id,
        issue.worker_id,
        issue.country_code,
        issue.issue_type,
        issue.status,
        issue.description,
        issue.created_at,
        issue.resolved_at,
        issue.handled_by_operator_user_id,
        issue.resolution_note,
        visit.scheduled_date::text AS scheduled_date,
        visit.scheduled_time_window,
        subscriber.phone_number AS subscriber_phone_number,
        address.gps_latitude,
        address.gps_longitude,
        address.landmark,
        address.neighborhood
      FROM worker_issue_reports issue
      INNER JOIN visits visit ON visit.id = issue.visit_id
      INNER JOIN subscriptions subscription ON subscription.id = issue.subscription_id
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      WHERE issue.id = $1
      FOR UPDATE OF issue
    `,
    [issueId],
  );

  return result.rows[0];
}

async function updateWorkerIssueResolution(
  client: PgClient,
  input: ResolveWorkerIssueInput,
): Promise<void> {
  await client.query(
    `
      UPDATE worker_issue_reports
      SET
        status = $1,
        handled_by_operator_user_id = $2,
        resolution_note = $3,
        resolved_at = $4,
        updated_at = now()
      WHERE id = $5
    `,
    [
      input.status,
      input.operatorUserId,
      input.resolutionNote,
      input.status === 'resolved' ? input.resolvedAt : null,
      input.issueId,
    ],
  );
}

async function insertVisitRating(client: PgClient, record: VisitRatingRecord): Promise<void> {
  await client.query(
    `
      INSERT INTO visit_ratings (
        id,
        subscription_id,
        visit_id,
        country_code,
        rating,
        comment,
        rated_by_user_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      record.ratingId,
      record.subscriptionId,
      record.visitId,
      record.countryCode,
      record.rating,
      record.comment,
      record.ratedByUserId,
      record.createdAt,
    ],
  );
}

async function insertSupportCredit(
  client: PgClient,
  record: SupportCreditRecord,
  countryCode: string,
): Promise<void> {
  await client.query(
    `
      INSERT INTO support_credits (
        id,
        dispute_id,
        subscription_id,
        country_code,
        amount_minor,
        currency_code,
        reason,
        issued_by_operator_user_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      record.creditId,
      record.disputeId,
      record.subscriptionId,
      countryCode,
      record.amount.amountMinor.toString(),
      record.amount.currencyCode,
      record.reason,
      record.issuedByOperatorUserId,
      record.createdAt,
    ],
  );
}

async function insertSupportDispute(client: PgClient, record: DisputeRecord): Promise<void> {
  await client.query(
    `
      INSERT INTO support_disputes (
        id,
        subscription_id,
        visit_id,
        country_code,
        issue_type,
        status,
        description,
        opened_by_user_id,
        resolved_by_operator_user_id,
        resolution_note,
        created_at,
        resolved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      record.disputeId,
      record.subscriptionId,
      record.visitId,
      record.countryCode,
      record.issueType,
      record.status,
      record.description,
      record.openedByUserId,
      record.resolvedByOperatorUserId,
      record.resolutionNote,
      record.createdAt,
      record.resolvedAt,
    ],
  );
}

async function selectOperatorDisputes(
  client: PgClient,
  input: ListOperatorDisputesInput,
): Promise<readonly DisputeRow[]> {
  const result = await client.query<DisputeRow>(
    `
      SELECT
        dispute.id AS dispute_id,
        dispute.subscription_id,
        dispute.visit_id,
        dispute.country_code,
        dispute.issue_type,
        dispute.status,
        dispute.description,
        dispute.opened_by_user_id,
        dispute.resolved_by_operator_user_id,
        dispute.resolution_note,
        dispute.created_at,
        dispute.resolved_at,
        credit.id AS credit_id,
        credit.amount_minor AS credit_amount_minor,
        credit.currency_code AS credit_currency_code,
        subscriber.phone_number AS subscriber_phone_number,
        visit.worker_id
      FROM support_disputes dispute
      INNER JOIN subscriptions subscription ON subscription.id = dispute.subscription_id
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      INNER JOIN visits visit ON visit.id = dispute.visit_id
      LEFT JOIN support_credits credit ON credit.dispute_id = dispute.id
      WHERE ($1::text IS NULL OR dispute.status = $1)
        AND ($2::uuid IS NULL OR dispute.subscription_id = $2)
      ORDER BY dispute.created_at DESC, dispute.id ASC
      LIMIT $3
    `,
    [input.status ?? null, input.subscriptionId ?? null, input.limit],
  );

  return result.rows;
}

async function selectDisputeForResolution(
  client: PgClient,
  disputeId: string,
): Promise<DisputeRow | undefined> {
  const result = await client.query<DisputeRow>(
    `
      SELECT
        dispute.id AS dispute_id,
        dispute.subscription_id,
        dispute.visit_id,
        dispute.country_code,
        dispute.issue_type,
        dispute.status,
        dispute.description,
        dispute.opened_by_user_id,
        dispute.resolved_by_operator_user_id,
        dispute.resolution_note,
        dispute.created_at,
        dispute.resolved_at,
        credit.id AS credit_id,
        credit.amount_minor AS credit_amount_minor,
        credit.currency_code AS credit_currency_code,
        subscriber.phone_number AS subscriber_phone_number,
        visit.worker_id
      FROM support_disputes dispute
      INNER JOIN subscriptions subscription ON subscription.id = dispute.subscription_id
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      INNER JOIN visits visit ON visit.id = dispute.visit_id
      LEFT JOIN support_credits credit ON credit.dispute_id = dispute.id
      WHERE dispute.id = $1
      FOR UPDATE OF dispute
    `,
    [disputeId],
  );

  return result.rows[0];
}

async function updateSupportDisputeResolution(
  client: PgClient,
  input: ResolveDisputeInput,
): Promise<void> {
  await client.query(
    `
      UPDATE support_disputes
      SET
        status = $1,
        resolved_by_operator_user_id = $2,
        resolution_note = $3,
        resolved_at = $4,
        updated_at = now()
      WHERE id = $5
    `,
    [
      input.resolution,
      input.operatorUserId,
      input.resolutionNote,
      input.resolvedAt,
      input.disputeId,
    ],
  );
}

function mapDisputeRow(row: DisputeRow): DisputeRecord {
  const record: DisputeRecord = {
    countryCode: row.country_code,
    createdAt: row.created_at,
    description: row.description,
    disputeId: row.dispute_id,
    events: [],
    issueType: row.issue_type,
    openedByUserId: row.opened_by_user_id,
    resolvedAt: row.resolved_at,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    resolutionNote: row.resolution_note,
    status: row.status,
    subscriberCredit:
      row.credit_amount_minor === undefined ||
      row.credit_amount_minor === null ||
      row.credit_currency_code === undefined ||
      row.credit_currency_code === null
        ? null
        : money(BigInt(row.credit_amount_minor), row.credit_currency_code),
    subscriberCreditId: row.credit_id ?? null,
    subscriptionId: row.subscription_id,
    visitId: row.visit_id,
    workerId: row.worker_id,
  };

  return row.subscriber_phone_number === undefined
    ? record
    : { ...record, subscriberPhoneNumber: row.subscriber_phone_number };
}

function mapWorkerIssueRow(row: WorkerIssueRow): WorkerIssueReportRecord {
  return {
    address: {
      gpsLatitude: Number(row.gps_latitude),
      gpsLongitude: Number(row.gps_longitude),
      landmark: row.landmark,
      neighborhood: row.neighborhood,
    },
    countryCode: row.country_code,
    createdAt: row.created_at,
    description: row.description,
    events: [],
    handledByOperatorUserId: row.handled_by_operator_user_id,
    issueId: row.issue_id,
    issueType: row.issue_type,
    resolutionNote: row.resolution_note,
    resolvedAt: row.resolved_at,
    scheduledDate: row.scheduled_date,
    scheduledTimeWindow: row.scheduled_time_window,
    status: row.status,
    subscriberPhoneNumber: row.subscriber_phone_number,
    subscriptionId: row.subscription_id,
    visitId: row.visit_id,
    workerId: row.worker_id,
  };
}

function mapWorkerAdvanceRequestRow(row: WorkerAdvanceRequestRow): WorkerAdvanceRequestRecord {
  return {
    amount: money(BigInt(row.amount_minor), row.currency_code),
    countryCode: row.country_code,
    events: [],
    month: row.month,
    reason: row.reason,
    requestedAt: row.requested_at,
    requestId: row.request_id,
    resolvedAt: row.resolved_at,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    resolutionNote: row.resolution_note,
    status: row.status,
    workerId: row.worker_id,
    workerName: row.worker_name,
  };
}

function mapWorkerPayoutRow(row: WorkerPayoutRow): WorkerPayoutRecord {
  return {
    advanceRequestId: row.advance_request_id,
    amount: money(BigInt(row.amount_minor), row.currency_code),
    countryCode: row.country_code,
    createdByOperatorUserId: row.created_by_operator_user_id,
    events: [],
    failureReason: row.failure_reason,
    note: row.note,
    paidAt: row.paid_at,
    payoutId: row.payout_id,
    payoutType: row.payout_type,
    periodMonth: row.period_month,
    provider: row.provider,
    providerReference: row.provider_reference,
    status: row.status,
    workerId: row.worker_id,
    workerName: row.worker_name,
  };
}

async function mapWorkerOnboardingCaseRow(
  client: PgClient,
  row: WorkerOnboardingCaseRow,
): Promise<WorkerOnboardingCaseRecord> {
  const notes = await selectWorkerOnboardingNotes(client, row.case_id);

  return {
    appliedAt: row.applied_at,
    caseId: row.case_id,
    countryCode: row.country_code,
    displayName: row.display_name,
    events: [],
    maxActiveSubscriptions: row.max_active_subscriptions,
    notes: notes.map((note) => ({
      createdAt: note.created_at,
      note: note.note,
      operatorUserId: note.operator_user_id,
      stage: note.stage,
    })),
    phoneNumber: row.phone_number,
    serviceNeighborhoods: row.service_neighborhoods,
    stage: row.stage,
    updatedAt: row.updated_at,
    workerId: row.worker_id,
  };
}

function mapWorkerUnavailabilityRow(row: WorkerUnavailabilityRow): WorkerUnavailabilityRecord {
  return {
    createdAt: row.created_at,
    date: row.unavailable_date,
    events: [],
    reason: row.reason,
    unavailabilityId: row.unavailability_id,
    workerId: row.worker_id,
  };
}

function mapWorkerSwapRequestRow(row: WorkerSwapRequestRow): WorkerSwapRequestRecord {
  const record: WorkerSwapRequestRecord = {
    countryCode: row.country_code,
    currentWorkerId: row.current_worker_id,
    events: [],
    reason: row.reason,
    replacementWorkerId: row.replacement_worker_id,
    requestedAt: row.requested_at,
    requestId: row.request_id,
    resolvedAt: row.resolved_at,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    resolutionNote: row.resolution_note,
    status: row.status,
    subscriberId: row.subscriber_id,
    subscriptionId: row.subscription_id,
  };

  return {
    ...record,
    ...(row.current_worker_name === null ? {} : { currentWorkerName: row.current_worker_name }),
    ...(row.replacement_worker_name === null
      ? {}
      : { replacementWorkerName: row.replacement_worker_name }),
    subscriberPhoneNumber: row.subscriber_phone_number,
  };
}

async function updateVisitCheckIn(
  client: PgClient,
  input: CheckInVisitInput,
  fallbackCode: string | null,
): Promise<void> {
  await client.query(
    `
      UPDATE visits
      SET
        check_in_at = $1,
        check_in_latitude = $2,
        check_in_longitude = $3,
        check_in_verification_method = $4,
        status = 'in_progress',
        updated_at = now()
      WHERE id = $5
    `,
    [
      input.checkedInAt,
      input.location.latitude,
      input.location.longitude,
      visitVerificationMethod(input.fallbackCode, fallbackCode),
      input.visitId,
    ],
  );
}

async function updateVisitCheckOut(
  client: PgClient,
  input: CheckOutVisitInput,
  fallbackCode: string | null,
): Promise<void> {
  await client.query(
    `
      UPDATE visits
      SET
        check_out_at = $1,
        check_out_latitude = $2,
        check_out_longitude = $3,
        check_out_verification_method = $4,
        completed_at = $1,
        status = 'completed',
        updated_at = now()
      WHERE id = $5
    `,
    [
      input.checkedOutAt,
      input.location.latitude,
      input.location.longitude,
      visitVerificationMethod(input.fallbackCode, fallbackCode),
      input.visitId,
    ],
  );
}

async function upsertVisitPhoto(
  client: PgClient,
  input: UploadVisitPhotoInput,
  countryCode: 'TG',
): Promise<Omit<VisitPhotoRecord, 'events'>> {
  const result = await client.query<VisitPhotoRow>(
    `
      INSERT INTO visit_photos (
        id,
        visit_id,
        worker_id,
        country_code,
        photo_type,
        object_key,
        content_type,
        byte_size,
        captured_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (visit_id, photo_type)
      DO UPDATE SET
        worker_id = EXCLUDED.worker_id,
        object_key = EXCLUDED.object_key,
        content_type = EXCLUDED.content_type,
        byte_size = EXCLUDED.byte_size,
        captured_at = EXCLUDED.captured_at,
        uploaded_at = now()
      RETURNING
        id AS photo_id,
        visit_id,
        worker_id,
        country_code,
        photo_type,
        object_key,
        content_type,
        byte_size,
        captured_at,
        uploaded_at
    `,
    [
      randomUUID(),
      input.visitId,
      input.workerId,
      countryCode,
      input.photoType,
      input.objectKey,
      input.contentType,
      input.byteSize,
      input.capturedAt,
    ],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error('Visit photo was not persisted.');
  }

  return toVisitPhotoRecord(row);
}

async function updateVisitSchedule(client: PgClient, input: RescheduleVisitInput): Promise<void> {
  await client.query(
    `
      UPDATE visits
      SET
        scheduled_date = $1,
        scheduled_time_window = $2,
        updated_at = now()
      WHERE id = $3
    `,
    [input.scheduledDate, input.scheduledTimeWindow, input.visitId],
  );
}

async function updateVisitStatus(
  client: PgClient,
  visitId: string,
  status: VisitStatus,
): Promise<void> {
  await client.query(
    `
      UPDATE visits
      SET
        status = $1,
        updated_at = now()
      WHERE id = $2
    `,
    [status, visitId],
  );
}

async function insertWorkerCompletedVisitBonus(
  client: PgClient,
  countryCode: string,
  input: CheckOutVisitInput,
  sourceEventId: string,
): Promise<void> {
  const bonus = completedVisitBonus();

  await client.query(
    `
      INSERT INTO worker_earning_ledger (
        id,
        worker_id,
        visit_id,
        country_code,
        amount_minor,
        currency_code,
        reason,
        source_event_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'completed_visit_bonus', $7)
    `,
    [
      randomUUID(),
      input.workerId,
      input.visitId,
      countryCode,
      bonus.amountMinor.toString(),
      bonus.currencyCode,
      sourceEventId,
    ],
  );
}

function assertVisitWorker(actualWorkerId: string, requestedWorkerId: string): void {
  if (actualWorkerId !== requestedWorkerId) {
    throw new Error('Visit is not assigned to this worker.');
  }
}

function assertSubscriptionCanChangeTier(status: SubscriptionStatus): void {
  if (status === 'cancelled') {
    throw new Error('Cancelled subscriptions cannot change tier.');
  }
}

function assertWorkerAdvanceAmountAllowed(amountMinor: bigint): void {
  const maxAdvanceAmountMinor = calculateWorkerMonthlyCompensation(0).floor.amountMinor / 2n;

  if (amountMinor < 1n) {
    throw new Error('Worker advance amount must be greater than zero.');
  }

  if (amountMinor > maxAdvanceAmountMinor) {
    throw new Error('Worker advance cannot exceed 50% of the monthly floor.');
  }
}

async function assertVisitPhotosReady(client: PgClient, visitId: string): Promise<void> {
  const result = await client.query<{ photo_type: 'after' | 'before' }>(
    `
      SELECT photo_type
      FROM visit_photos
      WHERE visit_id = $1
        AND photo_type IN ('before', 'after')
    `,
    [visitId],
  );
  const photoTypes = new Set(result.rows.map((row) => row.photo_type));

  if (!photoTypes.has('before') || !photoTypes.has('after')) {
    throw new Error('Visit requires before and after photos before checkout.');
  }
}

function assertVisitLocationVerified(input: {
  readonly fallbackCode: string | undefined;
  readonly location: VisitLocationInput;
  readonly target: VisitLocationInput;
  readonly visitFallbackCode?: string | null;
}): void {
  if (distanceMeters(input.location, input.target) <= 100) {
    return;
  }

  if (
    input.fallbackCode !== undefined &&
    input.visitFallbackCode !== undefined &&
    input.visitFallbackCode !== null &&
    input.fallbackCode === input.visitFallbackCode
  ) {
    return;
  }

  throw new Error('Visit location is outside the 100m check-in radius.');
}

function visitVerificationMethod(
  fallbackCode: string | undefined,
  visitFallbackCode: string | null,
): 'fallback_code' | 'gps' {
  return fallbackCode !== undefined &&
    visitFallbackCode !== null &&
    fallbackCode === visitFallbackCode
    ? 'fallback_code'
    : 'gps';
}

function distanceMeters(left: VisitLocationInput, right: VisitLocationInput): number {
  const earthRadiusMeters = 6_371_000;
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function durationMinutes(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toVisitPhotoRecord(row: VisitPhotoRow): Omit<VisitPhotoRecord, 'events'> {
  return {
    byteSize: row.byte_size,
    capturedAt: row.captured_at,
    contentType: row.content_type,
    countryCode: row.country_code,
    objectKey: row.object_key,
    photoId: row.photo_id,
    photoType: row.photo_type,
    uploadedAt: row.uploaded_at,
    visitId: row.visit_id,
    workerId: row.worker_id,
  };
}

function getUtcMonthRange(month: string): { endExclusive: Date; startInclusive: Date } {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  return {
    endExclusive: new Date(Date.UTC(year, monthIndex + 1, 1)),
    startInclusive: new Date(Date.UTC(year, monthIndex, 1)),
  };
}

function getUtcQuarterStart(value: Date): Date {
  const quarterStartMonth = Math.floor(value.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(value.getUTCFullYear(), quarterStartMonth, 1));
}

function nextPaymentSubscriptionStatus(
  currentStatus: SubscriptionStatus,
  outcome: 'failed' | 'succeeded',
): SubscriptionStatus {
  if (outcome === 'succeeded') {
    return currentStatus === 'payment_overdue'
      ? transitionSubscription(currentStatus, 'payment_recovered')
      : currentStatus;
  }

  return currentStatus === 'active'
    ? transitionSubscription(currentStatus, 'payment_failed')
    : currentStatus;
}

function buildPaymentAttemptRecord(input: {
  readonly actor: DomainEvent['actor'];
  readonly amount: ReturnType<typeof money>;
  readonly charge: {
    readonly provider: string;
    readonly providerReference: string;
    readonly status: 'failed' | 'succeeded';
  };
  readonly chargedAt: Date;
  readonly countryCode: 'TG';
  readonly idempotencyKey: string;
  readonly subscriptionId: string;
  readonly subscriptionStatus: SubscriptionStatus;
  readonly traceId: string;
}): PaymentAttemptRecord {
  const paymentAttemptId = randomUUID();
  const eventType =
    input.charge.status === 'succeeded'
      ? 'SubscriptionPaymentSucceeded'
      : 'SubscriptionPaymentFailed';
  const event = createDomainEvent({
    actor: input.actor,
    aggregateId: input.subscriptionId,
    aggregateType: 'subscription',
    countryCode: input.countryCode,
    eventType,
    payload: {
      amountMinor: input.amount.amountMinor.toString(),
      currencyCode: input.amount.currencyCode,
      idempotencyKey: input.idempotencyKey,
      paymentAttemptId,
      provider: input.charge.provider,
      providerReference: input.charge.providerReference,
      status: input.charge.status,
      subscriptionStatus: input.subscriptionStatus,
    },
    traceId: input.traceId,
  });

  return {
    amount: input.amount,
    chargedAt: input.chargedAt,
    events: [event],
    idempotencyKey: input.idempotencyKey,
    paymentAttemptId,
    provider: input.charge.provider,
    providerReference: input.charge.providerReference,
    status: input.charge.status,
    subscriptionId: input.subscriptionId,
    subscriptionStatus: input.subscriptionStatus,
  };
}

function toMatchingCandidate(
  worker: WorkerProfileRecord,
  activeSubscriptionCount: number,
): MatchingCandidateRecord {
  const capacityRemaining = worker.maxActiveSubscriptions - activeSubscriptionCount;
  const score = 100 + capacityRemaining * 5 - activeSubscriptionCount * 10;

  return {
    activeSubscriptionCount,
    capacityRemaining,
    displayName: worker.displayName,
    maxActiveSubscriptions: worker.maxActiveSubscriptions,
    score,
    scoreReasons: ['service_neighborhood_match', 'capacity_available'],
    serviceNeighborhoods: worker.serviceNeighborhoods,
    workerId: worker.workerId,
  };
}

function assertWorkerCanTakeAssignment(input: {
  readonly activeSubscriptionCount: number;
  readonly subscriptionNeighborhood: string;
  readonly worker: WorkerProfileRecord;
}): void {
  if (input.worker.status !== 'active') {
    throw new Error('Worker is not active for assignment.');
  }

  const subscriptionNeighborhood = normalizeNeighborhood(input.subscriptionNeighborhood);
  const servesNeighborhood = input.worker.serviceNeighborhoods.some(
    (neighborhood) => normalizeNeighborhood(neighborhood) === subscriptionNeighborhood,
  );

  if (!servesNeighborhood) {
    throw new Error('Worker does not serve the subscription service cell.');
  }

  if (input.activeSubscriptionCount >= input.worker.maxActiveSubscriptions) {
    throw new Error('Worker has no remaining assignment capacity.');
  }
}

function assignmentRejectionReason(
  error: unknown,
): 'capacity_exhausted' | 'service_cell_mismatch' | 'worker_not_active' | 'worker_unavailable' {
  if (!(error instanceof Error)) {
    return 'worker_unavailable';
  }

  if (error.message === 'Worker is not active for assignment.') {
    return 'worker_not_active';
  }

  if (error.message === 'Worker does not serve the subscription service cell.') {
    return 'service_cell_mismatch';
  }

  if (error.message === 'Worker has no remaining assignment capacity.') {
    return 'capacity_exhausted';
  }

  return 'worker_unavailable';
}

function compareMatchingCandidates(
  left: MatchingCandidateRecord,
  right: MatchingCandidateRecord,
): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.activeSubscriptionCount !== right.activeSubscriptionCount) {
    return left.activeSubscriptionCount - right.activeSubscriptionCount;
  }

  return left.displayName.localeCompare(right.displayName, 'fr');
}

function normalizeNeighborhood(value: string): string {
  return value.trim().toLocaleLowerCase('fr');
}

function toServiceCellCapacityRecord(row: ServiceCellCapacityRow): ServiceCellCapacityRecord {
  const capacityRemaining = Math.max(0, row.total_capacity - row.active_subscriptions);
  const utilizationPercent =
    row.total_capacity === 0
      ? 0
      : Math.round((row.active_subscriptions / row.total_capacity) * 100);

  return {
    activeSubscriptions: row.active_subscriptions,
    activeWorkers: row.active_workers,
    capacityRemaining,
    completedVisits: row.completed_visits,
    inProgressVisits: row.in_progress_visits,
    scheduledVisits: row.scheduled_visits,
    serviceCell: row.service_cell,
    totalCapacity: row.total_capacity,
    utilizationPercent,
  };
}

async function upsertWorkerPlaceholder(
  client: PgClient,
  countryCode: string,
  workerId: string,
): Promise<void> {
  await client.query(
    `
      INSERT INTO workers (id, country_code, display_name, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [workerId, countryCode, `Worker ${workerId.slice(0, 8)}`],
  );
}

async function updateSubscriptionAssignment(
  client: PgClient,
  input: AssignWorkerInput,
): Promise<void> {
  await client.query(
    `
      UPDATE subscriptions
      SET
        assigned_worker_id = $1,
        assigned_at = now(),
        status = 'active',
        updated_at = now()
      WHERE id = $2
    `,
    [input.workerId, input.subscriptionId],
  );
}

async function insertAssignmentDecision(
  client: PgClient,
  countryCode: AssignmentDecisionRecord['countryCode'],
  input: AssignWorkerInput | DeclineAssignmentCandidateInput,
  decision: {
    readonly decision: AssignmentDecisionRecord['decision'];
    readonly reason: AssignmentDecisionRecord['reason'];
  },
): Promise<AssignmentDecisionRecord> {
  const decisionId = randomUUID();
  const result = await client.query<AssignmentDecisionRow>(
    `
      INSERT INTO assignment_decisions (
        id,
        subscription_id,
        worker_id,
        operator_user_id,
        country_code,
        decision,
        anchor_date,
        reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id AS decision_id,
        subscription_id,
        worker_id,
        operator_user_id,
        country_code,
        decision,
        anchor_date::text AS anchor_date,
        reason,
        created_at
    `,
    [
      decisionId,
      input.subscriptionId,
      input.workerId,
      input.operatorUserId,
      countryCode,
      decision.decision,
      input.anchorDate,
      decision.reason,
    ],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error('Assignment decision was not recorded.');
  }

  const event = createAssignmentDecisionRecordedEvent({
    anchorDate: row.anchor_date,
    countryCode: row.country_code,
    createdAt: row.created_at,
    decision: row.decision,
    decisionId: row.decision_id,
    operatorUserId: row.operator_user_id,
    reason: row.reason,
    subscriptionId: row.subscription_id,
    traceId: input.traceId,
    workerId: row.worker_id,
  });

  return {
    anchorDate: row.anchor_date,
    countryCode: row.country_code,
    createdAt: row.created_at,
    decision: row.decision,
    decisionId: row.decision_id,
    events: [event],
    operatorUserId: row.operator_user_id,
    reason: row.reason,
    subscriptionId: row.subscription_id,
    workerId: row.worker_id,
  };
}

function createAssignmentDecisionRecordedEvent(input: {
  readonly anchorDate: string;
  readonly countryCode: AssignmentDecisionRecord['countryCode'];
  readonly createdAt: Date;
  readonly decision: AssignmentDecisionRecord['decision'];
  readonly decisionId: string;
  readonly operatorUserId: string;
  readonly reason: AssignmentDecisionRecord['reason'];
  readonly subscriptionId: string;
  readonly traceId: string;
  readonly workerId: string;
}): DomainEvent {
  return createDomainEvent({
    actor: { role: 'operator', userId: input.operatorUserId },
    aggregateId: input.decisionId,
    aggregateType: 'assignment_decision',
    countryCode: input.countryCode,
    eventType: 'AssignmentDecisionRecorded',
    occurredAt: input.createdAt,
    payload: {
      anchorDate: input.anchorDate,
      decision: input.decision,
      decisionId: input.decisionId,
      operatorUserId: input.operatorUserId,
      reason: input.reason,
      subscriptionId: input.subscriptionId,
      workerId: input.workerId,
    },
    traceId: input.traceId,
  });
}

async function insertVisits(
  client: PgClient,
  countryCode: string,
  subscriptionId: string,
  assignment: AssignedSubscriptionRecord,
): Promise<void> {
  for (const visit of assignment.visits) {
    await client.query(
      `
        INSERT INTO visits (
          id,
          subscription_id,
          country_code,
          status,
          scheduled_date,
          scheduled_time_window,
          worker_id,
          fallback_code
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        visit.visitId,
        subscriptionId,
        countryCode,
        visit.status,
        visit.scheduledDate,
        visit.scheduledTimeWindow,
        visit.workerId,
        visit.fallbackCode,
      ],
    );
  }
}

async function insertSubscriber(
  client: PgClient,
  input: CreateSubscriptionInput,
  record: CreatedSubscriptionRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO subscribers (id, country_code, locale, phone_number)
      VALUES ($1, $2, $3, $4)
    `,
    [record.subscriberId, record.countryCode, 'fr', input.phoneNumber],
  );
}

async function insertSubscriberAddress(
  client: PgClient,
  input: CreateSubscriptionInput,
  record: CreatedSubscriptionRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO subscriber_addresses (
        id,
        subscriber_id,
        country_code,
        neighborhood,
        landmark,
        gps_latitude,
        gps_longitude
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      record.addressId,
      record.subscriberId,
      record.countryCode,
      input.address.neighborhood,
      input.address.landmark,
      input.address.gpsLatitude,
      input.address.gpsLongitude,
    ],
  );
}

async function insertSubscription(
  client: PgClient,
  input: CreateSubscriptionInput,
  record: CreatedSubscriptionRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO subscriptions (
        id,
        subscriber_id,
        address_id,
        country_code,
        currency_code,
        tier_code,
        status,
        visits_per_cycle,
        monthly_price_minor,
        preferred_day_of_week,
        preferred_time_window
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      record.subscriptionId,
      record.subscriberId,
      record.addressId,
      record.countryCode,
      record.currencyCode,
      record.tierCode,
      record.status,
      record.visitsPerCycle,
      record.monthlyPriceMinor.toString(),
      input.schedulePreference.dayOfWeek,
      input.schedulePreference.timeWindow,
    ],
  );
}

async function insertOutboxEvents(client: PgClient, events: readonly DomainEvent[]): Promise<void> {
  for (const event of events) {
    assertCoreDomainEventContract(event);

    await client.query(
      `
        INSERT INTO audit_events (
          id,
          country_code,
          aggregate_type,
          aggregate_id,
          event_type,
          payload,
          actor_role,
          actor_user_id,
          trace_id,
          occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
      `,
      [
        event.eventId,
        event.countryCode,
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event.payload),
        event.actor.role,
        event.actor.userId,
        event.traceId,
        event.occurredAt,
      ],
    );
  }

  for (const event of events) {
    const messages = buildNotificationMessagesForEvent(event);

    for (const message of messages) {
      await insertNotificationMessage(client, message);
    }
  }

  for (const event of events) {
    await client.query(
      `
        INSERT INTO outbox_events (
          id,
          country_code,
          aggregate_type,
          aggregate_id,
          event_type,
          payload,
          actor_role,
          actor_user_id,
          trace_id,
          occurred_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
      `,
      [
        event.eventId,
        event.countryCode,
        event.aggregateType,
        event.aggregateId,
        event.eventType,
        JSON.stringify(event.payload),
        event.actor.role,
        event.actor.userId,
        event.traceId,
        event.occurredAt,
      ],
    );
  }
}

async function insertNotificationMessage(
  client: PgClient,
  message: NotificationMessageRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO notification_messages (
        id,
        country_code,
        channel,
        template_key,
        recipient_role,
        recipient_user_id,
        aggregate_type,
        aggregate_id,
        event_id,
        payload,
        status,
        provider,
        provider_reference,
        attempt_count,
        available_at,
        created_at,
        last_attempt_at,
        sent_at,
        failure_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `,
    [
      message.messageId,
      message.countryCode,
      message.channel,
      message.templateKey,
      message.recipientRole,
      message.recipientUserId,
      message.aggregateType,
      message.aggregateId,
      message.eventId,
      JSON.stringify(message.payload),
      message.status,
      message.provider,
      message.providerReference,
      message.attemptCount,
      message.availableAt,
      message.createdAt,
      message.lastAttemptAt,
      message.sentAt,
      message.failureReason,
    ],
  );
}

async function updateNotificationDelivery(
  client: PgClient,
  message: NotificationMessageRecord,
): Promise<NotificationMessageRecord> {
  const result = await client.query<NotificationMessageRow>(
    `
      UPDATE notification_messages
      SET
        status = $1,
        provider = $2,
        provider_reference = $3,
        attempt_count = $4,
        last_attempt_at = $5,
        sent_at = $6,
        failure_reason = $7,
        available_at = $8
      WHERE id = $9
      RETURNING
        id AS message_id,
        country_code,
        channel,
        template_key,
        recipient_role,
        recipient_user_id,
        aggregate_type,
        aggregate_id,
        event_id,
        payload,
        status,
        provider,
        provider_reference,
        attempt_count,
        available_at,
        created_at,
        last_attempt_at,
        sent_at,
        failure_reason
    `,
    [
      message.status,
      message.provider,
      message.providerReference,
      message.attemptCount,
      message.lastAttemptAt,
      message.sentAt,
      message.failureReason,
      message.availableAt,
      message.messageId,
    ],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error('Notification message was not found.');
  }

  return mapNotificationMessageRow(row);
}

async function selectPushTokensForNotificationMessage(
  client: PgClient,
  message: NotificationMessageRecord,
): Promise<readonly string[]> {
  if (message.channel !== 'push') {
    return [];
  }

  if (message.recipientUserId !== null) {
    const result = await client.query<{ readonly token: string }>(
      `
        SELECT token
        FROM push_device_tokens
        WHERE country_code = $1
          AND user_id = $2
          AND role = $3
          AND status = 'active'
        ORDER BY last_registered_at DESC, id ASC
        LIMIT 10
      `,
      [message.countryCode, message.recipientUserId, message.recipientRole],
    );

    return result.rows.map((row) => row.token);
  }

  if (message.recipientRole !== 'subscriber' || message.aggregateType !== 'subscription') {
    return [];
  }

  const result = await client.query<{ readonly token: string }>(
    `
      SELECT push_device.token
      FROM subscriptions subscription
      INNER JOIN subscribers subscriber
        ON subscriber.id = subscription.subscriber_id
      INNER JOIN auth_users auth_user
        ON auth_user.country_code = subscriber.country_code
        AND auth_user.phone_number = subscriber.phone_number
        AND auth_user.role = $3
      INNER JOIN push_device_tokens push_device
        ON push_device.user_id = auth_user.id
      WHERE subscription.id = $1
        AND push_device.country_code = $2
        AND push_device.role = $3
        AND push_device.status = 'active'
      ORDER BY push_device.last_registered_at DESC, push_device.id ASC
      LIMIT 10
    `,
    [message.aggregateId, message.countryCode, message.recipientRole],
  );

  return result.rows.map((row) => row.token);
}

function mapNotificationMessageRow(row: NotificationMessageRow): NotificationMessageRecord {
  return {
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    channel: row.channel,
    countryCode: row.country_code,
    createdAt: row.created_at,
    eventId: row.event_id,
    failureReason: row.failure_reason,
    lastAttemptAt: row.last_attempt_at,
    messageId: row.message_id,
    payload: row.payload,
    provider: row.provider,
    providerReference: row.provider_reference,
    recipientRole: row.recipient_role,
    recipientUserId: row.recipient_user_id,
    sentAt: row.sent_at,
    status: row.status,
    templateKey: row.template_key,
  };
}

function mapPushDeviceRow(row: PushDeviceRow): PushDeviceRecord {
  return {
    app: row.app,
    countryCode: row.country_code,
    createdAt: row.created_at,
    deviceId: row.device_id,
    environment: row.environment,
    lastRegisteredAt: row.last_registered_at,
    platform: row.platform,
    pushDeviceId: row.push_device_id,
    role: row.role,
    status: row.status,
    token: row.token,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}
