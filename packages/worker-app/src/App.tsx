import { useReducer, useState } from 'react';

import {
  Alert,
  Badge,
  BottomNav,
  Button,
  Card,
  EmptyState,
  ListItem,
  Tabs,
  WashedThemeProvider,
} from '@washed/ui';
import type { Dispatch, ReactElement, ReactNode } from 'react';

import {
  routeCards,
  visitSteps,
  workerCopy,
  workerSurfaces,
  type PrimaryWorkerRoute,
  type WorkerRoute,
} from './appData.js';
import {
  initialWorkerState,
  workerReducer,
  type WorkerAction,
  type WorkerState,
} from './workerState.js';

const navOrder = [
  'today',
  'planning',
  'earnings',
  'profile',
] as const satisfies readonly PrimaryWorkerRoute[];

export function App(): ReactElement {
  const [route, setRoute] = useState<WorkerRoute>('today');
  const [workerState, dispatch] = useReducer(workerReducer, initialWorkerState);
  const t = workerCopy;

  return (
    <WashedThemeProvider className="worker-frame" theme="worker">
      <div className="status-spacer" />
      <header className="worker-topbar">
        <button className="worker-brand" onClick={() => setRoute('today')} type="button">
          <strong>Washed</strong>
          <span>Travailleuse</span>
        </button>
        <Button
          className="sos-button"
          onClick={() => dispatch({ type: 'sos/open' })}
          variant="danger"
        >
          {t.safety.panic}
        </Button>
      </header>

      <main className="worker-shell">
        {workerState.lastFeedback === null ? null : (
          <Alert className="feedback-banner" tone="success">
            {t.feedback[workerState.lastFeedback]}
          </Alert>
        )}
        {route === 'today' ? (
          <TodayScreen
            dispatch={dispatch}
            onRouteChange={setRoute}
            t={t}
            workerState={workerState}
          />
        ) : null}
        {route === 'planning' ? (
          <PlanningScreen dispatch={dispatch} workerState={workerState} t={t} />
        ) : null}
        {route === 'earnings' ? (
          <EarningsScreen dispatch={dispatch} workerState={workerState} t={t} />
        ) : null}
        {route === 'profile' ? <ProfileScreen dispatch={dispatch} t={t} /> : null}
        {route === 'activation' ? (
          <ActivationScreen dispatch={dispatch} workerState={workerState} t={t} />
        ) : null}
        {route === 'inbox' ? <InboxScreen workerState={workerState} t={t} /> : null}
        {route === 'photoRetry' ? <PhotoRetryScreen dispatch={dispatch} t={t} /> : null}
        {route === 'daySummary' ? (
          <DaySummaryScreen dispatch={dispatch} workerState={workerState} t={t} />
        ) : null}
      </main>

      {workerState.sos.open ? <SosSheet dispatch={dispatch} t={t} /> : null}

      <BottomNav
        className="bottom-nav"
        items={navOrder.map((navRoute) => ({
          active: route === navRoute,
          label: t.nav[navRoute],
          onClick: () => setRoute(navRoute),
        }))}
      />
    </WashedThemeProvider>
  );
}

