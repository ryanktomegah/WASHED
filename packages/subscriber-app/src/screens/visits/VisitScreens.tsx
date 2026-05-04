import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSafeBack } from '../../navigation/useSafeBack.js';
import { ISSUE_OPTIONS, RESCHEDULE_OPTIONS, SUBSCRIBER_VISIT_DEMO } from './visitDemoData.js';

type RescheduleOptionId = (typeof RESCHEDULE_OPTIONS)[number]['id'];

export function VisitDetailX11(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/hub');
  const visit = SUBSCRIBER_VISIT_DEMO;

  return (
    <main aria-labelledby="x11-headline" className="visit-screen" data-screen-id="X-11">
      <div className="visit-body">
        <VisitBackHeader label={`Visite · ${visit.visitDateLabel}`} onBack={goBack} />

        <h1 className="visit-title" id="x11-headline">
          {visit.workerName} arrive
          <br /> à <em>{visit.arrivalTime}</em>.
        </h1>

        <div className="visit-chip-row" aria-label="Détails de la visite">
          <span className="visit-chip success">{visit.tenureLabel}</span>
          <span className="visit-chip">{visit.neighborhood}</span>
          <span className="visit-chip">{visit.estimatedDuration}</span>
        </div>

        <section className="visit-panel" aria-labelledby="x11-brings">
          <h2 className="visit-eyebrow" id="x11-brings">
            {translate('subscriber.visit.detail.brings.title')}
          </h2>
          <p>{translate('subscriber.visit.detail.brings.body')}</p>
        </section>

        <section className="visit-panel" aria-labelledby="x11-reminders">
          <h2 className="visit-eyebrow" id="x11-reminders">
            {translate('subscriber.visit.detail.reminders.title')}
          </h2>
          <ul className="visit-list">
            <li>{translate('subscriber.visit.detail.reminder.sms')}</li>
            <li>{translate('subscriber.visit.detail.reminder.push')}</li>
            <li>{translate('subscriber.visit.detail.reminder.photos')}</li>
          </ul>
        </section>

        <div className="visit-grow" />

        <button
          className="visit-button primary full"
          onClick={() => navigate('/visit/en-route')}
          type="button"
        >
          {translate('subscriber.visit.detail.follow.cta')}
        </button>
        <div className="visit-row2">
          <button
            className="visit-button ghost"
            onClick={() => navigate('/visit/reschedule')}
            type="button"
          >
            {translate('subscriber.visit.detail.report.cta')}
          </button>
          <button
            className="visit-button ghost"
            onClick={() => navigate('/visit/issue')}
            type="button"
          >
            {translate('subscriber.visit.feedback.issue')}
          </button>
        </div>
      </div>
    </main>
  );
}

