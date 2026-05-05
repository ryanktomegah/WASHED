import { useState, type ReactElement } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { translate, type WashedLocale } from '@washed/i18n';
import { useActiveLocale } from '@washed/ui';

import { useSafeBack } from '../../navigation/useSafeBack.js';
import { ISSUE_OPTIONS, RESCHEDULE_OPTIONS, SUBSCRIBER_VISIT_DEMO } from './visitDemoData.js';

type RescheduleOptionId = (typeof RESCHEDULE_OPTIONS)[number]['id'];
type IssueOptionId = (typeof ISSUE_OPTIONS)[number]['id'];

function dateFromIso(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00.000Z`);
}

function localeTag(locale: WashedLocale): string {
  return locale === 'fr' ? 'fr-TG' : 'en-US';
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatVisitDateLabel(dateIso: string, locale: WashedLocale): string {
  return capitalizeFirst(
    new Intl.DateTimeFormat(localeTag(locale), {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    }).format(dateFromIso(dateIso)),
  );
}

function formatMonthYear(dateIso: string, locale: WashedLocale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    month: 'long',
    year: 'numeric',
  }).format(dateFromIso(dateIso));
}

function formatClockTime(time24h: string, locale: WashedLocale): string {
  const [hour = '0', minute = '00'] = time24h.split(':');
  if (locale === 'fr') return `${Number(hour)} h ${minute.padStart(2, '0')}`;

  const hour24 = Number(hour);
  const hour12 = ((hour24 + 11) % 12) + 1;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minute.padStart(2, '0')} ${period}`;
}

function photoTimeValues(
  time24h: string,
  locale: WashedLocale,
): { readonly hour: string; readonly min: string } {
  const [hour = '0', minute = '00'] = time24h.split(':');
  const hour24 = Number(hour);
  if (locale === 'fr') return { hour: hour24.toString(), min: minute.padStart(2, '0') };

  const hour12 = ((hour24 + 11) % 12) + 1;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  return { hour: hour12.toString(), min: `${minute.padStart(2, '0')} ${period}` };
}

function formatDuration(minutes: number, locale: WashedLocale): string {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = (minutes % 60).toString().padStart(2, '0');
  return locale === 'fr' ? `${hours} h ${remainder}` : `${hours} hr ${remainder}`;
}

function formatEstimatedDuration(minutes: number, locale: WashedLocale): string {
  return `~${formatDuration(minutes, locale)}`;
}

function formatTenureLabel(months: number, locale: WashedLocale): string {
  return locale === 'fr' ? `${months}e mois` : `month ${months}`;
}

function formatCadence(seconds: number, locale: WashedLocale): string {
  return locale === 'fr' ? `${seconds} secondes` : `${seconds} seconds`;
}

function formatVisitCounter(count: number, locale: WashedLocale): string {
  return locale === 'fr' ? `${count} visites` : `${count} visits`;
}

export function VisitDetailX11(): ReactElement {
  const navigate = useNavigate();

  return (
    <main aria-labelledby="x11-headline" className="visit-screen" data-screen-id="X-11">
      <div className="visit-body">
        <div className="visit-title-stack">
          <span className="visit-kicker">{translate('subscriber.visit.detail.kicker')}</span>
          <h1 className="visit-title" id="x11-headline">
            {translate('subscriber.visit.detail.title')}
          </h1>
        </div>

        <p className="visit-copy">{translate('subscriber.visit.detail.body')}</p>

        <dl className="visit-card">
          <div className="visit-row">
            <dt>{translate('subscriber.visit.detail.address.label')}</dt>
            <dd>Tokoin Casablanca</dd>
          </div>
          <div className="visit-rule" aria-hidden="true" />
          <div className="visit-row">
            <dt>{translate('subscriber.visit.detail.duration.label')}</dt>
            <dd>1 h 15</dd>
          </div>
          <div className="visit-rule" aria-hidden="true" />
          <div className="visit-row">
            <dt>{translate('subscriber.visit.detail.tier.label')}</dt>
            <dd>1 visite / mois</dd>
          </div>
        </dl>

        <p className="visit-notice">{translate('subscriber.visit.detail.report_note')}</p>

        <div className="visit-grow" />

        <button
          className="visit-button primary full"
          onClick={() => navigate('/visit/reschedule')}
          type="button"
        >
          {translate('subscriber.visit.detail.report.cta')}
        </button>
      </div>
    </main>
  );
}

