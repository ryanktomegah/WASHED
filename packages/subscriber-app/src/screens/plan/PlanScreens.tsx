import { type ReactElement, useEffect, useState } from 'react';
import { ChevronLeft, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { SubscriptionBillingItemDto } from '@washed/api-client';
import { formatXof, translate, type WashedLocale } from '@washed/i18n';
import { useActiveLocale } from '@washed/ui';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import { useSafeBack } from '../../navigation/useSafeBack.js';
import { useSubscriberSubscription } from '../../subscription/SubscriberSubscriptionContext.js';
import {
  SUBSCRIBER_BOOKING_DAYS,
  SUBSCRIBER_BOOKING_TIME_WINDOWS,
} from '../hub/subscriberHubData.js';
import {
  PAYMENT_PROVIDER_LABEL,
  TIER_PRICE_XOF,
  useOptionalSignup,
  type SignupPaymentProvider,
  type SignupTier,
} from '../onboarding/SignupContext.js';
import { formatTogoDisplayPhone, toTogoE164Phone } from '../onboarding/phoneNumber.js';
import { SUBSCRIBER_PLAN_DEMO } from './subscriberPlanDemoData.js';
import { PlanTabBar } from './PlanTabBar.js';

function PlanActiveTitle({
  text,
  accentDate,
}: {
  readonly text: string;
  readonly accentDate: string;
}): ReactElement {
  const splitAt = text.indexOf(accentDate);
  if (splitAt === -1) return <>{text}</>;
  const before = text.slice(0, splitAt);
  const after = text.slice(splitAt + accentDate.length);
  return (
    <>
      {before}
      <em className="plan-title-accent">{accentDate}</em>
      {after}
    </>
  );
}

function dateFromIso(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00.000Z`);
}

function localeTag(locale: WashedLocale): string {
  return locale === 'fr' ? 'fr-TG' : 'en-US';
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayMonth(dateIso: string, locale: WashedLocale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
  }).format(dateFromIso(dateIso));
}

function formatFullDate(dateIso: string, locale: WashedLocale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dateFromIso(dateIso));
}

function formatWeekday(dateIso: string, locale: WashedLocale): string {
  return capitalizeFirst(
    new Intl.DateTimeFormat(localeTag(locale), {
      weekday: 'long',
    }).format(dateFromIso(dateIso)),
  );
}

function formatSentenceWeekday(dateIso: string, locale: WashedLocale): string {
  const weekday = formatWeekday(dateIso, locale);
  return locale === 'fr' ? weekday.toLowerCase() : weekday;
}

function formatPlanTime(time24h: string, locale: WashedLocale): string {
  const [hour = '0', minute = '00'] = time24h.split(':');
  if (locale === 'fr') return `${Number(hour)} h ${minute.padStart(2, '0')}`;

  const hour24 = Number(hour);
  const hour12 = ((hour24 + 11) % 12) + 1;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minute.padStart(2, '0')} ${period}`;
}

function formatBillingProvider(provider: string): string {
  if (provider === 'mobile_money_http') return 'Mobile Money';
  return provider.charAt(0).toUpperCase() + provider.slice(1).replace(/_/gu, ' ');
}

function billingAmountXof(item: SubscriptionBillingItemDto): number {
  const amount = Number(item.amount.amountMinor);
  return item.itemType === 'refund' ? -amount : amount;
}

function countBillingMonths(items: readonly SubscriptionBillingItemDto[]): number {
  return new Set(
    items
      .filter((item) => item.itemType === 'charge' && item.status === 'succeeded')
      .map((item) => item.occurredAt.slice(0, 7)),
  ).size;
}

function billingSuccessRate(items: readonly SubscriptionBillingItemDto[]): string {
  const charges = items.filter((item) => item.itemType === 'charge');
  if (charges.length === 0) return '0 %';
  const succeeded = charges.filter((item) => item.status === 'succeeded').length;
  return `${Math.round((succeeded / charges.length) * 100)} %`;
}

function activePlanLabel(tier: 'T1' | 'T2'): string {
  return translate(
    tier === 'T1' ? 'subscriber.plan.tier.t1.label' : 'subscriber.plan.tier.t2.label',
  );
}

function alternatePlanTier(tier: SignupTier): SignupTier {
  return tier === 'T1' ? 'T2' : 'T1';
}

function PlanTierDetails({ tier }: { readonly tier: 'T1' | 'T2' }): ReactElement {
  const savingsXof = Math.max(0, TIER_PRICE_XOF.T1 * 2 - TIER_PRICE_XOF.T2);
  const detailItems =
    tier === 'T1'
      ? [
          translate('subscriber.plan.detail.choose_slot'),
          translate('subscriber.plan.detail.t1.visits'),
        ]
      : [
          translate('subscriber.plan.detail.choose_slot'),
          translate('subscriber.plan.detail.t2.visits'),
          translate('subscriber.plan.detail.t2.second_slot'),
          translate('subscriber.plan.detail.t2.savings', {
            amount: formatXof(savingsXof),
          }),
        ];

  return (
    <ul className="plan-tier-detail-list">
      {detailItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function PlanX19(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  if (subscription.state.status === 'paused') {
    return <PlanPausedX19R />;
  }
  if (
    subscription.state.status === 'ready_no_visit' ||
    subscription.state.status === 'visit_request_pending'
  ) {
    return <PlanPendingX19 />;
  }

  const active = SUBSCRIBER_PLAN_DEMO.active;
  const isConfigured = subscriberApi.isConfigured;
  const liveNextVisit = isConfigured ? (subscription.state.upcomingVisits[0] ?? null) : null;
  const paymentReady =
    !isConfigured || subscription.state.billingStatus?.paymentAuthorizationStatus === 'ready';
  const accountGoodUntilIso = isConfigured
    ? (subscription.state.billingStatus?.nextChargeAt?.slice(0, 10) ?? null)
    : active.accountGoodUntilIso;
  const nextChargeIso = isConfigured
    ? (subscription.state.billingStatus?.nextChargeAt?.slice(0, 10) ?? null)
    : active.nextChargeDateIso;
  const accountGoodUntil =
    !paymentReady || accountGoodUntilIso === null
      ? translate('subscriber.plan.active_card.payment_setup_pending')
      : formatDayMonth(accountGoodUntilIso, locale);
  const nextChargeDate =
    !paymentReady || nextChargeIso === null
      ? translate('subscriber.plan.active_card.payment_setup_pending')
      : formatDayMonth(nextChargeIso, locale);
  const nextVisitWeekday =
    liveNextVisit === null ? null : formatWeekday(liveNextVisit.scheduledDate, locale);
  const nextVisitDate =
    liveNextVisit === null ? null : formatDayMonth(liveNextVisit.scheduledDate, locale);
  const nextVisitTime =
    liveNextVisit === null
      ? null
      : translate(
          liveNextVisit.scheduledTimeWindow === 'morning'
            ? 'subscriber.booking.time.morning.label'
            : 'subscriber.booking.time.afternoon.label',
        );
  const titleText =
    !paymentReady || accountGoodUntilIso === null
      ? translate('subscriber.plan.title.active_payment_setup')
      : translate('subscriber.plan.title.active', {
          date: accountGoodUntil,
        });

  return (
    <main
      aria-labelledby="x19-headline"
      className="plan-screen subscriber-tab-screen"
      data-screen-id="X-19"
    >
      <div className="plan-body">
        <header className="plan-header">
          <span className="plan-eyebrow">{translate('subscriber.plan.eyebrow')}</span>
        </header>

        <h1 className="plan-title" id="x19-headline">
          <PlanActiveTitle text={titleText} accentDate={accountGoodUntil} />
        </h1>

        <section className="plan-active-card" aria-labelledby="x19-active-card-eyebrow">
          <span className="plan-active-card-eyebrow" id="x19-active-card-eyebrow">
            {translate('subscriber.plan.active_card.eyebrow').toUpperCase()}
          </span>
          <span className="plan-active-card-tier">
            {translate('subscriber.plan.active_card.tier', {
              label: activePlanLabel(subscription.state.tier),
              amount: formatXof(TIER_PRICE_XOF[subscription.state.tier]),
            })}
          </span>
          <PlanTierDetails tier={subscription.state.tier} />
          <div className="plan-active-card-row">
            <span className="plan-active-card-row-label">
              {translate('subscriber.plan.active_card.next_charge_label')}
            </span>
            <span className="plan-active-card-row-value">
              {translate('subscriber.plan.active_card.next_charge_value', {
                date: nextChargeDate,
              })}
            </span>
          </div>
        </section>

        <h2 className="plan-eyebrow plan-section-eyebrow">
          {translate('subscriber.plan.next_visit.eyebrow')}
        </h2>
        {liveNextVisit === null && isConfigured ? (
          <section className="plan-list-card" aria-labelledby="x19-live-empty">
            <span className="plan-eyebrow" id="x19-live-empty">
              {translate('subscriber.plan.next_visit.eyebrow')}
            </span>
            <p className="plan-copy">{translate('subscriber.plan.next_visit.empty')}</p>
          </section>
        ) : (
          <article
            className="plan-next-visit-card"
            aria-label={
              subscription.state.assignedWorker?.displayName ?? active.nextVisit.workerName
            }
          >
            <span aria-hidden="true" className="plan-avatar">
              {initialsFromName(
                subscription.state.assignedWorker?.displayName ?? active.nextVisit.workerName,
              )}
            </span>
            <div className="plan-next-visit-meta">
              <strong>
                {translate('subscriber.plan.next_visit.summary', {
                  weekday: nextVisitWeekday ?? formatWeekday(active.nextVisit.dateIso, locale),
                  date: nextVisitDate ?? formatDayMonth(active.nextVisit.dateIso, locale),
                  time: nextVisitTime ?? formatPlanTime(active.nextVisit.time24h, locale),
                })}
              </strong>
              <span>
                {translate('subscriber.plan.next_visit.with_worker', {
                  name:
                    subscription.state.assignedWorker?.displayName ?? active.nextVisit.workerName,
                })}
              </span>
            </div>
          </article>
        )}

        <div className="plan-row2">
          <button
            className="plan-button ghost"
            onClick={() => navigate('/plan/upgrade')}
            type="button"
          >
            {translate('subscriber.plan.cta_modify')}
          </button>
          <button
            className="plan-button ghost"
            onClick={() => navigate('/plan/pause')}
            type="button"
          >
            {translate('subscriber.plan.cta_pause')}
          </button>
        </div>

        <div className="plan-row2 plan-payment-actions">
          <button
            className="plan-button subtle"
            onClick={() => navigate('/plan/payments')}
            type="button"
          >
            {translate('subscriber.payment.action.view_history')}
          </button>
          <button
            className="plan-button subtle"
            onClick={() => navigate('/plan/payment-method')}
            type="button"
          >
            {translate('subscriber.payment.action.edit_method')}
          </button>
        </div>

        <div className="plan-grow" />
      </div>
      <PlanTabBar />
    </main>
  );
}

function PlanPendingX19(): ReactElement {
  const navigate = useNavigate();
  const subscription = useSubscriberSubscription();
  const requestedDay = SUBSCRIBER_BOOKING_DAYS.find(
    (day) => day.id === subscription.state.firstVisitRequest?.dayId,
  );
  const requestedTimeWindow = SUBSCRIBER_BOOKING_TIME_WINDOWS.find(
    (timeWindow) => timeWindow.id === subscription.state.firstVisitRequest?.timeWindowId,
  );
  const isPendingRequest = subscription.state.status === 'visit_request_pending';
  const titleKey = isPendingRequest
    ? 'subscriber.plan.pending.request_title'
    : 'subscriber.plan.pending.title';
  const statusKey = isPendingRequest
    ? 'subscriber.dashboard.plan.first_visit_pending_status'
    : 'subscriber.dashboard.plan.first_visit_status';
  const actionKey = isPendingRequest
    ? 'subscriber.dashboard.pending_visit.cta'
    : 'subscriber.dashboard.empty_visit.cta';

  return (
    <main
      aria-labelledby="x19-headline"
      className="plan-screen subscriber-tab-screen"
      data-screen-id="X-19"
    >
      <div className="plan-body">
        <header className="plan-header">
          <span className="plan-eyebrow">{translate('subscriber.plan.eyebrow')}</span>
        </header>

        <h1 className="plan-title" id="x19-headline">
          {translate(titleKey)}
        </h1>

        <section className="plan-active-card" aria-labelledby="x19-pending-card-eyebrow">
          <span className="plan-active-card-eyebrow" id="x19-pending-card-eyebrow">
            {translate('subscriber.plan.pending.card_eyebrow').toUpperCase()}
          </span>
          <span className="plan-active-card-tier">
            {translate('subscriber.plan.active_card.tier', {
              label: activePlanLabel(subscription.state.tier),
              amount: formatXof(TIER_PRICE_XOF[subscription.state.tier]),
            })}
          </span>
          <PlanTierDetails tier={subscription.state.tier} />
          <div className="plan-active-card-row">
            <span className="plan-active-card-row-label">
              {translate('subscriber.dashboard.empty_visit.eyebrow')}
            </span>
            <span className="plan-active-card-row-value">{translate(statusKey)}</span>
          </div>
        </section>

        {isPendingRequest ? (
          <section className="plan-list-card" aria-labelledby="x19-first-visit-eyebrow">
            <span className="plan-eyebrow" id="x19-first-visit-eyebrow">
              {translate('subscriber.dashboard.empty_visit.eyebrow')}
            </span>
            <p className="plan-copy">{translate('subscriber.plan.pending.request_body')}</p>
            {requestedDay !== undefined && requestedTimeWindow !== undefined ? (
              <strong className="plan-pending-choice">
                {translate(requestedDay.labelKey)} · {translate(requestedTimeWindow.labelKey)}
              </strong>
            ) : null}
          </section>
        ) : null}

        <div className="plan-grow" />

        <button
          className="plan-button primary full lg"
          onClick={() => navigate('/booking')}
          type="button"
        >
          {translate(actionKey)}
        </button>
        <button
          className="plan-button ghost full"
          onClick={() => navigate('/plan/upgrade')}
          type="button"
        >
          {translate('subscriber.plan.cta_modify')}
        </button>
        <button
          className="plan-button ghost full"
          onClick={() => navigate('/plan/payment-method')}
          type="button"
        >
          {translate('subscriber.payment.action.edit_method')}
        </button>
      </div>
      <PlanTabBar />
    </main>
  );
}

export function PlanPaymentHistoryX20(): ReactElement {
  const goBack = useSafeBack('/plan');
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const { payment } = SUBSCRIBER_PLAN_DEMO;
  const [billingItems, setBillingItems] = useState<readonly SubscriptionBillingItemDto[] | null>(
    null,
  );
  const hasPaymentHistory =
    subscription.state.status === 'active' ||
    subscription.state.status === 'paused' ||
    subscription.state.status === 'payment_overdue';

  useEffect(() => {
    if (!subscriberApi.isConfigured) return;

    if (subscription.state.subscriptionId === null) {
      setBillingItems([]);
      return;
    }

    let cancelled = false;
    void subscriberApi
      .listBillingHistory({ limit: 25 })
      .then((response) => {
        if (!cancelled) setBillingItems(response.items);
      })
      .catch(() => {
        if (!cancelled) setBillingItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [subscriberApi, subscription.state.subscriptionId]);

  const demoRows = hasPaymentHistory
    ? payment.receipts.map((receipt) => ({
        amountXof: receipt.amountXof,
        dateIso: receipt.dateIso,
        key: receipt.reference,
        providerLine: `${receipt.provider} · ${receipt.reference}`,
      }))
    : [];
  const apiItems = billingItems ?? [];
  const apiRows = apiItems.map((item) => ({
    amountXof: billingAmountXof(item),
    dateIso: item.occurredAt.slice(0, 10),
    key: item.itemId,
    providerLine: `${formatBillingProvider(item.provider)} · ${
      item.providerReference ?? item.paymentAttemptId.slice(0, 8)
    }`,
  }));
  const rows = subscriberApi.isConfigured ? apiRows : demoRows;
  const historyMonths = subscriberApi.isConfigured
    ? countBillingMonths(apiItems)
    : hasPaymentHistory
      ? payment.historyMonths
      : 0;
  const chargeCount = subscriberApi.isConfigured
    ? apiItems.filter((item) => item.itemType === 'charge').length
    : historyMonths;
  const successRate = subscriberApi.isConfigured
    ? billingSuccessRate(apiItems)
    : translate('subscriber.payment.history.success_rate');
  const totalXof = subscriberApi.isConfigured
    ? apiItems
        .filter(
          (item) =>
            (item.itemType === 'charge' && item.status === 'succeeded') ||
            item.itemType === 'refund',
        )
        .reduce((sum, item) => sum + billingAmountXof(item), 0)
    : rows.reduce((sum, receipt) => sum + receipt.amountXof, 0);

  return (
    <main aria-labelledby="x20-headline" className="plan-screen" data-screen-id="X-20">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.payment.history.header')} onBack={goBack} />

        <h1 className="plan-title" id="x20-headline">
          {translate('subscriber.payment.history.title', {
            months: historyMonths,
          })}
        </h1>

        <section
          className="plan-cream-card plan-payment-summary"
          aria-label={translate('subscriber.payment.history.summary_label')}
        >
          <div>
            <span className="plan-cream-body">
              {translate('subscriber.payment.history.total_label')}
            </span>
            <strong className="plan-payment-total">{formatXof(totalXof)}</strong>
          </div>
          <div className="plan-payment-summary-right">
            <span className="plan-cream-body">
              {translate('subscriber.payment.history.count_label', {
                count: chargeCount,
              })}
            </span>
            <strong className="plan-payment-total">{successRate}</strong>
          </div>
        </section>

        <h2 className="plan-eyebrow plan-section-eyebrow">
          {translate('subscriber.payment.history.detail_eyebrow')}
        </h2>

        <ul
          className="plan-payment-list"
          aria-label={translate('subscriber.payment.history.detail_eyebrow')}
        >
          {rows.map((receipt) => (
            <li className="plan-payment-row" key={receipt.key}>
              <div>
                <strong>{formatFullDate(receipt.dateIso, locale)}</strong>
                <span>{receipt.providerLine}</span>
              </div>
              <strong className="plan-payment-amount">{formatXof(receipt.amountXof)}</strong>
            </li>
          ))}
        </ul>
        {rows.length === 0 ? (
          <p className="plan-copy">{translate('subscriber.payment.history.empty')}</p>
        ) : null}

        <div className="plan-grow" />

        <button className="plan-button ghost full" disabled type="button">
          {translate('subscriber.payment.history.download_cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanPaymentMethodX21(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/plan');
  const subscriberApi = useSubscriberApi();
  const signup = useOptionalSignup();
  const subscription = useSubscriberSubscription();
  const providerOptions: readonly SignupPaymentProvider[] = ['mixx', 'flooz'];
  const initialProvider = subscription.state.paymentProvider;
  const [selectedProvider, setSelectedProvider] = useState(initialProvider);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentPhoneNumber = subscription.state.paymentPhoneNumber ?? signup?.phone ?? '';
  const phoneDisplay =
    paymentPhoneNumber.trim() === ''
      ? translate('subscriber.profile.detail.missing')
      : formatTogoDisplayPhone(paymentPhoneNumber);

  const onSave = async (): Promise<void> => {
    if (isSubmitting) return;

    setError(null);

    if (!subscriberApi.isConfigured) {
      subscription.changePaymentProvider(selectedProvider);
      navigate('/plan');
      return;
    }

    setIsSubmitting(true);

    try {
      const detail = await subscriberApi.updatePaymentMethod({
        paymentMethod: {
          phoneNumber: toTogoE164Phone(paymentPhoneNumber),
          provider: selectedProvider,
        },
        updatedAt: new Date().toISOString(),
      });
      subscription.syncFromApi(detail);
      navigate('/plan');
    } catch {
      setError(translate('error.server.body'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main aria-labelledby="x21-headline" className="plan-screen" data-screen-id="X-21">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.payment.method.header')} onBack={goBack} />

        <h1 className="plan-title" id="x21-headline">
          {translate('subscriber.payment.method.title')}
        </h1>
        <p className="plan-copy">{translate('subscriber.payment.method.body')}</p>

        <div className="plan-method-list" role="list">
          {providerOptions.map((provider) => {
            const isSelected = selectedProvider === provider;
            const isActive = subscription.state.paymentProvider === provider;
            return (
              <button
                aria-pressed={isSelected}
                className={isSelected ? 'plan-method-card active' : 'plan-method-card'}
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                type="button"
              >
                <span
                  className={isSelected ? 'plan-radio active' : 'plan-radio'}
                  aria-hidden="true"
                >
                  {isSelected ? <span /> : null}
                </span>
                <span className="plan-method-meta">
                  <strong>{PAYMENT_PROVIDER_LABEL[provider]}</strong>
                  <span>
                    {phoneDisplay}
                    {isActive ? ` · ${translate('subscriber.payment.method.current_suffix')}` : ''}
                  </span>
                </span>
                <span className={isSelected ? 'plan-method-badge active' : 'plan-method-badge'}>
                  {isSelected
                    ? translate('subscriber.payment.method.active_badge').toUpperCase()
                    : translate('subscriber.payment.method.available_badge').toUpperCase()}
                </span>
              </button>
            );
          })}

          <button className="plan-method-card plan-method-add" disabled type="button">
            <span className="plan-radio" aria-hidden="true" />
            <strong>{translate('subscriber.payment.method.add_flooz')}</strong>
          </button>
        </div>

        {error === null ? null : (
          <p className="plan-copy" role="alert">
            {error}
          </p>
        )}

        <div className="plan-grow" />

        <button
          className="plan-button primary full lg"
          disabled={isSubmitting}
          onClick={onSave}
          type="button"
        >
          {translate('subscriber.payment.method.save_cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanOverdueX23(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const signup = useOptionalSignup();
  const subscription = useSubscriberSubscription();
  const firstName =
    signup?.identity.firstName.trim() || translate('subscriber.dashboard.greeting.generic');
  const nextVisit = subscription.state.upcomingVisits[0] ?? null;

  return (
    <main
      aria-labelledby="x23-headline"
      className="plan-screen subscriber-tab-screen"
      data-screen-id="X-23"
    >
      <div className="plan-body">
        <header className="plan-header">
          <span className="plan-eyebrow">
            {translate('subscriber.dashboard.greeting.morning', {
              name: firstName,
            })}
          </span>
          <span aria-hidden="true" className="plan-avatar">
            {initialsFromName(firstName)}
          </span>
        </header>

        <section className="plan-danger-card" aria-labelledby="x23-headline">
          <span className="plan-eyebrow accent-danger">
            {translate('subscriber.payment.overdue.header')}
          </span>
          <h1 className="plan-overdue-title" id="x23-headline">
            {translate('subscriber.payment.failed.title')}
          </h1>
          <p className="plan-danger-body">{translate('subscriber.payment.failed.body')}</p>
          <p className="plan-danger-body">{translate('subscriber.payment.overdue.banner')}</p>
          <div className="plan-row2">
            <button
              className="plan-button danger-outline"
              onClick={() => navigate('/plan/payments')}
              type="button"
            >
              {translate('subscriber.payment.history.detail_eyebrow')}
            </button>
            <button className="plan-button primary" onClick={() => navigate('/plan')} type="button">
              {translate('subscriber.payment.failed.cta')}
            </button>
          </div>
        </section>

        <section className="plan-overdue-visit" aria-labelledby="x23-next-visit">
          <span className="plan-eyebrow" id="x23-next-visit">
            {translate('subscriber.payment.overdue.next_visit_eyebrow')}
          </span>
          <strong>
            {nextVisit === null
              ? translate('subscriber.plan.next_visit.empty')
              : formatWeekday(nextVisit.scheduledDate, locale)}
          </strong>
          <span>{translate('subscriber.payment.overdue.waiting')}</span>
        </section>

        <div className="plan-grow" />
      </div>
      <PlanTabBar activeItem="home" />
    </main>
  );
}

export function PlanUpgradeX19U(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/plan');
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const upgrade = SUBSCRIBER_PLAN_DEMO.upgrade;
  const currentTier = subscription.state.tier;
  const newTier = alternatePlanTier(currentTier);
  const currentAmountXof = TIER_PRICE_XOF[currentTier];
  const newAmountXof = TIER_PRICE_XOF[newTier];
  const amountDeltaXof = Math.abs(newAmountXof - currentAmountXof);
  const t2SavingsXof = Math.max(0, TIER_PRICE_XOF.T1 * 2 - TIER_PRICE_XOF.T2);
  const savingsXof = newTier === 'T2' ? t2SavingsXof : amountDeltaXof;
  const effectiveDate = formatDayMonth(
    subscriberApi.isConfigured
      ? (subscription.state.billingStatus?.nextChargeAt?.slice(0, 10) ??
          new Date().toISOString().slice(0, 10))
      : upgrade.effectiveDateIso,
    locale,
  );
  const workerFirstName = subscriberApi.isConfigured
    ? (subscription.state.assignedWorker?.displayName.split(/\s+/u)[0] ?? '')
    : upgrade.workerFirstName;
  const planChangeBody =
    newTier === 'T2'
      ? translate('subscriber.plan.change.body.t2', {
          date: effectiveDate,
          savings: formatXof(t2SavingsXof),
        })
      : translate('subscriber.plan.change.body.t1', {
          amount: formatXof(amountDeltaXof),
          date: effectiveDate,
        });
  const effectItems = [
    translate(
      newTier === 'T2'
        ? 'subscriber.plan.change.effect.t2.visits'
        : 'subscriber.plan.change.effect.t1.visits',
    ),
    translate('subscriber.plan.upgrade.effect.charge', {
      date: effectiveDate,
      amount: formatXof(newAmountXof),
    }),
    translate(
      newTier === 'T2'
        ? 'subscriber.plan.change.effect.t2.bureau'
        : 'subscriber.plan.change.effect.t1.bureau',
    ),
    ...(workerFirstName === ''
      ? []
      : [
          translate('subscriber.plan.upgrade.effect.same_worker', {
            name: workerFirstName,
          }),
        ]),
  ];

  async function confirmTierChange(): Promise<void> {
    setHasSubmissionError(false);

    if (!subscriberApi.isConfigured) {
      subscription.changeTier(newTier);
      navigate('/plan');
      return;
    }

    setIsSubmitting(true);
    try {
      const detail = await subscriberApi.changeSubscriptionTier({
        effectiveAt: new Date().toISOString(),
        tierCode: newTier,
      });
      subscription.syncFromApi(detail);
      navigate('/plan');
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main aria-labelledby="x19u-headline" className="plan-screen" data-screen-id="X-19.U">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.plan.change.header')} onBack={goBack} />

        <h1 className="plan-title" id="x19u-headline">
          {translate(
            newTier === 'T2'
              ? 'subscriber.plan.change.title.t2'
              : 'subscriber.plan.change.title.t1',
          )}
        </h1>

        <p className="plan-copy">{planChangeBody}</p>

        <section className="plan-cream-card" aria-labelledby="x19u-changes-eyebrow">
          <span className="plan-eyebrow accent" id="x19u-changes-eyebrow">
            {translate('subscriber.plan.upgrade.changes_eyebrow')}
          </span>
          <div className="plan-compare-row">
            <span>{translate('subscriber.plan.upgrade.current_label')}</span>
            <span className="plan-compare-current">{formatXof(currentAmountXof)}</span>
          </div>
          <div className="plan-compare-row">
            <strong>{translate('subscriber.plan.upgrade.new_label')}</strong>
            <span className="plan-compare-new">{formatXof(newAmountXof)}</span>
          </div>
          <div className="plan-compare-divider" aria-hidden="true" />
          <div className="plan-compare-row plan-compare-row-savings">
            <span>
              {translate(
                newTier === 'T2'
                  ? 'subscriber.plan.upgrade.savings_label'
                  : 'subscriber.plan.change.reduction_label',
              )}
            </span>
            <span className="plan-compare-savings">— {formatXof(savingsXof)}</span>
          </div>
        </section>

        <section className="plan-list-card" aria-labelledby="x19u-effect-eyebrow">
          <span className="plan-eyebrow" id="x19u-effect-eyebrow">
            {translate('subscriber.plan.upgrade.effect_eyebrow')}
          </span>
          <ul className="plan-list">
            {effectItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <div className="plan-grow" />

        <button
          className="plan-button primary full lg"
          disabled={isSubmitting}
          onClick={() => void confirmTierChange()}
          type="button"
        >
          {translate('subscriber.plan.upgrade.confirm.cta', {
            amount: formatXof(newAmountXof),
          })}
        </button>
        {hasSubmissionError ? (
          <p className="plan-copy" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}
        <button className="plan-button ghost full" onClick={() => navigate('/plan')} type="button">
          {translate('subscriber.plan.upgrade.cancel.cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanPauseConfirmX22(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/plan');
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const active = SUBSCRIBER_PLAN_DEMO.active;
  const nextVisit = subscriberApi.isConfigured
    ? (subscription.state.upcomingVisits[0] ?? null)
    : null;
  const nextChargeDate = !subscriberApi.isConfigured
    ? formatDayMonth(active.nextChargeDateIso, locale)
    : subscription.state.billingStatus?.nextChargeAt === null ||
        subscription.state.billingStatus?.nextChargeAt === undefined
      ? translate('subscriber.plan.active_card.payment_setup_pending')
      : formatDayMonth(subscription.state.billingStatus.nextChargeAt.slice(0, 10), locale);
  const nextVisitWeekday =
    nextVisit === null
      ? subscriberApi.isConfigured
        ? translate('subscriber.notifications.no_visit')
        : formatSentenceWeekday(active.nextVisit.dateIso, locale)
      : formatSentenceWeekday(nextVisit.scheduledDate, locale);
  const nextVisitDate =
    nextVisit === null
      ? subscriberApi.isConfigured
        ? translate('subscriber.notifications.no_visit')
        : formatDayMonth(active.nextVisit.dateIso, locale)
      : formatDayMonth(nextVisit.scheduledDate, locale);
  const workerFirstName = subscriberApi.isConfigured
    ? (subscription.state.assignedWorker?.displayName.split(/\s+/u)[0] ?? '')
    : (active.nextVisit.workerName.split(/\s+/u)[0] ?? '');
  const amountXof = subscriberApi.isConfigured
    ? TIER_PRICE_XOF[subscription.state.tier]
    : active.amountXof;

  async function confirmPause(): Promise<void> {
    setHasSubmissionError(false);

    if (!subscriberApi.isConfigured) {
      subscription.pauseSubscription();
      navigate('/plan/pause/submitted');
      return;
    }

    setIsSubmitting(true);
    try {
      const detail = await subscriberApi.pauseSubscription({
        pausedAt: new Date().toISOString(),
      });
      subscription.syncFromApi(detail);
      navigate('/plan/pause/submitted');
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main aria-labelledby="x22-headline" className="plan-screen" data-screen-id="X-22">
      <div className="plan-body plan-body-flow">
        <BackHeader label={translate('subscriber.plan.pause.header')} onBack={goBack} />

        <h1 className="plan-title" id="x22-headline">
          {translate('subscriber.plan.pause.title')}
        </h1>

        <p className="plan-copy">
          {translate('subscriber.plan.pause.body', {
            name: workerFirstName,
            amount: formatXof(amountXof),
          })}
        </p>

        <section className="plan-warn-card" aria-labelledby="x22-warn-eyebrow">
          <span className="plan-eyebrow accent-warn" id="x22-warn-eyebrow">
            {translate('subscriber.plan.pause.warn_eyebrow')}
          </span>
          <ul className="plan-list">
            <li>
              {translate('subscriber.plan.pause.warn.cancel_visit', {
                weekday: nextVisitWeekday,
                date: nextVisitDate,
              })}
            </li>
            <li>
              {translate('subscriber.plan.pause.warn.no_charge', {
                date: nextChargeDate,
              })}
            </li>
            <li>{translate('subscriber.plan.pause.warn.resume')}</li>
          </ul>
        </section>

        <section className="plan-cream-card" aria-labelledby="x22-savings-eyebrow">
          <span className="plan-eyebrow accent" id="x22-savings-eyebrow">
            {translate('subscriber.plan.pause.savings_eyebrow')}
          </span>
          <p className="plan-cream-body">
            {translate('subscriber.plan.pause.savings_body', {
              savings: formatXof(amountXof),
            })}
          </p>
        </section>

        <div className="plan-grow" />

        <button className="plan-button ghost full" onClick={() => navigate('/plan')} type="button">
          {translate('subscriber.plan.upgrade.cancel.cta')}
        </button>
        <button
          className="plan-button danger full"
          disabled={isSubmitting}
          onClick={() => void confirmPause()}
          type="button"
        >
          {translate('subscriber.plan.pause.confirm.cta')}
        </button>
        {hasSubmissionError ? (
          <p className="plan-copy" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export function PlanPausedSuccessX22A(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const active = SUBSCRIBER_PLAN_DEMO.active;
  const paused = SUBSCRIBER_PLAN_DEMO.paused;
  const nextVisit = subscriberApi.isConfigured
    ? (subscription.state.upcomingVisits[0] ?? null)
    : null;
  const nextChargeDate = !subscriberApi.isConfigured
    ? formatDayMonth(active.nextChargeDateIso, locale)
    : subscription.state.billingStatus?.nextChargeAt === null ||
        subscription.state.billingStatus?.nextChargeAt === undefined
      ? translate('subscriber.plan.active_card.payment_setup_pending')
      : formatDayMonth(subscription.state.billingStatus.nextChargeAt.slice(0, 10), locale);
  const nextVisitWeekday =
    nextVisit === null
      ? subscriberApi.isConfigured
        ? translate('subscriber.notifications.no_visit')
        : formatSentenceWeekday(active.nextVisit.dateIso, locale)
      : formatSentenceWeekday(nextVisit.scheduledDate, locale);
  const nextVisitDate =
    nextVisit === null
      ? subscriberApi.isConfigured
        ? translate('subscriber.notifications.no_visit')
        : formatDayMonth(active.nextVisit.dateIso, locale)
      : formatDayMonth(nextVisit.scheduledDate, locale);
  const autoCloseDate = formatDayMonth(
    subscriberApi.isConfigured ? new Date().toISOString().slice(0, 10) : paused.autoCloseDateIso,
    locale,
  );
  const workerFirstName = subscriberApi.isConfigured
    ? (subscription.state.assignedWorker?.displayName.split(/\s+/u)[0] ?? '')
    : paused.workerFirstName;
  const titleText = translate('subscriber.plan.pause.success.title');

  return (
    <main aria-labelledby="x22a-headline" className="plan-screen" data-screen-id="X-22.A">
      <div className="plan-body plan-body-success">
        <div className="plan-grow" />

        <span aria-hidden="true" className="plan-pause-glyph">
          <Pause />
        </span>

        <h1 className="plan-title plan-success-title" id="x22a-headline">
          <PauseAccentTitle text={titleText} />
        </h1>

        <p className="plan-copy plan-success-copy">
          {translate('subscriber.plan.pause.success.body', {
            name: workerFirstName,
          })}
        </p>

        <section
          className="plan-cream-card plan-success-card"
          aria-labelledby="x22a-changes-eyebrow"
        >
          <span className="plan-eyebrow accent" id="x22a-changes-eyebrow">
            {translate('subscriber.plan.pause.success.changes_eyebrow')}
          </span>
          <ul className="plan-list">
            <li>
              {translate('subscriber.plan.pause.success.changes.visit', {
                weekday: nextVisitWeekday,
                date: nextVisitDate,
              })}
            </li>
            <li>
              {translate('subscriber.plan.pause.success.changes.no_charge', {
                date: nextChargeDate,
              })}
            </li>
            <li>{translate('subscriber.plan.pause.success.changes.data')}</li>
            <li>{translate('subscriber.plan.pause.success.changes.resume')}</li>
          </ul>
        </section>

        <section
          className="plan-warn-card plan-success-card"
          aria-labelledby="x22a-deadline-eyebrow"
        >
          <span className="plan-eyebrow accent-warn" id="x22a-deadline-eyebrow">
            {translate('subscriber.plan.pause.success.deadline_eyebrow')}
          </span>
          <p className="plan-cream-body">
            {translate('subscriber.plan.pause.success.deadline_body', {
              date: autoCloseDate,
            })}
          </p>
        </section>

        <div className="plan-grow" />

        <button
          className="plan-button ink full"
          onClick={() => navigate('/plan/paused')}
          type="button"
        >
          {translate('subscriber.plan.pause.success.cta')}
        </button>
      </div>
    </main>
  );
}

export function PlanPausedX19R(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const paused = SUBSCRIBER_PLAN_DEMO.paused;
  const pauseStartDate = formatDayMonth(
    subscriberApi.isConfigured ? new Date().toISOString().slice(0, 10) : paused.pauseStartDateIso,
    locale,
  );
  const autoCloseDate = formatDayMonth(
    subscriberApi.isConfigured ? new Date().toISOString().slice(0, 10) : paused.autoCloseDateIso,
    locale,
  );
  const workerName = subscriberApi.isConfigured
    ? (subscription.state.assignedWorker?.displayName ?? '')
    : paused.workerName;
  const workerFirstName = workerName.split(/\s+/u)[0] ?? '';
  const daysIntoPause = subscriberApi.isConfigured ? 0 : paused.daysIntoPause;
  const tenureMonths = subscriberApi.isConfigured ? 0 : paused.tenureMonths;

  async function resumePlan(): Promise<void> {
    setHasSubmissionError(false);

    if (!subscriberApi.isConfigured) {
      subscription.resumeSubscription();
      navigate('/plan');
      return;
    }

    setIsSubmitting(true);
    try {
      const detail = await subscriberApi.resumeSubscription({
        resumedAt: new Date().toISOString(),
      });
      subscription.syncFromApi(detail);
      navigate('/plan');
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      aria-labelledby="x19r-headline"
      className="plan-screen subscriber-tab-screen"
      data-screen-id="X-19.R"
    >
      <div className="plan-body">
        <header className="plan-header">
          <span className="plan-eyebrow">{translate('subscriber.plan.eyebrow')}</span>
        </header>

        <section className="plan-warn-card" aria-labelledby="x19r-paused-eyebrow">
          <span className="plan-eyebrow accent-warn" id="x19r-paused-eyebrow">
            {translate('subscriber.plan.paused.eyebrow').toUpperCase()}
          </span>
          <strong className="plan-paused-headline">
            {translate('subscriber.plan.paused.headline')}
          </strong>
          <span className="plan-paused-since">
            {translate('subscriber.plan.paused.since', {
              date: pauseStartDate,
              day: daysIntoPause,
            })}
          </span>
        </section>

        <h1 className="plan-title" id="x19r-headline">
          {translate('subscriber.plan.paused.title')}
        </h1>

        <section className="plan-cream-card" aria-labelledby="x19r-worker-eyebrow">
          <span className="plan-eyebrow accent" id="x19r-worker-eyebrow">
            {translate('subscriber.plan.paused.worker_eyebrow')}
          </span>
          <div className="plan-paused-worker">
            <span aria-hidden="true" className="plan-avatar plan-avatar-lg">
              {initialsFromName(workerName)}
            </span>
            <div className="plan-paused-worker-meta">
              <strong>
                {translate('subscriber.plan.paused.worker_line', {
                  name: workerName,
                })}
              </strong>
              <span>
                {translate('subscriber.plan.paused.worker_sub', {
                  months: tenureMonths,
                })}
              </span>
            </div>
          </div>
        </section>

        <section className="plan-list-card" aria-labelledby="x19r-deadline-eyebrow">
          <span className="plan-eyebrow" id="x19r-deadline-eyebrow">
            {translate('subscriber.plan.paused.deadline_eyebrow').toUpperCase()}
          </span>
          <p className="plan-deadline-body">
            {translate('subscriber.plan.paused.deadline_body', {
              date: autoCloseDate,
              name: workerFirstName,
            })}
          </p>
        </section>

        <div className="plan-grow" />

        <button
          className="plan-button primary full lg"
          disabled={isSubmitting}
          onClick={() => void resumePlan()}
          type="button"
        >
          {translate('subscriber.plan.paused.resume_cta')}
        </button>
        {hasSubmissionError ? (
          <p className="plan-copy" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}
        <button
          className="plan-button ghost full plan-button-sm"
          onClick={() => navigate('/plan')}
          type="button"
        >
          {translate('subscriber.plan.paused.extend_cta')}
        </button>
      </div>
      <PlanTabBar />
    </main>
  );
}

function BackHeader({
  label,
  onBack,
}: {
  readonly label: string;
  readonly onBack: () => void;
}): ReactElement {
  return (
    <header className="plan-back-header">
      <button
        aria-label={translate('common.action.back')}
        className="plan-back"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <span className="plan-eyebrow">{label.toUpperCase()}</span>
    </header>
  );
}

function PauseAccentTitle({ text }: { readonly text: string }): ReactElement {
  // Italicise the leading "Pause" word per design hi-fi:1326.
  const accent = 'Pause';
  if (!text.startsWith(accent)) return <>{text}</>;
  return (
    <>
      <em className="plan-pause-accent">{accent}</em>
      {text.slice(accent.length)}
    </>
  );
}