function TodayScreen({
  dispatch,
  onRouteChange,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly onRouteChange: (route: WorkerRoute) => void;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  const offlineCount = workerState.offlineQueueCount;

  return (
    <>
      <section className="worker-summary" aria-labelledby="worker-route-title">
        <div>
          <Badge tone="success">{t.today.routeActive}</Badge>
          <h1 id="worker-route-title">{t.today.title}</h1>
          <p>
            {t.today.visitCount}
            {offlineCount > 0 ? ` · ${offlineCount} actions hors ligne` : ''}
          </p>
        </div>
        <Button onClick={() => dispatch({ type: 'sos/open' })} variant="danger">
          {t.safety.panic}
        </Button>
      </section>

      <Alert
        title={
          offlineCount > 0 ? `${offlineCount} actions en attente de synchronisation` : t.sync.ready
        }
        tone={offlineCount > 0 ? 'accent' : 'success'}
      >
        <div className="sync-alert-body">
          <span>
            {offlineCount > 0 ? t.sync.offline : 'Toutes les preuves locales sont synchronisées.'}
          </span>
          <Button
            disabled={offlineCount === 0}
            onClick={() => dispatch({ type: 'sync/complete' })}
            size="sm"
            variant="secondary"
          >
            {t.action.retrySync}
          </Button>
        </div>
      </Alert>

      {workerState.activation.agreementAccepted ? null : (
        <Alert title={t.activation.title} tone="accent">
          <div className="sync-alert-body">
            <span>{t.activation.agreement}</span>
            <Button onClick={() => onRouteChange('activation')} size="sm" variant="secondary">
              {t.nav.activation}
            </Button>
          </div>
        </Alert>
      )}

      <Card elevated>
        <div className="card-header">
          <div>
            <span className="eyebrow">Prochaine visite</span>
            <h2>{t.today.subscriber}</h2>
          </div>
          <Badge>9:00</Badge>
        </div>
        <ListItem
          after={<Badge tone="success">100 m GPS</Badge>}
          description={t.today.addressHint}
          title={t.action.heading}
        />
        <VisitLifecycle dispatch={dispatch} t={t} workerState={workerState} />
        <VisitWorkstation
          dispatch={dispatch}
          onRouteChange={onRouteChange}
          t={t}
          workerState={workerState}
        />
        <div className="visit-actions">
          <Button fullWidth onClick={() => onRouteChange('planning')} variant="secondary">
            {t.planning.week}
          </Button>
          <Button
            fullWidth
            onClick={() => dispatch({ type: 'visit/reportIssue' })}
            variant="secondary"
          >
            {t.action.safetyReport}
          </Button>
          <Button fullWidth onClick={() => onRouteChange('photoRetry')} variant="secondary">
            {t.nav.photoRetry}
          </Button>
          <Button
            fullWidth
            onClick={() => dispatch({ type: 'visit/declareNoShow' })}
            variant="danger"
          >
            {t.action.declareNoShow}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="card-header">
          <h2>Route</h2>
          <Badge>{routeCards.length}</Badge>
        </div>
        <div className="route-list">
          {routeCards.map((card) => (
            <ListItem
              after={
                <Badge tone={card.status === 'Prochaine' ? 'success' : 'muted'}>
                  {card.status}
                </Badge>
              }
              description={t.today.addressHint}
              key={`${card.time}-${card.title}`}
              title={`${card.time} · ${card.title}`}
            />
          ))}
        </div>
        <div className="visit-actions">
          <Button fullWidth onClick={() => onRouteChange('inbox')} variant="secondary">
            {t.nav.inbox}
          </Button>
          <Button fullWidth onClick={() => onRouteChange('daySummary')} variant="secondary">
            {t.nav.daySummary}
          </Button>
        </div>
      </Card>
    </>
  );
}

function VisitWorkstation({
  dispatch,
  onRouteChange,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly onRouteChange: (route: WorkerRoute) => void;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  const stepConfig = {
    afterPhoto: {
      body: 'Vérifier les preuves, confirmer la sortie GPS et fermer la visite.',
      label: t.action.checkOutNow,
      onClick: () => dispatch({ step: 'checkOut', type: 'visit/setStep' }),
      title: 'Photo après enregistrée',
    },
    beforePhoto: {
      body: 'Photo avant en file hors ligne. Démarrer la prestation quand vous êtes prête.',
      label: t.action.startVisit,
      onClick: () => dispatch({ step: 'inVisit', type: 'visit/setStep' }),
      title: 'Preuve avant capturée',
    },
    checkIn: {
      body: 'GPS validé dans le rayon de 100 m. Capturer la photo avant maintenant.',
      label: t.action.takeBeforePhoto,
      onClick: () => dispatch({ step: 'beforePhoto', type: 'visit/setStep' }),
      title: 'Arrivée pointée',
    },
    checkOut: {
      body: 'Visite terminée. Les actions se synchronisent dès que le réseau revient.',
      label: t.action.openSummary,
      onClick: () => onRouteChange('daySummary'),
      title: 'Sortie pointée',
    },
    heading: {
      body: 'Le suivi encadré est visible côté abonnée seulement pendant ce trajet.',
      label: t.action.checkInNow,
      onClick: () => dispatch({ step: 'checkIn', type: 'visit/setStep' }),
      title: 'En route vers Ama K.',
    },
    inVisit: {
      body: 'La visite est en cours. Capturer la photo après avant de quitter le foyer.',
      label: t.action.takeAfterPhoto,
      onClick: () => dispatch({ step: 'afterPhoto', type: 'visit/setStep' }),
      title: 'Visite en cours',
    },
  }[workerState.visit.step];

  const proofItems = [
    { done: true, label: 'Route reçue' },
    { done: workerState.visit.step !== 'heading', label: 'Arrivée GPS' },
    { done: workerState.visit.beforePhotoCaptured, label: 'Photo avant' },
    {
      done: workerState.visit.step === 'inVisit' || workerState.visit.afterPhotoCaptured,
      label: 'Prestation',
    },
    { done: workerState.visit.afterPhotoCaptured, label: 'Photo après' },
    { done: workerState.visit.step === 'checkOut', label: 'Sortie GPS' },
  ];

  return (
    <div className="visit-workstation" aria-label="Guided visit workflow">
      <div>
        <span className="eyebrow">Étape terrain</span>
        <h3>{stepConfig.title}</h3>
        <p>{stepConfig.body}</p>
      </div>

      <div className="proof-grid" aria-label="Visit proof checklist">
        {proofItems.map((item) => (
          <span className="proof-item" data-complete={item.done} key={item.label}>
            {item.label}
          </span>
        ))}
      </div>

      <Button fullWidth onClick={stepConfig.onClick}>
        {stepConfig.label}
      </Button>
    </div>
  );
}

function VisitLifecycle({
  dispatch,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  return (
    <div className="route-steps" aria-label="Worker route lifecycle">
      {visitSteps.map((step, index) => (
        <button
          aria-label={t.visitStep[step]}
          aria-pressed={workerState.visit.step === step}
          className="route-step"
          key={step}
          onClick={() => dispatch({ step, type: 'visit/setStep' })}
          type="button"
        >
          <span>{index + 1}</span>
          <strong>{t.visitStep[step]}</strong>
        </button>
      ))}
    </div>
  );
}

function PlanningScreen({
  dispatch,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Semaine" title={t.planning.title}>
      <Card elevated>
        <div className="card-header">
          <h2>{t.planning.week}</h2>
          <Badge tone="success">11 visites</Badge>
        </div>
        <Tabs
          tabs={[
            { active: true, label: 'Lun' },
            { label: 'Mar' },
            { label: 'Mer' },
            { label: 'Jeu' },
          ]}
        />
        <div className="availability-grid">
          {['Matin', 'Midi', 'Après-midi', 'Urgence'].map((slot) => (
            <button key={slot} type="button">
              <strong>{slot}</strong>
              <span>
                {workerState.availabilityUnavailable
                  ? 'Indisponible'
                  : slot === 'Urgence'
                    ? 'Réservé opérateur'
                    : 'Disponible'}
              </span>
            </button>
          ))}
        </div>
        <Button
          fullWidth
          onClick={() => dispatch({ type: 'planning/markUnavailable' })}
          variant="secondary"
        >
          {t.planning.markUnavailable}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function EarningsScreen({
  dispatch,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Paiement" title={t.earnings.title}>
      <Card elevated>
        <Metric label={t.earnings.floor} value="40 000 FCFA" />
        <Metric label={t.earnings.bonus} value="3 500 FCFA" />
        <Metric label={t.earnings.nextPayout} value="31 mai" />
      </Card>
      <Card>
        <Alert title={t.earnings.advance} tone="accent">
          Les avances sont validées par opérateur et déduites du paiement mensuel.
        </Alert>
        <Button
          disabled={workerState.advanceRequested}
          fullWidth
          onClick={() => dispatch({ type: 'earnings/requestAdvance' })}
        >
          {t.action.advance}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function ProfileScreen({
  dispatch,
  t,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Compte" title={t.profile.title}>
      <Card elevated>
        <ListItem description="Akouvi A." title={t.profile.agreement} />
        <ListItem description="+228 90 00 00 00" title={t.profile.payout} />
        <ListItem
          description="Export, effacement, politique de confidentialité"
          title={t.profile.privacy}
        />
        <ListItem description="Assistance terrain et procédures" title={t.profile.help} />
        <div className="profile-actions">
          <Button
            fullWidth
            onClick={() => dispatch({ type: 'activation/complete' })}
            variant="secondary"
          >
            {t.activation.complete}
          </Button>
        </div>
      </Card>
      <Card>
        <div className="profile-actions">
          <Button
            fullWidth
            onClick={() => dispatch({ type: 'privacy/export' })}
            variant="secondary"
          >
            {t.action.requestExport}
          </Button>
          <Button
            fullWidth
            onClick={() => dispatch({ type: 'privacy/erasure' })}
            variant="secondary"
          >
            {t.action.requestErasure}
          </Button>
        </div>
      </Card>
      <Card>
        <div className="card-header">
          <h2>Surfaces</h2>
          <Badge>{workerSurfaces.length}</Badge>
        </div>
        <div className="surface-grid" aria-label="Worker app surfaces">
          {workerSurfaces.map((surface) => (
            <span key={surface}>{surface}</span>
          ))}
        </div>
      </Card>
    </ScreenFrame>
  );
}

function ActivationScreen({
  dispatch,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Première connexion" title={t.activation.title}>
      <Card elevated>
        <ListItem
          after={
            <Badge tone={workerState.activation.agreementAccepted ? 'success' : 'accent'}>
              {workerState.activation.agreementAccepted ? 'OK' : 'À faire'}
            </Badge>
          }
          description="Consentement, règles de sécurité, confidentialité localisation."
          title={t.activation.agreement}
        />
        <ListItem
          after={<Badge tone="success">OK</Badge>}
          description="+228 90 00 00 00"
          title={t.activation.payout}
        />
        <ListItem
          after={<Badge tone="success">OK</Badge>}
          description="Adidogomé, Agoè, Tokoin"
          title={t.activation.serviceCells}
        />
        <Button fullWidth onClick={() => dispatch({ type: 'activation/complete' })}>
          {t.activation.complete}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function InboxScreen({
  t,
  workerState,
}: {
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Messages" title={t.inbox.title}>
      <Card elevated>
        <ListItem
          after={<Badge tone="success">{workerState.inboxUnread}</Badge>}
          description="9:00 · Ama K."
          title={t.inbox.route}
        />
        <ListItem description="20 000 FCFA max · statut opérateur" title={t.inbox.advance} />
        <ListItem description="40 000 FCFA plancher + bonus" title={t.inbox.payout} />
      </Card>
    </ScreenFrame>
  );
}

function PhotoRetryScreen({
  dispatch,
  t,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Qualité" title={t.photoRetry.title}>
      <Card elevated>
        <Alert title={t.photoRetry.retake} tone="accent">
          {t.photoRetry.blur}
        </Alert>
        <div className="photo-preview" aria-label="Photo quality preview">
          <span />
        </div>
        <Button fullWidth onClick={() => dispatch({ step: 'beforePhoto', type: 'visit/setStep' })}>
          {t.photoRetry.retake}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function DaySummaryScreen({
  dispatch,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Fin journée" title={t.daySummary.title}>
      <Card elevated>
        <Metric label="Visites terminées" value="3 / 3" />
        <Metric label="Actions hors ligne" value={String(workerState.offlineQueueCount)} />
        <Metric label="Statut" value={workerState.dayComplete ? 'Clôturée' : 'Ouverte'} />
        <Button fullWidth onClick={() => dispatch({ type: 'day/complete' })}>
          {t.daySummary.complete}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function SosSheet({
  dispatch,
  t,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly t: typeof workerCopy;
}): ReactElement {
  return (
    <div aria-label={t.safety.title} className="sheet-backdrop" role="dialog">
      <Card className="sos-sheet" elevated>
        <Badge tone="danger">{t.safety.panic}</Badge>
        <h2>{t.safety.title}</h2>
        <p>{t.safety.body}</p>
        <div className="sheet-actions">
          <Button fullWidth onClick={() => dispatch({ type: 'sos/confirm' })} variant="danger">
            {t.action.confirmSos}
          </Button>
          <Button fullWidth onClick={() => dispatch({ type: 'sos/close' })} variant="secondary">
            {t.action.close}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ScreenFrame({
  children,
  eyebrow,
  title,
}: {
  readonly children: ReactNode;
  readonly eyebrow: string;
  readonly title: string;
}): ReactElement {
  return (
    <>
      <section className="section-title">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </section>
      {children}
    </>
  );
}

function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
