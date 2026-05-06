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
import {
  createDomainEvent,
  money,
  type CountryCode,
  type DomainEvent,
  type Money,
} from '@washed/shared';

import { hashOtpCode, hashRefreshToken, safeHashEqual } from './auth-crypto.js';
import { createDataProtectorFromEnv, type DataProtector } from './data-protection.js';
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
  CreateSubscriberAddressChangeRequestInput,
  CreateSubscriberPrivacyRequestInput,
  CreateSupportContactMessageInput,
  CreateWorkerUnavailabilityInput,
  CreateSubscriptionInput,
  CreateWorkerSwapRequestInput,
  CreateDisputeInput,
  CreateSupportContactInput,
  DisputeRecord,
  DisputeStatus,
  GetSupportContactInput,
  GetCurrentSubscriberSubscriptionInput,
  ListSupportContactsInput,
  GetSubscriberNotificationPreferencesInput,
  ResolveSupportContactInput,
  SubscriberAddressChangeRequestRecord,
  SubscriberNotificationPreferencesRecord,
  SubscriberVisitDetailRecord,
  SupportContactCategory,
  SupportContactMessageRecord,
  SupportContactRecord,
  SupportContactStatus,
  GetWorkerMonthlyEarningsInput,
  GetSubscriberProfileInput,
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
  PausedSubscriptionRecord,
  PauseSubscriptionInput,
  SubscriberPrivacyRequestRecord,
  SubscriptionPaymentMethod,
  SubscriptionBillingItemRecord,
  SubscriberSupportMatchRecord,
  NotificationMessageRecord,
  OperatorVisitStatusRecord,
  PushDeviceRecord,
  RateVisitInput,
  RefreshAuthSessionInput,
  RegisterPushDeviceInput,
  ReportWorkerIssueInput,
  RequestFirstVisitInput,
  ResumedSubscriptionRecord,
  ResumeSubscriptionInput,
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
  SubscriberProfileRecord,
  SupportCreditRecord,
  UploadVisitPhotoInput,
  UpdateOperatorVisitStatusInput,
  UpsertSubscriberProfileInput,
  UpdateSubscriberNotificationPreferencesInput,
  UpdateSubscriptionPaymentMethodInput,
  UpdatedSubscriptionPaymentMethodRecord,
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
  buildPausedSubscriptionRecord,
  buildResumedSubscriptionRecord,
  buildAdvancedWorkerOnboardingCaseRecord,
  buildCreatedDisputeRecord,
  buildCreatedSupportContactRecord,
  buildSubscriberAddressChangeRequestRecord,
  buildSubscriberNotificationPreferencesRecord,
  buildSupportContactMessageRecord,
  buildResolvedSupportContactRecord,
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
  buildSubscriberPrivacyRequestRecord,
  buildUpdatedSubscriptionPaymentMethodRecord,
} from './repository.js';
import {
  setPgLocalCountryCode,
  withPgTransaction,
  type PgClient,
  type PgPoolLike,
} from './postgres-client.js';
import { buildAssignedSubscriptionRecord } from './subscription-assignment.js';
import { buildCreatedSubscriptionRecord } from './subscription-record.js';

export class PostgresCoreRepository implements CoreRepository {
  public constructor(
    private readonly pool: PgPoolLike,
    private readonly otpProvider: OtpProvider = createOtpProvider(),
    private readonly paymentProvider: PaymentProvider = createPaymentProvider(),
    private readonly dataProtector: DataProtector = createDataProtectorFromEnv(),
  ) {}

  public async health(): Promise<'ok'> {
    await this.pool.query('SELECT 1');
    return 'ok';
  }

