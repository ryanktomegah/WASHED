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
  Check,
  Clock3,
  House,
  MapPinned,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import type { Dispatch, FormEvent, ReactElement, ReactNode } from 'react';

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
  type WorkerSosReason,
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

const WORKER_ACCESS_STORAGE_KEY = 'washed.worker.access.v1';

type WorkerLaunchStage = 'app' | 'login' | 'splash';

export function App(): ReactElement {
  const [route, setRoute] = useState<WorkerRoute>('today');
  const [workerState, dispatch] = useReducer(workerReducer, initialWorkerState);
  const [launchStage, setLaunchStage] = useState<WorkerLaunchStage>('splash');
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
      setLaunchStage(hasStoredWorkerAccess() ? 'app' : 'login');
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

  function completeLogin() {
    persistWorkerAccess();
    setLaunchStage('app');
  }

  if (launchStage !== 'app') {
    return (
      <WashedThemeProvider className="worker-frame" theme="worker">
        <div className="status-spacer" />
        {launchStage === 'splash' ? (
          <WorkerSplash t={t} />
        ) : (
          <WorkerLogin onLogin={completeLogin} t={t} />
        )}
      </WashedThemeProvider>
    );
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

function hasStoredWorkerAccess(): boolean {
  return globalThis.localStorage?.getItem(WORKER_ACCESS_STORAGE_KEY) === '1';
}

function persistWorkerAccess(): void {
  globalThis.localStorage?.setItem(WORKER_ACCESS_STORAGE_KEY, '1');
}

function WorkerSplash({ t }: { readonly t: typeof workerCopy }): ReactElement {
  return (
    <main className="worker-splash" aria-label={t.splash.sync}>
      <div className="worker-splash-mark">Washed.</div>
      <div className="worker-splash-tagline">{t.splash.tagline}</div>
      <div className="worker-splash-sync">{t.splash.sync}</div>
      <div className="worker-splash-progress" aria-hidden="true">
        <span />
      </div>
    </main>
  );
}

function WorkerLogin({
  onLogin,
  t,
}: {
  readonly onLogin: () => void;
  readonly t: typeof workerCopy;
}): ReactElement {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const canSubmit = phoneNumber.trim().length >= 8 && /^\d{4}$/u.test(pin);

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) {
      onLogin();
    }
  }

  return (
    <main className="worker-login-shell">
      <form className="worker-login-card" onSubmit={submitLogin}>
        <span className="eyebrow">{t.login.header}</span>
        <h1>
          {t.login.greeting}
          <br />
          {t.login.prompt}
        </h1>
        <p>{t.login.help}</p>

        <label className="worker-login-field">
          <span>{t.login.phoneLabel}</span>
          <div className="worker-login-phone">
            <strong>+228</strong>
            <input
              aria-label={t.login.phoneLabel}
              autoComplete="tel-national"
              inputMode="tel"
              onChange={(event) => setPhoneNumber(event.target.value)}
              type="tel"
              value={phoneNumber}
            />
          </div>
        </label>

        <label className="worker-login-field">
          <span>{t.login.pinLabel}</span>
          <div className="worker-pin-entry">
            <input
              aria-label={t.login.pinLabel}
              autoComplete="current-password"
              className="worker-login-pin"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setPin(event.target.value.replace(/\D/gu, '').slice(0, 4))}
              type="password"
              value={pin}
            />
            <div className="worker-pin-boxes" aria-hidden="true">
              {[0, 1, 2, 3].map((index) => (
                <span className={index < pin.length ? 'is-filled' : undefined} key={index}>
                  {index < pin.length ? '●' : ''}
                </span>
              ))}
            </div>
          </div>
        </label>

        <Button disabled={!canSubmit} fullWidth type="submit">
          {t.login.cta}
        </Button>
        <p className="worker-login-help">{t.login.forgot}</p>
      </form>
    </main>
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
  const activeVisitIndex = 1;

  return (
    <>
      <section className="worker-day-hero" aria-labelledby="worker-route-title">
        <div>
          <span className="summary-date">{t.today.dayLabel}</span>
          <h1 id="worker-route-title">{t.today.greeting}</h1>
          <span className="worker-status-pill">
            {t.today.visitCount} · {offlineCount > 0 ? `${offlineCount} hors ligne` : 'prête'}
          </span>
        </div>
        <div className="worker-day-metrics" aria-label="Journée travailleuse">
          <span>
            <small>Terminées</small>
            <strong>
              {completedVisits}/{routeCards.length}
            </strong>
          </span>
          <span>
            <small>{t.today.earnLabel}</small>
            <strong>7 500 XOF</strong>
          </span>
        </div>
        <div className="summary-progress" aria-hidden="true">
          <span style={{ width: progressPercent }} />
        </div>
      </section>

      <section className="field-command-card" aria-label={t.today.nextLabel}>
        <div className="field-command-top">
          <span className="eyebrow">{t.today.nextLabel}</span>
          <Badge tone="primary">{activeVisit.time}</Badge>
        </div>
        <div className="field-command-main">
          <div>
            <h2>{activeVisit.title}</h2>
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
        <div className="field-command-note">
          <span>Ordre conseillé</span>
          <strong>Route, arrivée GPS, photo avant, lavage, photo après.</strong>
        </div>
        <div className="field-command-actions">
          <button
            className="primary-field-action"
            onClick={() => onRouteChange('visit')}
            type="button"
          >
            <MapPinned aria-hidden="true" size={17} strokeWidth={2.4} />
            {t.today.routeCta}
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
          <strong>Tournée du jour</strong>
          <button onClick={() => onRouteChange('planning')} type="button">
            Planning
          </button>
        </div>
        <div className="route-list wire-route-list">
          {routeCards.map((card, index) => (
            <div
              className={`wire-route-card ${
                index < activeVisitIndex
                  ? 'is-done'
                  : index === activeVisitIndex
                    ? 'is-active'
                    : 'is-next'
              }`}
              key={`${card.time}-${card.title}`}
            >
              <div>
                <div className="visit-card-topline">
                  <strong>{card.title}</strong>
                  <Badge
                    tone={
                      index === activeVisitIndex
                        ? 'primary'
                        : index > activeVisitIndex
                          ? 'accent'
                          : 'success'
                    }
                    style={
                      index === activeVisitIndex
                        ? { background: 'var(--washed-primary)', color: '#fff' }
                        : undefined
                    }
                  >
                    {index < activeVisitIndex
                      ? 'Terminée'
                      : index === activeVisitIndex
                        ? 'À faire'
                        : 'Planifiée'}
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
  const activeVisit = routeCards[1];

  return (
    <Card className="active-visit-card" elevated>
      <div className="visit-card-main">
        <div>
          <div className="visit-card-topline">
            <strong>{activeVisit.title}</strong>
            <Badge>Visite 2 / {routeCards.length}</Badge>
          </div>
          <p>
            <MapPinned aria-hidden="true" size={14} strokeWidth={2.3} />
            {activeVisit.address}
          </p>
          <p>
            <Clock3 aria-hidden="true" size={14} strokeWidth={2.3} />
            {activeVisit.time} · {t.today.addressHint}
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
      body: 'La photo après est enregistrée. Vérifiez le résultat, puis pointez la sortie avant de quitter le foyer.',
      label: t.action.checkOutNow,
      loading: locationCaptureCheckpoint === 'checkOut',
      onClick: () => void onVisitLocationCapture('checkOut'),
      title: 'Photo après enregistrée',
    },
    beforePhoto: {
      body: "Photo avant enregistrée. Démarrez seulement quand l'eau, le savon et la bassine sont prêts.",
      label: t.action.startVisit,
      onClick: () => dispatch({ step: 'inVisit', type: 'visit/setStep' }),
      title: 'Photo « avant » capturée',
    },
    checkIn: {
      body: 'GPS confirmé à 8 m près. Photographiez le panier de linge sale près de la bassine.',
      label: t.action.takeBeforePhoto,
      loading: isCapturingPhoto,
      onClick: () => void onVisitPhotoCapture('before'),
      title: 'Vous êtes arrivée',
    },
    checkOut: {
      body: 'Visite terminée. Les preuves restent en sécurité et se synchronisent dès que le réseau revient.',
      label: t.action.openSummary,
      onClick: () => onRouteChange('daySummary'),
      title: 'Sortie pointée',
    },
    heading: {
      body: "Carte en cache. Appuyez sur J'arrive seulement quand vous êtes devant le foyer.",
      label: t.action.checkInNow,
      loading: locationCaptureCheckpoint === 'checkIn',
      onClick: () => void onVisitLocationCapture('checkIn'),
      title: `En route · ${routeCards[1].title}`,
    },
    inVisit: {
      body: "Pas besoin de regarder l'écran. L'application tourne en arrière-plan pendant le lavage.",
      label: t.action.takeAfterPhoto,
      loading: isCapturingPhoto,
      onClick: () => void onVisitPhotoCapture('after'),
      title: 'Lavage en cours.',
    },
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
          <span>{routeCards[1].address}</span>
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
    ['L', 'Lundi 11', '3 visites · 9h-13h'],
    ['M', 'Mardi 12', '4 visites · 8h-15h'],
    ['M', 'Merc. 13', '3 visites · 9h-12h'],
    ['J', 'Jeudi 14', '4 visites · 8h-14h'],
  ] as const;
  const planningRoutes = [
    ['Lundi 11', 'Adidogomé', '3 visites'],
    ['Mardi 12', 'Agoè', '4 visites'],
    ['Mercredi 13', 'Tokoin', '3 visites'],
    ['Jeudi 14', 'Bè Kpota', '4 visites'],
  ] as const;

  return (
    <ScreenFrame eyebrow="Semaine" title={t.planning.title}>
      <section className="planning-week-card" aria-label={t.planning.week}>
        <div className="card-header">
          <div>
            <h2>Semaine du 11 mai</h2>
            <p>Le bureau ajuste après appel, jamais en silence.</p>
          </div>
          <Badge tone={workerState.availabilityUnavailable ? 'accent' : 'success'}>
            {workerState.availabilityUnavailable ? 'Indispo.' : 'Confirmé'}
          </Badge>
        </div>
        <div className="planning-week-summary">
          <span>
            <small>Visites prévues</small>
            <strong>17</strong>
          </span>
          <span>
            <small>Estimé</small>
            <strong>25 500 XOF</strong>
          </span>
        </div>
      </section>

      <section className="planning-agenda-card" aria-label="Planning 7 jours">
        {dayPlan.map(([day, title, detail], index) => (
          <button aria-current={index === 0 ? 'date' : undefined} key={title} type="button">
            <span>{day}</span>
            <strong>{title}</strong>
            <small>{detail}</small>
            <em aria-hidden="true">›</em>
          </button>
        ))}
        <div className="planning-leave-note">
          <strong>Vendredi</strong>
          <span>{workerState.availabilityUnavailable ? 'Congé confirmé.' : 'Créneau libre.'}</span>
        </div>
        <button
          className="planning-unavailable-button"
          onClick={() => dispatch({ type: 'planning/markUnavailable' })}
          type="button"
        >
          {t.planning.markUnavailable}
        </button>
      </section>

      <section className="planning-route-board" aria-label="Routes à venir">
        {planningRoutes.map(([day, zone, count]) => (
          <article key={day}>
            <span>{day}</span>
            <div>
              <strong>{zone}</strong>
              <p>{count}</p>
            </div>
            <Badge tone="success">Planifié</Badge>
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
  const weeklyBars = [
    ['L', '80%'],
    ['M', '60%'],
    ['M', '90%'],
    ['J', '75%'],
    ['V', '50%'],
    ['S', '30%'],
    ['D', '30%'],
  ] as const;

  return (
    <ScreenFrame eyebrow="Paiement" title={t.earnings.title}>
      <section className="earnings-week-card">
        <span>Cette semaine</span>
        <strong>
          22 500<small> XOF</small>
        </strong>
        <p>15 visites · lundi → vendredi</p>
      </section>

      <section className="earnings-balance-card">
        <div>
          <span>Solde disponible</span>
          <strong>
            12 000 <small>XOF</small>
          </strong>
        </div>
        <button type="button">Retirer</button>
      </section>

      <section className="earnings-week-detail" aria-label="Cette semaine en détail">
        <span className="eyebrow">Cette semaine en détail</span>
        <div className="earnings-bars" aria-hidden="true">
          {weeklyBars.map(([day, height], index) => (
            <span
              className={index < 4 ? 'is-paid' : index === 4 ? 'is-active' : undefined}
              key={`${day}-${index}`}
              style={{ height }}
            />
          ))}
        </div>
        <div className="earnings-bar-labels">
          {weeklyBars.map(([day], index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
      </section>

      <section className="payout-command-card">
        <div className="card-header">
          <div>
            <h2>Mobile Money</h2>
            <p>T-Money · +228 90 XX XX XX</p>
          </div>
          <Badge tone="success">Prêt</Badge>
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
  const profileChecks = [
    [t.profile.agreement, 'Accepté', <Check aria-hidden="true" size={16} strokeWidth={3} />],
    [
      t.profile.payout,
      '+228 90 00 00 00',
      <Banknote aria-hidden="true" size={16} strokeWidth={2.4} />,
    ],
    [
      'Preuves hors ligne',
      'Photos et GPS gardés localement',
      <ShieldAlert aria-hidden="true" size={16} strokeWidth={2.4} />,
    ],
  ] as const;
  const regularHomes = [
    ['Ama Dossou', 'Adidogomé · 12 visites', '4.9'],
    ['Kofi Mensah', 'Bè Kpota · 8 visites', '4.8'],
    ['Esi Amouzou', 'Hédzranawoé · 5 visites', '5.0'],
  ] as const;

  return (
    <ScreenFrame eyebrow="Compte" title={t.profile.title}>
      <section className="worker-profile-hero" aria-label={t.profile.title}>
        <div className="worker-profile-avatar" aria-hidden="true">
          AA
        </div>
        <div>
          <h2>Akouvi A.</h2>
          <p>Laveuse active · Adidogomé, Agoè, Tokoin</p>
          <div className="profile-trust-row" aria-label="Statut travailleuse">
            <span>4.9</span>
            <span>25 visites</span>
            <span>3 foyers réguliers</span>
          </div>
        </div>
      </section>

      <section className="profile-readiness-card" aria-label="Statut du compte">
        <div className="card-header">
          <div>
            <h2>Compte prêt</h2>
            <p>Identité, paiement et preuves terrain.</p>
          </div>
          <Badge tone="success">Active</Badge>
        </div>
        <div className="profile-readiness-list">
          {profileChecks.map(([title, detail, icon]) => (
            <div key={title}>
              <span>{icon}</span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
        <div className="profile-action-row">
          <button onClick={() => dispatch({ type: 'activation/complete' })} type="button">
            {t.activation.complete}
          </button>
          <button onClick={() => onRouteChange('activation')} type="button">
            {t.nav.activation}
          </button>
          <button onClick={() => onRouteChange('inbox')} type="button">
            {t.nav.inbox}
          </button>
          <button onClick={() => onRouteChange('daySummary')} type="button">
            {t.nav.daySummary}
          </button>
        </div>
      </section>

      <section className="profile-household-card" aria-label="Foyers réguliers">
        <div className="card-header">
          <div>
            <h2>Foyers réguliers</h2>
            <p>Relations connues par Washed.</p>
          </div>
          <Badge tone="primary">3</Badge>
        </div>
        <div className="profile-household-list">
          {regularHomes.map(([name, detail, rating]) => (
            <div key={name}>
              <MapPinned aria-hidden="true" size={17} strokeWidth={2.35} />
              <span>
                <strong>{name}</strong>
                <small>{detail}</small>
              </span>
              <em>{rating}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-account-card" aria-label="Sécurité et données">
        <h2>Sécurité et données</h2>
        <button
          aria-label="Bouton SOS"
          onClick={() => dispatch({ type: 'sos/open' })}
          type="button"
        >
          <span>Bouton SOS</span>
          <small>Disponible depuis chaque visite.</small>
        </button>
        <button
          aria-label={t.action.requestExport}
          onClick={() => dispatch({ type: 'privacy/export' })}
          type="button"
        >
          <span>{t.action.requestExport}</span>
          <small>Copie de vos données travailleuse.</small>
        </button>
        <button
          aria-label={t.action.requestErasure}
          onClick={() => dispatch({ type: 'privacy/erasure' })}
          type="button"
        >
          <span>{t.action.requestErasure}</span>
          <small>Revue par l&apos;opérateur avant suppression.</small>
        </button>
        <button aria-label={t.profile.help} type="button">
          <span>{t.profile.help}</span>
          <small>Assistance terrain et procédures.</small>
        </button>
      </section>
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
  const sosOptions = [
    {
      body: t.safety.options.danger.body,
      reason: 'danger',
      title: t.safety.options.danger.title,
    },
    {
      body: t.safety.options.clientIssue.body,
      reason: 'clientIssue',
      title: t.safety.options.clientIssue.title,
    },
    {
      body: t.safety.options.medical.body,
      reason: 'medical',
      title: t.safety.options.medical.title,
    },
  ] as const satisfies readonly {
    readonly body: string;
    readonly reason: WorkerSosReason;
    readonly title: string;
  }[];

  return (
    <div aria-label={t.safety.title} className="sheet-backdrop" role="dialog">
      <Card className="sos-sheet" elevated>
        <Badge tone="danger">{t.safety.panic}</Badge>
        <h2>{t.safety.title}</h2>
        <p>{t.safety.body}</p>
        <div className="sos-reason-list">
          {sosOptions.map((option) => (
            <button
              className={`sos-reason-button${option.reason === 'danger' ? ' is-danger' : ''}`}
              key={option.reason}
              onClick={() =>
                dispatch({
                  reason: option.reason,
                  reasonLabel: option.title,
                  type: 'sos/confirm',
                })
              }
              type="button"
            >
              <strong>{option.title}</strong>
              <span>{option.body}</span>
            </button>
          ))}
        </div>
        <div className="sheet-actions">
          <Button fullWidth onClick={() => dispatch({ type: 'sos/close' })} variant="secondary">
            {t.safety.cancel}
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
