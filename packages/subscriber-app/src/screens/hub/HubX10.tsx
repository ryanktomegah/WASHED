import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { HubTabBar } from './HubTabBar.js';
import { TourX09 } from './TourX09.js';
import { SUBSCRIBER_HUB_DEMO } from './subscriberHubData.js';
import { useTourState } from './useTourState.js';

export function HubX10(): ReactElement {
  const navigate = useNavigate();
  const hub = SUBSCRIBER_HUB_DEMO;
  const tour = useTourState();

  return (
    <main aria-labelledby="x10-headline" className="hub-screen" data-screen-id="X-10">
      <div className="hub-body">
        <header className="hub-header">
          <div>
            <span className="hub-greeting">
              {translate('subscriber.dashboard.greeting.morning', {
                name: hub.subscriberFirstName,
              })}
            </span>
            <h1 className="hub-title" id="x10-headline">
              {translate('subscriber.dashboard.tab.home')}
            </h1>
          </div>
          <span aria-hidden="true" className="hub-avatar hub-avatar-lg" />
        </header>

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

        <section className="hub-plan" aria-label={hub.plan.label}>
          <div className="hub-plan-row">
            <span className="hub-eyebrow">{hub.plan.label}</span>
            <span className="hub-plan-date">{hub.plan.renewsOn}</span>
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
