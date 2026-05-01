import { useReducer, useState } from 'react';

import {
  Alert,
  Badge,
  Button,
  Card,
  ListItem,
  Tabs,
  TextField,
  WashedThemeProvider,
} from '@washed/ui';
import {
  Bell,
  ChartColumn,
  ClipboardList,
  CreditCard,
  Gauge,
  Map,
  Scale,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { Dispatch, ReactElement } from 'react';

import {
  liveVisits,
  matchingCandidates,
  navItems,
  notificationRows,
  operatorFeedback,
  queueMetrics,
  reportCards,
  routePlanRows,
  type MatchingCandidate,
  type OperatorRoute,
} from './appData.js';
import {
  initialOperatorState,
  operatorReducer,
  type OperatorAction,
  type OperatorState,
} from './operatorState.js';

const navIcons = {
  audit: <ShieldCheck aria-hidden="true" size={17} strokeWidth={2.25} />,
  dashboard: <Gauge aria-hidden="true" size={17} strokeWidth={2.25} />,
  disputes: <Scale aria-hidden="true" size={17} strokeWidth={2.25} />,
  liveOps: <Map aria-hidden="true" size={17} strokeWidth={2.25} />,
  matching: <ClipboardList aria-hidden="true" size={17} strokeWidth={2.25} />,
  notifications: <Bell aria-hidden="true" size={17} strokeWidth={2.25} />,
  payments: <CreditCard aria-hidden="true" size={17} strokeWidth={2.25} />,
  profiles: <UsersRound aria-hidden="true" size={17} strokeWidth={2.25} />,
  reports: <ChartColumn aria-hidden="true" size={17} strokeWidth={2.25} />,
  routePlanning: <ClipboardList aria-hidden="true" size={17} strokeWidth={2.25} />,
  settings: <SettingsIcon aria-hidden="true" size={17} strokeWidth={2.25} />,
} as const satisfies Record<OperatorRoute, ReactElement>;

export function App(): ReactElement {
  const [route, setRoute] = useState<OperatorRoute>('dashboard');
  const [operatorState, dispatch] = useReducer(operatorReducer, initialOperatorState);

  return (
    <WashedThemeProvider className="operator-frame" theme="operator">
      {operatorState.login.verified ? (
        <div className="operator-browser">
          <div className="operator-layout">
            <aside className="sidebar">
              <div className="sidebar-brand">
                <strong className="brand">Washed</strong>
                <span>Ops Console · Lomé</span>
              </div>
              <nav aria-label="Operator navigation">
                {navItems.map((item) => {
                  const badge = 'badge' in item ? item.badge : undefined;

                  return (
                    <button
                      aria-current={route === item.route ? 'page' : undefined}
                      aria-label={item.label}
                      key={item.route}
                      onClick={() => setRoute(item.route)}
                      type="button"
                    >
                      <span aria-hidden="true" className="nav-icon">
                        {navIcons[item.route]}
                      </span>
                      <span>{item.label}</span>
                      {badge === undefined ? null : <em>{badge}</em>}
                    </button>
                  );
                })}
              </nav>
              <div className="sidebar-footer">
                <span>Mode dispatch</span>
                <strong>Opérateur manuel ⟳</strong>
              </div>
            </aside>

            <main className="operator-main">
              <OperatorHeader route={route} />
              {operatorState.lastFeedback === null ||
              operatorState.lastFeedback === 'loginVerified' ? null : (
                <Alert className="feedback-banner" tone="success">
                  {operatorFeedback[operatorState.lastFeedback]}
                </Alert>
              )}

              {route === 'dashboard' ? (
                <Dashboard operatorState={operatorState} onRouteChange={setRoute} />
              ) : null}
              {route === 'matching' ? (
                <Matching dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'liveOps' ? <LiveOps /> : null}
              {route === 'routePlanning' ? (
                <RoutePlanning dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'profiles' ? (
                <Profiles dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'disputes' ? (
                <Disputes dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'payments' ? (
                <Payments dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'notifications' ? (
                <Notifications dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'audit' ? (
                <Audit dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'reports' ? (
                <Reports dispatch={dispatch} operatorState={operatorState} />
              ) : null}
              {route === 'settings' ? (
                <Settings dispatch={dispatch} operatorState={operatorState} />
              ) : null}
            </main>
          </div>
        </div>
      ) : (
        <LoginGate dispatch={dispatch} operatorState={operatorState} />
      )}
    </WashedThemeProvider>
  );
}

function LoginGate({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  const [phone, setPhone] = useState(operatorState.login.phone);
  const [otp, setOtp] = useState('');

  return (
    <div className="login-overlay" role="presentation">
      <Card className="login-card" elevated>
        <Badge>Operator access</Badge>
        <h1>Washed Ops login</h1>
        <p>
          Operator console access requires phone OTP before showing subscriber, worker, payment, or
          audit data.
        </p>

        {operatorState.lastFeedback === null ? null : (
          <Alert tone="success">{operatorFeedback[operatorState.lastFeedback]}</Alert>
        )}

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (operatorState.login.otpSent) {
              dispatch({ type: 'login/verifyOtp' });
              return;
            }

            dispatch({ phone, type: 'login/sendOtp' });
          }}
        >
          <TextField
            autoComplete="tel"
            label="Operator phone"
            onChange={(event) => setPhone(event.target.value)}
            value={phone}
          />
          {operatorState.login.otpSent ? (
            <TextField
              autoComplete="one-time-code"
              inputMode="numeric"
              label="OTP code"
              onChange={(event) => setOtp(event.target.value)}
              value={otp}
            />
          ) : null}
          <Button fullWidth type="submit">
            {operatorState.login.otpSent ? 'Verify OTP' : 'Send OTP'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function OperatorHeader({ route }: { readonly route: OperatorRoute }): ReactElement {
  const meta = {
    audit: {
      badge: 'Immutable',
      detail: 'Operator id, event type, affected entity, timestamp',
      title: 'Audit and governance',
    },
    dashboard: {
      badge: 'Operations console',
      detail: 'Assignment, support, payments, safety, and governance in one workspace.',
      title: 'Operations dashboard',
    },
    disputes: {
      badge: '2 ouverts',
      detail: 'SLA résolution : 24h',
      title: 'Bureau des litiges',
    },
    liveOps: {
      detail: 'Lundi 28 avr · 42 visites planifiées',
      live: 'Mise à jour en direct · <200ms',
      title: 'Live ops board',
    },
    matching: {
      badge: '3 en attente',
      detail: 'SLA : assigner < 4h · ⏱ 1h12 restant pour Essi',
      title: "File d'attribution",
    },
    notifications: {
      badge: 'Push devices',
      detail: 'Failed devices explain missed reminders and route confirmations.',
      title: 'Notifications and push devices',
    },
    payments: {
      badge: 'Mobile money',
      detail: 'Recoveries, refunds, payout batches, and failed payout retries.',
      title: 'Payments and payouts',
    },
    profiles: {
      badge: 'CS',
      detail: 'Worker history, subscriber support, privacy queues, and blocklist flags.',
      title: 'Worker and subscriber profiles',
    },
    reports: {
      badge: 'Ops metrics',
      detail: 'Founder cadence exports for weekly operations review.',
      title: 'Reports and KPI exports',
    },
    routePlanning: {
      badge: 'Tomorrow',
      detail: 'Plan around service-cell capacity, unavailability, and blocked relationships.',
      title: 'Daily route planning',
    },
    settings: {
      badge: 'Readiness',
      detail: 'OTP, push, payment, storage, observability, and forced-update flags.',
      title: 'Settings and readiness',
    },
  }[route];

  return (
    <header className="operator-header">
      <div>
        {meta.badge === undefined ? null : (
          <Badge tone={route === 'disputes' ? 'danger' : 'primary'}>{meta.badge}</Badge>
        )}
        <h1>{meta.title}</h1>
        {meta.live === undefined ? null : (
          <span className="live-indicator">
            <i aria-hidden="true" />
            {meta.live}
          </span>
        )}
        <p>{meta.detail}</p>
      </div>
      {route === 'matching' || route === 'liveOps' || route === 'disputes' ? null : (
        <button className="command-search" type="button">
          <Search aria-hidden="true" size={15} strokeWidth={2.35} />
          Command palette
          <kbd>⌘K</kbd>
        </button>
      )}
    </header>
  );
}

function Dashboard({
  operatorState,
  onRouteChange,
}: {
  readonly operatorState: OperatorState;
  readonly onRouteChange: (route: OperatorRoute) => void;
}): ReactElement {
  const metrics = queueMetrics.map((metric) => {
    if (metric.label === 'Payment exceptions') {
      return { ...metric, value: String(operatorState.payments.exceptions) };
    }

    if (metric.label === 'SOS incidents') {
      return { ...metric, value: String(operatorState.disputes.escalated) };
    }

    return metric;
  });

  return (
    <>
      <section className="metric-grid" aria-label="Operator queue metrics">
        {metrics.map((metric) => (
          <div className={`ops-metric-card ops-metric-${metric.tone}`} key={metric.label}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            <em>{metric.tone}</em>
          </div>
        ))}
      </section>

      <section className="dashboard-command-grid">
        <Card className="worklist priority-panel" elevated>
          <div className="card-header">
            <h2>Today priority</h2>
            <Badge tone="danger">2 risks</Badge>
          </div>
          <ListItem
            after={
              <Button onClick={() => onRouteChange('routePlanning')} size="sm">
                Open
              </Button>
            }
            description="Akouvi route is 18 minutes behind schedule"
            title="Route overload"
          />
          <ListItem
            after={
              <Button onClick={() => onRouteChange('notifications')} size="sm">
                Open
              </Button>
            }
            description={`${operatorState.notifications.due} due, ${operatorState.notifications.failedDevices} failed devices`}
            title="Notification queue"
          />
          <ListItem
            after={
              <Button onClick={() => onRouteChange('matching')} size="sm" variant="secondary">
                Assign
              </Button>
            }
            description="3 pending households; oldest SLA has 1h12 remaining"
            title="Matching backlog"
          />
        </Card>

        <Card className="ops-health-panel">
          <div className="card-header">
            <h2>Live state</h2>
            <Badge tone="success">Stable</Badge>
          </div>
          <div className="ops-health-grid">
            <span>
              <strong>42</strong>
              Visits today
            </span>
            <span>
              <strong>94%</strong>
              Completion
            </span>
            <span>
              <strong>31 mai</strong>
              Payout batch
            </span>
            <span>
              <strong>&lt; 4h</strong>
              Matching SLA
            </span>
          </div>
        </Card>

        <ReadinessPanel operatorState={operatorState} />
      </section>
    </>
  );
}

function RoutePlanning({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <section className="console-grid">
      <Card className="worklist" elevated>
        <div className="card-header">
          <h2>Tomorrow route board</h2>
          <Badge tone={operatorState.routePlanning.overloadedRoutes > 0 ? 'danger' : 'success'}>
            {operatorState.routePlanning.overloadedRoutes} overloads
          </Badge>
        </div>
        {routePlanRows.map((row) => (
          <ListItem
            after={
              <Badge
                tone={
                  row.risk === 'overloaded'
                    ? 'danger'
                    : row.risk === 'unavailable'
                      ? 'accent'
                      : 'success'
                }
              >
                {row.risk}
              </Badge>
            }
            description={row.load}
            key={row.worker}
            title={row.worker}
          />
        ))}
      </Card>
      <Card>
        <Alert title="Planning guardrails" tone="primary">
          Route approval must account for worker unavailability, service-cell capacity, and
          high-risk subscriber relationships.
        </Alert>
        <ListItem
          description={`${operatorState.routePlanning.unavailableWorkers} worker unavailable`}
          title="Unavailability conflicts"
        />
        <ListItem
          description={`${operatorState.routePlanning.approvedRoutes} approval events`}
          title="Approved routes"
        />
        <div className="operator-actions">
          <Button onClick={() => dispatch({ type: 'routePlanning/acknowledgeRisk' })}>
            Acknowledge risk
          </Button>
          <Button
            onClick={() => dispatch({ type: 'routePlanning/approveRoutes' })}
            variant="secondary"
          >
            Approve routes
          </Button>
        </div>
      </Card>
    </section>
  );
}

function Matching({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  const matchingQueue = [
    {
      active: true,
      name: 'Essi Agbodzan',
      neighborhood: 'Bè Kpota',
      schedule: 'T2 · Lundi matin',
      timeLeft: '3h22',
      urgent: false,
    },
    {
      active: false,
      name: 'Kodjo Amévi',
      neighborhood: 'Tokoin Est',
      schedule: 'T1 · Vendredi',
      timeLeft: '1h45',
      urgent: false,
    },
    {
      active: false,
      name: 'Abla Fiagbé',
      neighborhood: 'Adidogomé',
      schedule: 'T2 · Mercredi',
      timeLeft: '0h29',
      urgent: true,
    },
  ] as const;

  return (
    <section className="attribution-shell" aria-label="Operator matching command center">
      <aside className="assignment-queue">
        {matchingQueue.map((entry) => (
          <button
            className={[
              'queue-card',
              entry.active ? 'queue-card-active' : '',
              entry.urgent ? 'queue-card-urgent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={entry.name}
            type="button"
          >
            <span>
              <strong>{entry.name}</strong>
              <small>
                {entry.schedule} · {entry.neighborhood}
              </small>
              {entry.urgent ? <small className="urgent-copy">SLA presque atteint</small> : null}
            </span>
            <em>⏱ {entry.timeLeft}</em>
          </button>
        ))}
      </aside>

      <div className="assignment-detail">
        <div className="assignment-title">
          <div>
            <h2>Essi Agbodzan — T2 · Lundi matin</h2>
            <p>Bè Kpota · Lomé · Inscrite il y a 3h22 · Premier abonnement</p>
          </div>
          <Badge tone="accent">En attente</Badge>
        </div>

        <Tabs
          tabs={[{ active: true, label: 'Pending' }, { label: 'Assigned' }, { label: 'Rejected' }]}
        />

        <p className="section-eyebrow">Top 5 candidates · Score ML</p>
        <div className="candidate-stack">
          {matchingCandidates.map((candidate) => (
            <CandidateRow
              candidate={candidate}
              dispatch={dispatch}
              key={candidate.id}
              status={
                operatorState.matching.acceptedMatchId === candidate.id
                  ? 'accepted'
                  : operatorState.matching.rejectedMatchIds.includes(candidate.id)
                    ? 'rejected'
                    : 'pending'
              }
            />
          ))}
        </div>

        <div className="assignment-map" aria-label="Lomé candidate map">
          <span>🗺</span>
          <strong>Carte Lomé</strong>
          <p>Positions laveuses disponibles + quartier Essi</p>
        </div>

        <Alert title="Decision logging" tone="primary">
          Every accept/reject writes an audit event with feature scores, operator id, and reason.
        </Alert>
      </div>
    </section>
  );
}

function LiveOps(): ReactElement {
  return (
    <section className="liveops-shell">
      <div className="live-map" aria-label="Live operations map">
        <div className="live-kpis" aria-label="Live operations metrics">
          {[
            ['12', 'En cours', '🟢'],
            ['18', 'Planifiées', '⚪'],
            ['8', 'Terminées', '⬛'],
            ['1', 'Problèmes', '🔴'],
            ['3', 'Non assignées', '🟡'],
          ].map(([value, label, icon]) => (
            <div key={label}>
              <span>
                {icon} {label}
              </span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="map-centerpiece">
          <span>🗺</span>
          <strong>Carte Lomé en temps réel</strong>
          <p>Laveuses + abonnés · sous-200ms</p>
        </div>

        <span className="map-pin map-pin-a" />
        <span className="map-pin map-pin-b" />
        <span className="map-pin map-pin-risk" />

        <div className="map-legend">
          {[
            ['🟢', 'En route / en cours'],
            ['🟡', 'Prochaine (< 1h)'],
            ['⚪', 'Planifiée'],
            ['🔴', 'Problème signalé'],
            ['⬛', 'Terminée'],
          ].map(([icon, label]) => (
            <span key={label}>
              {icon} {label}
            </span>
          ))}
        </div>
      </div>

      <aside className="live-side-panel">
        <div className="card-header">
          <h2>Alertes actives</h2>
          <Badge tone="danger">3</Badge>
        </div>
        {[
          ['🔴', 'Yao Agbeko · laveuse en retard 40 min', 'urgent'],
          ['🟡', 'Ama Dossou · position GPS imprécise', 'warning'],
          ['🟡', '3 abonnés non assignés', 'warning'],
        ].map(([icon, title, tone]) => (
          <div className={`live-alert live-alert-${tone}`} key={title}>
            <strong>
              {icon} {title}
            </strong>
            <button type="button">Intervenir</button>
          </div>
        ))}

        <p className="section-eyebrow">Laveuses actives (12)</p>
        {liveVisits.map((visit) => (
          <ListItem
            after={
              <Badge tone={visit.status === 'At risk' ? 'danger' : 'success'}>{visit.status}</Badge>
            }
            description={`${visit.worker} · ETA ${visit.eta}`}
            key={`${visit.worker}-${visit.subscriber}`}
            title={visit.subscriber}
          />
        ))}
      </aside>
    </section>
  );
}

function Profiles({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <section className="console-grid">
      <Card elevated>
        <div className="card-header">
          <h2>Worker profile</h2>
          <Badge tone="success">Active</Badge>
        </div>
        <ListItem description="Visits, ratings, payouts, advances, disputes" title="Akouvi A." />
        <ListItem
          after={<Badge>{operatorState.blocklistCount}</Badge>}
          description="blocked_for_worker, watchlist, relationship block"
          title="Safety flags"
        />
        <Button onClick={() => dispatch({ type: 'blocklist/add' })} variant="secondary">
          Add relationship block
        </Button>
      </Card>
      <Card>
        <div className="card-header">
          <h2>Subscriber profile</h2>
          <Badge>CS</Badge>
        </div>
        <ListItem
          description="Billing, visits, support credits, privacy requests"
          title="Afi Mensah"
        />
        <ListItem
          after={
            operatorState.privacy.subscriberHandled ? <Badge tone="success">Handled</Badge> : null
          }
          description="Export, erasure, account deletion"
          title="Privacy request handling"
        />
        <div className="operator-actions">
          <Button onClick={() => dispatch({ type: 'privacy/handleSubscriber' })} size="sm">
            Handle subscriber privacy
          </Button>
          <Button
            onClick={() => dispatch({ type: 'privacy/handleWorker' })}
            size="sm"
            variant="secondary"
          >
            Handle worker privacy
          </Button>
        </div>
      </Card>
    </section>
  );
}

function Disputes({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <section className="dispute-desk">
      <aside className="dispute-list">
        {[
          ['Essi Agbodzan', 'Vêtement endommagé', '2h', 'active'],
          ['Kodjo Mévi', 'Objet manquant', '18h', 'critical'],
          ['Abla F. (résolu)', 'Laveuse absente', 'résolu', 'resolved'],
        ].map(([name, title, age, status]) => (
          <button className={`dispute-ticket dispute-ticket-${status}`} key={name} type="button">
            <strong>{name}</strong>
            <span>{title}</span>
            <small>{age}</small>
          </button>
        ))}
      </aside>

      <Card className="dispute-detail" elevated>
        <div className="assignment-title">
          <div>
            <h2>Essi Agbodzan — Vêtement endommagé</h2>
            <p>Visite du 29 avr · Akouvi Koffi · Ouvert il y a 2h</p>
          </div>
          <Badge>{operatorState.disputes.open} open</Badge>
        </div>

        <p className="section-eyebrow">Preuves & contexte</p>
        <div className="evidence-grid">
          {['Photo client\n(vêtement)', 'Photo Akouvi\nAVANT', 'Photo Akouvi\nAPRÈS'].map(
            (label) => (
              <div key={label}>{label}</div>
            ),
          )}
        </div>

        <div className="client-statement">
          <span>Description client</span>
          <p>"Ma robe bleue a été déchirée sur le côté. Elle était en bon état avant la visite."</p>
        </div>

        <div className="proof-trail">
          {[
            ['GPS check-in', '✓ 9h02 · 42m'],
            ['GPS check-out', '✓ 11h08 · 38m'],
            ['Durée', '2h06 min'],
            ['Appels', '1 · 3 min'],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="worker-statement">
          <strong>Déclaration laveuse (en attente)</strong>
          <span>Demander à Akouvi via l'app → notification push envoyée</span>
        </div>

        <div className="dispute-actions">
          <Button onClick={() => dispatch({ type: 'dispute/resolve' })}>Resolve dispute</Button>
          <Button onClick={() => dispatch({ type: 'dispute/escalate' })} variant="danger">
            Escalate safety case
          </Button>
        </div>

        <div className="proof-trail">
          <div>
            <span>Resolved</span>
            <strong>{operatorState.disputes.resolved} resolved</strong>
          </div>
          <div>
            <span>Escalated</span>
            <strong>{operatorState.disputes.escalated} escalated</strong>
          </div>
        </div>
      </Card>
    </section>
  );
}

function Payments({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <section className="console-grid">
      <Card elevated>
        <div className="card-header">
          <h2>Payment ops</h2>
          <Badge tone="accent">{operatorState.payments.exceptions} exceptions</Badge>
        </div>
        <ListItem
          after={
            <Button onClick={() => dispatch({ type: 'payments/retryRecovery' })} size="sm">
              Retry
            </Button>
          }
          description={`${operatorState.payments.retryQueued} queued`}
          title="Manual payment retry"
        />
        <ListItem
          after={
            <Button onClick={() => dispatch({ type: 'payments/issueRefund' })} size="sm">
              Issue
            </Button>
          }
          description={`${operatorState.payments.refundsIssued} refunds issued`}
          title="Refund issuance"
        />
      </Card>
      <Card>
        <div className="card-header">
          <h2>Payouts</h2>
          <Badge>{operatorState.payments.payoutBatchStarted ? 'Started' : 'May batch'}</Badge>
        </div>
        <ListItem
          after={
            <Button onClick={() => dispatch({ type: 'payments/startPayoutBatch' })} size="sm">
              Start
            </Button>
          }
          description="Worker floor, bonuses, advances"
          title="Batch initiation"
        />
        <ListItem
          after={
            <Button onClick={() => dispatch({ type: 'payments/retryFailedPayout' })} size="sm">
              Retry
            </Button>
          }
          description={`${operatorState.payments.failedPayouts} failed payout`}
          title="Failed payout retry"
        />
      </Card>
    </section>
  );
}

function Notifications({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <section className="console-grid">
      <Card className="worklist" elevated>
        <div className="card-header">
          <h2>Notification delivery</h2>
          <Badge tone={operatorState.notifications.due > 0 ? 'accent' : 'success'}>
            {operatorState.notifications.due} due
          </Badge>
        </div>
        {notificationRows.map((row) => (
          <ListItem
            after={
              <Badge
                tone={
                  row.status === 'failed' ? 'danger' : row.status === 'due' ? 'accent' : 'success'
                }
              >
                {row.status}
              </Badge>
            }
            description={row.audience}
            key={row.title}
            title={row.title}
          />
        ))}
      </Card>
      <Card>
        <Alert title="Push device recovery" tone="primary">
          Failed push devices stay visible because they often explain missed visit reminders and
          worker route confirmations.
        </Alert>
        <ListItem
          description={`${operatorState.notifications.failedDevices} devices need token recovery`}
          title="Failed devices"
        />
        <ListItem
          description={`${operatorState.notifications.deliveredDue} delivered from this queue`}
          title="Delivered due"
        />
        <Button onClick={() => dispatch({ type: 'notifications/deliverDue' })}>
          Deliver due notifications
        </Button>
      </Card>
    </section>
  );
}

function Audit({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <Card elevated>
      <div className="card-header">
        <h2>Audit log</h2>
        <Badge>Immutable</Badge>
      </div>
      <p>
        Search and filter matching decisions, refunds, privacy requests, SOS incidents, and
        blocklist changes.
      </p>
      <ListItem
        after={
          <Badge>{operatorState.auditFilter === '' ? 'All' : operatorState.auditFilter}</Badge>
        }
        description="Operator id, event type, affected entity, timestamp"
        title="Current filter"
      />
      <Button onClick={() => dispatch({ type: 'audit/filter' })}>Apply risk filter</Button>
    </Card>
  );
}

function Reports({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <section className="console-grid">
      <Card className="worklist" elevated>
        <div className="card-header">
          <h2>{operatorState.reports.kpiPeriod}</h2>
          <Badge>Ops metrics</Badge>
        </div>
        {reportCards.map((card) => (
          <ListItem
            description="Read from operational queues and finance events"
            key={card.label}
            title={`${card.label}: ${card.value}`}
          />
        ))}
      </Card>
      <Card>
        <Alert title="Export discipline" tone="primary">
          Reports are review artifacts for founder and operations cadence.
        </Alert>
        <ListItem
          after={<Badge>{operatorState.reports.exportedAt ?? 'Not exported'}</Badge>}
          description="CSV/PDF export state wired to operations metrics"
          title="Latest export"
        />
        <Button onClick={() => dispatch({ type: 'reports/export' })}>Export report</Button>
      </Card>
    </section>
  );
}

function Settings({
  dispatch,
  operatorState,
}: {
  readonly dispatch: Dispatch<OperatorAction>;
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <section className="console-grid">
      <Card elevated>
        <div className="card-header">
          <h2>Provider readiness</h2>
          <Badge tone="success">Ready</Badge>
        </div>
        <ListItem
          after={<Badge>{operatorState.readiness.lastChecked}</Badge>}
          description="OTP, push, payment, storage, observability"
          title="Readiness checks"
        />
        <ListItem
          after={
            <Badge tone={operatorState.readiness.forcedUpdateEnabled ? 'danger' : 'muted'}>
              {operatorState.readiness.forcedUpdateEnabled ? 'Forced' : 'Normal'}
            </Badge>
          }
          description="Quiet hours, mobile rollout mode, forced update"
          title="Feature flags"
        />
        <div className="operator-actions">
          <Button onClick={() => dispatch({ type: 'settings/checkReadiness' })}>
            Run readiness check
          </Button>
          <Button
            onClick={() => dispatch({ type: 'settings/toggleForcedUpdate' })}
            variant="secondary"
          >
            Toggle forced update
          </Button>
        </div>
      </Card>
      <ReadinessPanel operatorState={operatorState} />
    </section>
  );
}

function CandidateRow({
  candidate,
  dispatch,
  status,
}: {
  readonly candidate: MatchingCandidate;
  readonly dispatch: Dispatch<OperatorAction>;
  readonly status: 'accepted' | 'pending' | 'rejected';
}): ReactElement {
  return (
    <div className={`candidate-row candidate-row-${status}`}>
      <div className="candidate-photo">photo</div>
      <div className="candidate-info">
        <div>
          <strong>{candidate.worker}</strong>
          {candidate.top ? <Badge tone="success">Top match</Badge> : null}
        </div>
        <p>
          {candidate.visits} visites · {candidate.distance} · {candidate.availability}
        </p>
      </div>
      <div className="candidate-score">
        <strong>{candidate.score}</strong>
        <span>score ML</span>
      </div>
      <div className="candidate-actions">
        {status === 'accepted' ? (
          <Badge tone="success">Accepted</Badge>
        ) : status === 'rejected' ? (
          <Badge tone="danger">Rejected</Badge>
        ) : (
          <div className="row-actions">
            <Button
              onClick={() => dispatch({ matchId: candidate.id, type: 'matching/accept' })}
              size="sm"
            >
              Accept
            </Button>
            <Button
              onClick={() => dispatch({ matchId: candidate.id, type: 'matching/reject' })}
              size="sm"
              variant="secondary"
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReadinessPanel({
  operatorState,
}: {
  readonly operatorState: OperatorState;
}): ReactElement {
  return (
    <Card className="readiness-panel">
      <div className="card-header">
        <h2>Risk and readiness</h2>
        <Badge tone="success">Ready</Badge>
      </div>
      <div className="readiness-grid" aria-label="Operator readiness state">
        <span>
          <strong>{operatorState.readiness.lastChecked}</strong>
          Provider readiness
        </span>
        <span>
          <strong>{operatorState.payments.failedPayouts}</strong>
          Failed payouts
        </span>
        <span>
          <strong>{operatorState.privacy.subscriberHandled ? '0' : '1'}</strong>
          Privacy queue
        </span>
        <span>
          <strong>{operatorState.blocklistCount}</strong>
          Blocklist flags
        </span>
      </div>
      <div className="audit-preview" aria-label="Latest audit events">
        {[
          ['matching.accepted', 'Essi Agbodzan · Akouvi Koffi'],
          ['payment.retryQueued', 'T-Money recovery · 4,500 FCFA'],
          ['privacy.exportQueued', 'Subscriber data request'],
        ].map(([event, detail]) => (
          <span key={event}>
            <strong>{event}</strong>
            {detail}
          </span>
        ))}
      </div>
    </Card>
  );
}
