import { useEffect, useState, type ReactElement } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { translate } from '@washed/i18n';
import { useActiveLocale } from '@washed/ui';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import { useSafeBack } from '../../navigation/useSafeBack.js';
import { SUBSCRIBER_WORKER_PROFILE_DEMO } from './workerProfileDemoData.js';

const CHANGE_REASONS = ['personal', 'quality', 'behavior', 'schedule', 'other'] as const;

type ChangeReason = (typeof CHANGE_REASONS)[number];

export function WorkerProfileX18(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/hub');
  const locale = useActiveLocale();
  const params = useParams();
  const worker =
    params.workerId === SUBSCRIBER_WORKER_PROFILE_DEMO.id
      ? SUBSCRIBER_WORKER_PROFILE_DEMO
      : undefined;

  useEffect(() => {
    if (worker === undefined) navigate('/hub', { replace: true });
  }, [navigate, worker]);

  if (worker === undefined) return <></>;

  return (
    <main aria-labelledby="x18-headline" className="worker-profile-screen" data-screen-id="X-18">
      <div className="worker-profile-body">
        <header className="worker-profile-header">
          <button
            aria-label={translate('common.action.back')}
            className="worker-profile-back"
            onClick={goBack}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="worker-profile-eyebrow">
            {translate('subscriber.worker.profile.header')}
          </span>
        </header>

        <section className="worker-profile-identity" aria-labelledby="x18-headline">
          <span aria-hidden="true" className="worker-profile-avatar">
            {worker.initials}
          </span>
          <div>
            <h1 className="worker-profile-name" id="x18-headline">
              {worker.name}
            </h1>
            <p className="worker-profile-location">
              {translate('subscriber.worker.profile.location', {
                neighborhood: worker.neighborhood,
                distance: worker.distanceFromHome,
              })}
            </p>
          </div>
        </section>

        <section className="worker-profile-relation-card" aria-labelledby="x18-relation-label">
          <h2 className="worker-profile-eyebrow accent" id="x18-relation-label">
            {translate('subscriber.worker.profile.relation.title')}
          </h2>
          <div className="worker-profile-relation-grid">
            <MetricBlock
              label={translate('subscriber.worker.profile.relation.together')}
              value={translate('subscriber.worker.profile.relation.months', {
                months: worker.tenureMonths,
              })}
            />
            <MetricBlock
              align="right"
              label={translate('subscriber.worker.profile.relation.visits')}
              value={worker.visitCount.toString()}
            />
          </div>
        </section>

        <InfoCard
          body={translate('subscriber.worker.profile.path.body', {
            since: worker.since[locale],
            households: worker.regularHouseholds,
            languages: worker.languages[locale],
          })}
          id="x18-path-label"
          title={translate('subscriber.worker.profile.path.title')}
        />

        <InfoCard
          body={translate('subscriber.worker.profile.reliability.body', {
            visits: worker.totalVisits,
            cancellations: worker.cancellationsByWorker,
            onTimeRate: worker.onTimeRateThisMonth,
          })}
          id="x18-reliability-label"
          title={translate('subscriber.worker.profile.reliability.title')}
        />

        <div className="worker-profile-grow" />

        <button
          className="worker-profile-change-button"
          onClick={() => navigate(`/worker/${worker.id}/change`)}
          type="button"
        >
          {translate('subscriber.worker.profile.change.cta')}
        </button>
      </div>
    </main>
  );
}