export function VisitRescheduleX11M(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/visit/detail');
  const [selectedId, setSelectedId] = useState<RescheduleOptionId>(
    RESCHEDULE_OPTIONS[0]?.id ?? 'thu-07',
  );

  return (
    <main aria-labelledby="x11m-headline" className="visit-screen" data-screen-id="X-11.M">
      <div className="visit-body">
        <VisitBackHeader label="Reporter une visite" onBack={goBack} />

        <h1 className="visit-title" id="x11m-headline">
          {translate('subscriber.visit.reschedule.title')}
        </h1>
        <p className="visit-copy">{translate('subscriber.visit.reschedule.body')}</p>

        <fieldset className="visit-choice-list" aria-labelledby="x11m-headline">
          <legend className="visit-sr">Créneaux proposés</legend>
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
                <strong>{option.label}</strong>
                <small>{option.subline}</small>
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
  const visit = SUBSCRIBER_VISIT_DEMO;

  return (
    <main aria-labelledby="x12-headline" className="visit-screen" data-screen-id="X-12">
      <div className="visit-body tight">
        <span className="visit-eyebrow" id="x12-headline">
          En route · arrive à {visit.arrivalTime}
        </span>

        <div className="visit-map" aria-label="Carte de suivi">
          <span className="visit-map-path path-a" />
          <span className="visit-map-path path-b" />
          <span className="visit-map-pin worker-pin" />
          <span className="visit-map-pin home-pin" />
          <span className="visit-map-label worker-label">{visit.workerInitials}</span>
          <span className="visit-map-label home-label">Votre foyer</span>
        </div>

        <section className="visit-metric-card" aria-label="Statut du trajet">
          <div>
            <span>Distance</span>
            <strong>{visit.distance}</strong>
          </div>
          <div>
            <span>Arrive dans</span>
            <strong className="accent">{visit.eta}</strong>
          </div>
        </section>

        <p className="visit-note">Mise à jour toutes les {visit.updateCadence}</p>
      </div>
    </main>
  );
}

export function VisitInProgressX13(): ReactElement {
  const navigate = useNavigate();
  const visit = SUBSCRIBER_VISIT_DEMO;

  return (
    <main aria-labelledby="x13-headline" className="visit-screen" data-screen-id="X-13">
      <div className="visit-body center">
        <div className="visit-grow" />
        <span className="visit-chip success">Visite en cours</span>
        <h1 className="visit-title centered" id="x13-headline">
          {translate('subscriber.visit.in_progress.title')}
        </h1>
        <p className="visit-copy centered">{translate('subscriber.visit.in_progress.body')}</p>

        <section className="visit-panel cream align-left" aria-labelledby="x13-start">
          <h2 className="visit-eyebrow accent" id="x13-start">
            Démarrage
          </h2>
          <p>
            <strong>
              {visit.workerName} est arrivée à {visit.arrivedAt}.
            </strong>{' '}
            Photo « avant » prise.
          </p>
        </section>

        <div className="visit-grow" />

        <button className="visit-button ghost full" onClick={() => navigate('/hub')} type="button">
          Fermer l&apos;app sereinement
        </button>
      </div>
    </main>
  );
}

export function VisitRevealX14(): ReactElement {
  const navigate = useNavigate();
  const visit = SUBSCRIBER_VISIT_DEMO;

  return (
    <main aria-labelledby="x14-headline" className="visit-screen" data-screen-id="X-14">
      <div className="visit-body tight">
        <span className="visit-eyebrow">{translate('subscriber.visit.reveal.title')}</span>
        <h1 className="visit-title" id="x14-headline">
          <em>Visite terminée.</em>
        </h1>
        <p className="visit-note">
          {visit.workerName} est partie à {visit.completedAt}. Durée {visit.completedDuration}.
        </p>

        <div className="visit-photo-grid" aria-label="Photos avant et après">
          <div className="visit-photo before">
            {translate('subscriber.visit.reveal.before', 'fr', {
              hour: visit.beforePhotoTime.split(' h ')[0] ?? '9',
              min: visit.beforePhotoTime.split(' h ')[1] ?? '01',
            })}
          </div>
          <div className="visit-photo after">
            {translate('subscriber.visit.reveal.after', 'fr', {
              hour: visit.afterPhotoTime.split(' h ')[0] ?? '10',
              min: visit.afterPhotoTime.split(' h ')[1] ?? '04',
            })}
          </div>
        </div>

        <section className="visit-panel" aria-labelledby="x14-recap">
          <h2 className="visit-eyebrow" id="x14-recap">
            Récap
          </h2>
          <dl className="visit-recap">
            <div>
              <dt>Démarrage</dt>
              <dd>{visit.arrivedAt}</dd>
            </div>
            <div>
              <dt>Lavage</dt>
              <dd>62 min</dd>
            </div>
            <div>
              <dt>Fin</dt>
              <dd>{visit.completedAt}</dd>
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
  const visit = SUBSCRIBER_VISIT_DEMO;

  return (
    <main aria-labelledby="x15-headline" className="visit-screen" data-screen-id="X-15">
      <div className="visit-body center">
        <div className="visit-grow" />
        <div aria-hidden="true" className="visit-checkmark">
          ✓
        </div>
        <h1 className="visit-title centered" id="x15-headline">
          {translate('subscriber.visit.thanks.title')}
        </h1>
        <p className="visit-copy centered">{translate('subscriber.visit.thanks.body')}</p>

        <section className="visit-panel cream align-left full" aria-labelledby="x15-counter">
          <h2 className="visit-eyebrow accent" id="x15-counter">
            Votre compteur
          </h2>
          <div className="visit-counter">{visit.counter}</div>
          <p>avec Akouvi · depuis {visit.counterSince}</p>
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
  const [selectedIssue, setSelectedIssue] = useState<(typeof ISSUE_OPTIONS)[number]>(
    ISSUE_OPTIONS[0] ?? 'Linge endommagé',
  );

  return (
    <main aria-labelledby="x15s-headline" className="visit-screen" data-screen-id="X-15.S">
      <div className="visit-body">
        <VisitBackHeader label="Signaler un souci" onBack={goBack} />

        <h1 className="visit-title" id="x15s-headline">
          Qu'est-ce
          <br /> qui ne va pas ?
        </h1>
        <p className="visit-copy">{translate('subscriber.visit.support.body')}</p>

        <fieldset className="visit-choice-list compact" aria-labelledby="x15s-headline">
          <legend className="visit-sr">{translate('subscriber.visit.feedback.issue')}</legend>
          {ISSUE_OPTIONS.map((issue) => (
            <label
              className={`visit-choice${issue === selectedIssue ? ' selected' : ''}`}
              key={issue}
            >
              <input
                checked={issue === selectedIssue}
                className="visit-sr"
                name="issue"
                onChange={() => setSelectedIssue(issue)}
                type="radio"
                value={issue}
              />
              <span aria-hidden="true" className="visit-radio" />
              <span>
                <strong>{issue}</strong>
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
          ✓
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
      <button aria-label="Retour" className="visit-back" onClick={onBack} type="button">
        ‹
      </button>
      <span>{label}</span>
    </div>
  );
}