export function VisitRescheduleX11M(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/visit/detail');
  const locale = useActiveLocale();
  const [selectedId, setSelectedId] = useState<RescheduleOptionId>(
    RESCHEDULE_OPTIONS[0]?.id ?? 'thu-07',
  );

  return (
    <main aria-labelledby="x11m-headline" className="visit-screen" data-screen-id="X-11.M">
      <div className="visit-body">
        <VisitBackHeader label={translate('subscriber.visit.reschedule.header')} onBack={goBack} />

        <h1 className="visit-title" id="x11m-headline">
          {translate('subscriber.visit.reschedule.title')}
        </h1>
        <p className="visit-copy">{translate('subscriber.visit.reschedule.body')}</p>

        <fieldset className="visit-choice-list" aria-labelledby="x11m-headline">
          <legend className="visit-sr">
            {translate('subscriber.visit.reschedule.options_label')}
          </legend>
          {RESCHEDULE_OPTIONS.map((option) => (
            <label
              className={`visit-choice${option.id === selectedId ? ' selected' : ''}`}
              key={option.id}
            >
              <input
                checked={option.id === selectedId}
                className="visit-sr"
                name="rescheduleOption"
                onChange={() => setSelectedId(option.id)}
                type="radio"
                value={option.id}
              />
              <span aria-hidden="true" className="visit-radio" />
              <span>
                <strong>{formatVisitDateLabel(option.dateIso, locale)}</strong>
                <small>
                  {translate(option.sublineKey, {
                    name: SUBSCRIBER_VISIT_DEMO.workerName.split(' ')[0] ?? '',
                    time: formatClockTime(option.time24h, locale),
                  })}
                </small>
              </span>
            </label>
          ))}
        </fieldset>

        <p className="visit-note">{translate('subscriber.visit.reschedule.note')}</p>

        <div className="visit-grow" />

        <button
          className="visit-button primary full"
          onClick={() => navigate('/visit/detail')}
          type="button"
        >
          {translate('subscriber.visit.reschedule.confirm.cta')}
        </button>
      </div>
    </main>
  );
}

export function VisitEnRouteX12(): ReactElement {
  const locale = useActiveLocale();
  const visit = SUBSCRIBER_VISIT_DEMO;
  const arrivalTime = formatClockTime(visit.arrivalTime24h, locale);

  return (
    <main aria-labelledby="x12-headline" className="visit-screen" data-screen-id="X-12">
      <div className="visit-body tight">
        <span className="visit-eyebrow" id="x12-headline">
          {translate('subscriber.visit.enroute.eyebrow', { time: arrivalTime })}
        </span>

        <div className="visit-map" aria-label={translate('subscriber.visit.enroute.map_label')}>
          <span className="visit-map-path path-a" />
          <span className="visit-map-path path-b" />
          <span className="visit-map-pin worker-pin" />
          <span className="visit-map-pin home-pin" />
          <span className="visit-map-label worker-label">{visit.workerInitials}</span>
          <span className="visit-map-label home-label">
            {translate('subscriber.visit.enroute.home_label')}
          </span>
        </div>

        <section
          className="visit-metric-card"
          aria-label={translate('subscriber.visit.enroute.metrics_label')}
        >
          <div>
            <span>{translate('subscriber.visit.enroute.distance_label')}</span>
            <strong>{visit.distance}</strong>
          </div>
          <div>
            <span>{translate('subscriber.visit.enroute.eta_label')}</span>
            <strong className="accent">{`${visit.etaMinutes} min`}</strong>
          </div>
        </section>

        <p className="visit-note">
          {translate('subscriber.visit.enroute.update_note', {
            cadence: formatCadence(visit.updateCadenceSeconds, locale),
          })}
        </p>
      </div>
    </main>
  );
}

