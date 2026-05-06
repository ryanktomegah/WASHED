import { useEffect, type ReactElement } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  Home,
  TriangleAlert,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { formatXof, translate, type WashedLocale } from '@washed/i18n';
import { useActiveLocale } from '@washed/ui';

import { useSafeBack } from '../../navigation/useSafeBack.js';
import { SUBSCRIBER_HISTORY_DEMO, type PastVisitEntry } from './historyDemoData.js';

function dateFromIso(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00.000Z`);
}

function localeTag(locale: WashedLocale): string {
  return locale === 'fr' ? 'fr-TG' : 'en-US';
}

function formatDayMonth(dateIso: string, locale: WashedLocale, month: 'short' | 'long'): string {
  const formatted = new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month,
  }).format(dateFromIso(dateIso));
  return locale === 'fr' && month === 'short' ? formatted.replace('.', '') : formatted;
}

function formatClockTime(time24h: string, locale: WashedLocale): string {
  const [hour = '0', minute = '00'] = time24h.split(':');
  if (locale === 'fr') return `${Number(hour)} h ${minute.padStart(2, '0')}`;

  const hour24 = Number(hour);
  const hour12 = ((hour24 + 11) % 12) + 1;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minute.padStart(2, '0')} ${period}`;
}

function formatDuration(minutes: number, locale: WashedLocale): string {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return locale === 'fr' ? `${hours} h ${remainder}` : `${hours} hr ${remainder}`;
}

export function HistoryX16(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const { aggregates, recentVisits } = SUBSCRIBER_HISTORY_DEMO;
  const totalPaid = formatXof(aggregates.totalPaidXof);
  const totalPaidAmount = totalPaid.replace(/\s*XOF$/u, '').trim();

  const titleKey =
    aggregates.tenureMonths === 0 ? 'subscriber.history.title_first' : 'subscriber.history.title';

  const titleText = translate(titleKey, {
    name: aggregates.workerFirstName,
    months: aggregates.tenureMonths,
  });

  return (
    <main
      aria-labelledby="x16-headline"
      className="history-screen subscriber-tab-screen"
      data-screen-id="X-16"
    >
      <div className="history-body">
        <header className="history-header">
          <span className="history-eyebrow">{translate('subscriber.history.eyebrow')}</span>
        </header>

        <h1 className="history-title" id="x16-headline">
          <HistoryTitle text={titleText} accentName={aggregates.workerFirstName} />
        </h1>

        <section
          aria-label={translate('subscriber.history.eyebrow')}
          className="history-stats-card"
        >
          <div className="history-stat">
            <span className="history-stat-label">
              {translate('subscriber.history.stats.counter')}
            </span>
            <span className="history-stat-value">{aggregates.counter}</span>
          </div>
          <div className="history-stat align-right">
            <span className="history-stat-label">
              {translate('subscriber.history.stats.total')}
            </span>
            <span className="history-stat-value">
              {totalPaidAmount} <small>XOF</small>
            </span>
          </div>
        </section>

        <h2 className="history-eyebrow history-recent-label">
          {translate('subscriber.history.recent')}
        </h2>

        <ul className="history-list">
          {recentVisits.map((visit) => (
            <li key={visit.id}>
              <PastVisitCard
                entry={visit}
                locale={locale}
                onClick={() => navigate(`/history/${visit.id}`)}
              />
            </li>
          ))}
        </ul>

        <div className="history-grow" />
      </div>
      <nav className="hub-nav" aria-label={translate('common.navigation.main')}>
        <button className="hub-nav-item" type="button" onClick={() => navigate('/hub')}>
          <Home aria-hidden="true" className="hub-nav-glyph" />
          {translate('subscriber.dashboard.tab.home')}
        </button>
        <button className="hub-nav-item active" type="button" aria-current="page">
          <CalendarDays aria-hidden="true" className="hub-nav-glyph" />
          {translate('subscriber.dashboard.tab.visits')}
        </button>
        <button className="hub-nav-item" type="button" onClick={() => navigate('/plan')}>
          <WalletCards aria-hidden="true" className="hub-nav-glyph" />
          {translate('subscriber.dashboard.tab.plan')}
        </button>
        <button className="hub-nav-item" type="button" onClick={() => navigate('/profile')}>
          <UserRound aria-hidden="true" className="hub-nav-glyph" />
          {translate('subscriber.dashboard.tab.profile')}
        </button>
      </nav>
    </main>
  );
}

