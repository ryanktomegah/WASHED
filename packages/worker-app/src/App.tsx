import { useEffect, useReducer, useState } from 'react';

import {
  Alert,
  Badge,
  BottomNav,
  Button,
  Card,
  EmptyState,
  ListItem,
  WashedThemeProvider,
} from '@washed/ui';
import {
  Banknote,
  CalendarDays,
  Camera,
  Check,
  CircleAlert,
  Clock3,
  House,
  MapPinned,
  Moon,
  Sun,
  Sunrise,
  Zap,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import type { Dispatch, ReactElement, ReactNode } from 'react';

import {
  routeCards,
  visitSteps,
  workerCopy,
  type PrimaryWorkerRoute,
  type WorkerRoute,
} from './appData.js';
import {
  initialWorkerState,
  workerReducer,
  type WorkerAction,
  type WorkerOfflineQueueItem,
  type WorkerState,
} from './workerState.js';
import { captureVisitPhoto } from './nativeCamera.js';
import {
  captureVisitLocation,
  type NativeLocationResult,
  type VisitLocationCheckpoint,
} from './nativeLocation.js';
import { loadPersistedWorkerState, persistWorkerState } from './workerPersistence.js';
import { syncWorkerOfflineQueue } from './workerQueueSync.js';

const navOrder = [
  'today',
  'planning',
  'earnings',
  'profile',
] as const satisfies readonly PrimaryWorkerRoute[];

const navIcons = {
  earnings: <Banknote aria-hidden="true" size={18} strokeWidth={2.3} />,
  planning: <CalendarDays aria-hidden="true" size={18} strokeWidth={2.3} />,
  profile: <UserRound aria-hidden="true" size={18} strokeWidth={2.3} />,
  today: <MapPinned aria-hidden="true" size={18} strokeWidth={2.3} />,
} as const satisfies Record<PrimaryWorkerRoute, ReactNode>;

export function App(): ReactElement {
  const [route, setRoute] = useState<WorkerRoute>('today');
  const [workerState, dispatch] = useReducer(workerReducer, initialWorkerState);
  const [captureInProgress, setCaptureInProgress] = useState(false);
  const [locationCheckpoint, setLocationCheckpoint] = useState<VisitLocationCheckpoint | null>(
    null,
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastLocationProof, setLastLocationProof] = useState<NativeLocationResult | null>(null);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const t = workerCopy;

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const shell = document.querySelector<HTMLElement>('.worker-shell');
    if (shell !== null) {
      shell.scrollTop = 0;
      shell.scrollLeft = 0;
    }
  }, [route]);

  useEffect(() => {
    let cancelled = false;

    void loadPersistedWorkerState().then((persistedState) => {
      if (cancelled) {
        return;
      }

      if (persistedState !== null) {
        dispatch({ state: persistedState, type: 'state/hydrate' });
      }

      setPersistenceReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!persistenceReady) {
      return;
    }

    void persistWorkerState(workerState);
  }, [persistenceReady, workerState]);

  async function captureProof(kind: 'after' | 'before') {
    setCaptureInProgress(true);
    try {
      const proof = await captureVisitPhoto(kind);
      dispatch({
        photoProof: proof,
        step: kind === 'before' ? 'beforePhoto' : 'afterPhoto',
        type: 'visit/setStep',
      });
    } finally {
      setCaptureInProgress(false);
    }
  }

  async function captureLocationProof(checkpoint: VisitLocationCheckpoint) {
    setLocationCheckpoint(checkpoint);
    setLocationError(null);
    try {
      const proof = await captureVisitLocation(checkpoint);
      setLastLocationProof(proof);
      dispatch({ locationProof: proof, step: checkpoint, type: 'visit/setStep' });
    } catch {
      setLocationError(t.feedback.locationCaptureFailed);
    } finally {
      setLocationCheckpoint(null);
    }
  }

  async function syncOfflineQueue() {
    if (workerState.offlineQueue.length === 0 || syncInProgress) {
      return;
    }

    setSyncError(null);
    setSyncInProgress(true);

    try {
      await syncWorkerOfflineQueue(workerState.offlineQueue);
      dispatch({ type: 'sync/complete' });
    } catch {
      setSyncError(t.sync.failed);
    } finally {
      setSyncInProgress(false);
    }
  }

  return (
    <WashedThemeProvider className="worker-frame" theme="worker">
      <div className="status-spacer" />

      <main className="worker-shell">
        {workerState.lastFeedback === null ? null : (
          <Alert className="feedback-banner" tone="success">
            {t.feedback[workerState.lastFeedback]}
          </Alert>
        )}
        {route === 'today' ? (
          <TodayScreen
            dispatch={dispatch}
            isCapturingPhoto={captureInProgress}
            isSyncingQueue={syncInProgress}
            locationCaptureCheckpoint={locationCheckpoint}
            locationError={locationError}
            locationProof={lastLocationProof}
            onRouteChange={setRoute}
            onSyncQueue={syncOfflineQueue}
            onVisitLocationCapture={captureLocationProof}
            onVisitPhotoCapture={captureProof}
            syncError={syncError}
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
        {route === 'profile' ? (
          <ProfileScreen dispatch={dispatch} onRouteChange={setRoute} t={t} />
        ) : null}
        {route === 'activation' ? (
          <ActivationScreen dispatch={dispatch} workerState={workerState} t={t} />
        ) : null}
        {route === 'inbox' ? <InboxScreen workerState={workerState} t={t} /> : null}
        {route === 'photoRetry' ? (
          <PhotoRetryScreen
            isCapturingPhoto={captureInProgress}
            onVisitPhotoCapture={captureProof}
            t={t}
          />
        ) : null}
        {route === 'visit' ? (
          <VisitDetailScreen
            dispatch={dispatch}
            isCapturingPhoto={captureInProgress}
            locationCaptureCheckpoint={locationCheckpoint}
            locationError={locationError}
            locationProof={lastLocationProof}
            onRouteChange={setRoute}
            onVisitLocationCapture={captureLocationProof}
            onVisitPhotoCapture={captureProof}
            t={t}
            workerState={workerState}
          />
        ) : null}
        {route === 'daySummary' ? (
          <DaySummaryScreen dispatch={dispatch} workerState={workerState} t={t} />
        ) : null}
      </main>

      {workerState.sos.open ? <SosSheet dispatch={dispatch} t={t} /> : null}

      <BottomNav
        className="bottom-nav"
        items={navOrder.map((navRoute) => ({
          active: route === navRoute,
          icon: navIcons[navRoute],
          label: t.nav[navRoute],
          onClick: () => setRoute(navRoute),
        }))}
      />
    </WashedThemeProvider>
  );
}

function TodayScreen({
  dispatch,
  isCapturingPhoto,
  isSyncingQueue,
  locationCaptureCheckpoint,
  locationError,
  locationProof,
  onRouteChange,
  onSyncQueue,
  onVisitLocationCapture,
  onVisitPhotoCapture,
  syncError,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly isCapturingPhoto: boolean;
  readonly isSyncingQueue: boolean;
  readonly locationCaptureCheckpoint: VisitLocationCheckpoint | null;
  readonly locationError: string | null;
  readonly locationProof: NativeLocationResult | null;
  readonly onRouteChange: (route: WorkerRoute) => void;
  readonly onSyncQueue: () => Promise<void>;
  readonly onVisitLocationCapture: (checkpoint: VisitLocationCheckpoint) => Promise<void>;
  readonly onVisitPhotoCapture: (kind: 'after' | 'before') => Promise<void>;
  readonly syncError: string | null;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  const offlineCount = workerState.offlineQueue.length;
  const activeVisit = routeCards[1];
  const completedVisits = workerState.visit.step === 'checkOut' ? 2 : 1;
  const progressPercent = `${Math.round((completedVisits / routeCards.length) * 100)}%`;

  return (
    <>
      <section className="worker-summary" aria-labelledby="worker-route-title">
        <div className="summary-copy">
          <span className="summary-date">LUNDI 28 AVRIL</span>
          <div className="summary-title-row">
            <h1 id="worker-route-title">3 visites aujourd&apos;hui</h1>
            <div className="summary-earnings">
              <span>Ce mois</span>
              <strong>43 400 XOF</strong>
            </div>
          </div>
          <div className="summary-progress" aria-hidden="true">
            <span style={{ width: progressPercent }} />
          </div>
          <div className="summary-meta">
            <span>{completedVisits} / 3 visites complétées</span>
            <Badge>
              {offlineCount > 0 ? `● Hors ligne · ${offlineCount}` : t.today.routeActive}
            </Badge>
          </div>
        </div>
      </section>

      <section className="field-command-card" aria-label="Visite en cours">
        <div className="field-command-top">
          <span className="eyebrow">Visite en cours</span>
          <Badge tone="primary">11h30 - 13h30</Badge>
        </div>
        <div className="field-command-main">
          <div>
            <h2>Ama Dossou</h2>
            <p>
              <MapPinned aria-hidden="true" size={15} strokeWidth={2.35} />
              {activeVisit.address}
            </p>
            <p>
              <House aria-hidden="true" size={15} strokeWidth={2.35} />
              {t.today.addressHint}
            </p>
          </div>
          <button
            aria-label={t.safety.panic}
            className="sos-fab"
            onClick={() => dispatch({ type: 'sos/open' })}
            type="button"
          >
            <ShieldAlert aria-hidden="true" size={22} strokeWidth={2.6} />
            SOS
          </button>
        </div>
        <div className="field-command-actions">
          <button
            className="primary-field-action"
            onClick={() => onRouteChange('visit')}
            type="button"
          >
            <Camera aria-hidden="true" size={17} strokeWidth={2.4} />
            Ouvrir visite
          </button>
          <button onClick={() => dispatch({ type: 'visit/reportIssue' })} type="button">
            <CircleAlert aria-hidden="true" size={17} strokeWidth={2.4} />
            Signaler
          </button>
        </div>
      </section>

      {offlineCount > 0 || syncError !== null ? (
        <Alert
          className="sync-card"
          title={
            offlineCount > 0
              ? `${offlineCount} actions en attente de synchronisation`
              : t.sync.ready
          }
          tone={offlineCount > 0 ? 'accent' : 'success'}
        >
          <div className="sync-alert-body">
            <span>{syncError ?? (offlineCount > 0 ? t.sync.offline : t.sync.complete)}</span>
            <Button
              disabled={offlineCount === 0 || isSyncingQueue}
              onClick={onSyncQueue}
              size="sm"
              variant="secondary"
            >
              {t.action.retrySync}
            </Button>
          </div>
        </Alert>
      ) : null}

      {offlineCount > 0 ? <OfflineQueueLedger queue={workerState.offlineQueue} /> : null}

      <section className="route-card-stack">
        <div className="route-section-header">
          <strong>Route du jour</strong>
          <button onClick={() => onRouteChange('planning')} type="button">
            Voir planning
          </button>
        </div>
        <div className="route-list wire-route-list">
          {routeCards.map((card, index) => (
            <div
              className={`wire-route-card ${
                index === 0 ? 'is-done' : index === 1 ? 'is-active' : 'is-next'
              }`}
              key={`${card.time}-${card.title}`}
            >
              <div>
                <div className="visit-card-topline">
                  <strong>{card.title}</strong>
                  <Badge
                    tone={index === 1 ? 'primary' : index === 2 ? 'accent' : 'success'}
                    style={
                      index === 1
                        ? { background: 'var(--washed-primary)', color: '#fff' }
                        : undefined
                    }
                  >
                    {index === 0 ? 'Complétée' : index === 1 ? 'En cours' : 'Suivante'}
                  </Badge>
                </div>
                <p>
                  <MapPinned aria-hidden="true" size={14} strokeWidth={2.3} />
                  {card.address}
                </p>
                <p>
                  <Clock3 aria-hidden="true" size={14} strokeWidth={2.3} />
                  {card.time}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="earnings-strip">
          <strong className="earnings-strip-title">Salaire · Avril 2026</strong>
          <span>
            <small>Fixe garanti</small>
            <strong>40 000 XOF</strong>
          </span>
          <span>
            <small>Primes (×5)</small>
            <strong>3 000 XOF</strong>
          </span>
          <span>
            <small>Avance</small>
            <strong>Disponible</strong>
          </span>
        </div>
      </section>
    </>
  );
}

function VisitDetailScreen({
  dispatch,
  isCapturingPhoto,
  locationCaptureCheckpoint,
  locationError,
  locationProof,
  onRouteChange,
  onVisitLocationCapture,
  onVisitPhotoCapture,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly isCapturingPhoto: boolean;
  readonly locationCaptureCheckpoint: VisitLocationCheckpoint | null;
  readonly locationError: string | null;
  readonly locationProof: NativeLocationResult | null;
  readonly onRouteChange: (route: WorkerRoute) => void;
  readonly onVisitLocationCapture: (checkpoint: VisitLocationCheckpoint) => Promise<void>;
  readonly onVisitPhotoCapture: (kind: 'after' | 'before') => Promise<void>;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  return (
    <Card className="active-visit-card" elevated>
      <div className="visit-card-main">
        <div>
          <div className="visit-card-topline">
            <strong>Ama Dossou</strong>
            <Badge>En cours ●</Badge>
          </div>
          <p>
            <MapPinned aria-hidden="true" size={14} strokeWidth={2.3} />
            Adidogomé, rue 42
          </p>
          <p>
            <Clock3 aria-hidden="true" size={14} strokeWidth={2.3} />
            11h30-13h30 · {t.today.addressHint}
          </p>
        </div>
      </div>
      <VisitLifecycle dispatch={dispatch} t={t} workerState={workerState} />
      <VisitWorkstation
        dispatch={dispatch}
        isCapturingPhoto={isCapturingPhoto}
        locationCaptureCheckpoint={locationCaptureCheckpoint}
        locationError={locationError}
        locationProof={locationProof}
        onRouteChange={onRouteChange}
        onVisitLocationCapture={onVisitLocationCapture}
        onVisitPhotoCapture={onVisitPhotoCapture}
        t={t}
        workerState={workerState}
      />
      <div className="visit-actions active-visit-actions">
        <Button fullWidth onClick={() => onRouteChange('planning')} variant="secondary">
          Itinéraire
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
        <Button fullWidth onClick={() => dispatch({ type: 'sos/open' })} variant="danger">
          {t.safety.panic}
        </Button>
      </div>
    </Card>
  );
}

function VisitWorkstation({
  dispatch,
  isCapturingPhoto,
  locationCaptureCheckpoint,
  locationError,
  locationProof,
  onRouteChange,
  onVisitLocationCapture,
  onVisitPhotoCapture,
  t,
  workerState,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly isCapturingPhoto: boolean;
  readonly locationCaptureCheckpoint: VisitLocationCheckpoint | null;
  readonly locationError: string | null;
  readonly locationProof: NativeLocationResult | null;
  readonly onRouteChange: (route: WorkerRoute) => void;
  readonly onVisitLocationCapture: (checkpoint: VisitLocationCheckpoint) => Promise<void>;
  readonly onVisitPhotoCapture: (kind: 'after' | 'before') => Promise<void>;
  readonly t: typeof workerCopy;
  readonly workerState: WorkerState;
}): ReactElement {
  const stepConfig = {
    afterPhoto: {
      body: 'Vérifier les preuves, confirmer la sortie GPS et fermer la visite.',
      label: t.action.checkOutNow,
      loading: locationCaptureCheckpoint === 'checkOut',
      onClick: () => void onVisitLocationCapture('checkOut'),
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
      loading: isCapturingPhoto,
      onClick: () => void onVisitPhotoCapture('before'),
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
      loading: locationCaptureCheckpoint === 'checkIn',
      onClick: () => void onVisitLocationCapture('checkIn'),
      title: 'Trajet vers Ama Dossou',
    },
    inVisit: {
      body: 'La visite est en cours. Capturer la photo après avant de quitter le foyer.',
      label: t.action.takeAfterPhoto,
      loading: isCapturingPhoto,
      onClick: () => void onVisitPhotoCapture('after'),
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
  const activeProofLabel = {
    afterPhoto: 'Sortie GPS',
    beforePhoto: 'Prestation',
    checkIn: 'Photo avant',
    checkOut: 'Sortie GPS',
    heading: 'Arrivée GPS',
    inVisit: 'Photo après',
  }[workerState.visit.step];

  return (
    <div className="visit-workstation" aria-label="Guided visit workflow">
      <div>
        <span className="eyebrow">Étape terrain</span>
        <h3>{stepConfig.title}</h3>
        <p>{stepConfig.body}</p>
      </div>

      {workerState.visit.step === 'heading' ? (
        <div className="visit-map" aria-label="Worker GPS map">
          <MapPinned aria-hidden="true" size={30} strokeWidth={2.4} />
          <span>Adidogomé, rue 42</span>
          <small>Vous êtes à 85 m de l&apos;adresse</small>
          <em>85 m restants</em>
        </div>
      ) : null}

      <Button
        className="step-primary-button"
        fullWidth
        loading={'loading' in stepConfig ? stepConfig.loading : false}
        onClick={stepConfig.onClick}
      >
        {stepConfig.label}
      </Button>

      <div className="field-proof-rail" aria-label="Visit proof checklist">
        {proofItems.map((item, index) => (
          <span
            aria-current={item.label === activeProofLabel ? 'step' : undefined}
            className="proof-item"
            data-complete={item.done}
            key={item.label}
          >
            <i aria-hidden="true">
              {item.done ? <Check size={13} strokeWidth={3} /> : index + 1}
            </i>
            <small>{item.label}</small>
          </span>
        ))}
      </div>

      {locationProof === null ? null : (
        <div className="gps-proof" aria-label="Last GPS proof">
          <strong>
            {locationProof.checkpoint === 'checkIn'
              ? t.location.checkInCaptured
              : t.location.checkOutCaptured}
          </strong>
          <span>
            {locationProof.latitude.toFixed(4)}, {locationProof.longitude.toFixed(4)} ·{' '}
            {locationProof.accuracyMeters} m
          </span>
        </div>
      )}

      {locationError === null ? null : (
        <Alert title={t.location.failedTitle} tone="danger">
          {locationError}
        </Alert>
      )}
    </div>
  );
}

function OfflineQueueLedger({
  queue,
}: {
  readonly queue: readonly WorkerOfflineQueueItem[];
}): ReactElement {
  const visibleQueue = queue.slice(-4);
  const queueTone = {
    'planning.unavailable': 'Planning',
    sos: 'SOS',
    'visit.after_photo': 'Photo après',
    'visit.before_photo': 'Photo avant',
    'visit.check_in': 'Arrivée GPS',
    'visit.check_out': 'Sortie GPS',
    'visit.issue': 'Signalement',
    'visit.no_show': 'Absence client',
  } as const satisfies Record<WorkerOfflineQueueItem['kind'], string>;

  return (
    <div aria-label="Offline action ledger" className="offline-ledger">
      <div className="card-header">
        <div>
          <span className="eyebrow">File locale</span>
          <h2>Actions en attente</h2>
        </div>
        <Badge>{queue.length}</Badge>
      </div>
      <div className="offline-ledger-list">
        {visibleQueue.map((item) => (
          <div className="offline-ledger-item" key={item.id}>
            <span className="offline-ledger-type">{queueTone[item.kind]}</span>
            <strong>{item.label}</strong>
            <span>{formatQueueTimestamp(item.createdAt)} · prêt à envoyer</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatQueueTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'En attente';
  }

  return new Intl.DateTimeFormat('fr-TG', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
  const dayPlan = [
    ['Lun', '3 visites', 'Adidogomé'],
    ['Mar', '4 visites', 'Agoè'],
    ['Mer', '2 visites', 'Tokoin'],
    ['Jeu', 'Repos', 'Indispo.'],
  ] as const;
  const availabilitySlots = [
    ['Matin', 'Disponible', <Sunrise aria-hidden="true" size={15} strokeWidth={2.35} />],
    ['Midi', 'Disponible', <Sun aria-hidden="true" size={15} strokeWidth={2.35} />],
    ['Après-midi', 'Disponible', <Moon aria-hidden="true" size={15} strokeWidth={2.35} />],
    ['Urgence', 'Opérateur', <Zap aria-hidden="true" size={15} strokeWidth={2.35} />],
  ] as const;

  return (
    <ScreenFrame eyebrow="Semaine" title={t.planning.title}>
      <section className="planning-week-card" aria-label={t.planning.week}>
        <div className="card-header">
          <div>
            <h2>{t.planning.week}</h2>
            <p>11 visites · 3 quartiers · 1 créneau protégé</p>
          </div>
          <Badge tone={workerState.availabilityUnavailable ? 'accent' : 'success'}>
            {workerState.availabilityUnavailable ? 'Indispo.' : 'Confirmé'}
          </Badge>
        </div>
        <div className="planning-day-strip">
          {dayPlan.map(([day, count, cell], index) => (
            <button aria-current={index === 0 ? 'date' : undefined} key={day} type="button">
              <strong>{day}</strong>
              <span>{count}</span>
              <small>{cell}</small>
            </button>
          ))}
        </div>
      </section>

      <Card className="availability-card">
        <div className="card-header">
          <div>
            <h2>Disponibilité</h2>
            <p>Bloquez un créneau avant validation opérateur.</p>
          </div>
        </div>
        <div className="availability-grid">
          {availabilitySlots.map(([slot, fallbackLabel, icon]) => (
            <button aria-pressed={slot === 'Urgence'} key={slot} type="button">
              {icon}
              <strong>{slot}</strong>
              <span>
                {workerState.availabilityUnavailable ? 'Indisponible' : fallbackLabel}
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

      <section className="planning-route-board" aria-label="Routes à venir">
        {routeCards.map((card) => (
          <article key={card.title}>
            <span>{card.time}</span>
            <div>
              <strong>{card.title}</strong>
              <p>{card.address}</p>
            </div>
            <Badge tone={card.status === 'Prochaine' ? 'success' : 'muted'}>{card.status}</Badge>
          </article>
        ))}
      </section>
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
      <Card className="earnings-hero-card" elevated>
        <span>TOTAL DU MOIS</span>
        <strong>
          43 400<small> XOF</small>
        </strong>
        <div>
          <Metric label="Fixe garanti" value="40 000" />
          <Metric label="Primes (×5 vis.)" value="3 000" />
        </div>
        <div className="earnings-progress" aria-hidden="true">
          <span />
        </div>
        <p>22 / 48 visites complétées · 26 restantes</p>
      </Card>
      <section className="payout-command-card">
        <div className="card-header">
          <div>
            <h2>Paiement dimanche 4 mai</h2>
            <p>T-Money · +228 90 XX XX XX</p>
          </div>
          <Badge tone="success">Programmé</Badge>
        </div>
        <div className="payout-timeline" aria-label="Paiement travailleuse">
          <span data-state="done">Visites validées</span>
          <span data-state="active">Calcul bonus</span>
          <span>Virement</span>
        </div>
      </section>
      <section className="advance-card">
        <Alert title={t.earnings.advance} tone="accent">
          Jusqu&apos;à 50% du fixe · 1× par mois
        </Alert>
        <Button
          disabled={workerState.advanceRequested}
          fullWidth
          onClick={() => dispatch({ type: 'earnings/requestAdvance' })}
        >
          {t.action.advance}
        </Button>
      </section>
      <Card>
        <div className="card-header">
          <h2>Historique</h2>
        </div>
        <div className="route-list">
          {[
            ['Dim 27 avr', '7 200 XOF'],
            ['Dim 20 avr', '8 400 XOF'],
            ['Dim 13 avr', '6 000 XOF'],
          ].map(([date, amount]) => (
            <ListItem
              after={<Badge tone="success">Payé</Badge>}
              description="Virement hebdo"
              key={date}
              title={`${date} · ${amount}`}
            />
          ))}
        </div>
      </Card>
    </ScreenFrame>
  );
}

function ProfileScreen({
  dispatch,
  onRouteChange,
  t,
}: {
  readonly dispatch: Dispatch<WorkerAction>;
  readonly onRouteChange: (route: WorkerRoute) => void;
  readonly t: typeof workerCopy;
}): ReactElement {
  return (
    <ScreenFrame eyebrow="Compte" title={t.profile.title}>
      <section className="worker-profile-hero" aria-label={t.profile.title}>
        <div className="worker-profile-avatar" aria-hidden="true">
          AA
        </div>
        <div>
          <h2>Akouvi A.</h2>
          <p>Adidogomé · Agoè · Tokoin</p>
        </div>
        <Badge tone="success">Active</Badge>
      </section>

      <Card elevated>
        <div className="profile-command-grid">
          <span>
            <strong>{t.profile.agreement}</strong>
            <small>Accord travailleuse accepté</small>
          </span>
          <span>
            <strong>{t.profile.payout}</strong>
            <small>+228 90 00 00 00</small>
          </span>
          <span>
            <strong>{t.profile.privacy}</strong>
            <small>Export, effacement, politique de confidentialité</small>
          </span>
          <span>
            <strong>{t.profile.help}</strong>
            <small>Assistance terrain et procédures</small>
          </span>
        </div>
        <div className="profile-actions">
          <Button
            fullWidth
            onClick={() => dispatch({ type: 'activation/complete' })}
            variant="secondary"
          >
            {t.activation.complete}
          </Button>
          <Button fullWidth onClick={() => onRouteChange('activation')} variant="secondary">
            {t.nav.activation}
          </Button>
          <Button fullWidth onClick={() => onRouteChange('inbox')} variant="secondary">
            {t.nav.inbox}
          </Button>
          <Button fullWidth onClick={() => onRouteChange('daySummary')} variant="secondary">
            {t.nav.daySummary}
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
          <h2>Sécurité</h2>
          <Badge tone="success">Active</Badge>
        </div>
        <ListItem
          description="Disponible depuis chaque visite en cas de problème."
          title="Bouton SOS"
        />
        <ListItem
          description="Vos photos, pointages et signalements restent synchronisés dès que le réseau revient."
          title="Mode hors ligne"
        />
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
      <Card className="activation-checklist-card" elevated>
        <div className="activation-row">
          <span>1</span>
          <div>
            <strong>{t.activation.agreement}</strong>
            <p>Consentement, règles de sécurité, confidentialité localisation.</p>
          </div>
          <Badge tone={workerState.activation.agreementAccepted ? 'success' : 'accent'}>
            {workerState.activation.agreementAccepted ? 'OK' : 'À faire'}
          </Badge>
        </div>
        <div className="activation-row">
          <span>2</span>
          <div>
            <strong>{t.activation.payout}</strong>
            <p>+228 90 00 00 00</p>
          </div>
          <Badge tone="success">OK</Badge>
        </div>
        <div className="activation-row">
          <span>3</span>
          <div>
            <strong>{t.activation.serviceCells}</strong>
            <p>Adidogomé, Agoè, Tokoin</p>
          </div>
          <Badge tone="success">OK</Badge>
        </div>
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
  isCapturingPhoto,
  onVisitPhotoCapture,
  t,
}: {
  readonly isCapturingPhoto: boolean;
  readonly onVisitPhotoCapture: (kind: 'after' | 'before') => Promise<void>;
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
        <Button
          fullWidth
          loading={isCapturingPhoto}
          onClick={() => void onVisitPhotoCapture('before')}
        >
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
        <Metric label="Actions hors ligne" value={String(workerState.offlineQueue.length)} />
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
