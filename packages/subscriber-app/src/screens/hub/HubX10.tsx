import { CalendarPlus } from 'lucide-react';
import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSubscriberSubscription } from '../../subscription/SubscriberSubscriptionContext.js';
import { HubTabBar } from './HubTabBar.js';
import { TourX09 } from './TourX09.js';
import { useSignup } from '../onboarding/SignupContext.js';
import {
  SUBSCRIBER_BOOKING_DAYS,
  SUBSCRIBER_BOOKING_TIME_WINDOWS,
  SUBSCRIBER_HUB_DEMO,
} from './subscriberHubData.js';
import { useTourState } from './useTourState.js';

export function HubX10(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const subscription = useSubscriberSubscription();
  const hub = SUBSCRIBER_HUB_DEMO;
  const tour = useTourState();
  const hasScheduledVisit =
    subscription.state.status === 'active' && hub.visit !== null && hub.worker !== null;
  const hasRequestedFirstVisit = subscription.state.status === 'visit_request_pending';
  const requestedDay = SUBSCRIBER_BOOKING_DAYS.find(
    (day) => day.id === subscription.state.firstVisitRequest?.dayId,
  );
  const requestedTimeWindow = SUBSCRIBER_BOOKING_TIME_WINDOWS.find(
    (timeWindow) => timeWindow.id === subscription.state.firstVisitRequest?.timeWindowId,
  );
  const firstName = signup.identity.firstName.trim();
  const subscriberFirstName = firstName === '' ? hub.subscriberFirstName : firstName;
  const greeting =
    subscriberFirstName === null
      ? translate('subscriber.dashboard.greeting.generic')
      : translate('subscriber.dashboard.greeting.morning', {
          name: subscriberFirstName,
        });

  return (
    <main aria-labelledby="x10-headline" className="hub-screen" data-screen-id="X-10">
      <div className="hub-body">
        <header className="hub-header">
          <div>
            <span className="hub-greeting">{greeting}</span>
            <h1 className="hub-title" id="x10-headline">
              {translate('subscriber.dashboard.tab.home')}
            </h1>
          </div>
          <button
            aria-label={translate('subscriber.dashboard.profile_shortcut.label')}
            className="hub-profile-shortcut"
            onClick={() => navigate('/profile')}
            type="button"
          >
            {signup.avatarDataUrl === '' ? (
              <span aria-hidden="true" className="hub-avatar hub-avatar-lg" />
            ) : (
              <img alt="" className="hub-avatar-image hub-avatar-lg" src={signup.avatarDataUrl} />
            )}
          </button>
        </header>

        {hasScheduledVisit ? (
          <>
            <section aria-labelledby="x10-next-visit-label" className="hub-visit-card">
              <div className="hub-card-head">
                <span className="hub-eyebrow" id="x10-next-visit-label">
                  {translate('subscriber.dashboard.next_visit.label')}
                </span>
                <span className="hub-chip">
                  <span aria-hidden="true" className="hub-chip-dot" />
                  {hub.visit.status}
                </span>
              </div>

              <div className="hub-visit-time">
                <span className="hub-time">{hub.visit.time}</span>
                <span className="hub-date">{hub.visit.date}</span>
              </div>

              <div className="hub-rule" />

              <button
                aria-label={hub.worker.name}
                className="hub-worker-row"
                onClick={() => navigate('/worker/akouvi')}
                type="button"
              >
                <span aria-hidden="true" className="hub-avatar hub-avatar-worker" />
                <span className="hub-worker-copy">
                  <strong>{hub.worker.name}</strong>
                  <span>{hub.worker.detail}</span>
                </span>
                <span aria-hidden="true" className="hub-arrow">
                  →
                </span>
              </button>
            </section>

            <div className="hub-actions">
              <button
                className="hub-action secondary"
                onClick={() => navigate('/visit/reschedule')}
                type="button"
              >
                {translate('subscriber.dashboard.cta_report')}
              </button>
              <button
                className="hub-action primary"
                onClick={() => navigate('/visit/detail')}
                type="button"
              >
                {translate('subscriber.dashboard.cta_detail')}
              </button>
            </div>
          </>
        ) : hasRequestedFirstVisit ? (
          <section aria-labelledby="x10-pending-visit-title" className="hub-booking-card first">
            <div className="hub-first-icon" aria-hidden="true">
              <CalendarPlus />
            </div>
            <div>
              <span className="hub-eyebrow">
                {translate('subscriber.dashboard.pending_visit.eyebrow')}
              </span>
              <h2 className="hub-booking-title" id="x10-pending-visit-title">
                {translate('subscriber.dashboard.pending_visit.title')}
              </h2>
              <p>{translate('subscriber.dashboard.pending_visit.body')}</p>
              {requestedDay !== undefined && requestedTimeWindow !== undefined ? (
                <p className="hub-booking-choice">
                  {translate(requestedDay.labelKey)} · {translate(requestedTimeWindow.labelKey)}
                </p>
              ) : null}
            </div>
            <button
              className="hub-action secondary hub-booking-action"
              onClick={() => navigate('/booking')}
              type="button"
            >
              {translate('subscriber.dashboard.pending_visit.cta')}
            </button>
          </section>
        ) : (
          <section aria-labelledby="x10-first-visit-title" className="hub-booking-card first">
            <div className="hub-first-icon" aria-hidden="true">
              <CalendarPlus />
            </div>
            <div>
              <span className="hub-eyebrow">
                {translate('subscriber.dashboard.empty_visit.eyebrow')}
              </span>
              <h2 className="hub-booking-title" id="x10-first-visit-title">
                {translate('subscriber.dashboard.empty_visit.title')}
              </h2>
              <p>{translate('subscriber.dashboard.empty_visit.body')}</p>
            </div>
            <button
              className="hub-action primary hub-booking-action"
              onClick={() => navigate('/booking')}
              type="button"
            >
              {translate('subscriber.dashboard.empty_visit.cta')}
            </button>
          </section>
        )}

        <section className="hub-plan" aria-labelledby="x10-plan-label">
          <div className="hub-plan-row">
            <span className="hub-eyebrow" id="x10-plan-label">
              {translate(hub.plan.labelKey)}
            </span>
            <span className="hub-plan-date">
              {translate(
                hasRequestedFirstVisit
                  ? 'subscriber.dashboard.plan.first_visit_pending_status'
                  : hub.plan.renewsOnKey,
              )}
            </span>
          </div>
          <div className="hub-bar" aria-hidden="true">
            <span style={{ width: `${hub.plan.progressPct}%` }} />
          </div>
        </section>
      </div>
      <HubTabBar />
      {tour.isOpen ? <TourX09 onDismiss={tour.dismiss} /> : null}
    </main>
  );
}