  private async buildSubscriptionBillingStatus(
    detail: SubscriptionDetailRow,
  ): Promise<SubscriptionDetailRecord['billingStatus']> {
    const attempts = await withPgTransaction(this.pool, {
      countryCode: detail.country_code,
      run: (client) =>
        client.query<{
          readonly charged_at: Date;
          readonly status: 'failed' | 'succeeded';
        }>(
          `
            SELECT charged_at, status
            FROM payment_attempts
            WHERE subscription_id = $1
            ORDER BY charged_at DESC, id ASC
            LIMIT 12
          `,
          [detail.subscription_id],
        ),
    });
    const latestAttempt = attempts.rows[0];
    const latestSucceededAttempt = attempts.rows.find((attempt) => attempt.status === 'succeeded');

    return {
      nextChargeAt: addDays(latestSucceededAttempt?.charged_at ?? detail.created_at, 30),
      overdueSince:
        detail.status === 'payment_overdue' ? (latestAttempt?.charged_at ?? null) : null,
      paymentAuthorizationStatus:
        detail.payment_method_provider === null || detail.payment_method_phone_number === null
          ? 'unavailable'
          : latestAttempt?.status === 'failed'
            ? 'authorization_failed'
            : 'ready',
    };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreatedSubscriptionRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const subscriberId = await upsertSubscriber(client, this.dataProtector, input);
        const record = buildCreatedSubscriptionRecord(input, subscriberId);
        await insertSubscriberAddress(client, this.dataProtector, input, record);
        await insertSubscription(client, this.dataProtector, input, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async getSubscriberProfile(
    input: GetSubscriberProfileInput,
  ): Promise<SubscriberProfileRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        await ensureSubscriberProfile(client, this.dataProtector, input);
        const profile = await selectSubscriberProfile(
          client,
          this.dataProtector,
          input.countryCode,
          input.phoneNumber,
        );

        if (profile === undefined) {
          throw new Error('Subscriber profile was not found.');
        }

        return mapSubscriberProfileRow(this.dataProtector, profile);
      },
    });
  }

  public async upsertSubscriberProfile(
    input: UpsertSubscriberProfileInput,
  ): Promise<SubscriberProfileRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const existing = await selectSubscriberProfile(
          client,
          this.dataProtector,
          input.countryCode,
          input.phoneNumber,
        );
        const encryptedPhoneNumber = this.dataProtector.protectText(
          input.phoneNumber,
          'subscribers.phone_number',
        );
        const phoneNumberLookupHash = phoneLookupHash(
          this.dataProtector,
          input.countryCode,
          input.phoneNumber,
        );
        const encryptedEmail = this.dataProtector.protectNullableText(
          input.email,
          'subscribers.email',
        );
        const encryptedFirstName = this.dataProtector.protectNullableText(
          input.firstName,
          'subscribers.first_name',
        );
        const encryptedLastName = this.dataProtector.protectNullableText(
          input.lastName,
          'subscribers.last_name',
        );
        const encryptedAvatarObjectKey = this.dataProtector.protectNullableText(
          input.avatarObjectKey,
          'subscribers.avatar_object_key',
        );
        const result =
          existing === undefined
            ? await client.query<SubscriberProfileRow>(
                `
                  INSERT INTO subscribers (
                    id,
                    country_code,
                    locale,
                    phone_number,
                    phone_number_lookup_hash,
                    first_name,
                    last_name,
                    email,
                    email_lookup_hash,
                    avatar_object_key,
                    is_adult_confirmed
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                  RETURNING
                    id AS subscriber_id,
                    country_code,
                    phone_number,
                    first_name,
                    last_name,
                    email,
                    avatar_object_key,
                    is_adult_confirmed,
                    created_at,
                    updated_at
                `,
                [
                  input.subscriberUserId,
                  input.countryCode,
                  'fr',
                  encryptedPhoneNumber,
                  phoneNumberLookupHash,
                  encryptedFirstName,
                  encryptedLastName,
                  encryptedEmail,
                  emailLookupHash(this.dataProtector, input.countryCode, input.email),
                  encryptedAvatarObjectKey,
                  input.isAdultConfirmed,
                ],
              )
            : await client.query<SubscriberProfileRow>(
                `
                  UPDATE subscribers
                  SET
                    phone_number = $1,
                    phone_number_lookup_hash = $2,
                    first_name = $3,
                    last_name = $4,
                    email = $5,
                    email_lookup_hash = $6,
                    avatar_object_key = $7,
                    is_adult_confirmed = $8,
                    updated_at = now()
                  WHERE id = $9
                  RETURNING
                    id AS subscriber_id,
                    country_code,
                    phone_number,
                    first_name,
                    last_name,
                    email,
                    avatar_object_key,
                    is_adult_confirmed,
                    created_at,
                    updated_at
                `,
                [
                  encryptedPhoneNumber,
                  phoneNumberLookupHash,
                  encryptedFirstName,
                  encryptedLastName,
                  encryptedEmail,
                  emailLookupHash(this.dataProtector, input.countryCode, input.email),
                  encryptedAvatarObjectKey,
                  input.isAdultConfirmed,
                  existing.subscriber_id,
                ],
              );
        const profile = result.rows[0];

        if (profile === undefined) {
          throw new Error('Subscriber profile could not be saved.');
        }

        return mapSubscriberProfileRow(this.dataProtector, profile);
      },
    });
  }

  public async getCurrentSubscriberSubscription(
    input: GetCurrentSubscriberSubscriptionInput,
  ): Promise<SubscriptionDetailRecord | null> {
    const current = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectCurrentSubscriberSubscription(client, this.dataProtector, input),
    });

    if (current === undefined) {
      return null;
    }

    return this.getSubscriptionDetail({
      countryCode: input.countryCode,
      subscriptionId: current.subscription_id,
    });
  }

  public async requestFirstVisit(input: RequestFirstVisitInput): Promise<SubscriptionDetailRecord> {
    const subscriptionId = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const current = await selectCurrentSubscriberSubscription(
          client,
          this.dataProtector,
          input,
          true,
        );

        if (current === undefined) {
          throw new Error('Subscription was not found.');
        }

        const status = transitionSubscription(current.status, 'request_first_visit');
        if (status !== 'pending_match') {
          throw new Error(`Expected pending first visit status, received ${status}.`);
        }
        const event = createDomainEvent({
          actor: { role: 'subscriber', userId: current.subscriber_id },
          aggregateId: current.subscription_id,
          aggregateType: 'subscription',
          countryCode: current.country_code,
          eventType: 'FirstVisitRequested',
          payload: {
            preferredDayOfWeek: input.schedulePreference.dayOfWeek,
            preferredTimeWindow: input.schedulePreference.timeWindow,
            requestedAt: input.requestedAt.toISOString(),
            status,
            subscriberId: current.subscriber_id,
            subscriptionId: current.subscription_id,
          },
          traceId: input.traceId,
        });
        assertCoreDomainEventContract(event);

        await updateSubscriptionFirstVisitRequest(client, current.subscription_id, {
          dayOfWeek: input.schedulePreference.dayOfWeek,
          status,
          timeWindow: input.schedulePreference.timeWindow,
        });
        await insertOutboxEvents(client, this.dataProtector, [event]);
        return current.subscription_id;
      },
    });

    return this.getSubscriptionDetail({ countryCode: input.countryCode, subscriptionId });
  }

  public async createSubscriberAddressChangeRequest(
    input: CreateSubscriberAddressChangeRequestInput,
  ): Promise<SubscriberAddressChangeRequestRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionCountryCodeForUpdate(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const record = buildSubscriberAddressChangeRequestRecord({
          countryCode: subscription.country_code,
          input,
        });

        await insertSubscriberAddressChangeRequest(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async getSubscriberNotificationPreferences(
    input: GetSubscriberNotificationPreferencesInput,
  ): Promise<SubscriberNotificationPreferencesRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionCountryCodeForUpdate(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const existing = await selectSubscriberNotificationPreferences(
          client,
          input.subscriptionId,
        );

        if (existing !== undefined) {
          return mapSubscriberNotificationPreferencesRow(existing);
        }

        return buildSubscriberNotificationPreferencesRecord({
          countryCode: subscription.country_code,
          input: {
            emailRecap: true,
            pushReveal: true,
            pushRoute: true,
            smsReminder: true,
            subscriberUserId: input.subscriberUserId,
            subscriptionId: input.subscriptionId,
            traceId: randomUUID(),
            updatedAt: new Date(),
          },
          subscriberId: subscription.subscriber_id,
          withEvent: false,
        });
      },
    });
  }

  public async updateSubscriberNotificationPreferences(
    input: UpdateSubscriberNotificationPreferencesInput,
  ): Promise<SubscriberNotificationPreferencesRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionCountryCodeForUpdate(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const record = buildSubscriberNotificationPreferencesRecord({
          countryCode: subscription.country_code,
          input,
          subscriberId: subscription.subscriber_id,
          withEvent: true,
        });

        await upsertSubscriberNotificationPreferences(client, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async startOtpChallenge(
    input: StartOtpChallengeInput,
  ): Promise<StartedOtpChallengeRecord> {
    const challengeId = randomUUID();
    const delivery = await this.otpProvider.startChallenge(input);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        await client.query(
          `
            INSERT INTO auth_otp_challenges (
              id,
              country_code,
              phone_number,
              phone_number_lookup_hash,
              code_hash,
              expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            challengeId,
            input.countryCode,
            this.dataProtector.protectText(input.phoneNumber, 'auth_otp_challenges.phone_number'),
            phoneLookupHash(this.dataProtector, input.countryCode, input.phoneNumber),
            hashOtpCode(challengeId, delivery.code),
            expiresAt,
          ],
        );
      },
    });

    return {
      challengeId,
      expiresAt,
      phoneNumber: input.phoneNumber,
      provider: delivery.provider,
      testCode: delivery.testCode,
    };
  }

  public async verifyOtpChallenge(input: VerifyOtpChallengeInput): Promise<AuthSessionRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const challenge = await selectOtpChallengeForVerification(client, input.challengeId);

        if (challenge === undefined) {
          throw new Error('OTP challenge was not found.');
        }

        await setPgLocalCountryCode(client, challenge.country_code);

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

        const verifiedChallenge = {
          ...challenge,
          phone_number: this.dataProtector.revealText(
            challenge.phone_number,
            'auth_otp_challenges.phone_number',
          ),
        };

        await consumeOtpChallenge(client, input.challengeId);
        const user = await upsertAuthUser(
          client,
          this.dataProtector,
          verifiedChallenge,
          input.role,
        );
        const session = await insertAuthSession(client, this.dataProtector, user, input.deviceId);
        return session;
      },
    });
  }

  public async refreshAuthSession(input: RefreshAuthSessionInput): Promise<AuthSessionRecord> {
    const refreshTokenHash = hashRefreshToken(input.refreshToken);

    return withPgTransaction(this.pool, {
      run: async (client) => {
        const currentSession = await selectAuthSessionForRefresh(client, refreshTokenHash);

        if (currentSession === undefined) {
          throw new Error('Refresh token is invalid.');
        }

        await setPgLocalCountryCode(client, currentSession.country_code);

        if (currentSession.revoked_at !== null) {
          throw new Error('Refresh token is invalid.');
        }

        if (currentSession.session_expires_at.getTime() <= Date.now()) {
          throw new Error('Refresh token has expired.');
        }

        await revokeAuthSession(client, currentSession.session_id);
        const session = await insertAuthSession(
          client,
          this.dataProtector,
          {
            country_code: currentSession.country_code,
            phone_number: this.dataProtector.revealText(
              currentSession.phone_number,
              'auth_users.phone_number',
            ),
            role: currentSession.role,
            user_id: currentSession.user_id,
          },
          this.dataProtector.revealText(currentSession.device_id, 'auth_sessions.device_id'),
        );
        return session;
      },
    });
  }

  public async chargeSubscription(input: ChargeSubscriptionInput): Promise<PaymentAttemptRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const existingAttempt = await selectPaymentAttemptByIdempotencyKey(
          client,
          input.idempotencyKey,
        );

        if (existingAttempt !== undefined) {
          return mapPaymentAttemptRow(existingAttempt);
        }

        const subscription = await selectSubscriptionForPayment(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);

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
        const subscriptionStatus = nextPaymentSubscriptionStatus(
          subscription.status,
          charge.status,
        );
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

        await insertPaymentAttempt(client, subscription.country_code, attempt);

        if (subscriptionStatus !== subscription.status) {
          await updateSubscriptionPaymentStatus(client, input.subscriptionId, subscriptionStatus);
        }

        await insertOutboxEvents(client, this.dataProtector, attempt.events);
        return attempt;
      },
    });
  }

  public async ingestPaymentWebhook(
    input: IngestPaymentWebhookInput,
  ): Promise<PaymentAttemptRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const existingAttempt =
          (await selectPaymentAttemptByIdempotencyKey(client, input.idempotencyKey)) ??
          (await selectPaymentAttemptByProviderReference(
            client,
            input.provider,
            input.providerReference,
          ));

        if (existingAttempt !== undefined) {
          return mapPaymentAttemptRow(existingAttempt);
        }

        const subscription = await selectSubscriptionForPayment(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);

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

        await insertPaymentAttempt(client, subscription.country_code, attempt);

        if (subscriptionStatus !== subscription.status) {
          await updateSubscriptionPaymentStatus(client, input.subscriptionId, subscriptionStatus);
        }

        await insertOutboxEvents(client, this.dataProtector, attempt.events);
        return attempt;
      },
    });
  }

  public async assignWorker(input: AssignWorkerInput): Promise<AssignedSubscriptionRecord> {
    let rejectedDecision:
      | {
          readonly countryCode: CountryCode;
          readonly reason: AssignmentDecisionRecord['reason'];
        }
      | undefined;

    try {
      return await withPgTransaction(this.pool, {
        run: async (client) => {
          const subscription = await selectSubscriptionForAssignment(client, input.subscriptionId);

          if (subscription === undefined) {
            throw new Error('Subscription was not found.');
          }

          if (
            subscription.status !== 'pending_match' ||
            subscription.preferred_day_of_week === null ||
            subscription.preferred_time_window === null
          ) {
            throw new Error('First visit must be requested before worker assignment.');
          }

          await setPgLocalCountryCode(client, subscription.country_code);

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
            visitsPerCycle: subscription.visits_per_cycle,
          });

          await upsertWorkerPlaceholder(client, subscription.country_code, input.workerId);
          await updateSubscriptionAssignment(client, input);
          const decision = await insertAssignmentDecision(
            client,
            subscription.country_code,
            input,
            {
              decision: 'assigned',
              reason: 'operator_selected_worker',
            },
          );
          await insertVisits(client, subscription.country_code, input.subscriptionId, assignment);
          await insertOutboxEvents(client, this.dataProtector, [
            ...decision.events,
            ...assignment.events,
          ]);
          return assignment;
        },
      });
    } catch (error) {
      if (rejectedDecision !== undefined) {
        const rejection = rejectedDecision;
        try {
          await withPgTransaction(this.pool, {
            countryCode: rejection.countryCode,
            run: async (client) => {
              const decision = await insertAssignmentDecision(
                client,
                rejection.countryCode,
                input,
                {
                  decision: 'rejected',
                  reason: rejection.reason,
                },
              );
              await insertOutboxEvents(client, this.dataProtector, decision.events);
            },
          });
        } catch {
          // Assignment failure should remain the caller-visible error.
        }
      }

      throw error;
    }
  }

  public async declineAssignmentCandidate(
    input: DeclineAssignmentCandidateInput,
  ): Promise<AssignmentDecisionRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionForAssignment(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);

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
        await insertOutboxEvents(client, this.dataProtector, decision.events);
        return decision;
      },
    });
  }

  public async createWorkerAdvanceRequest(
    input: CreateWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const worker = await selectWorkerForAdvanceRequest(client, input.workerId);

        if (worker === undefined) {
          throw new Error('Worker was not found.');
        }

        await setPgLocalCountryCode(client, worker.country_code);
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

        await insertWorkerAdvanceRequest(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listWorkerAdvanceRequests(
    input: ListWorkerAdvanceRequestsInput,
  ): Promise<readonly WorkerAdvanceRequestRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectWorkerAdvanceRequests(client, input),
    });

    return rows.map((row) => mapWorkerAdvanceRequestRow(this.dataProtector, row));
  }

  public async createWorkerMonthlyPayout(
    input: CreateWorkerMonthlyPayoutInput,
  ): Promise<WorkerPayoutRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const worker = await selectWorkerForPayout(client, input.workerId);

        if (worker === undefined) {
          throw new Error('Worker was not found.');
        }

        await setPgLocalCountryCode(client, worker.country_code);
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

        await insertWorkerPayout(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listWorkerPayouts(
    input: ListWorkerPayoutsInput,
  ): Promise<readonly WorkerPayoutRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectWorkerPayouts(client, input),
    });

    return rows.map((row) => mapWorkerPayoutRow(this.dataProtector, row));
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
    return withPgTransaction(this.pool, {
      run: async (client) => {
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

        await setPgLocalCountryCode(client, attempt.country_code);

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

        await insertPaymentRefund(client, this.dataProtector, refund);
        await insertOutboxEvents(client, this.dataProtector, refund.events);
        return refund;
      },
    });
  }

  public async runPaymentReconciliation(
    input: RunPaymentReconciliationInput,
  ): Promise<PaymentReconciliationRunRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
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
        await insertOutboxEvents(client, this.dataProtector, run.events);
        return run;
      },
    });
  }

  public async resolveWorkerAdvanceRequest(
    input: ResolveWorkerAdvanceRequestInput,
  ): Promise<WorkerAdvanceRequestRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const request = await selectWorkerAdvanceRequestForResolution(client, input.requestId);

        if (request === undefined) {
          throw new Error('Worker advance request was not found.');
        }

        await setPgLocalCountryCode(client, request.country_code);

        if (request.status !== 'open') {
          throw new Error(
            `Worker advance request cannot be resolved from status ${request.status}.`,
          );
        }

        const record = buildResolvedWorkerAdvanceRequestRecord({
          input,
          request: mapWorkerAdvanceRequestRow(this.dataProtector, request),
        });

        await updateWorkerAdvanceRequestResolution(client, this.dataProtector, input);
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
              countryCode: record.countryCode,
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
          await insertWorkerPayout(client, this.dataProtector, payout);
          await insertOutboxEvents(client, this.dataProtector, [
            ...record.events,
            ...payout.events,
          ]);
        } else {
          await insertOutboxEvents(client, this.dataProtector, record.events);
        }
        return record;
      },
    });
  }

  public async createWorkerSwapRequest(
    input: CreateWorkerSwapRequestInput,
  ): Promise<WorkerSwapRequestRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionForWorkerSwapRequest(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);

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
          subscriberPhoneNumber: this.dataProtector.revealText(
            subscription.phone_number,
            'subscribers.phone_number',
          ),
          ...(subscription.assigned_worker_display_name === null
            ? {}
            : { currentWorkerName: subscription.assigned_worker_display_name }),
        });

        await insertWorkerSwapRequest(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listWorkerSwapRequests(
    input: ListWorkerSwapRequestsInput,
  ): Promise<readonly WorkerSwapRequestRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectWorkerSwapRequests(client, input),
    });
    return rows.map((row) => mapWorkerSwapRequestRow(this.dataProtector, row));
  }

  public async resolveWorkerSwapRequest(
    input: ResolveWorkerSwapRequestInput,
  ): Promise<WorkerSwapRequestRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const request = await selectWorkerSwapRequestForResolution(client, input.requestId);

        if (request === undefined) {
          throw new Error('Worker swap request was not found.');
        }

        await setPgLocalCountryCode(client, request.country_code);

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
          request: mapWorkerSwapRequestRow(this.dataProtector, request),
          ...(replacementWorker === undefined
            ? {}
            : { replacementWorkerName: replacementWorker.display_name }),
        });

        await updateWorkerSwapRequestResolution(client, this.dataProtector, input);
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
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelledSubscriptionRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionForStatusChange(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
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

        await updateSubscriptionStatus(client, input.subscriptionId, status);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async pauseSubscription(input: PauseSubscriptionInput): Promise<PausedSubscriptionRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionForStatusChange(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const status = transitionSubscription(subscription.status, 'pause');
        if (status !== 'paused') {
          throw new Error(`Expected paused subscription status, received ${status}.`);
        }

        const pausedScheduledVisits = await cancelScheduledSubscriptionVisits(
          client,
          input.subscriptionId,
        );
        const record = buildPausedSubscriptionRecord({
          countryCode: subscription.country_code,
          input,
          pausedScheduledVisits,
          status,
        });

        await updateSubscriptionStatus(client, input.subscriptionId, status);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async resumeSubscription(
    input: ResumeSubscriptionInput,
  ): Promise<ResumedSubscriptionRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionForStatusChange(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const status = transitionSubscription(subscription.status, 'resume');
        if (status !== 'active') {
          throw new Error(`Expected active subscription status, received ${status}.`);
        }
        const record = buildResumedSubscriptionRecord({
          countryCode: subscription.country_code,
          input,
          status,
        });

        await updateSubscriptionStatus(client, input.subscriptionId, status);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async changeSubscriptionTier(
    input: ChangeSubscriptionTierInput,
  ): Promise<ChangedSubscriptionTierRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionForTierChange(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        assertSubscriptionCanChangeTier(subscription.status);
        const record = buildChangedSubscriptionTierRecord({
          countryCode: subscription.country_code,
          input,
          previousTierCode: subscription.tier_code,
          status: subscription.status,
        });

        await updateSubscriptionTier(client, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async updateSubscriptionPaymentMethod(
    input: UpdateSubscriptionPaymentMethodInput,
  ): Promise<UpdatedSubscriptionPaymentMethodRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionForPaymentMethodUpdate(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);

        if (subscription.status === 'cancelled') {
          throw new Error('Cancelled subscriptions cannot change payment method.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        const record = buildUpdatedSubscriptionPaymentMethodRecord({
          countryCode: subscription.country_code,
          input,
        });

        await updateSubscriptionPaymentMethod(
          client,
          this.dataProtector,
          subscription.country_code,
          record,
        );
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async checkInVisit(input: CheckInVisitInput): Promise<CheckedInVisitRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForLifecycle(client, input.visitId);

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
        assertVisitWorker(visit.worker_id, input.workerId);
        assertVisitLocationVerified({
          fallbackCode: input.fallbackCode,
          location: input.location,
          target: {
            latitude: revealCoordinate(
              this.dataProtector,
              visit.gps_latitude_ciphertext,
              visit.gps_latitude,
              'subscriber_addresses.gps_latitude',
            ),
            longitude: revealCoordinate(
              this.dataProtector,
              visit.gps_longitude_ciphertext,
              visit.gps_longitude,
              'subscriber_addresses.gps_longitude',
            ),
          },
          visitFallbackCode: visit.fallback_code,
        });
        transitionVisit(visit.status, 'check_in');
        await updateVisitCheckIn(client, this.dataProtector, input, visit.fallback_code);

        return {
          checkedInAt: input.checkedInAt,
          status: 'in_progress',
          visitId: input.visitId,
          workerId: input.workerId,
        };
      },
    });
  }

  public async uploadVisitPhoto(input: UploadVisitPhotoInput): Promise<VisitPhotoRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForLifecycle(client, input.visitId);

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
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
        const photo = await upsertVisitPhoto(client, this.dataProtector, input, visit.country_code);
        await insertOutboxEvents(client, this.dataProtector, [event]);

        return {
          ...photo,
          events: [event],
        };
      },
    });
  }

  public async checkOutVisit(input: CheckOutVisitInput): Promise<CompletedVisitRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForLifecycle(client, input.visitId);

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);

        if (visit.check_in_at === null) {
          throw new Error('Visit has not been checked in.');
        }

        assertVisitWorker(visit.worker_id, input.workerId);
        transitionVisit(visit.status, 'check_out');
        assertVisitLocationVerified({
          fallbackCode: input.fallbackCode,
          location: input.location,
          target: {
            latitude: revealCoordinate(
              this.dataProtector,
              visit.gps_latitude_ciphertext,
              visit.gps_latitude,
              'subscriber_addresses.gps_latitude',
            ),
            longitude: revealCoordinate(
              this.dataProtector,
              visit.gps_longitude_ciphertext,
              visit.gps_longitude,
              'subscriber_addresses.gps_longitude',
            ),
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

        await updateVisitCheckOut(client, this.dataProtector, input, visit.fallback_code);
        await insertWorkerCompletedVisitBonus(client, visit.country_code, input, event.eventId);
        await insertOutboxEvents(client, this.dataProtector, [event]);

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
      },
    });
  }

  public async rescheduleVisit(input: RescheduleVisitInput): Promise<RescheduledVisitRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForSubscriberChange(
          client,
          input.subscriptionId,
          input.visitId,
        );

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
        assertSubscriberOwnsSubscription(visit, input.subscriberUserId);

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
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async skipVisit(input: SkipVisitInput): Promise<SkippedVisitRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForSubscriberChange(
          client,
          input.subscriptionId,
          input.visitId,
        );

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
        assertSubscriberOwnsSubscription(visit, input.subscriberUserId);
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
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async updateOperatorVisitStatus(
    input: UpdateOperatorVisitStatusInput,
  ): Promise<OperatorVisitStatusRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForOperatorStatusUpdate(client, input.visitId);

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
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
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async createDispute(input: CreateDisputeInput): Promise<DisputeRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForDispute(client, input.subscriptionId, input.visitId);

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
        assertSubscriberOwnsSubscription(visit, input.subscriberUserId);
        const status = transitionVisit(visit.status, 'dispute');
        const record = buildCreatedDisputeRecord({
          countryCode: visit.country_code,
          input,
          subscriberPhoneNumber: this.dataProtector.revealText(
            visit.subscriber_phone_number,
            'subscribers.phone_number',
          ),
          workerId: visit.worker_id,
        });

        await insertSupportDispute(client, this.dataProtector, record);
        await updateVisitStatus(client, input.visitId, status);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listOperatorDisputes(
    input: ListOperatorDisputesInput,
  ): Promise<readonly DisputeRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectOperatorDisputes(client, input),
    });
    return rows.map((row) => mapDisputeRow(this.dataProtector, row));
  }

  public async resolveDispute(input: ResolveDisputeInput): Promise<DisputeRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const dispute = await selectDisputeForResolution(client, input.disputeId);

        if (dispute === undefined) {
          throw new Error('Dispute was not found.');
        }

        await setPgLocalCountryCode(client, dispute.country_code);

        if (dispute.status !== 'open') {
          throw new Error(`Dispute cannot be resolved from status ${dispute.status}.`);
        }

        const record = buildResolvedDisputeRecord({
          dispute: mapDisputeRow(this.dataProtector, dispute),
          input,
        });
        const credit = buildSupportCreditRecord(record, input);

        await updateSupportDisputeResolution(client, this.dataProtector, input);
        if (credit !== null) {
          await insertSupportCredit(client, this.dataProtector, credit, record.countryCode);
        }
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async createSupportContact(
    input: CreateSupportContactInput,
  ): Promise<SupportContactRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const subscription = await selectSubscriptionCountryCodeForUpdate(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        await setPgLocalCountryCode(client, subscription.country_code);
        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const record = buildCreatedSupportContactRecord({
          countryCode: subscription.country_code,
          input,
        });

        await insertSupportContact(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listSupportContactsForSubscription(
    input: ListSupportContactsInput,
  ): Promise<readonly SupportContactRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectSupportContactsForSubscription(client, input),
    });
    return rows.map((row) => mapSupportContactRow(this.dataProtector, row));
  }

  public async getSupportContact(
    input: GetSupportContactInput,
  ): Promise<SupportContactRecord | null> {
    const row = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectSupportContactById(client, input),
    });
    return row === undefined ? null : mapSupportContactRow(this.dataProtector, row);
  }

  public async createSupportContactMessage(
    input: CreateSupportContactMessageInput,
  ): Promise<SupportContactMessageRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const row = await selectSupportContactForResolution(client, input.contactId);

        if (row === undefined || row.subscription_id !== input.subscriptionId) {
          throw new Error('Support contact was not found.');
        }

        await setPgLocalCountryCode(client, row.country_code);
        const subscription = await selectSubscriptionCountryCodeForUpdate(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const contact = mapSupportContactRow(this.dataProtector, row);
        if (contact.status !== 'open') {
          throw new Error(`Support contact cannot receive replies from status ${contact.status}.`);
        }

        const record = buildSupportContactMessageRecord({
          countryCode: row.country_code,
          input,
        });

        await insertSupportContactMessage(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listSupportContactMessages(
    input: GetSupportContactInput,
  ): Promise<readonly SupportContactMessageRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const contact = await selectSupportContactById(client, input);

        if (contact === undefined) {
          throw new Error('Support contact was not found.');
        }

        return selectSupportContactMessages(client, input.contactId);
      },
    });

    return rows.map((row) => mapSupportContactMessageRow(this.dataProtector, row));
  }

  public async resolveSupportContact(
    input: ResolveSupportContactInput,
  ): Promise<SupportContactRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const row = await selectSupportContactForResolution(client, input.contactId);

        if (row === undefined) {
          throw new Error('Support contact was not found.');
        }

        const contact = mapSupportContactRow(this.dataProtector, row);
        if (contact.status !== 'open') {
          throw new Error(`Support contact cannot be resolved from status ${contact.status}.`);
        }

        const record = buildResolvedSupportContactRecord({ contact, input });
        await updateSupportContactResolution(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async rateVisit(input: RateVisitInput): Promise<VisitRatingRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForRating(client, input.subscriptionId, input.visitId);

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
        assertSubscriberOwnsSubscription(visit, input.subscriberUserId);

        if (visit.status !== 'completed' && visit.status !== 'disputed') {
          throw new Error(`Visit cannot be rated from status ${visit.status}.`);
        }

        const record = buildVisitRatingRecord({
          countryCode: visit.country_code,
          input,
          workerId: visit.worker_id,
        });

        await insertVisitRating(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async reportWorkerIssue(input: ReportWorkerIssueInput): Promise<WorkerIssueReportRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const visit = await selectVisitForWorkerIssue(client, input.visitId);

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        await setPgLocalCountryCode(client, visit.country_code);
        assertVisitWorker(visit.worker_id, input.workerId);
        const record = buildWorkerIssueReportRecord({
          address: revealSubscriberAddress(this.dataProtector, visit),
          countryCode: visit.country_code,
          input,
          scheduledDate: visit.scheduled_date,
          scheduledTimeWindow: visit.scheduled_time_window,
          subscriberPhoneNumber: this.dataProtector.revealText(
            visit.subscriber_phone_number,
            'subscribers.phone_number',
          ),
          subscriptionId: visit.subscription_id,
        });

        await insertWorkerIssueReport(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listWorkerIssues(
    input: ListWorkerIssuesInput,
  ): Promise<readonly WorkerIssueReportRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectWorkerIssues(client, input),
    });
    return rows.map((row) => mapWorkerIssueRow(this.dataProtector, row));
  }

  public async resolveWorkerIssue(
    input: ResolveWorkerIssueInput,
  ): Promise<WorkerIssueReportRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const issue = await selectWorkerIssueForResolution(client, input.issueId);

        if (issue === undefined) {
          throw new Error('Worker issue was not found.');
        }

        await setPgLocalCountryCode(client, issue.country_code);

        if (issue.status === 'resolved') {
          throw new Error('Worker issue is already resolved.');
        }

        const record = buildResolvedWorkerIssueRecord({
          input,
          issue: mapWorkerIssueRow(this.dataProtector, issue),
        });

        await updateWorkerIssueResolution(client, this.dataProtector, input);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async getWorkerMonthlyEarnings(
    input: GetWorkerMonthlyEarningsInput,
  ): Promise<WorkerMonthlyEarningsRecord> {
    const { endExclusive, startInclusive } = getUtcMonthRange(input.month);
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<WorkerMonthlyEarningsRow>(
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
        ),
    });
    const completedVisits = Number(result.rows[0]?.completed_visits ?? 0);
    const compensation = calculateWorkerMonthlyCompensation(completedVisits);
    const payoutHistory = await this.listWorkerPayouts({
      countryCode: input.countryCode,
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
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<WorkerRouteRow>(
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
              address.gps_latitude_ciphertext,
              address.gps_longitude,
              address.gps_longitude_ciphertext
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
        ),
    });

    return {
      date: input.date,
      visits: result.rows.map((row) => ({
        address: revealSubscriberAddress(this.dataProtector, row),
        scheduledDate: row.scheduled_date,
        scheduledTimeWindow: row.scheduled_time_window,
        status: row.status,
        subscriberPhoneNumber: this.dataProtector.revealText(
          row.subscriber_phone_number,
          'subscribers.phone_number',
        ),
        subscriptionId: row.subscription_id,
        visitId: row.visit_id,
      })),
      workerId: input.workerId,
    };
  }

  public async getSubscriptionDetail(
    input: GetSubscriptionDetailInput,
  ): Promise<SubscriptionDetailRecord> {
    const { detail, pendingAddressChange, recentVisits, supportCredits, visits } =
      await withPgTransaction(this.pool, {
        countryCode: input.countryCode,
        run: async (client) => {
          const detail = await selectSubscriptionDetail(client, input.subscriptionId);

          if (detail === undefined) {
            throw new Error('Subscription was not found.');
          }

          return {
            detail,
            pendingAddressChange: await selectPendingSubscriberAddressChangeRequest(
              client,
              this.dataProtector,
              input.subscriptionId,
            ),
            recentVisits: await selectSubscriptionRecentVisits(client, input.subscriptionId),
            supportCredits: await selectSubscriptionSupportCredits(client, input.subscriptionId),
            visits: await selectSubscriptionUpcomingVisits(client, input.subscriptionId),
          };
        },
      });

    return {
      address: revealSubscriberAddress(this.dataProtector, detail),
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
      billingStatus: await this.buildSubscriptionBillingStatus(detail),
      countryCode: detail.country_code,
      monthlyPriceMinor: BigInt(detail.monthly_price_minor),
      pendingAddressChange,
      paymentMethod:
        detail.payment_method_provider === null || detail.payment_method_phone_number === null
          ? null
          : {
              phoneNumber: this.dataProtector.revealText(
                detail.payment_method_phone_number,
                'subscriptions.payment_method_phone_number',
              ),
              provider: detail.payment_method_provider,
            },
      phoneNumber: this.dataProtector.revealText(detail.phone_number, 'subscribers.phone_number'),
      schedulePreference:
        detail.preferred_day_of_week === null || detail.preferred_time_window === null
          ? null
          : {
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
        reason: this.dataProtector.revealText(credit.reason, 'support_credits.reason'),
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

  public async getSubscriberVisitDetail(input: {
    readonly countryCode: CountryCode;
    readonly subscriberUserId: string;
    readonly subscriptionId: string;
    readonly visitId: string;
  }): Promise<SubscriberVisitDetailRecord> {
    const { dispute, photos, rating, visit } = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const subscription = await selectSubscriptionCountryCodeForUpdate(
          client,
          input.subscriptionId,
        );

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        assertSubscriberOwnsSubscription(subscription, input.subscriberUserId);
        const visit = await selectSubscriberVisitDetail(
          client,
          input.subscriptionId,
          input.visitId,
        );

        if (visit === undefined) {
          throw new Error('Visit was not found.');
        }

        return {
          dispute: await selectDisputeForVisit(client, input.subscriptionId, input.visitId),
          photos: await selectVisitPhotos(client, input.visitId),
          rating: await selectVisitRating(client, input.subscriptionId, input.visitId),
          visit,
        };
      },
    });

    return {
      address: revealSubscriberAddress(this.dataProtector, visit),
      countryCode: visit.country_code,
      dispute: dispute === undefined ? null : mapDisputeRow(this.dataProtector, dispute),
      photos: photos.map((photo) => ({
        ...toVisitPhotoRecord(this.dataProtector, photo),
        events: [],
      })),
      rating: rating === undefined ? null : mapVisitRatingRow(this.dataProtector, rating),
      scheduledDate: visit.scheduled_date,
      scheduledTimeWindow: visit.scheduled_time_window,
      status: visit.status,
      subscriptionId: visit.subscription_id,
      timeline: {
        checkedInAt: visit.check_in_at,
        checkedOutAt: visit.check_out_at,
        durationMinutes:
          visit.check_in_at === null || visit.check_out_at === null
            ? null
            : durationMinutes(visit.check_in_at, visit.check_out_at),
      },
      visitId: visit.visit_id,
      worker:
        visit.worker_id === null
          ? null
          : {
              displayName: visit.worker_display_name ?? `Worker ${visit.worker_id.slice(0, 8)}`,
              workerId: visit.worker_id,
            },
    };
  }

  public async upsertWorkerProfile(input: UpsertWorkerProfileInput): Promise<WorkerProfileRecord> {
    await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        await upsertWorkerProfileRow(client, input);
        await replaceWorkerServiceCells(client, {
          countryCode: input.countryCode,
          maxActiveSubscriptions: input.maxActiveSubscriptions,
          serviceNeighborhoods: input.serviceNeighborhoods,
          workerId: input.workerId,
        });
      },
    });

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
    const worker = await withPgTransaction(this.pool, {
      run: (client) => selectWorkerProfile(client, workerId),
    });

    if (worker === undefined) {
      throw new Error('Worker profile was not found.');
    }

    return worker;
  }

  public async createWorkerOnboardingCase(
    input: CreateWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        await upsertWorkerForOnboarding(client, input);
        const record = buildCreatedWorkerOnboardingCaseRecord(input);
        await insertWorkerOnboardingCase(client, this.dataProtector, record);
        await insertWorkerOnboardingNotes(
          client,
          this.dataProtector,
          record.countryCode,
          record.caseId,
          record.notes,
        );
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listWorkerOnboardingCases(
    input: ListWorkerOnboardingCasesInput,
  ): Promise<readonly WorkerOnboardingCaseRecord[]> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const rows = await selectWorkerOnboardingCases(client, input);
        return Promise.all(
          rows.map((row) => mapWorkerOnboardingCaseRow(client, this.dataProtector, row)),
        );
      },
    });
  }

  public async advanceWorkerOnboardingCase(
    input: AdvanceWorkerOnboardingCaseInput,
  ): Promise<WorkerOnboardingCaseRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const row = await selectWorkerOnboardingCaseForUpdate(client, input.caseId);

        if (row === undefined) {
          throw new Error('Worker onboarding case was not found.');
        }

        await setPgLocalCountryCode(client, row.country_code);
        const current = await mapWorkerOnboardingCaseRow(client, this.dataProtector, row);
        const record = buildAdvancedWorkerOnboardingCaseRecord({ input, record: current });
        await updateWorkerOnboardingCaseStage(client, record);
        await insertWorkerOnboardingNotes(
          client,
          this.dataProtector,
          record.countryCode,
          record.caseId,
          [record.notes.at(-1)!],
        );
        if (record.stage === 'activated') {
          await updateWorkerStatus(client, record.workerId, 'active');
        } else if (record.stage === 'rejected') {
          await updateWorkerStatus(client, record.workerId, 'inactive');
        } else {
          await updateWorkerStatus(client, record.workerId, 'onboarding');
        }
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async createWorkerUnavailability(
    input: CreateWorkerUnavailabilityInput,
  ): Promise<WorkerUnavailabilityRecord> {
    return withPgTransaction(this.pool, {
      run: async (client) => {
        const worker = await selectWorkerProfile(client, input.workerId);

        if (worker === undefined) {
          throw new Error('Worker was not found.');
        }

        await setPgLocalCountryCode(client, worker.countryCode);

        if (await isWorkerUnavailableOnDate(client, input.workerId, input.date)) {
          throw new Error('Worker unavailability already exists for this date.');
        }

        const record = buildWorkerUnavailabilityRecord(input);
        await insertWorkerUnavailability(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listWorkerUnavailability(
    input: ListWorkerUnavailabilityInput,
  ): Promise<readonly WorkerUnavailabilityRecord[]> {
    const rows = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) => selectWorkerUnavailability(client, input),
    });

    return rows.map((row) => mapWorkerUnavailabilityRow(this.dataProtector, row));
  }

  public async listMatchingQueue(
    input: ListMatchingQueueInput,
  ): Promise<readonly MatchingQueueItemRecord[]> {
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<MatchingQueueRow>(
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
              address.gps_latitude_ciphertext,
              address.gps_longitude,
              address.gps_longitude_ciphertext
            FROM subscriptions subscription
            INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
            INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
            WHERE subscription.country_code = $1
              AND subscription.status = 'pending_match'
              AND subscription.preferred_day_of_week IS NOT NULL
              AND subscription.preferred_time_window IS NOT NULL
            ORDER BY subscription.created_at ASC
            LIMIT $2
          `,
          [input.countryCode, input.limit],
        ),
    });

    return result.rows.map((row) => ({
      address: revealSubscriberAddress(this.dataProtector, row),
      assignmentDueAt: row.assignment_due_at,
      countryCode: row.country_code,
      monthlyPriceMinor: BigInt(row.monthly_price_minor),
      phoneNumber: this.dataProtector.revealText(row.phone_number, 'subscribers.phone_number'),
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
    const { result, subscription } = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const subscription = await selectSubscriptionForCandidates(client, input.subscriptionId);

        if (subscription === undefined) {
          throw new Error('Subscription was not found.');
        }

        return {
          subscription,
          result: await client.query<MatchingCandidateRow>(
            `
              SELECT
                worker.id AS worker_id,
                worker.display_name,
                COALESCE(
                  array_agg(DISTINCT service_cell.display_name)
                    FILTER (WHERE service_cell.display_name IS NOT NULL),
                  worker.service_neighborhoods
                ) AS service_neighborhoods,
                worker.max_active_subscriptions,
                COUNT(DISTINCT active_subscription.id)::int AS active_subscription_count
              FROM workers worker
              LEFT JOIN worker_service_cells worker_cell
                ON worker_cell.worker_id = worker.id
              LEFT JOIN service_cells service_cell
                ON service_cell.country_code = worker_cell.country_code
                AND service_cell.cell_key = worker_cell.cell_key
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
                  FROM worker_service_cells matching_worker_cell
                  WHERE matching_worker_cell.worker_id = worker.id
                    AND matching_worker_cell.cell_key = lower($2)
                  UNION ALL
                  SELECT 1
                  FROM unnest(worker.service_neighborhoods) service_neighborhood
                  WHERE NOT EXISTS (
                      SELECT 1
                      FROM worker_service_cells existing_worker_cell
                      WHERE existing_worker_cell.worker_id = worker.id
                    )
                    AND lower(service_neighborhood) = lower($2)
                )
              GROUP BY
                worker.id,
                worker.display_name,
                worker.service_neighborhoods,
                worker.max_active_subscriptions
              HAVING COUNT(DISTINCT active_subscription.id) < worker.max_active_subscriptions
              ORDER BY
                COUNT(DISTINCT active_subscription.id) ASC,
                worker.display_name ASC
            `,
            [
              subscription.country_code,
              subscription.neighborhood,
              input.anchorDate ?? null,
              input.subscriptionId,
            ],
          ),
        };
      },
    });

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
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<ServiceCellCapacityRow>(
          `
        WITH worker_cell_source AS (
          SELECT
            worker.id AS worker_id,
            service_cell.cell_key,
            service_cell.display_name AS service_cell,
            worker_cell.max_active_subscriptions
          FROM worker_service_cells worker_cell
          INNER JOIN workers worker ON worker.id = worker_cell.worker_id
          INNER JOIN service_cells service_cell
            ON service_cell.country_code = worker_cell.country_code
            AND service_cell.cell_key = worker_cell.cell_key
          WHERE worker.status = 'active'
            AND service_cell.status = 'active'
          UNION ALL
          SELECT
            worker.id AS worker_id,
            lower(service_cell) AS cell_key,
            service_cell,
            worker.max_active_subscriptions
          FROM workers worker
          CROSS JOIN LATERAL unnest(worker.service_neighborhoods) AS service_cell
          WHERE worker.status = 'active'
            AND NOT EXISTS (
              SELECT 1
              FROM worker_service_cells existing_worker_cell
              WHERE existing_worker_cell.worker_id = worker.id
            )
        ),
        worker_cells AS (
          SELECT
            cell_key,
            min(service_cell) AS service_cell,
            COUNT(worker_id)::int AS active_workers,
            COALESCE(SUM(max_active_subscriptions), 0)::int AS total_capacity
          FROM worker_cell_source
          GROUP BY cell_key
        ),
        subscription_cells AS (
          SELECT
            address.service_cell_key AS cell_key,
            COUNT(subscription.id)::int AS active_subscriptions
          FROM subscriptions subscription
          INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
          WHERE subscription.status = 'active'
          GROUP BY address.service_cell_key
        ),
        visit_cells AS (
          SELECT
            address.service_cell_key AS cell_key,
            COUNT(*) FILTER (WHERE visit.status = 'scheduled')::int AS scheduled_visits,
            COUNT(*) FILTER (WHERE visit.status = 'in_progress')::int AS in_progress_visits,
            COUNT(*) FILTER (WHERE visit.status = 'completed')::int AS completed_visits
          FROM visits visit
          INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
          INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
          WHERE visit.scheduled_date = $1
          GROUP BY address.service_cell_key
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
        ),
    });

    return result.rows.map((row) => toServiceCellCapacityRecord(row));
  }

  public async listAuditEvents(input: ListAuditEventsInput): Promise<readonly AuditEventRecord[]> {
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<AuditEventRow>(
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
        ),
    });

    return result.rows.map((row) => ({
      actor: { role: row.actor_role, userId: row.actor_user_id },
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      countryCode: row.country_code,
      eventId: row.event_id,
      eventType: row.event_type,
      occurredAt: row.occurred_at,
      payload: this.dataProtector.revealJson(row.payload, 'audit_events.payload'),
      recordedAt: row.recorded_at,
      traceId: row.trace_id,
    }));
  }

  public async createSubscriberPrivacyRequest(
    input: CreateSubscriberPrivacyRequestInput,
  ): Promise<SubscriberPrivacyRequestRecord> {
    const detail = await this.getSubscriptionDetail({
      countryCode: input.countryCode,
      subscriptionId: input.subscriptionId,
    });
    const [billingHistory, disputes, notifications, auditEvents] = await Promise.all([
      this.listSubscriptionBilling({
        countryCode: detail.countryCode,
        limit: 100,
        subscriptionId: input.subscriptionId,
      }),
      this.listOperatorDisputes({ countryCode: detail.countryCode, limit: 500 }),
      this.listNotificationMessages({
        aggregateId: input.subscriptionId,
        countryCode: detail.countryCode,
        limit: 100,
      }),
      this.listAuditEvents({
        aggregateId: input.subscriptionId,
        aggregateType: 'subscription',
        countryCode: detail.countryCode,
        limit: 100,
      }),
    ]);
    const record = buildSubscriberPrivacyRequestRecord({
      auditEvents,
      billingHistory,
      detail,
      disputes: disputes.filter((dispute) => dispute.subscriptionId === input.subscriptionId),
      input,
      notifications,
    });

    return withPgTransaction(this.pool, {
      countryCode: detail.countryCode,
      run: async (client) => {
        await insertSubscriberPrivacyRequest(client, this.dataProtector, record);
        await insertOutboxEvents(client, this.dataProtector, record.events);
        return record;
      },
    });
  }

  public async listPaymentAttempts(
    input: ListPaymentAttemptsInput,
  ): Promise<readonly PaymentAttemptSummaryRecord[]> {
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<PaymentAttemptSummaryRow>(
          `
            SELECT
              attempt.id AS payment_attempt_id,
              attempt.subscription_id,
              attempt.country_code,
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
            WHERE attempt.country_code = $1
              AND ($2::text IS NULL OR attempt.provider = $2)
              AND ($3::text IS NULL OR attempt.status = $3)
            ORDER BY attempt.charged_at DESC, attempt.id DESC
            LIMIT $4
          `,
          [input.countryCode, input.provider ?? null, input.status ?? null, input.limit],
        ),
    });

    return result.rows.map((row) => ({
      ...mapPaymentAttemptRow(row),
      countryCode: row.country_code,
    }));
  }

  public async listSubscriberSupportMatches(
    input: ListSubscriberSupportMatchesInput,
  ): Promise<readonly SubscriberSupportMatchRecord[]> {
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<SubscriberSupportMatchRow>(
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
              AND (
                $2::text[] IS NULL
                OR subscriber.phone_number_lookup_hash = ANY($2::text[])
                OR (
                  subscriber.phone_number_lookup_hash IS NULL
                  AND subscriber.phone_number ILIKE '%' || $3 || '%'
                )
              )
            ORDER BY subscription.created_at DESC, subscription.id DESC
            LIMIT $4
          `,
          [
            input.countryCode,
            input.phoneNumber === undefined
              ? null
              : phoneLookupHashes(this.dataProtector, input.countryCode, input.phoneNumber),
            input.phoneNumber ?? null,
            input.limit,
          ],
        ),
    });

    return result.rows.map((row) => ({
      countryCode: row.country_code,
      phoneNumber: this.dataProtector.revealText(row.phone_number, 'subscribers.phone_number'),
      status: row.status,
      subscriberId: row.subscriber_id,
      subscriptionId: row.subscription_id,
      tierCode: row.tier_code,
    }));
  }

  public async listSubscriptionBilling(
    input: ListSubscriptionBillingInput,
  ): Promise<readonly SubscriptionBillingItemRecord[]> {
    const { chargeRows, refundRows } = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => ({
        chargeRows: await selectPaymentAttemptsForSubscription(client, input.subscriptionId),
        refundRows: await selectPaymentRefundsForSubscription(client, input.subscriptionId),
      }),
    });
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
        reason: this.dataProtector.revealText(refund.reason, 'payment_refunds.reason'),
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
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<NotificationMessageRow>(
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
        ),
    });

    return result.rows.map((row) => mapNotificationMessageRow(this.dataProtector, row));
  }

  public async registerPushDevice(input: RegisterPushDeviceInput): Promise<PushDeviceRecord> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
        const encryptedDeviceId = this.dataProtector.protectText(
          input.deviceId,
          'push_device_tokens.device_id',
        );
        const deviceIdLookupHash = pushDeviceLookupHash(
          this.dataProtector,
          input.userId,
          input.deviceId,
        );
        const encryptedToken = this.dataProtector.protectText(
          input.token,
          'push_device_tokens.token',
        );
        const existing = await client.query<{ readonly push_device_id: string }>(
          `
            SELECT id AS push_device_id
            FROM push_device_tokens
            WHERE user_id = $1
              AND device_id_lookup_hash = ANY($2::text[])
            FOR UPDATE
          `,
          [input.userId, pushDeviceLookupHashes(this.dataProtector, input.userId, input.deviceId)],
        );
        const existingDevice = existing.rows[0];
        const result =
          existingDevice === undefined
            ? await client.query<PushDeviceRow>(
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
                    device_id_lookup_hash,
                    token,
                    status,
                    last_registered_at
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
                  ON CONFLICT (user_id, device_id_lookup_hash)
                    WHERE device_id_lookup_hash IS NOT NULL
                  DO UPDATE
                  SET
                    country_code = excluded.country_code,
                    role = excluded.role,
                    app = excluded.app,
                    platform = excluded.platform,
                    environment = excluded.environment,
                    device_id = excluded.device_id,
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
                  encryptedDeviceId,
                  deviceIdLookupHash,
                  encryptedToken,
                  input.registeredAt,
                ],
              )
            : await client.query<PushDeviceRow>(
                `
                  UPDATE push_device_tokens
                  SET
                    country_code = $1,
                    role = $2,
                    app = $3,
                    platform = $4,
                    environment = $5,
                    device_id = $6,
                    device_id_lookup_hash = $7,
                    token = $8,
                    status = 'active',
                    last_registered_at = $9,
                    updated_at = now()
                  WHERE id = $10
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
                  input.countryCode,
                  input.role,
                  input.app,
                  input.platform,
                  input.environment,
                  encryptedDeviceId,
                  deviceIdLookupHash,
                  encryptedToken,
                  input.registeredAt,
                  existingDevice.push_device_id,
                ],
              );
        const row = result.rows[0];

        if (row === undefined) {
          throw new Error('Push device could not be registered.');
        }

        return mapPushDeviceRow(this.dataProtector, row);
      },
    });
  }

  public async listPushDevices(input: ListPushDevicesInput): Promise<readonly PushDeviceRecord[]> {
    const result = await withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: (client) =>
        client.query<PushDeviceRow>(
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
        ),
    });

    return result.rows.map((row) => mapPushDeviceRow(this.dataProtector, row));
  }

  public async deliverDueNotificationMessages(
    input: DeliverDueNotificationMessagesInput,
  ): Promise<readonly NotificationMessageRecord[]> {
    return withPgTransaction(this.pool, {
      countryCode: input.countryCode,
      run: async (client) => {
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
          const message = mapNotificationMessageRow(this.dataProtector, row);
          const updated = await deliverNotificationMessageLocally({
            deliveredAt: input.deliveredAt,
            message,
            pushTokens: await selectPushTokensForNotificationMessage(
              client,
              this.dataProtector,
              message,
            ),
          });
          delivered.push(await updateNotificationDelivery(client, this.dataProtector, updated));
        }

        return delivered;
      },
    });
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
  readonly country_code: CountryCode;
  readonly expires_at: Date;
  readonly phone_number: string;
}

interface AuthUserRow {
  readonly country_code: CountryCode;
  readonly phone_number: string;
  readonly role: 'operator' | 'subscriber' | 'worker';
  readonly user_id: string;
}

interface AuthRefreshSessionRow {
  readonly country_code: CountryCode;
  readonly device_id: string;
  readonly phone_number: string;
  readonly revoked_at: Date | null;
  readonly role: 'operator' | 'subscriber' | 'worker';
  readonly session_expires_at: Date;
  readonly session_id: string;
  readonly user_id: string;
}

interface SubscriberProfileRow {
  readonly avatar_object_key: string | null;
  readonly country_code: CountryCode;
  readonly created_at: Date;
  readonly email: string | null;
  readonly first_name: string | null;
  readonly is_adult_confirmed: boolean;
  readonly last_name: string | null;
  readonly phone_number: string;
  readonly subscriber_id: string;
  readonly updated_at: Date;
}

interface PaymentSubscriptionRow {
  readonly country_code: CountryCode;
  readonly currency_code: 'XOF';
  readonly monthly_price_minor: string;
  readonly status: SubscriptionStatus;
}

interface PaymentAttemptRow {
  readonly amount_minor: string;
  readonly charged_at: Date;
  readonly country_code: CountryCode;
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
  readonly gps_latitude_ciphertext: string | null;
  readonly gps_longitude: string;
  readonly gps_longitude_ciphertext: string | null;
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
  readonly gps_latitude_ciphertext: string | null;
  readonly gps_longitude: string;
  readonly gps_longitude_ciphertext: string | null;
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
  readonly created_at: Date;
  readonly gps_latitude: string;
  readonly gps_latitude_ciphertext: string | null;
  readonly gps_longitude: string;
  readonly gps_longitude_ciphertext: string | null;
  readonly landmark: string;
  readonly monthly_price_minor: string;
  readonly neighborhood: string;
  readonly payment_method_phone_number: string | null;
  readonly payment_method_provider: SubscriptionPaymentMethod['provider'] | null;
  readonly phone_number: string;
  readonly preferred_day_of_week:
    | 'friday'
    | 'monday'
    | 'saturday'
    | 'sunday'
    | 'thursday'
    | 'tuesday'
    | 'wednesday'
    | null;
  readonly preferred_time_window: 'afternoon' | 'morning' | null;
  readonly status: SubscriptionStatus;
  readonly subscriber_id: string;
  readonly subscription_id: string;
  readonly tier_code: 'T1' | 'T2';
  readonly visits_per_cycle: 1 | 2;
}

interface CurrentSubscriberSubscriptionRow {
  readonly country_code: 'TG';
  readonly status: SubscriptionStatus;
  readonly subscriber_id: string;
  readonly subscription_id: string;
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
        subscription.created_at,
        subscription.tier_code,
        subscription.status,
        subscription.visits_per_cycle,
        subscription.monthly_price_minor,
        subscription.preferred_day_of_week,
        subscription.preferred_time_window,
        subscription.payment_method_provider,
        subscription.payment_method_phone_number,
        subscriber.phone_number,
        address.neighborhood,
        address.landmark,
        address.gps_latitude,
        address.gps_latitude_ciphertext,
        address.gps_longitude,
        address.gps_longitude_ciphertext,
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

async function selectCurrentSubscriberSubscription(
  client: PgClient,
  dataProtector: DataProtector,
  input: GetCurrentSubscriberSubscriptionInput,
  lock = false,
): Promise<CurrentSubscriberSubscriptionRow | undefined> {
  const result = await client.query<CurrentSubscriberSubscriptionRow>(
    `
      SELECT
        subscription.id AS subscription_id,
        subscription.subscriber_id,
        subscription.country_code,
        subscription.status
      FROM subscriptions subscription
      INNER JOIN subscribers subscriber ON subscriber.id = subscription.subscriber_id
      WHERE subscriber.country_code = $1
        AND (
          subscriber.phone_number_lookup_hash = ANY($2::text[])
          OR (
            subscriber.phone_number_lookup_hash IS NULL
            AND subscriber.phone_number = $3
          )
        )
      ORDER BY
        CASE WHEN subscription.status = 'cancelled' THEN 1 ELSE 0 END ASC,
        subscription.created_at DESC,
        subscription.id ASC
      LIMIT 1
      ${lock ? 'FOR UPDATE OF subscription' : ''}
    `,
    [
      input.countryCode,
      phoneLookupHashes(dataProtector, input.countryCode, input.phoneNumber),
      input.phoneNumber,
    ],
  );

  return result.rows[0];
}

async function updateSubscriptionFirstVisitRequest(
  client: PgClient,
  subscriptionId: string,
  input: {
    readonly dayOfWeek: RequestFirstVisitInput['schedulePreference']['dayOfWeek'];
    readonly status: 'pending_match';
    readonly timeWindow: RequestFirstVisitInput['schedulePreference']['timeWindow'];
  },
): Promise<void> {
  await client.query(
    `
      UPDATE subscriptions
      SET
        preferred_day_of_week = $1,
        preferred_time_window = $2,
        status = $3,
        updated_at = now()
      WHERE id = $4
    `,
    [input.dayOfWeek, input.timeWindow, input.status, subscriptionId],
  );
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

async function selectSubscriberVisitDetail(
  client: PgClient,
  subscriptionId: string,
  visitId: string,
): Promise<SubscriberVisitDetailRow | undefined> {
  const result = await client.query<SubscriberVisitDetailRow>(
    `
      SELECT
        visit.id AS visit_id,
        visit.subscription_id,
        visit.country_code,
        visit.status,
        visit.scheduled_date::text AS scheduled_date,
        visit.scheduled_time_window,
        visit.worker_id,
        visit.check_in_at,
        visit.check_out_at,
        address.neighborhood,
        address.landmark,
        address.gps_latitude,
        address.gps_latitude_ciphertext,
        address.gps_longitude,
        address.gps_longitude_ciphertext,
        worker.display_name AS worker_display_name
      FROM visits visit
      INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
      INNER JOIN subscriber_addresses address ON address.id = subscription.address_id
      LEFT JOIN workers worker ON worker.id = visit.worker_id
      WHERE visit.id = $1
        AND visit.subscription_id = $2
    `,
    [visitId, subscriptionId],
  );

  return result.rows[0];
}

async function selectVisitPhotos(
  client: PgClient,
  visitId: string,
): Promise<readonly VisitPhotoRow[]> {
  const result = await client.query<VisitPhotoRow>(
    `
      SELECT
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
      FROM visit_photos
      WHERE visit_id = $1
      ORDER BY captured_at ASC, id ASC
    `,
    [visitId],
  );

  return result.rows;
}

async function selectVisitRating(
  client: PgClient,
  subscriptionId: string,
  visitId: string,
): Promise<VisitRatingRow | undefined> {
  const result = await client.query<VisitRatingRow>(
    `
      SELECT
        rating.id AS rating_id,
        rating.subscription_id,
        rating.visit_id,
        rating.country_code,
        rating.rating,
        rating.comment,
        rating.rated_by_user_id,
        rating.created_at,
        visit.worker_id
      FROM visit_ratings rating
      INNER JOIN visits visit ON visit.id = rating.visit_id
      WHERE rating.subscription_id = $1
        AND rating.visit_id = $2
    `,
    [subscriptionId, visitId],
  );

  return result.rows[0];
}

async function selectDisputeForVisit(
  client: PgClient,
  subscriptionId: string,
  visitId: string,
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
        visit.worker_id,
        credit.id AS credit_id,
        credit.amount_minor AS credit_amount_minor,
        credit.currency_code AS credit_currency_code
      FROM support_disputes dispute
      INNER JOIN visits visit ON visit.id = dispute.visit_id
      LEFT JOIN support_credits credit ON credit.dispute_id = dispute.id
      WHERE dispute.subscription_id = $1
        AND dispute.visit_id = $2
      ORDER BY dispute.created_at DESC, dispute.id ASC
      LIMIT 1
    `,
    [subscriptionId, visitId],
  );

  return result.rows[0];
}