export function HistoryDetailX17(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/history');
  const params = useParams();
  const locale = useActiveLocale();
  const { aggregates, recentVisits } = SUBSCRIBER_HISTORY_DEMO;
  const visit = recentVisits.find((entry) => entry.id === params.visitId);

  useEffect(() => {
    if (visit === undefined) navigate('/history', { replace: true });
  }, [navigate, visit]);

  if (visit === undefined) return <></>;

  const detailTitle = translate('subscriber.history.detail.good_title');
  const duration = formatDuration(visit.durationMinutes, locale);
  const detailSubtitle = translate('subscriber.history.detail.duration_with_worker', {
    duration,
    name: aggregates.workerFirstName,
  });

  return (
    <main aria-labelledby="x17-headline" className="history-screen" data-screen-id="X-17">
      <div className="history-body">
        <header className="history-detail-header">
          <button
            aria-label={translate('common.action.back')}
            className="history-back"
            onClick={goBack}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="history-eyebrow">
            {translate('subscriber.history.detail.header', {
              date: formatDayMonth(visit.dateIso, locale, 'long'),
            })}
          </span>
        </header>

        <h1
          aria-label={`${detailTitle} ${detailSubtitle}`}
          className="history-title history-detail-title"
          id="x17-headline"
        >
          <em className="history-title-accent">{detailTitle}</em>
          <span>{detailSubtitle}</span>
        </h1>

        <section
          aria-label={translate('subscriber.visit.reveal.photos_label')}
          className="history-photo-grid"
        >
          <div className="history-photo before">
            <span>{translate('subscriber.history.detail.before')}</span>
          </div>
          <div className="history-photo after">
            <span>{translate('subscriber.history.detail.after')}</span>
          </div>
        </section>

        <section className="history-detail-card" aria-labelledby="x17-timeline-label">
          <h2 className="history-eyebrow" id="x17-timeline-label">
            {translate('subscriber.history.detail.timeline')}
          </h2>
          <dl className="history-timeline">
            <DetailRow
              label={translate('subscriber.history.detail.arrival')}
              value={formatClockTime(visit.arrivalTime24h, locale)}
            />
            <DetailRow
              label={translate('subscriber.history.detail.before_photo')}
              value={formatClockTime(visit.beforePhotoTime24h, locale)}
            />
            <DetailRow
              label={translate('subscriber.history.detail.after_photo')}
              value={formatClockTime(visit.afterPhotoTime24h, locale)}
            />
            <DetailRow
              label={translate('subscriber.history.detail.completed')}
              value={formatClockTime(visit.completedTime24h, locale)}
            />
          </dl>
        </section>

        <section className="history-detail-card" aria-labelledby="x17-payment-label">
          <h2 className="history-eyebrow" id="x17-payment-label">
            {translate('subscriber.history.detail.payment')}
          </h2>
          <dl className="history-timeline">
            <DetailRow
              label={translate('subscriber.history.detail.included')}
              value={`— ${formatXof(visit.paymentAmountXof)}`}
            />
          </dl>
        </section>

        <div className="history-grow" />

        <button
          className="history-report-button"
          onClick={() => navigate('/visit/issue')}
          type="button"
        >
          {translate('subscriber.history.detail.report.cta')}
        </button>
      </div>
    </main>
  );
}

function HistoryTitle({
  text,
  accentName,
}: {
  readonly text: string;
  readonly accentName: string;
}): ReactElement {
  const splitAt = text.indexOf(accentName);
  if (splitAt === -1) return <>{text}</>;
  const before = text.slice(0, splitAt);
  const after = text.slice(splitAt + accentName.length);
  return (
    <>
      {before}
      <em className="history-title-accent">{accentName}</em>
      {after}
    </>
  );
}

function DetailRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <div className="history-detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PastVisitCard({
  entry,
  locale,
  onClick,
}: {
  readonly entry: PastVisitEntry;
  readonly locale: WashedLocale;
  readonly onClick: () => void;
}): ReactElement {
  const subtitleKey =
    entry.mostRecent && entry.status === 'clean'
      ? 'subscriber.history.entry.duration_clean'
      : 'subscriber.history.entry.duration';

  const statusLabelKey =
    entry.status === 'clean'
      ? 'subscriber.history.entry.status_clean'
      : 'subscriber.history.entry.status_issue';

  return (
    <button className="history-card" onClick={onClick} type="button">
      <span aria-hidden="true" className="history-card-avatar" />
      <span className="history-card-meta">
        <strong>
          {formatDayMonth(entry.dateIso, locale, 'short')} ·{' '}
          {formatClockTime(entry.arrivalTime24h, locale)}
        </strong>
        <span>
          {translate(subtitleKey, { duration: formatDuration(entry.durationMinutes, locale) })}
        </span>
      </span>
      <span
        aria-label={translate(statusLabelKey)}
        className={`history-card-chip${entry.status === 'clean' ? ' clean' : ' issue'}`}
        role="img"
      >
        {entry.status === 'clean' ? (
          <Check aria-hidden="true" />
        ) : (
          <TriangleAlert aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
