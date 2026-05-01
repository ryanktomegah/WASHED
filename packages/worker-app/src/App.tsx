import { useState } from 'react';

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
import type { ReactElement, ReactNode } from 'react';

import {
  routeCards,
  visitSteps,
  workerCopy,
  workerSurfaces,
  type VisitStep,
  type WorkerRoute,
} from './appData.js';

const navOrder = [
  'today',
  'planning',
  'earnings',
  'profile',
] as const satisfies readonly WorkerRoute[];

export function App(): ReactElement {
  const [route, setRoute] = useState<WorkerRoute>('today');
  const [visitStep, setVisitStep] = useState<VisitStep>('heading');
  const [offlineCount, setOfflineCount] = useState(3);
  const [sosOpen, setSosOpen] = useState(false);
  const t = workerCopy;

  const syncNow = (): void => {
    setOfflineCount(0);
  };

  return (
    <WashedThemeProvider className="worker-frame" theme="worker">
      <div className="status-spacer" />
      <header className="worker-topbar">
        <button className="worker-brand" onClick={() => setRoute('today')} type="button">
          <strong>Washed</strong>
          <span>Travailleuse</span>
        </button>
        <Button className="sos-button" onClick={() => setSosOpen(true)} variant="danger">
          {t.safety.panic}
        </Button>
      </header>

      <main className="worker-shell">
        {route === 'today' ? (
          <TodayScreen
            offlineCount={offlineCount}
            onRouteChange={setRoute}
            onSos={() => setSosOpen(true)}
            onSyncNow={syncNow}
            onVisitStepChange={setVisitStep}
            t={t}
            visitStep={visitStep}
          />
        ) : null}
        {route === 'planning' ? <PlanningScreen t={t} /> : null}
        {route === 'earnings' ? <EarningsScreen t={t} /> : null}
        {route === 'profile' ? <ProfileScreen t={t} /> : null}
      </main>

      {sosOpen ? <SosSheet onClose={() => setSosOpen(false)} t={t} /> : null}

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
  offlineCount,
  onRouteChange,
  onSos,
  onSyncNow,
  onVisitStepChange,
  t,
  visitStep,
}: {
  readonly offlineCount: number;
  readonly onRouteChange: (route: WorkerRoute) => void;
  readonly onSos: () => void;
  readonly onSyncNow: () => void;
  readonly onVisitStepChange: (step: VisitStep) => void;
  readonly t: typeof workerCopy;
  readonly visitStep: VisitStep;
}): ReactElement {
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
        <Button onClick={onSos} variant="danger">
          {t.safety.panic}
        </Button>
      </section>

      <Alert
        title={offlineCount > 0 ? t.sync.pending : t.sync.ready}
        tone={offlineCount > 0 ? 'accent' : 'success'}
      >
        <div className="sync-alert-body">
          <span>
            {offlineCount > 0 ? t.sync.offline : 'Toutes les preuves locales sont synchronisées.'}
          </span>
          <Button disabled={offlineCount === 0} onClick={onSyncNow} size="sm" variant="secondary">
            {t.action.retrySync}
          </Button>
        </div>
      </Alert>

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
        <VisitLifecycle onVisitStepChange={onVisitStepChange} t={t} visitStep={visitStep} />
        <div className="visit-actions">
          <Button fullWidth onClick={() => onVisitStepChange('checkIn')}>
            {t.visitStep.checkIn}
          </Button>
          <Button fullWidth onClick={() => onRouteChange('planning')} variant="secondary">
            {t.planning.week}
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
      </Card>
    </>
  );
}

function VisitLifecycle({
  onVisitStepChange,
  t,
  visitStep,
}: {
  readonly onVisitStepChange: (step: VisitStep) => void;
  readonly t: typeof workerCopy;
  readonly visitStep: VisitStep;
}): ReactElement {
  return (
    <div className="route-steps" aria-label="Worker route lifecycle">
      {visitSteps.map((step, index) => (
        <button
          aria-pressed={visitStep === step}
          className="route-step"
          key={step}
          onClick={() => onVisitStepChange(step)}
          type="button"
        >
          <span>{index + 1}</span>
          <strong>{t.visitStep[step]}</strong>
        </button>
      ))}
    </div>
  );
}

function PlanningScreen({ t }: { readonly t: typeof workerCopy }): ReactElement {
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
              <span>{slot === 'Urgence' ? 'Réservé opérateur' : 'Disponible'}</span>
            </button>
          ))}
        </div>
        <Button fullWidth variant="secondary">
          {t.planning.markUnavailable}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function EarningsScreen({ t }: { readonly t: typeof workerCopy }): ReactElement {
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
        <Button fullWidth>{t.action.advance}</Button>
      </Card>
    </ScreenFrame>
  );
}

function ProfileScreen({ t }: { readonly t: typeof workerCopy }): ReactElement {
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

function SosSheet({
  onClose,
  t,
}: {
  readonly onClose: () => void;
  readonly t: typeof workerCopy;
}): ReactElement {
  return (
    <div aria-label={t.safety.title} className="sheet-backdrop" role="dialog">
      <Card className="sos-sheet" elevated>
        <Badge tone="danger">{t.safety.panic}</Badge>
        <h2>{t.safety.title}</h2>
        <p>{t.safety.body}</p>
        <div className="sheet-actions">
          <Button fullWidth variant="danger">
            {t.action.confirmSos}
          </Button>
          <Button fullWidth onClick={onClose} variant="secondary">
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