export function VisitInProgressX13(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const visit = SUBSCRIBER_VISIT_DEMO;

  return (
    <main aria-labelledby="x13-headline" className="visit-screen" data-screen-id="X-13">
      <div className="visit-body center">
        <div className="visit-grow" />
        <span className="visit-chip success">
          {translate('subscriber.visit.in_progress.status')}
        </span>
        <h1 className="visit-title centered" id="x13-headline">
          {translate('subscriber.visit.in_progress.title')}
        </h1>
        <p className="visit-copy centered">{translate('subscriber.visit.in_progress.body')}</p>

        <section className="visit-panel cream align-left" aria-labelledby="x13-start">
          <h2 className="visit-eyebrow accent" id="x13-start">
            {translate('subscriber.visit.in_progress.started_title')}
          </h2>
          <p>
            <strong>
              {translate('subscriber.visit.in_progress.started_body', {
                name: visit.workerName,
                time: formatClockTime(visit.arrivedAt24h, locale),
              })}
            </strong>{' '}
          </p>
        </section>

        <div className="visit-grow" />

        <button className="visit-button ghost full" onClick={() => navigate('/hub')} type="button">
          {translate('subscriber.visit.in_progress.close_cta')}
        </button>
      </div>
    </main>
  );
}

export function VisitRevealX14(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const visit = SUBSCRIBER_VISIT_DEMO;
  const beforePhoto = photoTimeValues(visit.beforePhotoTime24h, locale);
  const afterPhoto = photoTimeValues(visit.afterPhotoTime24h, locale);

  return (
    <main aria-labelledby="x14-headline" className="visit-screen" data-screen-id="X-14">
      <div className="visit-body tight">
        <span className="visit-eyebrow">{translate('subscriber.visit.reveal.title')}</span>
        <h1 className="visit-title" id="x14-headline">
          <em>{translate('subscriber.visit.reveal.completed_title')}</em>
        </h1>
        <p className="visit-note">
          {translate('subscriber.visit.reveal.completed_note', {
            name: visit.workerName,
            time: formatClockTime(visit.completedAt24h, locale),
            duration: formatDuration(visit.completedDurationMinutes, locale),
          })}
        </p>

        <div
          className="visit-photo-grid"
          aria-label={translate('subscriber.visit.reveal.photos_label')}
        >
          <div className="visit-photo before">
            {translate('subscriber.visit.reveal.before', {
              hour: beforePhoto.hour,
              min: beforePhoto.min,
            })}
          </div>
          <div className="visit-photo after">
            {translate('subscriber.visit.reveal.after', {
              hour: afterPhoto.hour,
              min: afterPhoto.min,
            })}
          </div>
        </div>

        <section className="visit-panel" aria-labelledby="x14-recap">
          <h2 className="visit-eyebrow" id="x14-recap">
            {translate('subscriber.visit.reveal.recap_title')}
          </h2>
          <dl className="visit-recap">
            <div>
              <dt>{translate('subscriber.visit.reveal.timeline.start')}</dt>
              <dd>{formatClockTime(visit.arrivedAt24h, locale)}</dd>
            </div>
            <div>
              <dt>{translate('subscriber.visit.reveal.timeline.wash')}</dt>
              <dd>{formatDuration(visit.completedWashDurationMinutes, locale)}</dd>
            </div>
            <div>
              <dt>{translate('subscriber.visit.reveal.timeline.end')}</dt>
              <dd>{formatClockTime(visit.completedAt24h, locale)}</dd>
            </div>
          </dl>
        </section>

        <div className="visit-grow" />

        <button
          className="visit-button primary full"
          onClick={() => navigate('/visit/feedback')}
          type="button"
        >
          {translate('subscriber.visit.feedback.good')}
        </button>
        <button
          className="visit-button ghost full"
          onClick={() => navigate('/visit/issue')}
          type="button"
        >
          {translate('subscriber.visit.feedback.issue')}
        </button>
      </div>
    </main>
  );
}

