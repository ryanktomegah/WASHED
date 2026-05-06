import { randomUUID } from 'node:crypto';

import { listLomeV1Tiers } from '@washed/core-domain';
import type { DomainEvent, Money } from '@washed/shared';
import Fastify, { type FastifyInstance } from 'fastify';

import { toIsoString, toMoneyDto } from './http-dto.js';
import {
  createObjectStorageProvider,
  type ObjectStorageProvider,
} from './object-storage-provider.js';
import {
  createObservabilityProvider,
  type ObservabilityProvider,
} from './observability-provider.js';
import { getPaymentProviderReadiness } from './payment-provider-readiness.js';
import { getPushProviderReadiness } from './push-provider-readiness.js';
import { createRepositoryFromEnv } from './repository-factory.js';
import {
  type CoreRepository,
  type SupportContactMessageRecord,
  type SupportContactRecord,
} from './repository.js';
import { verifyAccessToken } from './auth-tokens.js';
import type { AuthAccessTokenClaims, AuthRole } from './auth-tokens.js';
import { buildBetaMetrics } from './beta-metrics.js';
import {
  parseAssignWorkerBody,
  parseAdvanceWorkerOnboardingCaseBody,
  parseCancelSubscriptionBody,
  parseChangeSubscriptionTierBody,
  parseChargeSubscriptionBody,
  parseCheckInVisitBody,
  parseCheckOutVisitBody,
  parseCreateWorkerMonthlyPayoutBody,
  parseCreateWorkerOnboardingCaseBody,
  parseCreateWorkerUnavailabilityBody,
  parseCreateWorkerAdvanceRequestBody,
  parseCreateVisitPhotoUploadBody,
  parseCreateCurrentSubscriberAddressChangeRequestBody,
  parseCreateCurrentSubscriberDisputeBody,
  parseCreateCurrentSubscriberPrivacyRequestBody,
  parseCreateCurrentSubscriberSupportContactBody,
  parseCreateCurrentSubscriberSupportContactMessageBody,
  parseCreateCurrentSubscriberWorkerSwapRequestBody,
  parseCreateDisputeBody,
  parseCreateSubscriptionBody,
  parseCreateSupportContactBody,
  parseCancelCurrentSubscriberSubscriptionBody,
  parseChangeCurrentSubscriberSubscriptionTierBody,
  parseGetSupportContactParams,
  parseListSupportContactsRequest,
  parseCreateSubscriberPrivacyRequestBody,
  parseCreateSubscriberSubscriptionBody,
  parseCreateWorkerSwapRequestBody,
  parseDeclineAssignmentCandidateBody,
  parseDeliverDueNotificationMessagesBody,
  parseGetBetaMetricsRequest,
  parseGetWorkerMonthlyEarningsRequest,
  parseGetWorkerRouteRequest,
  parseGetSubscriptionDetailRequest,
  parseIngestPaymentWebhookBody,
  parseIssuePaymentRefundBody,
  parsePauseCurrentSubscriberSubscriptionBody,
  parseListWorkerPayoutsRequest,
  parseListWorkerOnboardingCasesRequest,
  parseListWorkerUnavailabilityRequest,
  parseListWorkerAdvanceRequestsRequest,
  parseListAuditEventsRequest,
  parseListMatchingCandidatesRequest,
  parseListMatchingQueueRequest,
  parseListNotificationMessagesRequest,
  parseListPushDevicesRequest,
  parseListOperatorDisputesRequest,
  parseListPaymentAttemptsRequest,
  parseListSubscriberSupportMatchesRequest,
  parseListSubscriptionBillingRequest,
  parseListServiceCellsRequest,
  parseListWorkerSwapRequestsRequest,
  parseListWorkerIssuesRequest,
  parseRateVisitBody,
  parseRateCurrentSubscriberVisitBody,
  parseRefreshAuthSessionBody,
  parseRegisterPushDeviceBody,
  parseRequestFirstVisitBody,
  parseReportWorkerIssueBody,
  parseResolveDisputeBody,
  parseResolveWorkerAdvanceRequestBody,
  parseResolveWorkerSwapRequestBody,
  parseResolveWorkerIssueBody,
  parseResumeCurrentSubscriberSubscriptionBody,
  parseRescheduleCurrentSubscriberVisitBody,
  parseRescheduleVisitBody,
  parseRunPaymentReconciliationBody,
  parseSkipCurrentSubscriberVisitBody,
  parseSkipVisitBody,
  parseStartOtpChallengeBody,
  parseUploadVisitPhotoBody,
  parseUpsertSubscriberProfileBody,
  parseUpdateCurrentSubscriberPaymentMethodBody,
  parseUpdateSubscriberNotificationPreferencesBody,
  parseUpdateOperatorVisitStatusBody,
  parseUpsertWorkerProfileBody,
  parseVerifyOtpChallengeBody,
} from './validation.js';

export interface CoreApiOptions {
  readonly objectStorageProvider?: ObjectStorageProvider;
  readonly observabilityProvider?: ObservabilityProvider;
  readonly paymentWebhookSecret?: string;
  readonly routeGuardsEnabled?: boolean;
  readonly repository?: CoreRepository;
}

