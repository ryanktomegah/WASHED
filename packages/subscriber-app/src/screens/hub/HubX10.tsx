import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { greetingTimeOfDay, SUBSCRIBER_HUB_DEMO } from './subscriberHubData.js';

// Renders deck key `subscriber.dashboard.streak.label` ({count} visites avec
// {name}) with the count fragment italicised per design contract. We split on
// " avec " — the deck-locked French connector — so the italic span tracks
// translation changes to the count phrasing without needing a sub-key.
function StreakLine({
  count,
  workerFirstName,
}: {
  readonly count: number;
  readonly workerFirstName: string;
}): ReactElement {
  const fullLine = translate('subscriber.dashboard.streak.label', 'fr', {
    count,
    name: workerFirstName,
  });
  const connector = ' avec ';
  const splitAt = fullLine.indexOf(connector);
  if (splitAt === -1) return <>{fullLine}</>;
  const countPhrase = fullLine.slice(0, splitAt);
  const tail = fullLine.slice(splitAt);
  return (
    <>
      <em className="hub-streak-count">{countPhrase}</em>
      {tail}
    </>
  );
}

export function HubX10(): ReactElement {
  const navigate = useNavigate();
  const hub = SUBSCRIBER_HUB_DEMO;
  const timeOfDay = greetingTimeOfDay();
  const greetingKey = `subscriber.dashboard.greeting.${timeOfDay}` as const;

  const tenureLabel =
    hub.worker.tenureMonths === 0
      ? translate('subscriber.dashboard.worker.tenure_first')
      : translate('subscriber.dashboard.worker.tenure', 'fr', {
          neighborhood: hub.worker.neighborhood,
          months: hub.worker.tenureMonths,
        });

  return (
    <main aria-labelledby="x10-headline" className="hub-screen" data-screen-id="X-10">
      <div className="hub-body">
        <header className="hub-header">
          <span className="hub-greeting" id="x10-headline">
            {translate(greetingKey, 'fr', { name: hub.subscriberFirstName })}
          </span>
          <span aria-hidden="true" className="hub-avatar hub-avatar-sm">
            {hub.subscriberFirstName.charAt(0)}
          </span>
        </header>

        <section aria-labelledby="x10-next-visit-label" className="hub-next-visit">
          <span className="hub-eyebrow" id="x10-next-visit-label">
            {translate('subscriber.dashboard.next_visit.label')}
          </span>
          <span className="hub-day">
            <em>{hub.nextVisit.weekday}</em>
          </span>
          <span className="hub-time">
            {translate('subscriber.dashboard.next_visit.time', 'fr', {
              hour: hub.nextVisit.hour,
              min: hub.nextVisit.minute.toString().padStart(2, '0'),
            })}
          </span>
          <span className="hub-countdown">
            {translate('subscriber.dashboard.next_visit.countdown', 'fr', {
              days: hub.nextVisit.inDays,
              hours: hub.nextVisit.inHours,
            })}
          </span>
        </section>

        <article className="hub-worker-card" aria-label={hub.worker.name}>
          <span aria-hidden="true" className="hub-avatar">
            {hub.worker.initials}
          </span>
          <div className="hub-worker-meta">
            <strong>{hub.worker.name}</strong>
            <span className="hub-worker-tenure">{tenureLabel}</span>
          </div>
          {hub.worker.isReady ? (
            <span className="hub-chip success">
              {translate('subscriber.dashboard.worker.ready_chip')}
            </span>
          ) : null}
        </article>

        <div className="hub-row2">
          <button
            className="hub-button ghost"
            onClick={() => navigate('/visit/detail')}
            type="button"
          >
            {translate('subscriber.dashboard.cta_detail')}
          </button>
          <button
            className="hub-button primary"
            onClick={() => navigate('/visit/detail')}
            type="button"
          >
            {translate('subscriber.dashboard.cta_visits')}
          </button>
        </div>

        <aside className="hub-streak-card" aria-labelledby="x10-last-visit-label">
          <span className="hub-eyebrow accent" id="x10-last-visit-label">
            {translate('subscriber.dashboard.last_visit.label', 'fr', {
              date: hub.lastVisit.dateLabel,
            })}
          </span>
          <p className="hub-streak-body">
            <StreakLine
              count={hub.lastVisit.streakCount}
              workerFirstName={hub.worker.name.split(' ')[0] ?? hub.worker.name}
            />
          </p>
        </aside>

        <div className="hub-grow" />

        <nav className="hub-nav" aria-label="Navigation principale">
          <button className="hub-nav-item active" type="button" aria-current="page">
            <span aria-hidden="true" className="hub-nav-glyph" />
            {translate('subscriber.dashboard.tab.home')}
          </button>
          <button className="hub-nav-item" type="button" disabled>
            <span aria-hidden="true" className="hub-nav-glyph" />
            {translate('subscriber.dashboard.tab.visits')}
          </button>
          <button className="hub-nav-item" type="button" disabled>
            <span aria-hidden="true" className="hub-nav-glyph" />
            {translate('subscriber.dashboard.tab.plan')}
          </button>
          <button className="hub-nav-item" type="button" disabled>
            <span aria-hidden="true" className="hub-nav-glyph" />
            {translate('subscriber.dashboard.tab.profile')}
          </button>
        </nav>
      </div>
    </main>
  );
}