export function VisitFeedbackX15(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const visit = SUBSCRIBER_VISIT_DEMO;

  return (
    <main aria-labelledby="x15-headline" className="visit-screen" data-screen-id="X-15">
      <div className="visit-body center">
        <div className="visit-grow" />
        <div aria-hidden="true" className="visit-checkmark">
          <Check />
        </div>
        <h1 className="visit-title centered" id="x15-headline">
          {translate('subscriber.visit.thanks.title')}
        </h1>
        <p className="visit-copy centered">{translate('subscriber.visit.thanks.body')}</p>

        <section className="visit-panel cream align-left full" aria-labelledby="x15-counter">
          <h2 className="visit-eyebrow accent" id="x15-counter">
            {translate('subscriber.visit.thanks.counter_title')}
          </h2>
          <div className="visit-counter">{formatVisitCounter(visit.counter, locale)}</div>
          <p>
            {translate('subscriber.visit.thanks.counter_line', {
              name: visit.workerName.split(' ')[0] ?? visit.workerName,
              since: formatMonthYear(visit.counterSinceIso, locale),
            })}
          </p>
        </section>

        <div className="visit-grow" />

        <button className="visit-button ghost full" onClick={() => navigate('/hub')} type="button">
          {translate('subscriber.visit.return_home.cta')}
        </button>
      </div>
    </main>
  );
}

export function VisitIssueX15S(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/visit/detail');
  const [selectedIssue, setSelectedIssue] = useState<IssueOptionId>(
    ISSUE_OPTIONS[0]?.id ?? 'damaged',
  );

  return (
    <main aria-labelledby="x15s-headline" className="visit-screen" data-screen-id="X-15.S">
      <div className="visit-body">
        <VisitBackHeader label={translate('subscriber.visit.issue.header')} onBack={goBack} />

        <h1 className="visit-title" id="x15s-headline">
          {translate('subscriber.visit.issue.title')}
        </h1>
        <p className="visit-copy">{translate('subscriber.visit.support.body')}</p>

        <fieldset className="visit-choice-list compact" aria-labelledby="x15s-headline">
          <legend className="visit-sr">{translate('subscriber.visit.feedback.issue')}</legend>
          {ISSUE_OPTIONS.map((issue) => (
            <label
              className={`visit-choice${issue.id === selectedIssue ? ' selected' : ''}`}
              key={issue.id}
            >
              <input
                checked={issue.id === selectedIssue}
                className="visit-sr"
                name="issue"
                onChange={() => setSelectedIssue(issue.id)}
                type="radio"
                value={issue.id}
              />
              <span aria-hidden="true" className="visit-radio" />
              <span>
                <strong>{translate(issue.labelKey)}</strong>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="visit-grow" />

        <button
          className="visit-button primary full"
          onClick={() => navigate('/visit/issue/submitted')}
          type="button"
        >
          {translate('subscriber.visit.support.submit.cta')}
        </button>
      </div>
    </main>
  );
}

export function VisitIssueSubmittedX15S(): ReactElement {
  const navigate = useNavigate();

  return (
    <main
      aria-labelledby="x15s-submitted-headline"
      className="visit-screen"
      data-screen-id="X-15.S"
    >
      <div className="visit-body center">
        <div className="visit-grow" />
        <div aria-hidden="true" className="visit-checkmark">
          <Check />
        </div>
        <h1 className="visit-title centered" id="x15s-submitted-headline">
          {translate('subscriber.visit.support.submitted.title')}
        </h1>
        <p className="visit-copy centered">
          {translate('subscriber.visit.support.submitted.body')}
        </p>
        <div className="visit-grow" />
        <button
          className="visit-button primary full"
          onClick={() => navigate('/support/tickets/0421')}
          type="button"
        >
          {translate('subscriber.visit.support.submitted.ticket_cta')}
        </button>
        <button className="visit-button ghost full" onClick={() => navigate('/hub')} type="button">
          {translate('subscriber.visit.return_home.cta')}
        </button>
      </div>
    </main>
  );
}

function VisitBackHeader({
  label,
  onBack,
}: {
  readonly label: string;
  readonly onBack: () => void;
}): ReactElement {
  return (
    <div className="visit-header">
      <button
        aria-label={translate('common.action.back')}
        className="visit-back"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <span>{label}</span>
    </div>
  );
}

function VisitTimeTitle({
  text,
  time,
}: {
  readonly text: string;
  readonly time: string;
}): ReactElement {
  const splitAt = text.indexOf(time);
  if (splitAt === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, splitAt)}
      <em>{time}</em>
      {text.slice(splitAt + time.length)}
    </>
  );
}