export function WorkerChangeX18C(): ReactElement {
  const navigate = useNavigate();
  const subscriberApi = useSubscriberApi();
  const params = useParams();
  const worker =
    params.workerId === SUBSCRIBER_WORKER_PROFILE_DEMO.id
      ? SUBSCRIBER_WORKER_PROFILE_DEMO
      : undefined;
  const goBack = useSafeBack(`/worker/${worker?.id ?? SUBSCRIBER_WORKER_PROFILE_DEMO.id}`);
  const [reason, setReason] = useState<ChangeReason>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);

  useEffect(() => {
    if (worker === undefined) navigate('/hub', { replace: true });
  }, [navigate, worker]);

  if (worker === undefined) return <></>;

  const firstName = worker.name.split(' ')[0] ?? worker.name;
  const submittedPath = `/worker/${worker.id}/change/submitted`;

  async function submitChangeRequest(): Promise<void> {
    if (isSubmitting) return;

    if (!subscriberApi.isConfigured) {
      navigate(submittedPath);
      return;
    }

    setHasSubmissionError(false);
    setIsSubmitting(true);
    try {
      await subscriberApi.requestWorkerSwap({
        reason: translate(changeReasonKey(reason), { name: firstName }),
        requestedAt: new Date().toISOString(),
      });
      navigate(submittedPath);
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main aria-labelledby="x18c-headline" className="worker-profile-screen" data-screen-id="X-18.C">
      <div className="worker-profile-body">
        <header className="worker-profile-header">
          <button
            aria-label={translate('common.action.back')}
            className="worker-profile-back"
            onClick={goBack}
            type="button"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="worker-profile-eyebrow">
            {translate('subscriber.worker.change.header')}
          </span>
        </header>

        <h1 className="worker-profile-change-title" id="x18c-headline">
          {translate('subscriber.worker.change.title')}
        </h1>
        <p className="worker-profile-change-body">
          {translate('subscriber.worker.change.body', { name: firstName })}
        </p>

        <fieldset className="worker-profile-choice-list">
          <legend className="worker-profile-sr-only">
            {translate('subscriber.worker.change.title')}
          </legend>
          {CHANGE_REASONS.map((option) => (
            <label
              className={`worker-profile-choice${reason === option ? ' is-selected' : ''}`}
              key={option}
            >
              <span className="worker-profile-radio" aria-hidden="true" />
              <input
                checked={reason === option}
                className="worker-profile-sr-only"
                name="worker-change-reason"
                onChange={() => setReason(option)}
                type="radio"
                value={option}
              />
              <span>{translate(changeReasonKey(option), { name: firstName })}</span>
            </label>
          ))}
        </fieldset>

        <aside className="worker-profile-note" aria-labelledby="x18c-note-title">
          <h2 className="worker-profile-eyebrow accent" id="x18c-note-title">
            {translate('subscriber.worker.change.note.title')}
          </h2>
          <p>{translate('subscriber.worker.change.note.body', { name: firstName })}</p>
        </aside>

        {hasSubmissionError ? (
          <p className="worker-profile-note" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}

        <div className="worker-profile-grow" />

        <button
          className="worker-profile-submit-button"
          disabled={isSubmitting}
          onClick={() => void submitChangeRequest()}
          type="button"
        >
          {translate('subscriber.worker.change.submit.cta')}
        </button>
      </div>
    </main>
  );
}

export function WorkerChangeSubmittedX18C(): ReactElement {
  const navigate = useNavigate();
  const params = useParams();
  const worker =
    params.workerId === SUBSCRIBER_WORKER_PROFILE_DEMO.id
      ? SUBSCRIBER_WORKER_PROFILE_DEMO
      : undefined;

  useEffect(() => {
    if (worker === undefined) navigate('/hub', { replace: true });
  }, [navigate, worker]);

  if (worker === undefined) return <></>;

  const firstName = worker.name.split(' ')[0] ?? worker.name;

  return (
    <main
      aria-labelledby="x18c-submitted-headline"
      className="worker-profile-screen"
      data-screen-id="X-18.C.S"
    >
      <div className="worker-profile-body worker-profile-submitted">
        <span aria-hidden="true" className="worker-profile-submitted-mark">
          <Check />
        </span>
        <h1 className="worker-profile-change-title" id="x18c-submitted-headline">
          {translate('subscriber.worker.change.submitted.title')}
        </h1>
        <p className="worker-profile-change-body">
          {translate('subscriber.worker.change.submitted.body', { name: firstName })}
        </p>

        <div className="worker-profile-grow" />

        <button
          className="worker-profile-submit-button"
          onClick={() => navigate('/hub')}
          type="button"
        >
          {translate('subscriber.visit.return_home.cta')}
        </button>
      </div>
    </main>
  );
}

function changeReasonKey(
  option: ChangeReason,
):
  | 'subscriber.worker.change.reason.personal'
  | 'subscriber.worker.change.reason.quality'
  | 'subscriber.worker.change.reason.behavior'
  | 'subscriber.worker.change.reason.schedule'
  | 'subscriber.worker.change.reason.other' {
  switch (option) {
    case 'personal':
      return 'subscriber.worker.change.reason.personal';
    case 'quality':
      return 'subscriber.worker.change.reason.quality';
    case 'behavior':
      return 'subscriber.worker.change.reason.behavior';
    case 'schedule':
      return 'subscriber.worker.change.reason.schedule';
    case 'other':
      return 'subscriber.worker.change.reason.other';
  }
}

function MetricBlock({
  align = 'left',
  label,
  value,
}: {
  readonly align?: 'left' | 'right';
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <div className={`worker-profile-metric ${align}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InfoCard({
  body,
  id,
  title,
}: {
  readonly body: string;
  readonly id: string;
  readonly title: string;
}): ReactElement {
  return (
    <section className="worker-profile-card" aria-labelledby={id}>
      <h2 className="worker-profile-eyebrow" id={id}>
        {title}
      </h2>
      <p>{body}</p>
    </section>
  );
}