export function createCoreApiApp(options: CoreApiOptions = {}): FastifyInstance {
  const repository = options.repository ?? createRepositoryFromEnv();
  const objectStorageProvider = options.objectStorageProvider ?? createObjectStorageProvider();
  const observabilityProvider = options.observabilityProvider ?? createObservabilityProvider();
  const app = Fastify({
    logger: false,
  });
  const getCurrentSubscriberSubscription = (claims: AuthAccessTokenClaims) =>
    repository.getCurrentSubscriberSubscription({
      countryCode: 'TG',
      phoneNumber: claims.phoneNumber,
      subscriberUserId: claims.sub,
    });

  app.addContentTypeParser(
    /^image\/(jpeg|png|webp)$/u,
    { parseAs: 'buffer' },
    (_request, body, done) => {
      done(null, body);
    },
  );

  app.addHook('onRequest', async (request, reply) => {
    const incomingTraceId = request.headers['x-trace-id'];
    const traceId = typeof incomingTraceId === 'string' ? incomingTraceId : randomUUID();
    request.headers['x-trace-id'] = traceId;
    reply.header('x-trace-id', traceId);

    if (options.routeGuardsEnabled === true) {
      const requiredRole = requiredRoleForRequest(request.method, request.url);

      if (requiredRole !== null) {
        let claims: AuthAccessTokenClaims;

        try {
          claims = verifyAccessToken(readBearerToken(request.headers['authorization']));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Authentication is required.';

          return reply.code(401).send({
            code: 'core.auth.unauthorized',
            message,
            traceId,
          });
        }

        if (claims.role !== requiredRole) {
          return reply.code(403).send({
            code: 'core.auth.forbidden',
            message: `${requiredRole} access is required.`,
            traceId,
          });
        }
      }
    }
  });

  app.setErrorHandler(async (error, request, reply) => {
    const incomingTraceId = request.headers['x-trace-id'];
    const traceId = typeof incomingTraceId === 'string' ? incomingTraceId : randomUUID();

    try {
      await observabilityProvider.captureException({
        error,
        request: {
          method: request.method,
          url: request.url,
        },
        tags: { route: request.routeOptions.url ?? 'unknown' },
        traceId,
      });
    } catch (captureError) {
      process.stderr.write(
        `${JSON.stringify({
          errorName: captureError instanceof Error ? captureError.name : 'NonErrorException',
          message:
            captureError instanceof Error ? captureError.message : 'Observability capture failed',
          service: 'core-api',
          traceId,
        })}\n`,
      );
    }

    return reply.code(500).send({
      code: 'core.internal_error',
      message: 'Une erreur est survenue. Réessayez ou contactez le support.',
      traceId,
    });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async () => ({
    repository: await repository.health(),
    status: 'ok',
  }));

  app.put('/local-object-storage/*', async (_request, reply) => reply.code(204).send());

  app.get('/v1/pricing/lome', async () => ({
    countryCode: 'TG',
    tiers: listLomeV1Tiers().map((tier) => ({
      code: tier.code,
      monthlyPrice: toMoneyDto(tier.monthlyPrice),
      nameKey: tier.nameKey,
      visitsPerCycle: tier.visitsPerCycle,
    })),
  }));

  app.post('/v1/payments/webhooks', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    if (!isValidPaymentWebhookSecret(request.headers['x-payment-webhook-secret'], options)) {
      return reply.code(401).send({
        code: 'core.payment_webhook.unauthorized',
        message: 'Payment webhook secret is invalid.',
        traceId: parsedTraceId,
      });
    }

    try {
      const input = parseIngestPaymentWebhookBody(request.body, parsedTraceId);
      const attempt = await repository.ingestPaymentWebhook(input);

      return reply.code(200).send(toPaymentAttemptDto(attempt));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.payment_webhook.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/auth/otp/start', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseStartOtpChallengeBody(request.body, parsedTraceId);
      const challenge = await repository.startOtpChallenge(input);

      return reply.code(201).send({
        challengeId: challenge.challengeId,
        expiresAt: toIsoString(challenge.expiresAt),
        phoneNumber: challenge.phoneNumber,
        provider: challenge.provider,
        testCode: challenge.testCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.auth_otp_start.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/auth/otp/verify', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseVerifyOtpChallengeBody(request.body, parsedTraceId);
      const session = await repository.verifyOtpChallenge(input);

      return reply.code(200).send(toAuthSessionDto(session));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.auth_otp_verify.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/auth/refresh', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseRefreshAuthSessionBody(request.body, parsedTraceId);
      const session = await repository.refreshAuthSession(input);

      return reply.code(200).send(toAuthSessionDto(session));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.auth_refresh.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriber/profile', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_profile.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const profile = await repository.getSubscriberProfile({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      return reply.code(200).send(toSubscriberProfileDto(profile));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_profile.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.put('/v1/subscriber/profile', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_profile.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const input = parseUpsertSubscriberProfileBody(
        request.body,
        {
          countryCode: 'TG',
          phoneNumber: claims.phoneNumber,
          subscriberUserId: claims.sub,
        },
        parsedTraceId,
      );
      const profile = await repository.upsertSubscriberProfile(input);

      return reply.code(200).send(toSubscriberProfileDto(profile));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_profile.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriber/subscription', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const subscription = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      return reply.code(200).send({
        subscription: subscription === null ? null : toSubscriptionDetailDto(subscription),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_subscription.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriber/notification-preferences', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_notification_preferences.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const preferences = await repository.getSubscriberNotificationPreferences({
        subscriberUserId: claims.sub,
        subscriptionId: current.subscriptionId,
      });

      return reply.code(200).send(toSubscriberNotificationPreferencesDto(preferences));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_notification_preferences.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.put('/v1/subscriber/notification-preferences', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_notification_preferences.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseUpdateSubscriberNotificationPreferencesBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const preferences = await repository.updateSubscriberNotificationPreferences(input);

      return reply.code(200).send(toSubscriberNotificationPreferencesDto(preferences));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_notification_preferences.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/address-change-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseCreateCurrentSubscriberAddressChangeRequestBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const record = await repository.createSubscriberAddressChangeRequest(input);

      return reply.code(201).send(toSubscriberAddressChangeRequestDto(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_address_change.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      if (current !== null && current.status !== 'cancelled') {
        return reply.code(409).send({
          code: 'core.subscriber_subscription.already_exists',
          message: 'Subscriber already has a current subscription.',
          traceId: parsedTraceId,
        });
      }

      const input = parseCreateSubscriberSubscriptionBody(
        request.body,
        {
          countryCode: 'TG',
          phoneNumber: claims.phoneNumber,
          subscriberUserId: claims.sub,
        },
        parsedTraceId,
      );
      const subscription = await repository.createSubscription(input);

      return reply.code(201).send(toCreatedSubscriptionDto(subscription));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_subscription.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/first-visit-request', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const input = parseRequestFirstVisitBody(
        request.body,
        {
          countryCode: 'TG',
          phoneNumber: claims.phoneNumber,
          subscriberUserId: claims.sub,
        },
        parsedTraceId,
      );
      const subscription = await repository.requestFirstVisit(input);

      return reply.code(200).send(toSubscriptionDetailDto(subscription));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_first_visit.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriber/subscription/billing-history', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseListSubscriptionBillingRequest(current.subscriptionId, request.query);
      const items = await repository.listSubscriptionBilling(input);

      return reply.code(200).send({
        items: items.map(toSubscriptionBillingItemDto),
        limit: input.limit,
        subscriptionId: input.subscriptionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_billing.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/tier', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseChangeCurrentSubscriberSubscriptionTierBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      await repository.changeSubscriptionTier(input);
      const detail = await repository.getSubscriptionDetail({
        countryCode: current.countryCode,
        subscriptionId: current.subscriptionId,
      });

      return reply.code(200).send(toSubscriptionDetailDto(detail));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_tier.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/pause', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parsePauseCurrentSubscriberSubscriptionBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      await repository.pauseSubscription(input);
      const detail = await repository.getSubscriptionDetail({
        countryCode: current.countryCode,
        subscriptionId: current.subscriptionId,
      });

      return reply.code(200).send(toSubscriptionDetailDto(detail));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_pause.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/resume', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseResumeCurrentSubscriberSubscriptionBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      await repository.resumeSubscription(input);
      const detail = await repository.getSubscriptionDetail({
        countryCode: current.countryCode,
        subscriptionId: current.subscriptionId,
      });

      return reply.code(200).send(toSubscriptionDetailDto(detail));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_resume.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.put('/v1/subscriber/subscription/payment-method', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseUpdateCurrentSubscriberPaymentMethodBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      await repository.updateSubscriptionPaymentMethod(input);
      const detail = await repository.getSubscriptionDetail({
        countryCode: current.countryCode,
        subscriptionId: current.subscriptionId,
      });

      return reply.code(200).send(toSubscriptionDetailDto(detail));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_payment_method.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/cancel', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await repository.getCurrentSubscriberSubscription({
        countryCode: 'TG',
        phoneNumber: claims.phoneNumber,
        subscriberUserId: claims.sub,
      });

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseCancelCurrentSubscriberSubscriptionBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      await repository.cancelSubscription(input);
      const detail = await repository.getSubscriptionDetail({
        countryCode: current.countryCode,
        subscriptionId: current.subscriptionId,
      });

      return reply.code(200).send(toSubscriptionDetailDto(detail));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_cancel.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/worker-swap-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseCreateCurrentSubscriberWorkerSwapRequestBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const swapRequest = await repository.createWorkerSwapRequest(input);

      return reply.code(201).send(toWorkerSwapRequestDto(swapRequest));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_worker_swap_request.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriber/subscription/visits/:visitId', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const detail = await repository.getSubscriberVisitDetail({
        countryCode: current.countryCode,
        subscriberUserId: claims.sub,
        subscriptionId: current.subscriptionId,
        visitId: params.visitId ?? '',
      });

      return reply.code(200).send(toSubscriberVisitDetailDto(detail));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_visit_detail.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/visits/:visitId/reschedule', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseRescheduleCurrentSubscriberVisitBody(
        current.subscriptionId,
        params.visitId ?? '',
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const visit = await repository.rescheduleVisit(input);

      return reply.code(200).send({
        scheduledDate: visit.scheduledDate,
        scheduledTimeWindow: visit.scheduledTimeWindow,
        status: visit.status,
        subscriptionId: visit.subscriptionId,
        visitId: visit.visitId,
        workerId: visit.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_visit_reschedule.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/visits/:visitId/skip', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseSkipCurrentSubscriberVisitBody(
        current.subscriptionId,
        params.visitId ?? '',
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const visit = await repository.skipVisit(input);

      return reply.code(200).send({
        status: visit.status,
        subscriptionId: visit.subscriptionId,
        visitId: visit.visitId,
        workerId: visit.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_visit_skip.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/visits/:visitId/disputes', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseCreateCurrentSubscriberDisputeBody(
        current.subscriptionId,
        params.visitId ?? '',
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const dispute = await repository.createDispute(input);

      return reply.code(201).send(toDisputeDto(dispute));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_dispute_create.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/visits/:visitId/rating', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseRateCurrentSubscriberVisitBody(
        current.subscriptionId,
        params.visitId ?? '',
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const rating = await repository.rateVisit(input);

      return reply.code(201).send(toVisitRatingDto(rating));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_visit_rating.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriber/subscription/support-contacts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseCreateCurrentSubscriberSupportContactBody(
        current.subscriptionId,
        request.body,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const record = await repository.createSupportContact(input);
      return reply.code(201).send(toSupportContactDto(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return reply.code(400).send({
        code: 'core.subscriber_support_contact_create.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriber/subscription/support-contacts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseListSupportContactsRequest(current.subscriptionId, request.query);
      const items = await repository.listSupportContactsForSubscription(input);
      return reply.code(200).send({
        items: items.map((item) => toSupportContactDto(item)),
        limit: input.limit,
        status: input.status ?? null,
        subscriptionId: input.subscriptionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return reply.code(400).send({
        code: 'core.subscriber_support_contact_list.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriber/subscription/support-contacts/:contactId', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { contactId?: string };

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseGetSupportContactParams(current.subscriptionId, params.contactId ?? '');
      const record = await repository.getSupportContact(input);
      if (record === null) {
        return reply.code(404).send({
          code: 'core.subscriber_support_contact_get.not_found',
          message: 'Support contact was not found.',
          traceId: parsedTraceId,
        });
      }
      const messages = await repository.listSupportContactMessages(input);
      return reply.code(200).send(toSupportContactDto(record, messages));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return reply.code(400).send({
        code: 'core.subscriber_support_contact_get.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post(
    '/v1/subscriber/subscription/support-contacts/:contactId/messages',
    async (request, reply) => {
      const traceId = request.headers['x-trace-id'];
      const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
      const params = request.params as { contactId?: string };

      let claims: AuthAccessTokenClaims;

      try {
        claims = readSubscriberClaims(request.headers['authorization']);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Authentication is required.';

        return reply.code(401).send({
          code: 'core.subscriber_subscription.unauthorized',
          message,
          traceId: parsedTraceId,
        });
      }

      try {
        const current = await getCurrentSubscriberSubscription(claims);

        if (current === null) {
          return reply.code(404).send({
            code: 'core.subscriber_subscription.not_found',
            message: 'Subscription was not found.',
            traceId: parsedTraceId,
          });
        }

        const input = parseCreateCurrentSubscriberSupportContactMessageBody(
          current.subscriptionId,
          params.contactId ?? '',
          request.body,
          { subscriberUserId: claims.sub },
          parsedTraceId,
        );
        const record = await repository.createSupportContactMessage(input);

        return reply.code(201).send(toSupportContactMessageDto(record));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';

        return reply.code(400).send({
          code: 'core.subscriber_support_contact_message.invalid_request',
          message,
          traceId: parsedTraceId,
        });
      }
    },
  );

  app.post('/v1/subscriber/subscription/privacy-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    let claims: AuthAccessTokenClaims;

    try {
      claims = readSubscriberClaims(request.headers['authorization']);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication is required.';

      return reply.code(401).send({
        code: 'core.subscriber_subscription.unauthorized',
        message,
        traceId: parsedTraceId,
      });
    }

    try {
      const current = await getCurrentSubscriberSubscription(claims);

      if (current === null) {
        return reply.code(404).send({
          code: 'core.subscriber_subscription.not_found',
          message: 'Subscription was not found.',
          traceId: parsedTraceId,
        });
      }

      const input = parseCreateCurrentSubscriberPrivacyRequestBody(
        request.body,
        current.subscriptionId,
        { subscriberUserId: claims.sub },
        parsedTraceId,
      );
      const privacyRequest = await repository.createSubscriberPrivacyRequest(input);

      return reply.code(201).send(toSubscriberPrivacyRequestDto(privacyRequest));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscriber_privacy_request.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/devices/push-token', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const claims = verifyAccessToken(readBearerToken(request.headers['authorization']));
      const input = parseRegisterPushDeviceBody(request.body, {
        countryCode: 'TG',
        role: claims.role,
        userId: claims.sub,
      });
      const device = await repository.registerPushDevice(input);

      return reply.code(201).send(toPushDeviceDto(device));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.push_device.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseCreateSubscriptionBody(request.body, parsedTraceId);
      const subscription = await repository.createSubscription(input);

      return reply.code(201).send(toCreatedSubscriptionDto(subscription));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscription.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/assignment', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseAssignWorkerBody(params.subscriptionId ?? '', request.body, parsedTraceId);
      const assignment = await repository.assignWorker(input);

      return reply.code(200).send({
        status: assignment.status,
        subscriptionId: assignment.subscriptionId,
        visits: assignment.visits,
        workerId: assignment.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.assignment.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post(
    '/v1/operator/subscriptions/:subscriptionId/assignment-decisions',
    async (request, reply) => {
      const traceId = request.headers['x-trace-id'];
      const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
      const params = request.params as { subscriptionId?: string };

      try {
        const input = parseDeclineAssignmentCandidateBody(
          params.subscriptionId ?? '',
          request.body,
          parsedTraceId,
        );
        const decision = await repository.declineAssignmentCandidate(input);

        return reply.code(201).send({
          anchorDate: decision.anchorDate,
          createdAt: toIsoString(decision.createdAt),
          decision: decision.decision,
          decisionId: decision.decisionId,
          operatorUserId: decision.operatorUserId,
          reason: decision.reason,
          subscriptionId: decision.subscriptionId,
          workerId: decision.workerId,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';

        return reply.code(400).send({
          code: 'core.assignment_decision.invalid_request',
          message,
          traceId: parsedTraceId,
        });
      }
    },
  );

  app.get('/v1/subscriptions/:subscriptionId', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseGetSubscriptionDetailRequest(params.subscriptionId ?? '');
      const detail = await repository.getSubscriptionDetail(input);

      return reply.code(200).send(toSubscriptionDetailDto(detail));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscription_detail.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriptions/:subscriptionId/billing-history', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseListSubscriptionBillingRequest(params.subscriptionId ?? '', request.query);
      const items = await repository.listSubscriptionBilling(input);

      return reply.code(200).send({
        items: items.map(toSubscriptionBillingItemDto),
        limit: input.limit,
        subscriptionId: input.subscriptionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscription_billing.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/cancel', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseCancelSubscriptionBody(
        params.subscriptionId ?? '',
        request.body,
        parsedTraceId,
      );
      const subscription = await repository.cancelSubscription(input);

      return reply.code(200).send({
        cancelledAt: toIsoString(subscription.cancelledAt),
        cancelledScheduledVisits: subscription.cancelledScheduledVisits,
        status: subscription.status,
        subscriptionId: subscription.subscriptionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscription_cancel.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/tier', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseChangeSubscriptionTierBody(
        params.subscriptionId ?? '',
        request.body,
        parsedTraceId,
      );
      const subscription = await repository.changeSubscriptionTier(input);

      return reply.code(200).send({
        effectiveAt: toIsoString(subscription.effectiveAt),
        monthlyPriceMinor: subscription.monthlyPriceMinor.toString(),
        previousTierCode: subscription.previousTierCode,
        status: subscription.status,
        subscriptionId: subscription.subscriptionId,
        tierCode: subscription.tierCode,
        visitsPerCycle: subscription.visitsPerCycle,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.subscription_tier.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/mock-charge', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseChargeSubscriptionBody(
        params.subscriptionId ?? '',
        request.body,
        parsedTraceId,
      );
      const attempt = await repository.chargeSubscription(input);

      return reply.code(200).send(toPaymentAttemptDto(attempt));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.payment_charge.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/worker-swap-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseCreateWorkerSwapRequestBody(
        params.subscriptionId ?? '',
        request.body,
        parsedTraceId,
      );
      const swapRequest = await repository.createWorkerSwapRequest(input);

      return reply.code(201).send(toWorkerSwapRequestDto(swapRequest));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_swap_request.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/matching-queue', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListMatchingQueueRequest(request.query);
      const items = await repository.listMatchingQueue(input);

      return reply.code(200).send({
        countryCode: input.countryCode,
        items: items.map((item) => ({
          address: item.address,
          assignmentDueAt: toIsoString(item.assignmentDueAt),
          monthlyPriceMinor: item.monthlyPriceMinor.toString(),
          phoneNumber: item.phoneNumber,
          queuedAt: toIsoString(item.queuedAt),
          schedulePreference: item.schedulePreference,
          status: item.status,
          subscriberId: item.subscriberId,
          subscriptionId: item.subscriptionId,
          tierCode: item.tierCode,
          visitsPerCycle: item.visitsPerCycle,
        })),
        limit: input.limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.matching_queue.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.put('/v1/operator/workers/:workerId/profile', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseUpsertWorkerProfileBody(params.workerId ?? '', request.body);
      const worker = await repository.upsertWorkerProfile(input);

      return reply.code(200).send(worker);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_profile.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/worker-onboarding-cases', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseCreateWorkerOnboardingCaseBody(request.body, parsedTraceId);
      const onboardingCase = await repository.createWorkerOnboardingCase(input);

      return reply.code(201).send(toWorkerOnboardingCaseDto(onboardingCase));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_onboarding_case.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/worker-onboarding-cases', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListWorkerOnboardingCasesRequest(request.query);
      const cases = await repository.listWorkerOnboardingCases(input);

      return reply.code(200).send({
        items: cases.map(toWorkerOnboardingCaseDto),
        limit: input.limit,
        stage: input.stage ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_onboarding_cases.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/worker-onboarding-cases/:caseId/advance', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { caseId?: string };

    try {
      const input = parseAdvanceWorkerOnboardingCaseBody(
        params.caseId ?? '',
        request.body,
        parsedTraceId,
      );
      const onboardingCase = await repository.advanceWorkerOnboardingCase(input);

      return reply.code(200).send(toWorkerOnboardingCaseDto(onboardingCase));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_onboarding_case_advance.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get(
    '/v1/operator/subscriptions/:subscriptionId/matching-candidates',
    async (request, reply) => {
      const traceId = request.headers['x-trace-id'];
      const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
      const params = request.params as { subscriptionId?: string };

      try {
        const input = parseListMatchingCandidatesRequest(
          params.subscriptionId ?? '',
          request.query,
        );
        const candidates = await repository.listMatchingCandidates(input);

        return reply.code(200).send({
          candidates,
          limit: input.limit,
          subscriptionId: input.subscriptionId,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';

        return reply.code(400).send({
          code: 'core.matching_candidates.invalid_request',
          message,
          traceId: parsedTraceId,
        });
      }
    },
  );

  app.get('/v1/operator/service-cells', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListServiceCellsRequest(request.query);
      const cells = await repository.listServiceCells(input);

      return reply.code(200).send({
        date: input.date,
        items: cells,
        limit: input.limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.service_cells.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/audit-events', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListAuditEventsRequest(request.query);
      const events = await repository.listAuditEvents(input);

      return reply.code(200).send({
        countryCode: input.countryCode,
        filters: {
          aggregateId: input.aggregateId ?? null,
          aggregateType: input.aggregateType ?? null,
          eventType: input.eventType ?? null,
        },
        items: events.map(toAuditEventDto),
        limit: input.limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.audit_events.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/notifications', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListNotificationMessagesRequest(request.query);
      const messages = await repository.listNotificationMessages(input);

      return reply.code(200).send({
        countryCode: input.countryCode,
        filters: {
          aggregateId: input.aggregateId ?? null,
          aggregateType: input.aggregateType ?? null,
          channel: input.channel ?? null,
          status: input.status ?? null,
          templateKey: input.templateKey ?? null,
        },
        items: messages.map(toNotificationMessageDto),
        limit: input.limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.notifications.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/payment-attempts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListPaymentAttemptsRequest(request.query);
      const attempts = await repository.listPaymentAttempts(input);

      return reply.code(200).send({
        countryCode: input.countryCode,
        filters: {
          provider: input.provider ?? null,
          status: input.status ?? null,
        },
        items: attempts.map(toPaymentAttemptSummaryDto),
        limit: input.limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.payment_attempts.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/beta-metrics', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseGetBetaMetricsRequest(request.query);
      const metrics = await buildBetaMetrics(repository, input);

      return reply.code(200).send({
        ...metrics,
        generatedAt: toIsoString(metrics.generatedAt),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.beta_metrics.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/payment-attempts/:paymentAttemptId/refunds', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { paymentAttemptId?: string };

    try {
      const input = parseIssuePaymentRefundBody(
        params.paymentAttemptId ?? '',
        request.body,
        parsedTraceId,
      );
      const refund = await repository.issuePaymentRefund(input);

      return reply.code(201).send(toPaymentRefundDto(refund));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.payment_refund.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/payment-reconciliation-runs', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseRunPaymentReconciliationBody(request.body, parsedTraceId);
      const run = await repository.runPaymentReconciliation(input);

      return reply.code(201).send(toPaymentReconciliationRunDto(run));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.payment_reconciliation.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/payment-provider-readiness', async (request, reply) =>
    reply.code(200).send(getPaymentProviderReadiness()),
  );

  app.get('/v1/operator/subscriber-support-matches', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListSubscriberSupportMatchesRequest(request.query);
      const items = await repository.listSubscriberSupportMatches(input);

      return reply.code(200).send({
        countryCode: input.countryCode,
        items: items.map(toSubscriberSupportMatchDto),
        limit: input.limit,
        phoneNumber: input.phoneNumber ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.operator_support_search.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/subscriptions/:subscriptionId/support-context', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const detailInput = parseGetSubscriptionDetailRequest(params.subscriptionId ?? '');
      const [detail, billingItems, disputes, notifications] = await Promise.all([
        repository.getSubscriptionDetail(detailInput),
        repository.listSubscriptionBilling({
          countryCode: detailInput.countryCode,
          limit: 25,
          subscriptionId: detailInput.subscriptionId,
        }),
        repository.listOperatorDisputes({ countryCode: detailInput.countryCode, limit: 100 }),
        repository.listNotificationMessages({
          aggregateId: detailInput.subscriptionId,
          countryCode: detailInput.countryCode,
          limit: 25,
        }),
      ]);

      return reply.code(200).send({
        billingHistory: billingItems.map(toSubscriptionBillingItemDto),
        disputes: disputes
          .filter((dispute) => dispute.subscriptionId === detailInput.subscriptionId)
          .map(toDisputeDto),
        notifications: notifications.map(toNotificationMessageDto),
        subscription: toSubscriptionDetailDto(detail),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.operator_support.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post(
    '/v1/operator/subscriptions/:subscriptionId/privacy-requests',
    async (request, reply) => {
      const traceId = request.headers['x-trace-id'];
      const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
      const params = request.params as { subscriptionId?: string };

      try {
        const input = parseCreateSubscriberPrivacyRequestBody(
          request.body,
          params.subscriptionId ?? '',
          parsedTraceId,
        );
        const privacyRequest = await repository.createSubscriberPrivacyRequest(input);

        return reply.code(201).send(toSubscriberPrivacyRequestDto(privacyRequest));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';

        return reply.code(400).send({
          code: 'core.operator_privacy_request.invalid_request',
          message,
          traceId: parsedTraceId,
        });
      }
    },
  );

  app.get('/v1/operator/push-devices', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListPushDevicesRequest(request.query);
      const devices = await repository.listPushDevices(input);

      return reply.code(200).send({
        countryCode: input.countryCode,
        filters: {
          role: input.role ?? null,
          status: input.status ?? null,
        },
        items: devices.map(toPushDeviceDto),
        limit: input.limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.push_devices.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/push-provider-readiness', async (request, reply) =>
    reply.code(200).send(getPushProviderReadiness()),
  );

  app.post('/v1/operator/notifications/deliver-due', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseDeliverDueNotificationMessagesBody(request.body);
      const messages = await repository.deliverDueNotificationMessages(input);

      return reply.code(200).send({
        countryCode: input.countryCode,
        deliveredAt: toIsoString(input.deliveredAt),
        items: messages.map(toNotificationMessageDto),
        limit: input.limit,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.notification_delivery.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/visits/:visitId/check-in', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    try {
      const input = parseCheckInVisitBody(params.visitId ?? '', request.body, parsedTraceId);
      const visit = await repository.checkInVisit(input);

      return reply.code(200).send({
        checkedInAt: toIsoString(visit.checkedInAt),
        status: visit.status,
        visitId: visit.visitId,
        workerId: visit.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.visit_check_in.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/visits/:visitId/check-out', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    try {
      const input = parseCheckOutVisitBody(params.visitId ?? '', request.body, parsedTraceId);
      const visit = await repository.checkOutVisit(input);

      return reply.code(200).send({
        bonus: toMoneyDto(visit.bonus),
        checkedOutAt: toIsoString(visit.checkedOutAt),
        status: visit.status,
        visitId: visit.visitId,
        workerId: visit.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.visit_check_out.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/visits/:visitId/worker-issues', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    try {
      const input = parseReportWorkerIssueBody(params.visitId ?? '', request.body, parsedTraceId);
      const issue = await repository.reportWorkerIssue(input);

      return reply.code(201).send(toWorkerIssueDto(issue));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_issue.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/visits/:visitId/photos', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    try {
      const input = parseUploadVisitPhotoBody(params.visitId ?? '', request.body, parsedTraceId);
      const photo = await repository.uploadVisitPhoto(input);

      return reply.code(201).send({
        byteSize: photo.byteSize,
        capturedAt: toIsoString(photo.capturedAt),
        contentType: photo.contentType,
        objectKey: photo.objectKey,
        photoId: photo.photoId,
        photoType: photo.photoType,
        uploadedAt: toIsoString(photo.uploadedAt),
        visitId: photo.visitId,
        workerId: photo.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.visit_photo.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/visits/:visitId/photo-uploads', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    try {
      const input = parseCreateVisitPhotoUploadBody(
        params.visitId ?? '',
        request.body,
        parsedTraceId,
      );
      const upload = await objectStorageProvider.createUploadUrl(input);

      return reply.code(201).send({
        expiresAt: toIsoString(upload.expiresAt),
        headers: upload.headers,
        method: upload.method,
        objectKey: upload.objectKey,
        provider: upload.provider,
        uploadUrl: upload.uploadUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.visit_photo_upload.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post(
    '/v1/subscriptions/:subscriptionId/visits/:visitId/reschedule',
    async (request, reply) => {
      const traceId = request.headers['x-trace-id'];
      const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
      const params = request.params as { subscriptionId?: string; visitId?: string };

      try {
        const input = parseRescheduleVisitBody(
          params.subscriptionId ?? '',
          params.visitId ?? '',
          request.body,
          parsedTraceId,
        );
        const visit = await repository.rescheduleVisit(input);

        return reply.code(200).send({
          scheduledDate: visit.scheduledDate,
          scheduledTimeWindow: visit.scheduledTimeWindow,
          status: visit.status,
          subscriptionId: visit.subscriptionId,
          visitId: visit.visitId,
          workerId: visit.workerId,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';

        return reply.code(400).send({
          code: 'core.visit_reschedule.invalid_request',
          message,
          traceId: parsedTraceId,
        });
      }
    },
  );

  app.post('/v1/subscriptions/:subscriptionId/visits/:visitId/skip', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string; visitId?: string };

    try {
      const input = parseSkipVisitBody(
        params.subscriptionId ?? '',
        params.visitId ?? '',
        request.body,
        parsedTraceId,
      );
      const visit = await repository.skipVisit(input);

      return reply.code(200).send({
        status: visit.status,
        subscriptionId: visit.subscriptionId,
        visitId: visit.visitId,
        workerId: visit.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.visit_skip.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/visits/:visitId/status', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { visitId?: string };

    try {
      const input = parseUpdateOperatorVisitStatusBody(
        params.visitId ?? '',
        request.body,
        parsedTraceId,
      );
      const visit = await repository.updateOperatorVisitStatus(input);

      return reply.code(200).send({
        note: visit.note,
        previousStatus: visit.previousStatus,
        status: visit.status,
        subscriptionId: visit.subscriptionId,
        updatedAt: toIsoString(visit.updatedAt),
        visitId: visit.visitId,
        workerId: visit.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.operator_visit_status.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/visits/:visitId/disputes', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string; visitId?: string };

    try {
      const input = parseCreateDisputeBody(
        params.subscriptionId ?? '',
        params.visitId ?? '',
        request.body,
        parsedTraceId,
      );
      const dispute = await repository.createDispute(input);

      return reply.code(201).send(toDisputeDto(dispute));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.dispute_create.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/visits/:visitId/rating', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string; visitId?: string };

    try {
      const input = parseRateVisitBody(
        params.subscriptionId ?? '',
        params.visitId ?? '',
        request.body,
        parsedTraceId,
      );
      const rating = await repository.rateVisit(input);

      return reply.code(201).send(toVisitRatingDto(rating));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.visit_rating.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/subscriptions/:subscriptionId/support-contacts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseCreateSupportContactBody(
        params.subscriptionId ?? '',
        request.body,
        parsedTraceId,
      );
      const record = await repository.createSupportContact(input);
      return reply.code(201).send(toSupportContactDto(record));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return reply.code(400).send({
        code: 'core.support_contact_create.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/subscriptions/:subscriptionId/support-contacts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { subscriptionId?: string };

    try {
      const input = parseListSupportContactsRequest(params.subscriptionId ?? '', request.query);
      const items = await repository.listSupportContactsForSubscription(input);
      return reply.code(200).send({
        items: items.map((item) => toSupportContactDto(item)),
        limit: input.limit,
        status: input.status ?? null,
        subscriptionId: input.subscriptionId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';
      return reply.code(400).send({
        code: 'core.support_contact_list.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get(
    '/v1/subscriptions/:subscriptionId/support-contacts/:contactId',
    async (request, reply) => {
      const traceId = request.headers['x-trace-id'];
      const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
      const params = request.params as { subscriptionId?: string; contactId?: string };

      try {
        const input = parseGetSupportContactParams(
          params.subscriptionId ?? '',
          params.contactId ?? '',
        );
        const record = await repository.getSupportContact(input);
        if (record === null) {
          return reply.code(404).send({
            code: 'core.support_contact_get.not_found',
            message: 'Support contact was not found.',
            traceId: parsedTraceId,
          });
        }
        return reply.code(200).send(toSupportContactDto(record));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid request.';
        return reply.code(400).send({
          code: 'core.support_contact_get.invalid_request',
          message,
          traceId: parsedTraceId,
        });
      }
    },
  );

  app.get('/v1/operator/disputes', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListOperatorDisputesRequest(request.query);
      const disputes = await repository.listOperatorDisputes(input);

      return reply.code(200).send({
        items: disputes.map(toDisputeDto),
        limit: input.limit,
        status: input.status ?? null,
        subscriptionId: input.subscriptionId ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.disputes.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/disputes/:disputeId/resolve', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { disputeId?: string };

    try {
      const input = parseResolveDisputeBody(params.disputeId ?? '', request.body, parsedTraceId);
      const dispute = await repository.resolveDispute(input);

      return reply.code(200).send(toDisputeDto(dispute));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.dispute_resolve.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/worker-issues', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListWorkerIssuesRequest(request.query);
      const issues = await repository.listWorkerIssues(input);

      return reply.code(200).send({
        items: issues.map(toWorkerIssueDto),
        limit: input.limit,
        status: input.status ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_issues.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/worker-issues/:issueId/resolve', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { issueId?: string };

    try {
      const input = parseResolveWorkerIssueBody(params.issueId ?? '', request.body, parsedTraceId);
      const issue = await repository.resolveWorkerIssue(input);

      return reply.code(200).send(toWorkerIssueDto(issue));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_issue_resolve.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/worker-swap-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListWorkerSwapRequestsRequest(request.query);
      const requests = await repository.listWorkerSwapRequests(input);

      return reply.code(200).send({
        items: requests.map(toWorkerSwapRequestDto),
        limit: input.limit,
        status: input.status ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_swap_requests.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/worker-swap-requests/:requestId/resolve', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { requestId?: string };

    try {
      const input = parseResolveWorkerSwapRequestBody(
        params.requestId ?? '',
        request.body,
        parsedTraceId,
      );
      const swapRequest = await repository.resolveWorkerSwapRequest(input);

      return reply.code(200).send(toWorkerSwapRequestDto(swapRequest));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_swap_request_resolve.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/workers/:workerId/route', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseGetWorkerRouteRequest(params.workerId ?? '', request.query);
      const route = await repository.getWorkerRoute(input);

      return reply.code(200).send(route);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_route.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/workers/:workerId/profile', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const worker = await repository.getWorkerProfile(params.workerId ?? '');

      return reply.code(200).send(worker);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_profile.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/workers/:workerId/unavailability', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseCreateWorkerUnavailabilityBody(
        params.workerId ?? '',
        request.body,
        parsedTraceId,
      );
      const unavailability = await repository.createWorkerUnavailability(input);

      return reply.code(201).send(toWorkerUnavailabilityDto(unavailability));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_unavailability.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/workers/:workerId/unavailability', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseListWorkerUnavailabilityRequest(params.workerId ?? '', request.query);
      const records = await repository.listWorkerUnavailability(input);

      return reply.code(200).send({
        items: records.map(toWorkerUnavailabilityDto),
        limit: input.limit,
        workerId: input.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_unavailability.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/workers/:workerId/earnings', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseGetWorkerMonthlyEarningsRequest(params.workerId ?? '', request.query);
      const earnings = await repository.getWorkerMonthlyEarnings(input);

      return reply.code(200).send({
        completedVisits: earnings.completedVisits,
        floor: toMoneyDto(earnings.floor),
        month: earnings.month,
        netDue: toMoneyDto(earnings.netDue),
        paidOutTotal: toMoneyDto(earnings.paidOutTotal),
        payoutHistory: earnings.payoutHistory.map(toWorkerPayoutDto),
        total: toMoneyDto(earnings.total),
        visitBonusTotal: toMoneyDto(earnings.visitBonusTotal),
        workerId: earnings.workerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_earnings.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/workers/:workerId/payouts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseListWorkerPayoutsRequest(request.query, params.workerId ?? '');
      const payouts = await repository.listWorkerPayouts(input);

      return reply.code(200).send({
        items: payouts.map(toWorkerPayoutDto),
        limit: input.limit,
        month: input.month ?? null,
        workerId: input.workerId ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_payouts.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/workers/:workerId/advance-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseCreateWorkerAdvanceRequestBody(
        params.workerId ?? '',
        request.body,
        parsedTraceId,
      );
      const advanceRequest = await repository.createWorkerAdvanceRequest(input);

      return reply.code(201).send(toWorkerAdvanceRequestDto(advanceRequest));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_advance_request.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/workers/:workerId/advance-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseListWorkerAdvanceRequestsRequest(request.query, params.workerId ?? '');
      const advanceRequests = await repository.listWorkerAdvanceRequests(input);

      return reply.code(200).send({
        items: advanceRequests.map(toWorkerAdvanceRequestDto),
        limit: input.limit,
        month: input.month ?? null,
        status: input.status ?? null,
        workerId: input.workerId ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_advance_requests.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/workers/:workerId/monthly-payouts', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { workerId?: string };

    try {
      const input = parseCreateWorkerMonthlyPayoutBody(
        params.workerId ?? '',
        request.body,
        parsedTraceId,
      );
      const payout = await repository.createWorkerMonthlyPayout(input);

      return reply.code(201).send(toWorkerPayoutDto(payout));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_monthly_payout.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.get('/v1/operator/worker-advance-requests', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();

    try {
      const input = parseListWorkerAdvanceRequestsRequest(request.query);
      const advanceRequests = await repository.listWorkerAdvanceRequests(input);

      return reply.code(200).send({
        items: advanceRequests.map(toWorkerAdvanceRequestDto),
        limit: input.limit,
        month: input.month ?? null,
        status: input.status ?? null,
        workerId: input.workerId ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_advance_requests.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  app.post('/v1/operator/worker-advance-requests/:requestId/resolve', async (request, reply) => {
    const traceId = request.headers['x-trace-id'];
    const parsedTraceId = typeof traceId === 'string' ? traceId : randomUUID();
    const params = request.params as { requestId?: string };

    try {
      const input = parseResolveWorkerAdvanceRequestBody(
        params.requestId ?? '',
        request.body,
        parsedTraceId,
      );
      const advanceRequest = await repository.resolveWorkerAdvanceRequest(input);

      return reply.code(200).send(toWorkerAdvanceRequestDto(advanceRequest));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid request.';

      return reply.code(400).send({
        code: 'core.worker_advance_request_resolve.invalid_request',
        message,
        traceId: parsedTraceId,
      });
    }
  });

  return app;
}

function toAuthSessionDto(session: {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Date;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly role: string;
  readonly sessionId: string;
  readonly userId: string;
}): Record<string, string> {
  return {
    accessToken: session.accessToken,
    accessTokenExpiresAt: toIsoString(session.accessTokenExpiresAt),
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: toIsoString(session.refreshTokenExpiresAt),
    role: session.role,
    sessionId: session.sessionId,
    userId: session.userId,
  };
}

function toAuditEventDto(event: {
  readonly actor: { readonly role: string; readonly userId: string | null };
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly countryCode: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: Date;
  readonly payload: Record<string, unknown>;
  readonly recordedAt: Date;
  readonly traceId: string;
}): Record<string, unknown> {
  return {
    actor: event.actor,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    countryCode: event.countryCode,
    eventId: event.eventId,
    eventType: event.eventType,
    occurredAt: toIsoString(event.occurredAt),
    payload: event.payload,
    recordedAt: toIsoString(event.recordedAt),
    traceId: event.traceId,
  };
}

function toNotificationMessageDto(message: {
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly attemptCount: number;
  readonly availableAt: Date;
  readonly channel: string;
  readonly countryCode: string;
  readonly createdAt: Date;
  readonly eventId: string;
  readonly failureReason: string | null;
  readonly lastAttemptAt: Date | null;
  readonly messageId: string;
  readonly payload: Record<string, unknown>;
  readonly provider: string | null;
  readonly providerReference: string | null;
  readonly recipientRole: string;
  readonly recipientUserId: string | null;
  readonly sentAt: Date | null;
  readonly status: string;
  readonly templateKey: string;
}): Record<string, unknown> {
  return {
    aggregateId: message.aggregateId,
    aggregateType: message.aggregateType,
    attemptCount: message.attemptCount,
    availableAt: toIsoString(message.availableAt),
    channel: message.channel,
    countryCode: message.countryCode,
    createdAt: toIsoString(message.createdAt),
    eventId: message.eventId,
    failureReason: message.failureReason,
    lastAttemptAt: message.lastAttemptAt === null ? null : toIsoString(message.lastAttemptAt),
    messageId: message.messageId,
    payload: message.payload,
    provider: message.provider,
    providerReference: message.providerReference,
    recipientRole: message.recipientRole,
    recipientUserId: message.recipientUserId,
    sentAt: message.sentAt === null ? null : toIsoString(message.sentAt),
    status: message.status,
    templateKey: message.templateKey,
  };
}

function toPushDeviceDto(device: {
  readonly app: string;
  readonly countryCode: string;
  readonly createdAt: Date;
  readonly deviceId: string;
  readonly environment: string;
  readonly lastRegisteredAt: Date;
  readonly platform: string;
  readonly pushDeviceId: string;
  readonly role: string;
  readonly status: string;
  readonly token: string;
  readonly updatedAt: Date;
  readonly userId: string;
}): Record<string, unknown> {
  return {
    app: device.app,
    countryCode: device.countryCode,
    createdAt: toIsoString(device.createdAt),
    deviceId: device.deviceId,
    environment: device.environment,
    lastRegisteredAt: toIsoString(device.lastRegisteredAt),
    platform: device.platform,
    pushDeviceId: device.pushDeviceId,
    role: device.role,
    status: device.status,
    tokenPreview: previewPushToken(device.token),
    updatedAt: toIsoString(device.updatedAt),
    userId: device.userId,
  };
}

function toSubscriberProfileDto(profile: {
  readonly avatarObjectKey: string | null;
  readonly countryCode: string;
  readonly createdAt: Date;
  readonly email: string | null;
  readonly firstName: string | null;
  readonly isAdultConfirmed: boolean;
  readonly lastName: string | null;
  readonly phoneNumber: string;
  readonly subscriberId: string;
  readonly updatedAt: Date;
}): Record<string, unknown> {
  return {
    avatarObjectKey: profile.avatarObjectKey,
    countryCode: profile.countryCode,
    createdAt: toIsoString(profile.createdAt),
    email: profile.email,
    firstName: profile.firstName,
    isAdultConfirmed: profile.isAdultConfirmed,
    lastName: profile.lastName,
    phoneNumber: profile.phoneNumber,
    subscriberId: profile.subscriberId,
    updatedAt: toIsoString(profile.updatedAt),
  };
}

function toCreatedSubscriptionDto(subscription: {
  readonly countryCode: string;
  readonly currencyCode: string;
  readonly monthlyPriceMinor: bigint;
  readonly paymentMethod: unknown;
  readonly status: string;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly tierCode: string;
  readonly visitsPerCycle: number;
}): Record<string, unknown> {
  return {
    assignmentSlaHours: subscription.status === 'pending_match' ? 4 : null,
    countryCode: subscription.countryCode,
    currencyCode: subscription.currencyCode,
    monthlyPriceMinor: subscription.monthlyPriceMinor.toString(),
    paymentMethod: subscription.paymentMethod,
    status: subscription.status,
    subscriberId: subscription.subscriberId,
    subscriptionId: subscription.subscriptionId,
    tierCode: subscription.tierCode,
    visitsPerCycle: subscription.visitsPerCycle,
  };
}

function readSubscriberClaims(header: unknown): AuthAccessTokenClaims {
  const claims = verifyAccessToken(readBearerToken(header));

  if (claims.role !== 'subscriber') {
    throw new Error('Subscriber access is required.');
  }

  return claims;
}

function readBearerToken(header: unknown): string {
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    throw new Error('Authorization bearer token is required.');
  }

  return header.slice('Bearer '.length).trim();
}

function isValidPaymentWebhookSecret(header: unknown, options: CoreApiOptions): boolean {
  const configuredSecret = options.paymentWebhookSecret ?? process.env['PAYMENT_WEBHOOK_SECRET'];

  if (configuredSecret === undefined || configuredSecret.trim().length === 0) {
    return true;
  }

  return typeof header === 'string' && header === configuredSecret;
}

function requiredRoleForRequest(method: string, rawUrl: string): AuthRole | null {
  const pathname = rawUrl.split('?')[0] ?? rawUrl;

  if (pathname.startsWith('/v1/operator/')) {
    return 'operator';
  }

  if (pathname.startsWith('/v1/subscriber/')) {
    return 'subscriber';
  }

  if (pathname.startsWith('/v1/workers/') || pathname.startsWith('/v1/visits/')) {
    return 'worker';
  }

  if (pathname === '/v1/subscriptions' || pathname.startsWith('/v1/subscriptions/')) {
    return 'operator';
  }

  return null;
}

function previewPushToken(token: string): string {
  return token.length <= 12 ? token : `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function toPaymentAttemptDto(attempt: {
  readonly amount: Money;
  readonly chargedAt: Date;
  readonly idempotencyKey: string;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string;
  readonly status: string;
  readonly subscriptionId: string;
  readonly subscriptionStatus: string;
}): Record<string, unknown> {
  return {
    amount: toMoneyDto(attempt.amount),
    chargedAt: toIsoString(attempt.chargedAt),
    idempotencyKey: attempt.idempotencyKey,
    paymentAttemptId: attempt.paymentAttemptId,
    provider: attempt.provider,
    providerReference: attempt.providerReference,
    status: attempt.status,
    subscriptionId: attempt.subscriptionId,
    subscriptionStatus: attempt.subscriptionStatus,
  };
}

function toPaymentAttemptSummaryDto(attempt: {
  readonly amount: Money;
  readonly chargedAt: Date;
  readonly countryCode: string;
  readonly idempotencyKey: string;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string;
  readonly status: string;
  readonly subscriptionId: string;
  readonly subscriptionStatus: string;
}): Record<string, unknown> {
  return {
    ...toPaymentAttemptDto(attempt),
    countryCode: attempt.countryCode,
  };
}

function toSubscriberSupportMatchDto(match: {
  readonly countryCode: string;
  readonly phoneNumber: string;
  readonly status: string;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly tierCode: string;
}): Record<string, unknown> {
  return {
    countryCode: match.countryCode,
    phoneNumber: match.phoneNumber,
    status: match.status,
    subscriberId: match.subscriberId,
    subscriptionId: match.subscriptionId,
    tierCode: match.tierCode,
  };
}

function toSubscriptionDetailDto(detail: {
  readonly address: unknown;
  readonly assignedWorker: unknown;
  readonly billingStatus?: {
    readonly nextChargeAt: Date | null;
    readonly overdueSince: Date | null;
    readonly paymentAuthorizationStatus: string;
  };
  readonly countryCode: string;
  readonly monthlyPriceMinor: bigint;
  readonly pendingAddressChange?: unknown;
  readonly paymentMethod: unknown;
  readonly phoneNumber: string;
  readonly recentVisits: unknown;
  readonly schedulePreference: unknown;
  readonly status: string;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly supportCredits: readonly {
    readonly amount: Money;
    readonly createdAt: Date;
    readonly creditId: string;
    readonly reason: string;
  }[];
  readonly tierCode: string;
  readonly upcomingVisits: unknown;
  readonly visitsPerCycle: number;
}): Record<string, unknown> {
  return {
    address: detail.address,
    assignedWorker: detail.assignedWorker,
    billingStatus:
      detail.billingStatus === undefined
        ? null
        : {
            nextChargeAt:
              detail.billingStatus.nextChargeAt === null
                ? null
                : toIsoString(detail.billingStatus.nextChargeAt),
            overdueSince:
              detail.billingStatus.overdueSince === null
                ? null
                : toIsoString(detail.billingStatus.overdueSince),
            paymentAuthorizationStatus: detail.billingStatus.paymentAuthorizationStatus,
          },
    countryCode: detail.countryCode,
    monthlyPriceMinor: detail.monthlyPriceMinor.toString(),
    pendingAddressChange: detail.pendingAddressChange ?? null,
    paymentMethod: detail.paymentMethod,
    phoneNumber: detail.phoneNumber,
    recentVisits: detail.recentVisits,
    schedulePreference: detail.schedulePreference,
    status: detail.status,
    subscriberId: detail.subscriberId,
    subscriptionId: detail.subscriptionId,
    supportCredits: detail.supportCredits.map((credit) => ({
      amount: toMoneyDto(credit.amount),
      createdAt: toIsoString(credit.createdAt),
      creditId: credit.creditId,
      reason: credit.reason,
    })),
    tierCode: detail.tierCode,
    upcomingVisits: detail.upcomingVisits,
    visitsPerCycle: detail.visitsPerCycle,
  };
}

function toSubscriberAddressChangeRequestDto(request: {
  readonly address: unknown;
  readonly countryCode: string;
  readonly requestId: string;
  readonly requestedAt: Date;
  readonly requestedByUserId: string;
  readonly status: string;
  readonly subscriptionId: string;
}): Record<string, unknown> {
  return {
    address: request.address,
    countryCode: request.countryCode,
    requestId: request.requestId,
    requestedAt: toIsoString(request.requestedAt),
    requestedByUserId: request.requestedByUserId,
    status: request.status,
    subscriptionId: request.subscriptionId,
  };
}

function toSubscriberNotificationPreferencesDto(preferences: {
  readonly countryCode: string;
  readonly emailRecap: boolean;
  readonly pushReveal: boolean;
  readonly pushRoute: boolean;
  readonly smsReminder: boolean;
  readonly subscriberId: string;
  readonly subscriptionId: string;
  readonly updatedAt: Date;
  readonly updatedByUserId: string;
}): Record<string, unknown> {
  return {
    countryCode: preferences.countryCode,
    emailRecap: preferences.emailRecap,
    pushReveal: preferences.pushReveal,
    pushRoute: preferences.pushRoute,
    smsReminder: preferences.smsReminder,
    subscriberId: preferences.subscriberId,
    subscriptionId: preferences.subscriptionId,
    updatedAt: toIsoString(preferences.updatedAt),
    updatedByUserId: preferences.updatedByUserId,
  };
}

function toSubscriberPrivacyRequestDto(request: {
  readonly erasurePlan: {
    readonly immediateActions: readonly string[];
    readonly retainedRecords: readonly {
      readonly reason: string;
      readonly recordType: string;
      readonly retention: string;
    }[];
  };
  readonly exportBundle: {
    readonly auditEvents: readonly Parameters<typeof toAuditEventDto>[0][];
    readonly billingHistory: readonly Parameters<typeof toSubscriptionBillingItemDto>[0][];
    readonly disputes: readonly Parameters<typeof toDisputeDto>[0][];
    readonly notifications: readonly Parameters<typeof toNotificationMessageDto>[0][];
    readonly subscription: Parameters<typeof toSubscriptionDetailDto>[0];
  };
  readonly events: readonly DomainEvent[];
  readonly operatorUserId: string;
  readonly reason: string;
  readonly requestedAt: Date;
  readonly requestId: string;
  readonly requestType: string;
  readonly subscriptionId: string;
}): Record<string, unknown> {
  return {
    erasurePlan: request.erasurePlan,
    events: request.events.map((event) =>
      toAuditEventDto({
        actor: event.actor,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        countryCode: event.countryCode,
        eventId: event.eventId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        payload: event.payload,
        recordedAt: event.occurredAt,
        traceId: event.traceId,
      }),
    ),
    exportBundle: {
      auditEvents: request.exportBundle.auditEvents.map(toAuditEventDto),
      billingHistory: request.exportBundle.billingHistory.map(toSubscriptionBillingItemDto),
      disputes: request.exportBundle.disputes.map(toDisputeDto),
      notifications: request.exportBundle.notifications.map(toNotificationMessageDto),
      subscription: toSubscriptionDetailDto(request.exportBundle.subscription),
    },
    operatorUserId: request.operatorUserId,
    reason: request.reason,
    requestedAt: toIsoString(request.requestedAt),
    requestId: request.requestId,
    requestType: request.requestType,
    subscriptionId: request.subscriptionId,
  };
}

function toPaymentRefundDto(refund: {
  readonly amount: Money;
  readonly countryCode: string;
  readonly issuedAt: Date;
  readonly operatorUserId: string;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly reason: string;
  readonly refundId: string;
  readonly status: string;
  readonly subscriptionId: string;
}): Record<string, unknown> {
  return {
    amount: toMoneyDto(refund.amount),
    countryCode: refund.countryCode,
    issuedAt: toIsoString(refund.issuedAt),
    operatorUserId: refund.operatorUserId,
    paymentAttemptId: refund.paymentAttemptId,
    provider: refund.provider,
    providerReference: refund.providerReference,
    reason: refund.reason,
    refundId: refund.refundId,
    status: refund.status,
    subscriptionId: refund.subscriptionId,
  };
}

function toSubscriptionBillingItemDto(item: {
  readonly amount: Money;
  readonly itemId: string;
  readonly itemType: string;
  readonly occurredAt: Date;
  readonly paymentAttemptId: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly reason: string | null;
  readonly refundId: string | null;
  readonly status: string;
  readonly subscriptionId: string;
}): Record<string, unknown> {
  return {
    amount: toMoneyDto(item.amount),
    itemId: item.itemId,
    itemType: item.itemType,
    occurredAt: toIsoString(item.occurredAt),
    paymentAttemptId: item.paymentAttemptId,
    provider: item.provider,
    providerReference: item.providerReference,
    reason: item.reason,
    refundId: item.refundId,
    status: item.status,
    subscriptionId: item.subscriptionId,
  };
}

function toPaymentReconciliationRunDto(run: {
  readonly checkedAt: Date;
  readonly countryCode: string;
  readonly issues: readonly {
    readonly amount: Money;
    readonly issueType: string;
    readonly paymentAttemptId: string;
    readonly refundedAmount: Money;
    readonly severity: string;
    readonly subscriptionId: string;
  }[];
  readonly operatorUserId: string;
  readonly provider: string | null;
  readonly reconciliationRunId: string;
  readonly status: string;
  readonly totalCollected: Money;
  readonly totalFailedAttempts: number;
  readonly totalRefunded: Money;
  readonly totalSucceededAttempts: number;
}): Record<string, unknown> {
  return {
    checkedAt: toIsoString(run.checkedAt),
    countryCode: run.countryCode,
    issueCount: run.issues.length,
    issues: run.issues.map((issue) => ({
      amount: toMoneyDto(issue.amount),
      issueType: issue.issueType,
      paymentAttemptId: issue.paymentAttemptId,
      refundedAmount: toMoneyDto(issue.refundedAmount),
      severity: issue.severity,
      subscriptionId: issue.subscriptionId,
    })),
    operatorUserId: run.operatorUserId,
    provider: run.provider,
    reconciliationRunId: run.reconciliationRunId,
    status: run.status,
    totalCollected: toMoneyDto(run.totalCollected),
    totalFailedAttempts: run.totalFailedAttempts,
    totalRefunded: toMoneyDto(run.totalRefunded),
    totalSucceededAttempts: run.totalSucceededAttempts,
  };
}

function toDisputeDto(dispute: {
  readonly createdAt: Date;
  readonly description: string;
  readonly disputeId: string;
  readonly issueType: string;
  readonly openedByUserId: string;
  readonly resolvedAt: Date | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly status: string;
  readonly subscriberCredit: Money | null;
  readonly subscriberCreditId: string | null;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string | null;
}): Record<string, unknown> {
  return {
    createdAt: toIsoString(dispute.createdAt),
    description: dispute.description,
    disputeId: dispute.disputeId,
    issueType: dispute.issueType,
    openedByUserId: dispute.openedByUserId,
    resolvedAt: dispute.resolvedAt === null ? null : toIsoString(dispute.resolvedAt),
    resolvedByOperatorUserId: dispute.resolvedByOperatorUserId,
    resolutionNote: dispute.resolutionNote,
    status: dispute.status,
    subscriberCredit:
      dispute.subscriberCredit === null ? null : toMoneyDto(dispute.subscriberCredit),
    subscriberCreditId: dispute.subscriberCreditId,
    subscriberPhoneNumber: dispute.subscriberPhoneNumber,
    subscriptionId: dispute.subscriptionId,
    visitId: dispute.visitId,
    workerId: dispute.workerId,
  };
}

function toSupportContactDto(
  record: SupportContactRecord,
  messages: readonly SupportContactMessageRecord[] = [],
): Record<string, unknown> {
  return {
    body: record.body,
    category: record.category,
    contactId: record.contactId,
    countryCode: record.countryCode,
    createdAt: toIsoString(record.createdAt),
    openedByUserId: record.openedByUserId,
    resolutionNote: record.resolutionNote,
    resolvedAt: record.resolvedAt === null ? null : toIsoString(record.resolvedAt),
    resolvedByOperatorUserId: record.resolvedByOperatorUserId,
    status: record.status,
    subject: record.subject,
    subscriptionId: record.subscriptionId,
    messages: messages.map(toSupportContactMessageDto),
  };
}

function toSupportContactMessageDto(record: SupportContactMessageRecord): Record<string, unknown> {
  return {
    authorRole: record.authorRole,
    authorUserId: record.authorUserId,
    body: record.body,
    contactId: record.contactId,
    countryCode: record.countryCode,
    createdAt: toIsoString(record.createdAt),
    messageId: record.messageId,
    subscriptionId: record.subscriptionId,
  };
}

function toVisitPhotoDto(photo: {
  readonly byteSize: number;
  readonly capturedAt: Date;
  readonly contentType: string;
  readonly objectKey: string;
  readonly photoId: string;
  readonly photoType: string;
  readonly uploadedAt: Date;
  readonly visitId: string;
  readonly workerId: string;
}): Record<string, unknown> {
  return {
    byteSize: photo.byteSize,
    capturedAt: toIsoString(photo.capturedAt),
    contentType: photo.contentType,
    objectKey: photo.objectKey,
    photoId: photo.photoId,
    photoType: photo.photoType,
    uploadedAt: toIsoString(photo.uploadedAt),
    visitId: photo.visitId,
    workerId: photo.workerId,
  };
}

function toSubscriberVisitDetailDto(detail: {
  readonly address: unknown;
  readonly countryCode: string;
  readonly dispute: Parameters<typeof toDisputeDto>[0] | null;
  readonly photos: readonly Parameters<typeof toVisitPhotoDto>[0][];
  readonly rating: Parameters<typeof toVisitRatingDto>[0] | null;
  readonly scheduledDate: string;
  readonly scheduledTimeWindow: string;
  readonly status: string;
  readonly subscriptionId: string;
  readonly timeline: {
    readonly checkedInAt: Date | null;
    readonly checkedOutAt: Date | null;
    readonly durationMinutes: number | null;
  };
  readonly visitId: string;
  readonly worker: unknown;
}): Record<string, unknown> {
  return {
    address: detail.address,
    countryCode: detail.countryCode,
    dispute: detail.dispute === null ? null : toDisputeDto(detail.dispute),
    photos: detail.photos.map(toVisitPhotoDto),
    rating: detail.rating === null ? null : toVisitRatingDto(detail.rating),
    scheduledDate: detail.scheduledDate,
    scheduledTimeWindow: detail.scheduledTimeWindow,
    status: detail.status,
    subscriptionId: detail.subscriptionId,
    timeline: {
      checkedInAt:
        detail.timeline.checkedInAt === null ? null : toIsoString(detail.timeline.checkedInAt),
      checkedOutAt:
        detail.timeline.checkedOutAt === null ? null : toIsoString(detail.timeline.checkedOutAt),
      durationMinutes: detail.timeline.durationMinutes,
    },
    visitId: detail.visitId,
    worker: detail.worker,
  };
}

function toVisitRatingDto(rating: {
  readonly comment: string | null;
  readonly createdAt: Date;
  readonly ratedByUserId: string;
  readonly rating: number;
  readonly ratingId: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string | null;
}): Record<string, unknown> {
  return {
    comment: rating.comment,
    createdAt: toIsoString(rating.createdAt),
    ratedByUserId: rating.ratedByUserId,
    rating: rating.rating,
    ratingId: rating.ratingId,
    subscriptionId: rating.subscriptionId,
    visitId: rating.visitId,
    workerId: rating.workerId,
  };
}

function toWorkerIssueDto(issue: {
  readonly address?: {
    readonly gpsLatitude: number;
    readonly gpsLongitude: number;
    readonly landmark: string;
    readonly neighborhood: string;
  };
  readonly createdAt: Date;
  readonly description: string;
  readonly handledByOperatorUserId: string | null;
  readonly issueId: string;
  readonly issueType: string;
  readonly resolutionNote: string | null;
  readonly resolvedAt: Date | null;
  readonly scheduledDate?: string;
  readonly scheduledTimeWindow?: string;
  readonly status: string;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
  readonly visitId: string;
  readonly workerId: string;
}): Record<string, unknown> {
  return {
    address: issue.address ?? null,
    createdAt: toIsoString(issue.createdAt),
    description: issue.description,
    handledByOperatorUserId: issue.handledByOperatorUserId,
    issueId: issue.issueId,
    issueType: issue.issueType,
    resolutionNote: issue.resolutionNote,
    resolvedAt: issue.resolvedAt === null ? null : toIsoString(issue.resolvedAt),
    scheduledDate: issue.scheduledDate ?? null,
    scheduledTimeWindow: issue.scheduledTimeWindow ?? null,
    status: issue.status,
    subscriberPhoneNumber: issue.subscriberPhoneNumber ?? null,
    subscriptionId: issue.subscriptionId,
    visitId: issue.visitId,
    workerId: issue.workerId,
  };
}

function toWorkerAdvanceRequestDto(request: {
  readonly amount: Money;
  readonly countryCode: string;
  readonly month: string;
  readonly reason: string;
  readonly requestedAt: Date;
  readonly requestId: string;
  readonly resolvedAt: Date | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly status: string;
  readonly workerId: string;
  readonly workerName?: string;
}): Record<string, unknown> {
  return {
    amount: toMoneyDto(request.amount),
    countryCode: request.countryCode,
    month: request.month,
    reason: request.reason,
    requestedAt: toIsoString(request.requestedAt),
    requestId: request.requestId,
    resolvedAt: request.resolvedAt === null ? null : toIsoString(request.resolvedAt),
    resolvedByOperatorUserId: request.resolvedByOperatorUserId,
    resolutionNote: request.resolutionNote,
    status: request.status,
    workerId: request.workerId,
    workerName: request.workerName ?? null,
  };
}

function toWorkerPayoutDto(payout: {
  readonly advanceRequestId: string | null;
  readonly amount: Money;
  readonly createdByOperatorUserId: string;
  readonly failureReason: string | null;
  readonly note: string;
  readonly paidAt: Date;
  readonly payoutId: string;
  readonly payoutType: string;
  readonly periodMonth: string;
  readonly provider: string;
  readonly providerReference: string | null;
  readonly status: string;
  readonly workerId: string;
  readonly workerName?: string;
}): Record<string, unknown> {
  return {
    advanceRequestId: payout.advanceRequestId,
    amount: toMoneyDto(payout.amount),
    createdByOperatorUserId: payout.createdByOperatorUserId,
    failureReason: payout.failureReason,
    note: payout.note,
    paidAt: toIsoString(payout.paidAt),
    payoutId: payout.payoutId,
    payoutType: payout.payoutType,
    periodMonth: payout.periodMonth,
    provider: payout.provider,
    providerReference: payout.providerReference,
    status: payout.status,
    workerId: payout.workerId,
    workerName: payout.workerName ?? null,
  };
}

function toWorkerOnboardingCaseDto(onboardingCase: {
  readonly appliedAt: Date;
  readonly caseId: string;
  readonly countryCode: string;
  readonly displayName: string;
  readonly maxActiveSubscriptions: number;
  readonly notes: readonly {
    readonly createdAt: Date;
    readonly note: string;
    readonly operatorUserId: string;
    readonly stage: string;
  }[];
  readonly phoneNumber: string;
  readonly serviceNeighborhoods: readonly string[];
  readonly stage: string;
  readonly updatedAt: Date;
  readonly workerId: string;
}): Record<string, unknown> {
  return {
    appliedAt: toIsoString(onboardingCase.appliedAt),
    caseId: onboardingCase.caseId,
    countryCode: onboardingCase.countryCode,
    displayName: onboardingCase.displayName,
    maxActiveSubscriptions: onboardingCase.maxActiveSubscriptions,
    notes: onboardingCase.notes.map((note) => ({
      createdAt: toIsoString(note.createdAt),
      note: note.note,
      operatorUserId: note.operatorUserId,
      stage: note.stage,
    })),
    phoneNumber: onboardingCase.phoneNumber,
    serviceNeighborhoods: onboardingCase.serviceNeighborhoods,
    stage: onboardingCase.stage,
    updatedAt: toIsoString(onboardingCase.updatedAt),
    workerId: onboardingCase.workerId,
  };
}

function toWorkerUnavailabilityDto(unavailability: {
  readonly createdAt: Date;
  readonly date: string;
  readonly reason: string;
  readonly unavailabilityId: string;
  readonly workerId: string;
}): Record<string, unknown> {
  return {
    createdAt: toIsoString(unavailability.createdAt),
    date: unavailability.date,
    reason: unavailability.reason,
    unavailabilityId: unavailability.unavailabilityId,
    workerId: unavailability.workerId,
  };
}

function toWorkerSwapRequestDto(request: {
  readonly countryCode: string;
  readonly currentWorkerId: string;
  readonly currentWorkerName?: string;
  readonly reason: string;
  readonly replacementWorkerId: string | null;
  readonly replacementWorkerName?: string;
  readonly requestedAt: Date;
  readonly requestId: string;
  readonly resolvedAt: Date | null;
  readonly resolvedByOperatorUserId: string | null;
  readonly resolutionNote: string | null;
  readonly status: string;
  readonly subscriberId: string;
  readonly subscriberPhoneNumber?: string;
  readonly subscriptionId: string;
}): Record<string, unknown> {
  return {
    countryCode: request.countryCode,
    currentWorkerId: request.currentWorkerId,
    currentWorkerName: request.currentWorkerName ?? null,
    reason: request.reason,
    replacementWorkerId: request.replacementWorkerId,
    replacementWorkerName: request.replacementWorkerName ?? null,
    requestedAt: toIsoString(request.requestedAt),
    requestId: request.requestId,
    resolvedAt: request.resolvedAt === null ? null : toIsoString(request.resolvedAt),
    resolvedByOperatorUserId: request.resolvedByOperatorUserId,
    resolutionNote: request.resolutionNote,
    status: request.status,
    subscriberId: request.subscriberId,
    subscriberPhoneNumber: request.subscriberPhoneNumber ?? null,
    subscriptionId: request.subscriptionId,
  };
}