interface VisitLifecycleRow {
  readonly check_in_at: Date | null;
  readonly country_code: 'TG';
  readonly fallback_code: string | null;
  readonly gps_latitude: string;
  readonly gps_latitude_ciphertext: string | null;
  readonly gps_longitude: string;
  readonly gps_longitude_ciphertext: string | null;
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

interface SubscriberVisitDetailRow {
  readonly check_in_at: Date | null;
  readonly check_out_at: Date | null;
  readonly country_code: 'TG';
  readonly gps_latitude: string;
  readonly gps_latitude_ciphertext: string | null;
  readonly gps_longitude: string;
  readonly gps_longitude_ciphertext: string | null;
  readonly landmark: string;
  readonly neighborhood: string;
  readonly scheduled_date: string;
  readonly scheduled_time_window: 'afternoon' | 'morning';
  readonly status: VisitStatus;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_display_name: string | null;
  readonly worker_id: string | null;
}

interface VisitRatingRow {
  readonly comment: string | null;
  readonly country_code: 'TG';
  readonly created_at: Date;
  readonly rated_by_user_id: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly rating_id: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string | null;
}

interface SubscriberVisitChangeRow {
  readonly country_code: 'TG';
  readonly scheduled_date: string;
  readonly scheduled_time_window: 'afternoon' | 'morning';
  readonly status: VisitStatus;
  readonly subscriber_id: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string;
}

interface DisputeVisitRow {
  readonly country_code: 'TG';
  readonly status: VisitStatus;
  readonly subscriber_id: string;
  readonly subscriber_phone_number: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string | null;
}

interface RatingVisitRow {
  readonly country_code: 'TG';
  readonly status: VisitStatus;
  readonly subscriber_id: string;
  readonly subscription_id: string;
  readonly visit_id: string;
  readonly worker_id: string | null;
}

interface WorkerIssueVisitRow {
  readonly country_code: 'TG';
  readonly gps_latitude: string;
  readonly gps_latitude_ciphertext: string | null;
  readonly gps_longitude: string;
  readonly gps_longitude_ciphertext: string | null;
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
  readonly gps_latitude_ciphertext: string | null;
  readonly gps_longitude: string;
  readonly gps_longitude_ciphertext: string | null;
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
    | 'wednesday'
    | null;
  readonly preferred_time_window: 'afternoon' | 'morning' | null;
  readonly status: SubscriptionStatus;
  readonly visits_per_cycle: 1 | 2;
}

interface SubscriptionCancellationRow {
  readonly country_code: 'TG';
  readonly status: SubscriptionStatus;
  readonly subscriber_id: string;
}

interface SubscriptionTierChangeRow {
  readonly country_code: 'TG';
  readonly status: SubscriptionStatus;
  readonly subscriber_id: string;
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
        subscription.status,
        subscription.visits_per_cycle
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

async function selectSubscriptionForStatusChange(
  client: PgClient,
  subscriptionId: string,
): Promise<SubscriptionCancellationRow | undefined> {
  const result = await client.query<SubscriptionCancellationRow>(
    `
      SELECT
        country_code,
        subscriber_id,
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
        subscriber_id,
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

async function selectSubscriptionForPaymentMethodUpdate(
  client: PgClient,
  subscriptionId: string,
): Promise<SubscriptionCancellationRow | undefined> {
  const result = await client.query<SubscriptionCancellationRow>(
    `
      SELECT
        country_code,
        subscriber_id,
        status
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
  dataProtector: DataProtector,
  challenge: OtpChallengeRow,
  role: 'operator' | 'subscriber' | 'worker',
): Promise<AuthUserRow> {
  const encryptedPhoneNumber = dataProtector.protectText(
    challenge.phone_number,
    'auth_users.phone_number',
  );
  const phoneNumberLookupHash = phoneLookupHash(
    dataProtector,
    challenge.country_code,
    challenge.phone_number,
  );
  const existing = await client.query<AuthUserRow>(
    `
      SELECT
        id AS user_id,
        country_code,
        phone_number,
        role
      FROM auth_users
      WHERE country_code = $1
        AND (
          phone_number_lookup_hash = ANY($2::text[])
          OR (
            phone_number_lookup_hash IS NULL
            AND phone_number = $3
          )
        )
      FOR UPDATE
    `,
    [
      challenge.country_code,
      phoneLookupHashes(dataProtector, challenge.country_code, challenge.phone_number),
      challenge.phone_number,
    ],
  );
  const existingUser = existing.rows[0];
  if (existingUser !== undefined) {
    await client.query(
      `
        UPDATE auth_users
        SET
          phone_number = $1,
          phone_number_lookup_hash = $2,
          updated_at = now()
        WHERE id = $3
      `,
      [encryptedPhoneNumber, phoneNumberLookupHash, existingUser.user_id],
    );
    return {
      ...existingUser,
      phone_number: challenge.phone_number,
    };
  }

  const result = await client.query<AuthUserRow>(
    `
      INSERT INTO auth_users (
        id,
        country_code,
        phone_number,
        phone_number_lookup_hash,
        role
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (country_code, phone_number_lookup_hash)
        WHERE phone_number_lookup_hash IS NOT NULL
      DO UPDATE
      SET updated_at = now()
      RETURNING
        id AS user_id,
        country_code,
        phone_number,
        role
    `,
    [randomUUID(), challenge.country_code, encryptedPhoneNumber, phoneNumberLookupHash, role],
  );

  const user = result.rows[0];

  if (user === undefined) {
    throw new Error('Auth user could not be created.');
  }

  return {
    ...user,
    phone_number: dataProtector.revealText(user.phone_number, 'auth_users.phone_number'),
  };
}

async function insertAuthSession(
  client: PgClient,
  dataProtector: DataProtector,
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
        country_code,
        user_id,
        refresh_token_hash,
        device_id,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      sessionId,
      user.country_code,
      user.user_id,
      hashRefreshToken(tokens.refreshToken),
      dataProtector.protectText(deviceId, 'auth_sessions.device_id'),
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
        session.country_code,
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
        attempt.country_code,
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
        attempt.country_code,
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
        attempt.country_code,
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
        attempt.country_code,
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
        attempt.country_code,
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
      WHERE attempt.country_code = $1
        AND ($2::text IS NULL OR attempt.provider = $2)
      GROUP BY
        attempt.id,
        attempt.country_code,
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
  countryCode: CountryCode,
  attempt: PaymentAttemptRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO payment_attempts (
        id,
        subscription_id,
        country_code,
        amount_minor,
        currency_code,
        status,
        provider,
        provider_reference,
        idempotency_key,
        charged_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      attempt.paymentAttemptId,
      attempt.subscriptionId,
      countryCode,
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

async function insertPaymentRefund(
  client: PgClient,
  dataProtector: DataProtector,
  refund: PaymentRefundRecord,
): Promise<void> {
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
      dataProtector.protectText(refund.reason, 'payment_refunds.reason'),
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
  dataProtector: DataProtector,
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
      dataProtector.protectText(record.reason, 'worker_advance_requests.reason'),
      record.requestedAt,
      record.resolvedAt,
      record.resolvedByOperatorUserId,
      dataProtector.protectNullableText(
        record.resolutionNote,
        'worker_advance_requests.resolution_note',
      ),
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
  dataProtector: DataProtector,
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
      dataProtector.protectText(input.resolutionNote, 'worker_advance_requests.resolution_note'),
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
  dataProtector: DataProtector,
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
      dataProtector.protectText(record.reason, 'worker_swap_requests.reason'),
      record.resolvedByOperatorUserId,
      dataProtector.protectNullableText(
        record.resolutionNote,
        'worker_swap_requests.resolution_note',
      ),
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

async function insertWorkerPayout(
  client: PgClient,
  dataProtector: DataProtector,
  record: WorkerPayoutRecord,
): Promise<void> {
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
      dataProtector.protectNullableText(record.failureReason, 'worker_payouts.failure_reason'),
      dataProtector.protectText(record.note, 'worker_payouts.note'),
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
  await upsertWorkerProfileRow(client, {
    countryCode: input.countryCode,
    displayName: input.displayName,
    maxActiveSubscriptions: input.maxActiveSubscriptions,
    serviceNeighborhoods: input.serviceNeighborhoods,
    status: 'applicant',
    workerId: input.workerId,
  });
  await replaceWorkerServiceCells(client, {
    countryCode: input.countryCode,
    maxActiveSubscriptions: input.maxActiveSubscriptions,
    serviceNeighborhoods: input.serviceNeighborhoods,
    workerId: input.workerId,
  });
}

async function upsertWorkerProfileRow(
  client: PgClient,
  input: {
    readonly countryCode: CountryCode;
    readonly displayName: string;
    readonly maxActiveSubscriptions: number;
    readonly serviceNeighborhoods: readonly string[];
    readonly status: WorkerProfileRecord['status'];
    readonly workerId: string;
  },
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
}

async function replaceWorkerServiceCells(
  client: PgClient,
  input: {
    readonly countryCode: CountryCode;
    readonly maxActiveSubscriptions: number;
    readonly serviceNeighborhoods: readonly string[];
    readonly workerId: string;
  },
): Promise<void> {
  await client.query('DELETE FROM worker_service_cells WHERE worker_id = $1', [input.workerId]);

  for (const serviceNeighborhood of input.serviceNeighborhoods) {
    const serviceCell = normalizeServiceCell(serviceNeighborhood);

    if (serviceCell === null) {
      continue;
    }

    await client.query(
      `
        INSERT INTO service_cells (
          country_code,
          cell_key,
          display_name
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (country_code, cell_key) DO UPDATE
        SET
          display_name = EXCLUDED.display_name,
          status = 'active',
          updated_at = now()
      `,
      [input.countryCode, serviceCell.cellKey, serviceCell.displayName],
    );

    await client.query(
      `
        INSERT INTO worker_service_cells (
          worker_id,
          country_code,
          cell_key,
          max_active_subscriptions
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (worker_id, cell_key) DO UPDATE
        SET
          country_code = EXCLUDED.country_code,
          max_active_subscriptions = EXCLUDED.max_active_subscriptions,
          updated_at = now()
      `,
      [input.workerId, input.countryCode, serviceCell.cellKey, input.maxActiveSubscriptions],
    );
  }
}

async function insertWorkerOnboardingCase(
  client: PgClient,
  dataProtector: DataProtector,
  record: WorkerOnboardingCaseRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_onboarding_cases (
        id,
        worker_id,
        country_code,
        phone_number,
        phone_number_lookup_hash,
        stage,
        applied_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      record.caseId,
      record.workerId,
      record.countryCode,
      dataProtector.protectText(record.phoneNumber, 'worker_onboarding_cases.phone_number'),
      phoneLookupHash(dataProtector, record.countryCode, record.phoneNumber),
      record.stage,
      record.appliedAt,
      record.updatedAt,
    ],
  );
}

async function insertWorkerOnboardingNotes(
  client: PgClient,
  dataProtector: DataProtector,
  countryCode: CountryCode,
  caseId: string,
  notes: readonly WorkerOnboardingNoteRecord[],
): Promise<void> {
  for (const note of notes) {
    await client.query(
      `
        INSERT INTO worker_onboarding_notes (
          id,
          country_code,
          case_id,
          stage,
          note,
          operator_user_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        randomUUID(),
        countryCode,
        caseId,
        note.stage,
        dataProtector.protectText(note.note, 'worker_onboarding_notes.note'),
        note.operatorUserId,
        note.createdAt,
      ],
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
  dataProtector: DataProtector,
  record: WorkerUnavailabilityRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO worker_unavailability (
        id,
        country_code,
        worker_id,
        unavailable_date,
        reason,
        created_at
      )
      SELECT $1, worker.country_code, $2, $3, $4, $5
      FROM workers worker
      WHERE worker.id = $2
    `,
    [
      record.unavailabilityId,
      record.workerId,
      record.date,
      dataProtector.protectText(record.reason, 'worker_unavailability.reason'),
      record.createdAt,
    ],
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
  dataProtector: DataProtector,
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
      dataProtector.protectText(input.resolutionNote, 'worker_swap_requests.resolution_note'),
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

async function updateSubscriptionStatus(
  client: PgClient,
  subscriptionId: string,
  status: 'active' | 'cancelled' | 'paused',
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

async function updateSubscriptionPaymentMethod(
  client: PgClient,
  dataProtector: DataProtector,
  countryCode: CountryCode,
  record: UpdatedSubscriptionPaymentMethodRecord,
): Promise<void> {
  await client.query(
    `
      UPDATE subscriptions
      SET
        payment_method_provider = $1,
        payment_method_phone_number = $2,
        payment_method_phone_number_lookup_hash = $3,
        updated_at = now()
      WHERE id = $4
    `,
    [
      record.paymentMethod.provider,
      dataProtector.protectText(
        record.paymentMethod.phoneNumber,
        'subscriptions.payment_method_phone_number',
      ),
      phoneLookupHash(dataProtector, countryCode, record.paymentMethod.phoneNumber),
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
        address.gps_latitude_ciphertext,
        address.gps_longitude,
        address.gps_longitude_ciphertext,
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
        visit.id AS visit_id,
        visit.subscription_id,
        visit.country_code,
        visit.status,
        visit.worker_id,
        visit.scheduled_date::text AS scheduled_date,
        visit.scheduled_time_window,
        subscription.subscriber_id
      FROM visits visit
      INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
      WHERE visit.id = $1
        AND visit.subscription_id = $2
      FOR UPDATE OF visit
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
        subscription.subscriber_id,
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
        visit.id AS visit_id,
        visit.subscription_id,
        visit.country_code,
        visit.status,
        visit.worker_id,
        subscription.subscriber_id
      FROM visits visit
      INNER JOIN subscriptions subscription ON subscription.id = visit.subscription_id
      WHERE visit.id = $1
        AND visit.subscription_id = $2
      FOR UPDATE OF visit
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
        address.gps_latitude_ciphertext,
        address.gps_longitude,
        address.gps_longitude_ciphertext,
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
  dataProtector: DataProtector,
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
      dataProtector.protectText(record.description, 'worker_issue_reports.description'),
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
        address.gps_latitude_ciphertext,
        address.gps_longitude,
        address.gps_longitude_ciphertext,
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
        address.gps_latitude_ciphertext,
        address.gps_longitude,
        address.gps_longitude_ciphertext,
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
  dataProtector: DataProtector,
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
      dataProtector.protectText(input.resolutionNote, 'worker_issue_reports.resolution_note'),
      input.status === 'resolved' ? input.resolvedAt : null,
      input.issueId,
    ],
  );
}

async function insertVisitRating(
  client: PgClient,
  dataProtector: DataProtector,
  record: VisitRatingRecord,
): Promise<void> {
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
      dataProtector.protectNullableText(record.comment, 'visit_ratings.comment'),
      record.ratedByUserId,
      record.createdAt,
    ],
  );
}

function mapVisitRatingRow(dataProtector: DataProtector, row: VisitRatingRow): VisitRatingRecord {
  return {
    comment: dataProtector.revealNullableText(row.comment, 'visit_ratings.comment'),
    countryCode: row.country_code,
    createdAt: row.created_at,
    events: [],
    ratedByUserId: row.rated_by_user_id,
    rating: row.rating,
    ratingId: row.rating_id,
    subscriptionId: row.subscription_id,
    visitId: row.visit_id,
    workerId: row.worker_id,
  };
}

async function insertSupportCredit(
  client: PgClient,
  dataProtector: DataProtector,
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
      dataProtector.protectText(record.reason, 'support_credits.reason'),
      record.issuedByOperatorUserId,
      record.createdAt,
    ],
  );
}

async function insertSupportDispute(
  client: PgClient,
  dataProtector: DataProtector,
  record: DisputeRecord,
): Promise<void> {
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
      dataProtector.protectText(record.description, 'support_disputes.description'),
      record.openedByUserId,
      record.resolvedByOperatorUserId,
      dataProtector.protectNullableText(record.resolutionNote, 'support_disputes.resolution_note'),
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
  dataProtector: DataProtector,
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
      dataProtector.protectText(input.resolutionNote, 'support_disputes.resolution_note'),
      input.resolvedAt,
      input.disputeId,
    ],
  );
}

function mapDisputeRow(dataProtector: DataProtector, row: DisputeRow): DisputeRecord {
  const record: DisputeRecord = {
    countryCode: row.country_code,
    createdAt: row.created_at,
    description: dataProtector.revealText(row.description, 'support_disputes.description'),
    disputeId: row.dispute_id,
    events: [],
    issueType: row.issue_type,
    openedByUserId: row.opened_by_user_id,
    resolvedAt: row.resolved_at,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    resolutionNote: dataProtector.revealNullableText(
      row.resolution_note,
      'support_disputes.resolution_note',
    ),
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
    : {
        ...record,
        subscriberPhoneNumber: dataProtector.revealText(
          row.subscriber_phone_number,
          'subscribers.phone_number',
        ),
      };
}

interface SupportContactRow {
  readonly body: string;
  readonly category: SupportContactCategory;
  readonly country_code: 'TG';
  readonly created_at: Date;
  readonly id: string;
  readonly opened_by_user_id: string;
  readonly resolution_note: string | null;
  readonly resolved_at: Date | null;
  readonly resolved_by_operator_user_id: string | null;
  readonly status: SupportContactStatus;
  readonly subject: string;
  readonly subscription_id: string;
}

interface SupportContactMessageRow {
  readonly author_role: 'operator' | 'subscriber';
  readonly author_user_id: string;
  readonly body: string;
  readonly contact_id: string;
  readonly country_code: 'TG';
  readonly created_at: Date;
  readonly message_id: string;
  readonly subscription_id: string;
}

interface SubscriberNotificationPreferencesRow {
  readonly country_code: 'TG';
  readonly email_recap: boolean;
  readonly push_reveal: boolean;
  readonly push_route: boolean;
  readonly sms_reminder: boolean;
  readonly subscriber_id: string;
  readonly subscription_id: string;
  readonly updated_at: Date;
  readonly updated_by_user_id: string;
}

interface SubscriberAddressChangeRequestRow {
  readonly address_landmark: string;
  readonly address_neighborhood: string;
  readonly country_code: 'TG';
  readonly gps_latitude_ciphertext: string;
  readonly gps_longitude_ciphertext: string;
  readonly requested_at: Date;
  readonly requested_by_user_id: string;
  readonly request_id: string;
  readonly status: 'pending_review';
  readonly subscription_id: string;
}

async function selectSubscriptionCountryCodeForUpdate(
  client: PgClient,
  subscriptionId: string,
): Promise<{ readonly country_code: 'TG'; readonly subscriber_id: string } | undefined> {
  const result = await client.query<{
    readonly country_code: 'TG';
    readonly subscriber_id: string;
  }>(
    `
      SELECT country_code, subscriber_id
      FROM subscriptions
      WHERE id = $1
      FOR UPDATE
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function insertSupportContact(
  client: PgClient,
  dataProtector: DataProtector,
  record: SupportContactRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO support_contacts (
        id,
        subscription_id,
        country_code,
        category,
        status,
        subject,
        body,
        opened_by_user_id,
        resolved_by_operator_user_id,
        resolution_note,
        created_at,
        resolved_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      record.contactId,
      record.subscriptionId,
      record.countryCode,
      record.category,
      record.status,
      dataProtector.protectText(record.subject, 'support_contacts.subject'),
      dataProtector.protectText(record.body, 'support_contacts.body'),
      record.openedByUserId,
      record.resolvedByOperatorUserId,
      dataProtector.protectNullableText(record.resolutionNote, 'support_contacts.resolution_note'),
      record.createdAt,
      record.resolvedAt,
    ],
  );
}

async function selectSupportContactsForSubscription(
  pool: PgClient,
  input: ListSupportContactsInput,
): Promise<readonly SupportContactRow[]> {
  const result = await pool.query<SupportContactRow>(
    `
      SELECT
        id,
        subscription_id,
        country_code,
        category,
        status,
        subject,
        body,
        opened_by_user_id,
        resolved_by_operator_user_id,
        resolution_note,
        created_at,
        resolved_at
      FROM support_contacts
      WHERE subscription_id = $1
        AND ($2::text IS NULL OR status = $2)
      ORDER BY created_at DESC, id ASC
      LIMIT $3
    `,
    [input.subscriptionId, input.status ?? null, input.limit],
  );

  return result.rows;
}

async function selectSupportContactById(
  pool: PgClient,
  input: GetSupportContactInput,
): Promise<SupportContactRow | undefined> {
  const result = await pool.query<SupportContactRow>(
    `
      SELECT
        id,
        subscription_id,
        country_code,
        category,
        status,
        subject,
        body,
        opened_by_user_id,
        resolved_by_operator_user_id,
        resolution_note,
        created_at,
        resolved_at
      FROM support_contacts
      WHERE id = $1 AND subscription_id = $2
    `,
    [input.contactId, input.subscriptionId],
  );

  return result.rows[0];
}

function mapSupportContactRow(
  dataProtector: DataProtector,
  row: SupportContactRow,
): SupportContactRecord {
  return {
    body: dataProtector.revealText(row.body, 'support_contacts.body'),
    category: row.category,
    contactId: row.id,
    countryCode: row.country_code,
    createdAt: row.created_at,
    events: [],
    openedByUserId: row.opened_by_user_id,
    resolutionNote: dataProtector.revealNullableText(
      row.resolution_note,
      'support_contacts.resolution_note',
    ),
    resolvedAt: row.resolved_at,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    status: row.status,
    subject: dataProtector.revealText(row.subject, 'support_contacts.subject'),
    subscriptionId: row.subscription_id,
  };
}

async function selectSupportContactForResolution(
  client: PgClient,
  contactId: string,
): Promise<SupportContactRow | undefined> {
  const result = await client.query<SupportContactRow>(
    `
      SELECT
        id,
        subscription_id,
        country_code,
        category,
        status,
        subject,
        body,
        opened_by_user_id,
        resolved_by_operator_user_id,
        resolution_note,
        created_at,
        resolved_at
      FROM support_contacts
      WHERE id = $1
      FOR UPDATE
    `,
    [contactId],
  );

  return result.rows[0];
}

async function updateSupportContactResolution(
  client: PgClient,
  dataProtector: DataProtector,
  record: SupportContactRecord,
): Promise<void> {
  await client.query(
    `
      UPDATE support_contacts
      SET
        status = $1,
        resolved_by_operator_user_id = $2,
        resolution_note = $3,
        resolved_at = $4,
        updated_at = now()
      WHERE id = $5
    `,
    [
      record.status,
      record.resolvedByOperatorUserId,
      dataProtector.protectNullableText(record.resolutionNote, 'support_contacts.resolution_note'),
      record.resolvedAt,
      record.contactId,
    ],
  );
}

async function insertSupportContactMessage(
  client: PgClient,
  dataProtector: DataProtector,
  record: SupportContactMessageRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO support_contact_messages (
        id,
        contact_id,
        subscription_id,
        country_code,
        author_role,
        author_user_id,
        body,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      record.messageId,
      record.contactId,
      record.subscriptionId,
      record.countryCode,
      record.authorRole,
      record.authorUserId,
      dataProtector.protectText(record.body, 'support_contact_messages.body'),
      record.createdAt,
    ],
  );
}

async function selectSupportContactMessages(
  client: PgClient,
  contactId: string,
): Promise<readonly SupportContactMessageRow[]> {
  const result = await client.query<SupportContactMessageRow>(
    `
      SELECT
        id AS message_id,
        contact_id,
        subscription_id,
        country_code,
        author_role,
        author_user_id,
        body,
        created_at
      FROM support_contact_messages
      WHERE contact_id = $1
      ORDER BY created_at ASC, id ASC
    `,
    [contactId],
  );

  return result.rows;
}

function mapSupportContactMessageRow(
  dataProtector: DataProtector,
  row: SupportContactMessageRow,
): SupportContactMessageRecord {
  return {
    authorRole: row.author_role,
    authorUserId: row.author_user_id,
    body: dataProtector.revealText(row.body, 'support_contact_messages.body'),
    contactId: row.contact_id,
    countryCode: row.country_code,
    createdAt: row.created_at,
    events: [],
    messageId: row.message_id,
    subscriptionId: row.subscription_id,
  };
}

async function insertSubscriberAddressChangeRequest(
  client: PgClient,
  dataProtector: DataProtector,
  record: SubscriberAddressChangeRequestRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO subscriber_address_change_requests (
        id,
        subscription_id,
        country_code,
        status,
        address_neighborhood,
        address_landmark,
        gps_latitude_ciphertext,
        gps_longitude_ciphertext,
        requested_by_user_id,
        requested_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      record.requestId,
      record.subscriptionId,
      record.countryCode,
      record.status,
      dataProtector.protectText(
        record.address.neighborhood,
        'subscriber_address_change_requests.address_neighborhood',
      ),
      dataProtector.protectText(
        record.address.landmark,
        'subscriber_address_change_requests.address_landmark',
      ),
      protectCoordinate(
        dataProtector,
        record.address.gpsLatitude,
        'subscriber_address_change_requests.gps_latitude',
      ),
      protectCoordinate(
        dataProtector,
        record.address.gpsLongitude,
        'subscriber_address_change_requests.gps_longitude',
      ),
      record.requestedByUserId,
      record.requestedAt,
    ],
  );
}

async function selectPendingSubscriberAddressChangeRequest(
  client: PgClient,
  dataProtector: DataProtector,
  subscriptionId: string,
): Promise<SubscriberAddressChangeRequestRecord | null> {
  const result = await client.query<SubscriberAddressChangeRequestRow>(
    `
      SELECT
        id AS request_id,
        subscription_id,
        country_code,
        status,
        address_neighborhood,
        address_landmark,
        gps_latitude_ciphertext,
        gps_longitude_ciphertext,
        requested_by_user_id,
        requested_at
      FROM subscriber_address_change_requests
      WHERE subscription_id = $1
        AND status = 'pending_review'
      ORDER BY requested_at DESC, id ASC
      LIMIT 1
    `,
    [subscriptionId],
  );
  const row = result.rows[0];

  if (row === undefined) {
    return null;
  }

  return {
    address: {
      gpsLatitude: revealCoordinate(
        dataProtector,
        row.gps_latitude_ciphertext,
        '0',
        'subscriber_address_change_requests.gps_latitude',
      ),
      gpsLongitude: revealCoordinate(
        dataProtector,
        row.gps_longitude_ciphertext,
        '0',
        'subscriber_address_change_requests.gps_longitude',
      ),
      landmark: dataProtector.revealText(
        row.address_landmark,
        'subscriber_address_change_requests.address_landmark',
      ),
      neighborhood: dataProtector.revealText(
        row.address_neighborhood,
        'subscriber_address_change_requests.address_neighborhood',
      ),
    },
    countryCode: row.country_code,
    events: [],
    requestId: row.request_id,
    requestedAt: row.requested_at,
    requestedByUserId: row.requested_by_user_id,
    status: row.status,
    subscriptionId: row.subscription_id,
  };
}

async function selectSubscriberNotificationPreferences(
  client: PgClient,
  subscriptionId: string,
): Promise<SubscriberNotificationPreferencesRow | undefined> {
  const result = await client.query<SubscriberNotificationPreferencesRow>(
    `
      SELECT
        subscription_id,
        subscriber_id,
        country_code,
        sms_reminder,
        push_route,
        push_reveal,
        email_recap,
        updated_by_user_id,
        updated_at
      FROM subscriber_notification_preferences
      WHERE subscription_id = $1
    `,
    [subscriptionId],
  );

  return result.rows[0];
}

async function upsertSubscriberNotificationPreferences(
  client: PgClient,
  record: SubscriberNotificationPreferencesRecord,
): Promise<void> {
  await client.query(
    `
      INSERT INTO subscriber_notification_preferences (
        subscription_id,
        subscriber_id,
        country_code,
        sms_reminder,
        push_route,
        push_reveal,
        email_recap,
        updated_by_user_id,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (subscription_id)
      DO UPDATE SET
        sms_reminder = EXCLUDED.sms_reminder,
        push_route = EXCLUDED.push_route,
        push_reveal = EXCLUDED.push_reveal,
        email_recap = EXCLUDED.email_recap,
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        updated_at = EXCLUDED.updated_at
    `,
    [
      record.subscriptionId,
      record.subscriberId,
      record.countryCode,
      record.smsReminder,
      record.pushRoute,
      record.pushReveal,
      record.emailRecap,
      record.updatedByUserId,
      record.updatedAt,
    ],
  );
}

function mapSubscriberNotificationPreferencesRow(
  row: SubscriberNotificationPreferencesRow,
): SubscriberNotificationPreferencesRecord {
  return {
    countryCode: row.country_code,
    emailRecap: row.email_recap,
    events: [],
    pushReveal: row.push_reveal,
    pushRoute: row.push_route,
    smsReminder: row.sms_reminder,
    subscriberId: row.subscriber_id,
    subscriptionId: row.subscription_id,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
  };
}

function mapWorkerIssueRow(
  dataProtector: DataProtector,
  row: WorkerIssueRow,
): WorkerIssueReportRecord {
  return {
    address: revealSubscriberAddress(dataProtector, row),
    countryCode: row.country_code,
    createdAt: row.created_at,
    description: dataProtector.revealText(row.description, 'worker_issue_reports.description'),
    events: [],
    handledByOperatorUserId: row.handled_by_operator_user_id,
    issueId: row.issue_id,
    issueType: row.issue_type,
    resolutionNote: dataProtector.revealNullableText(
      row.resolution_note,
      'worker_issue_reports.resolution_note',
    ),
    resolvedAt: row.resolved_at,
    scheduledDate: row.scheduled_date,
    scheduledTimeWindow: row.scheduled_time_window,
    status: row.status,
    subscriberPhoneNumber: dataProtector.revealText(
      row.subscriber_phone_number,
      'subscribers.phone_number',
    ),
    subscriptionId: row.subscription_id,
    visitId: row.visit_id,
    workerId: row.worker_id,
  };
}

function mapWorkerAdvanceRequestRow(
  dataProtector: DataProtector,
  row: WorkerAdvanceRequestRow,
): WorkerAdvanceRequestRecord {
  return {
    amount: money(BigInt(row.amount_minor), row.currency_code),
    countryCode: row.country_code,
    events: [],
    month: row.month,
    reason: dataProtector.revealText(row.reason, 'worker_advance_requests.reason'),
    requestedAt: row.requested_at,
    requestId: row.request_id,
    resolvedAt: row.resolved_at,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    resolutionNote: dataProtector.revealNullableText(
      row.resolution_note,
      'worker_advance_requests.resolution_note',
    ),
    status: row.status,
    workerId: row.worker_id,
    workerName: row.worker_name,
  };
}

function mapWorkerPayoutRow(
  dataProtector: DataProtector,
  row: WorkerPayoutRow,
): WorkerPayoutRecord {
  return {
    advanceRequestId: row.advance_request_id,
    amount: money(BigInt(row.amount_minor), row.currency_code),
    countryCode: row.country_code,
    createdByOperatorUserId: row.created_by_operator_user_id,
    events: [],
    failureReason: dataProtector.revealNullableText(
      row.failure_reason,
      'worker_payouts.failure_reason',
    ),
    note: dataProtector.revealText(row.note, 'worker_payouts.note'),
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
  dataProtector: DataProtector,
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
      note: dataProtector.revealText(note.note, 'worker_onboarding_notes.note'),
      operatorUserId: note.operator_user_id,
      stage: note.stage,
    })),
    phoneNumber: dataProtector.revealText(row.phone_number, 'worker_onboarding_cases.phone_number'),
    serviceNeighborhoods: row.service_neighborhoods,
    stage: row.stage,
    updatedAt: row.updated_at,
    workerId: row.worker_id,
  };
}

function mapWorkerUnavailabilityRow(
  dataProtector: DataProtector,
  row: WorkerUnavailabilityRow,
): WorkerUnavailabilityRecord {
  return {
    createdAt: row.created_at,
    date: row.unavailable_date,
    events: [],
    reason: dataProtector.revealText(row.reason, 'worker_unavailability.reason'),
    unavailabilityId: row.unavailability_id,
    workerId: row.worker_id,
  };
}

function mapWorkerSwapRequestRow(
  dataProtector: DataProtector,
  row: WorkerSwapRequestRow,
): WorkerSwapRequestRecord {
  const record: WorkerSwapRequestRecord = {
    countryCode: row.country_code,
    currentWorkerId: row.current_worker_id,
    events: [],
    reason: dataProtector.revealText(row.reason, 'worker_swap_requests.reason'),
    replacementWorkerId: row.replacement_worker_id,
    requestedAt: row.requested_at,
    requestId: row.request_id,
    resolvedAt: row.resolved_at,
    resolvedByOperatorUserId: row.resolved_by_operator_user_id,
    resolutionNote: dataProtector.revealNullableText(
      row.resolution_note,
      'worker_swap_requests.resolution_note',
    ),
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
    subscriberPhoneNumber: dataProtector.revealText(
      row.subscriber_phone_number,
      'subscribers.phone_number',
    ),
  };
}

async function updateVisitCheckIn(
  client: PgClient,
  dataProtector: DataProtector,
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
        check_in_latitude_ciphertext = $4,
        check_in_longitude_ciphertext = $5,
        check_in_verification_method = $6,
        status = 'in_progress',
        updated_at = now()
      WHERE id = $7
    `,
    [
      input.checkedInAt,
      coarseCoordinate(input.location.latitude),
      coarseCoordinate(input.location.longitude),
      protectCoordinate(dataProtector, input.location.latitude, 'visits.check_in_latitude'),
      protectCoordinate(dataProtector, input.location.longitude, 'visits.check_in_longitude'),
      visitVerificationMethod(input.fallbackCode, fallbackCode),
      input.visitId,
    ],
  );
}

async function updateVisitCheckOut(
  client: PgClient,
  dataProtector: DataProtector,
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
        check_out_latitude_ciphertext = $4,
        check_out_longitude_ciphertext = $5,
        check_out_verification_method = $6,
        completed_at = $1,
        status = 'completed',
        updated_at = now()
      WHERE id = $7
    `,
    [
      input.checkedOutAt,
      coarseCoordinate(input.location.latitude),
      coarseCoordinate(input.location.longitude),
      protectCoordinate(dataProtector, input.location.latitude, 'visits.check_out_latitude'),
      protectCoordinate(dataProtector, input.location.longitude, 'visits.check_out_longitude'),
      visitVerificationMethod(input.fallbackCode, fallbackCode),
      input.visitId,
    ],
  );
}

async function upsertVisitPhoto(
  client: PgClient,
  dataProtector: DataProtector,
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
      dataProtector.protectText(input.objectKey, 'visit_photos.object_key'),
      input.contentType,
      input.byteSize,
      input.capturedAt,
    ],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error('Visit photo was not persisted.');
  }

  return toVisitPhotoRecord(dataProtector, row);
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

function assertSubscriberOwnsSubscription(
  record: { readonly subscriber_id: string },
  subscriberUserId: string,
): void {
  if (record.subscriber_id !== subscriberUserId) {
    throw new Error('Subscription was not found.');
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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toVisitPhotoRecord(
  dataProtector: DataProtector,
  row: VisitPhotoRow,
): Omit<VisitPhotoRecord, 'events'> {
  return {
    byteSize: row.byte_size,
    capturedAt: row.captured_at,
    contentType: row.content_type,
    countryCode: row.country_code,
    objectKey: dataProtector.revealText(row.object_key, 'visit_photos.object_key'),
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
  readonly countryCode: CountryCode;
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

function phoneLookupHash(
  dataProtector: DataProtector,
  countryCode: CountryCode,
  phoneNumber: string,
): string {
  return dataProtector.lookupHash(`${countryCode}:${phoneNumber}`, 'phone_number');
}

function phoneLookupHashes(
  dataProtector: DataProtector,
  countryCode: CountryCode,
  phoneNumber: string,
): readonly string[] {
  return dataProtector.lookupHashes(`${countryCode}:${phoneNumber}`, 'phone_number');
}

function emailLookupHash(
  dataProtector: DataProtector,
  countryCode: CountryCode,
  email: string | null | undefined,
): string | null {
  if (email === undefined || email === null) {
    return null;
  }

  return dataProtector.lookupHash(
    `${countryCode}:${email.trim().toLocaleLowerCase('fr')}`,
    'email',
  );
}

function emailLookupHashes(
  dataProtector: DataProtector,
  countryCode: CountryCode,
  email: string,
): readonly string[] {
  return dataProtector.lookupHashes(
    `${countryCode}:${email.trim().toLocaleLowerCase('fr')}`,
    'email',
  );
}

function pushDeviceLookupHash(
  dataProtector: DataProtector,
  userId: string,
  deviceId: string,
): string {
  return dataProtector.lookupHash(`${userId}:${deviceId}`, 'push_device.device_id');
}

function pushDeviceLookupHashes(
  dataProtector: DataProtector,
  userId: string,
  deviceId: string,
): readonly string[] {
  return dataProtector.lookupHashes(`${userId}:${deviceId}`, 'push_device.device_id');
}

function protectCoordinate(dataProtector: DataProtector, value: number, context: string): string {
  return dataProtector.protectText(value.toFixed(6), context);
}

function revealCoordinate(
  dataProtector: DataProtector,
  encryptedValue: string | null | undefined,
  fallbackValue: string,
  context: string,
): number {
  return Number(
    encryptedValue === undefined || encryptedValue === null
      ? fallbackValue
      : dataProtector.revealText(encryptedValue, context),
  );
}

function revealSubscriberAddress<
  T extends {
    readonly gps_latitude: string;
    readonly gps_latitude_ciphertext?: string | null;
    readonly gps_longitude: string;
    readonly gps_longitude_ciphertext?: string | null;
    readonly landmark: string;
    readonly neighborhood: string;
  },
>(dataProtector: DataProtector, row: T): CreateSubscriptionInput['address'] {
  return {
    gpsLatitude: revealCoordinate(
      dataProtector,
      row.gps_latitude_ciphertext,
      row.gps_latitude,
      'subscriber_addresses.gps_latitude',
    ),
    gpsLongitude: revealCoordinate(
      dataProtector,
      row.gps_longitude_ciphertext,
      row.gps_longitude,
      'subscriber_addresses.gps_longitude',
    ),
    landmark: dataProtector.revealText(row.landmark, 'subscriber_addresses.landmark'),
    neighborhood: row.neighborhood,
  };
}

function coarseCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeServiceCell(
  value: string,
): { readonly cellKey: string; readonly displayName: string } | null {
  const displayName = value.trim();

  if (displayName.length === 0) {
    return null;
  }

  return {
    cellKey: displayName.toLocaleLowerCase('fr'),
    displayName,
  };
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

async function upsertSubscriber(
  client: PgClient,
  dataProtector: DataProtector,
  input: CreateSubscriptionInput,
): Promise<string> {
  const existing = await selectSubscriberProfile(
    client,
    dataProtector,
    input.countryCode,
    input.phoneNumber,
  );
  const encryptedPhoneNumber = dataProtector.protectText(
    input.phoneNumber,
    'subscribers.phone_number',
  );
  const phoneNumberLookupHash = phoneLookupHash(
    dataProtector,
    input.countryCode,
    input.phoneNumber,
  );

  if (existing !== undefined) {
    await client.query(
      `
        UPDATE subscribers
        SET
          phone_number = $1,
          phone_number_lookup_hash = $2,
          updated_at = now()
        WHERE id = $3
      `,
      [encryptedPhoneNumber, phoneNumberLookupHash, existing.subscriber_id],
    );
    return existing.subscriber_id;
  }

  const result = await client.query<{ readonly subscriber_id: string }>(
    `
      INSERT INTO subscribers (id, country_code, locale, phone_number, phone_number_lookup_hash)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (country_code, phone_number_lookup_hash)
        WHERE phone_number_lookup_hash IS NOT NULL
      DO UPDATE
      SET
        phone_number = EXCLUDED.phone_number,
        updated_at = now()
      RETURNING id AS subscriber_id
    `,
    [
      input.subscriberUserId ?? randomUUID(),
      input.countryCode,
      'fr',
      encryptedPhoneNumber,
      phoneNumberLookupHash,
    ],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error('Subscriber could not be saved.');
  }

  return row.subscriber_id;
}

async function ensureSubscriberProfile(
  client: PgClient,
  dataProtector: DataProtector,
  input: GetSubscriberProfileInput,
): Promise<void> {
  const existing = await selectSubscriberProfile(
    client,
    dataProtector,
    input.countryCode,
    input.phoneNumber,
  );
  if (existing !== undefined) {
    await client.query(
      `
        UPDATE subscribers
        SET
          phone_number = $1,
          phone_number_lookup_hash = $2,
          updated_at = now()
        WHERE id = $3
      `,
      [
        dataProtector.protectText(input.phoneNumber, 'subscribers.phone_number'),
        phoneLookupHash(dataProtector, input.countryCode, input.phoneNumber),
        existing.subscriber_id,
      ],
    );
    return;
  }

  await client.query(
    `
      INSERT INTO subscribers (id, country_code, locale, phone_number, phone_number_lookup_hash)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (country_code, phone_number_lookup_hash)
        WHERE phone_number_lookup_hash IS NOT NULL
      DO NOTHING
    `,
    [
      input.subscriberUserId,
      input.countryCode,
      'fr',
      dataProtector.protectText(input.phoneNumber, 'subscribers.phone_number'),
      phoneLookupHash(dataProtector, input.countryCode, input.phoneNumber),
    ],
  );
}

async function selectSubscriberProfile(
  client: PgClient,
  dataProtector: DataProtector,
  countryCode: CountryCode,
  phoneNumber: string,
): Promise<SubscriberProfileRow | undefined> {
  const result = await client.query<SubscriberProfileRow>(
    `
      SELECT
        id AS subscriber_id,
        country_code,
        phone_number,
        first_name,
        last_name,
        email,
        avatar_object_key,
        is_adult_confirmed,
        created_at,
        updated_at
      FROM subscribers
      WHERE country_code = $1
        AND (
          phone_number_lookup_hash = $2
          OR (
            phone_number_lookup_hash IS NULL
            AND phone_number = $3
          )
        )
    `,
    [countryCode, phoneLookupHashes(dataProtector, countryCode, phoneNumber), phoneNumber],
  );

  return result.rows[0];
}

function mapSubscriberProfileRow(
  dataProtector: DataProtector,
  row: SubscriberProfileRow,
): SubscriberProfileRecord {
  return {
    avatarObjectKey: dataProtector.revealNullableText(
      row.avatar_object_key,
      'subscribers.avatar_object_key',
    ),
    countryCode: row.country_code,
    createdAt: row.created_at,
    email: dataProtector.revealNullableText(row.email, 'subscribers.email'),
    firstName: dataProtector.revealNullableText(row.first_name, 'subscribers.first_name'),
    isAdultConfirmed: row.is_adult_confirmed,
    lastName: dataProtector.revealNullableText(row.last_name, 'subscribers.last_name'),
    phoneNumber: dataProtector.revealText(row.phone_number, 'subscribers.phone_number'),
    subscriberId: row.subscriber_id,
    updatedAt: row.updated_at,
  };
}

async function insertSubscriberAddress(
  client: PgClient,
  dataProtector: DataProtector,
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
        service_cell_key,
        landmark,
        gps_latitude,
        gps_longitude,
        gps_latitude_ciphertext,
        gps_longitude_ciphertext
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      record.addressId,
      record.subscriberId,
      record.countryCode,
      input.address.neighborhood,
      normalizeNeighborhood(input.address.neighborhood),
      dataProtector.protectText(input.address.landmark, 'subscriber_addresses.landmark'),
      coarseCoordinate(input.address.gpsLatitude),
      coarseCoordinate(input.address.gpsLongitude),
      protectCoordinate(
        dataProtector,
        input.address.gpsLatitude,
        'subscriber_addresses.gps_latitude',
      ),
      protectCoordinate(
        dataProtector,
        input.address.gpsLongitude,
        'subscriber_addresses.gps_longitude',
      ),
    ],
  );
}

async function insertSubscription(
  client: PgClient,
  dataProtector: DataProtector,
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
        preferred_time_window,
        payment_method_provider,
        payment_method_phone_number,
        payment_method_phone_number_lookup_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      input.schedulePreference?.dayOfWeek ?? null,
      input.schedulePreference?.timeWindow ?? null,
      input.paymentMethod?.provider ?? null,
      dataProtector.protectNullableText(
        input.paymentMethod?.phoneNumber,
        'subscriptions.payment_method_phone_number',
      ),
      input.paymentMethod === undefined
        ? null
        : phoneLookupHash(dataProtector, record.countryCode, input.paymentMethod.phoneNumber),
    ],
  );
}

async function insertSubscriberPrivacyRequest(
  client: PgClient,
  dataProtector: DataProtector,
  record: SubscriberPrivacyRequestRecord,
): Promise<void> {
  const detail = record.exportBundle.subscription;

  await client.query(
    `
      INSERT INTO subscriber_privacy_requests (
        id,
        subscription_id,
        subscriber_id,
        country_code,
        request_type,
        status,
        reason,
        requested_by_operator_user_id,
        requested_at,
        export_bundle,
        erasure_plan
      )
      VALUES ($1, $2, $3, $4, $5, 'recorded', $6, $7, $8, $9::jsonb, $10::jsonb)
    `,
    [
      record.requestId,
      record.subscriptionId,
      detail.subscriberId,
      detail.countryCode,
      record.requestType,
      dataProtector.protectText(record.reason, 'subscriber_privacy_requests.reason'),
      record.operatorUserId,
      record.requestedAt,
      stringifyJsonForPostgres(
        dataProtector.protectJson(record.exportBundle, 'subscriber_privacy_requests.export_bundle'),
      ),
      stringifyJsonForPostgres(
        dataProtector.protectJson(record.erasurePlan, 'subscriber_privacy_requests.erasure_plan'),
      ),
    ],
  );
}

async function insertOutboxEvents(
  client: PgClient,
  dataProtector: DataProtector,
  events: readonly DomainEvent[],
): Promise<void> {
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
        stringifyJsonForPostgres(dataProtector.protectJson(event.payload, 'audit_events.payload')),
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
      await insertNotificationMessage(client, dataProtector, message);
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
        stringifyJsonForPostgres(dataProtector.protectJson(event.payload, 'outbox_events.payload')),
        event.actor.role,
        event.actor.userId,
        event.traceId,
        event.occurredAt,
      ],
    );
  }
}

function stringifyJsonForPostgres(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue: unknown) =>
    typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue,
  );
}

async function insertNotificationMessage(
  client: PgClient,
  dataProtector: DataProtector,
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
      stringifyJsonForPostgres(
        dataProtector.protectJson(message.payload, 'notification_messages.payload'),
      ),
      message.status,
      message.provider,
      message.providerReference,
      message.attemptCount,
      message.availableAt,
      message.createdAt,
      message.lastAttemptAt,
      message.sentAt,
      dataProtector.protectNullableText(
        message.failureReason,
        'notification_messages.failure_reason',
      ),
    ],
  );
}

async function updateNotificationDelivery(
  client: PgClient,
  dataProtector: DataProtector,
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
      dataProtector.protectNullableText(
        message.failureReason,
        'notification_messages.failure_reason',
      ),
      message.availableAt,
      message.messageId,
    ],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error('Notification message was not found.');
  }

  return mapNotificationMessageRow(dataProtector, row);
}

async function selectPushTokensForNotificationMessage(
  client: PgClient,
  dataProtector: DataProtector,
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

    return result.rows.map((row) =>
      dataProtector.revealText(row.token, 'push_device_tokens.token'),
    );
  }

  if (message.recipientRole !== 'subscriber' || message.aggregateType !== 'subscription') {
    return [];
  }

  const subscriberResult = await client.query<{ readonly phone_number: string }>(
    `
      SELECT subscriber.phone_number
      FROM subscriptions subscription
      INNER JOIN subscribers subscriber
        ON subscriber.id = subscription.subscriber_id
      WHERE subscription.id = $1
        AND subscription.country_code = $2
      LIMIT 1
    `,
    [message.aggregateId, message.countryCode],
  );
  const subscriber = subscriberResult.rows[0];
  if (subscriber === undefined) {
    return [];
  }

  const subscriberPhoneNumber = dataProtector.revealText(
    subscriber.phone_number,
    'subscribers.phone_number',
  );
  const result = await client.query<{ readonly token: string }>(
    `
      SELECT push_device.token
      FROM auth_users auth_user
      INNER JOIN push_device_tokens push_device
        ON push_device.user_id = auth_user.id
      WHERE auth_user.country_code = $1
        AND auth_user.role = $2
        AND (
          auth_user.phone_number_lookup_hash = ANY($3::text[])
          OR (
            auth_user.phone_number_lookup_hash IS NULL
            AND auth_user.phone_number = $4
          )
        )
        AND push_device.country_code = $1
        AND push_device.role = $2
        AND push_device.status = 'active'
      ORDER BY push_device.last_registered_at DESC, push_device.id ASC
      LIMIT 10
    `,
    [
      message.countryCode,
      message.recipientRole,
      phoneLookupHashes(dataProtector, message.countryCode, subscriberPhoneNumber),
      subscriberPhoneNumber,
    ],
  );

  return result.rows.map((row) => dataProtector.revealText(row.token, 'push_device_tokens.token'));
}

function mapNotificationMessageRow(
  dataProtector: DataProtector,
  row: NotificationMessageRow,
): NotificationMessageRecord {
  return {
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    channel: row.channel,
    countryCode: row.country_code,
    createdAt: row.created_at,
    eventId: row.event_id,
    failureReason: dataProtector.revealNullableText(
      row.failure_reason,
      'notification_messages.failure_reason',
    ),
    lastAttemptAt: row.last_attempt_at,
    messageId: row.message_id,
    payload: dataProtector.revealJson(row.payload, 'notification_messages.payload'),
    provider: row.provider,
    providerReference: row.provider_reference,
    recipientRole: row.recipient_role,
    recipientUserId: row.recipient_user_id,
    sentAt: row.sent_at,
    status: row.status,
    templateKey: row.template_key,
  };
}

function mapPushDeviceRow(dataProtector: DataProtector, row: PushDeviceRow): PushDeviceRecord {
  return {
    app: row.app,
    countryCode: row.country_code,
    createdAt: row.created_at,
    deviceId: dataProtector.revealText(row.device_id, 'push_device_tokens.device_id'),
    environment: row.environment,
    lastRegisteredAt: row.last_registered_at,
    platform: row.platform,
    pushDeviceId: row.push_device_id,
    role: row.role,
    status: row.status,
    token: dataProtector.revealText(row.token, 'push_device_tokens.token'),
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}
