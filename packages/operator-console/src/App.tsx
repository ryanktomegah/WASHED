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
import type { Dispatch, ReactElement } from 'react';

import {
  liveVisits,
  matchingCandidates,
  navItems,
  notificationRows,
  operatorFeedback,
  operatorSurfaces,
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

export function App(): ReactElement {
  const [route, setRoute] = useState<OperatorRoute>('dashboard');
  const [operatorState, dispatch] = useReducer(operatorReducer, initialOperatorState);

  return (
    <WashedThemeProvider className="operator-frame" theme="operator">
      {operatorState.login.verified ? (
        <div className="operator-layout">
          <aside className="sidebar">
            <strong className="brand">Washed Ops</strong>
            <nav aria-label="Operator navigation">
              {navItems.map((item) => (
                <button
                  aria-current={route === item.route ? 'page' : undefined}
                  key={item.route}
                  onClick={() => setRoute(item.route)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="operator-main">
            <OperatorHeader route={route} />
            {operatorState.lastFeedback === null ? null : (
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
            {route === 'audit' ? <Audit dispatch={dispatch} operatorState={operatorState} /> : null}
            {route === 'reports' ? (
              <Reports dispatch={dispatch} operatorState={operatorState} />
            ) : null}
            {route === 'settings' ? (
              <Settings dispatch={dispatch} operatorState={operatorState} />
            ) : null}
          </main>
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
  const title = {
    audit: 'Audit and governance',
    dashboard: 'Operations dashboard',
    disputes: 'Dispute desk',
    liveOps: 'Live Ops board',
    matching: 'Matching command center',
    notifications: 'Notifications and push devices',
    payments: 'Payments and payouts',
    profiles: 'Worker and subscriber profiles',
    reports: 'Reports and KPI exports',
    routePlanning: 'Daily route planning',
    settings: 'Settings and readiness',
  }[route];

  return (
    <header className="operator-header">
      <div>
        <Badge>Closed beta console</Badge>
        <h1>{title}</h1>
        <p>Dense internal tooling for assignment, support, payments, safety, and governance.</p>
      </div>
      <Button variant="secondary">Command palette</Button>
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
          <Card key={metric.label}>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            <Badge tone={metric.tone}>{metric.tone}</Badge>
          </Card>
        ))}
      </section>

      <section className="console-grid">
        <Card className="worklist" elevated>
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
        </Card>

        <SurfaceInventory />
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
  return (
    <section className="console-grid">
      <Card className="worklist" elevated>
        <div className="card-header">
          <h2>Top candidate queue</h2>
          <Badge>Attribution</Badge>
        </div>
        <Tabs
          tabs={[{ active: true, label: 'Pending' }, { label: 'Assigned' }, { label: 'Rejected' }]}
        />
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
      </Card>

      <Card>
        <Alert title="Decision logging" tone="primary">
          Every accept/reject writes an audit event with feature scores, operator id, and reason.
        </Alert>
        <ListItem description="Distance, schedule, safety, rating, load" title="Feature scores" />
        <ListItem description="2 per quarter, operator-approved" title="Worker swap requests" />
      </Card>
    </section>
  );
}

function LiveOps(): ReactElement {
  return (
    <section className="console-grid">
      <Card className="ops-map" elevated>
        <div className="card-header">
          <h2>Route map</h2>
          <Badge>WebSocket</Badge>
        </div>
        <div className="map-board" aria-label="Live operations map">
          <span className="map-pin map-pin-a" />
          <span className="map-pin map-pin-b" />
          <span className="map-pin map-pin-risk" />
        </div>
      </Card>
      <Card>
        <div className="card-header">
          <h2>Active visits</h2>
          <Badge>{liveVisits.length}</Badge>
        </div>
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
      </Card>
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
    <Card elevated>
      <div className="card-header">
        <h2>Dispute triage</h2>
        <Badge>{operatorState.disputes.open} open</Badge>
      </div>
      <p>
        Missed visit, damaged clothes, late worker, and safety reports route here before refunds or
        worker sanctions.
      </p>
      <div className="operator-actions">
        <Button onClick={() => dispatch({ type: 'dispute/resolve' })}>Resolve dispute</Button>
        <Button onClick={() => dispatch({ type: 'dispute/escalate' })} variant="danger">
          Escalate safety case
        </Button>
      </div>
      <ListItem description={`${operatorState.disputes.resolved} resolved`} title="Resolved" />
      <ListItem description={`${operatorState.disputes.escalated} escalated`} title="Escalated" />
    </Card>
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
          <Badge>Beta metrics</Badge>
        </div>
        {reportCards.map((card) => (
          <ListItem
            description="Read from beta metrics and operational queues"
            key={card.label}
            title={`${card.label}: ${card.value}`}
          />
        ))}
      </Card>
      <Card>
        <Alert title="Export discipline" tone="primary">
          Reports are review artifacts for founder and ops cadence; they are not a public analytics
          dashboard yet.
        </Alert>
        <ListItem
          after={<Badge>{operatorState.reports.exportedAt ?? 'Not exported'}</Badge>}
          description="CSV/PDF export state wired to beta metrics"
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
          description="Quiet hours, beta mode, forced update"
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
      <SurfaceInventory />
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
    <ListItem
      after={
        status === 'accepted' ? (
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
        )
      }
      description={`${candidate.worker} · ${candidate.cell}`}
      title={`${candidate.subscriber} · ${candidate.score}`}
    />
  );
}

function SurfaceInventory(): ReactElement {
  return (
    <Card>
      <div className="card-header">
        <h2>Operational coverage</h2>
        <Badge>{operatorSurfaces.length} surfaces</Badge>
      </div>
      <Alert title="Internal quality bar" tone="primary">
        Visual polish can stay practical; auditability, permissions, privacy queues, and money
        movement cannot be skipped.
      </Alert>
      <div className="surface-grid" aria-label="Operator console surfaces">
        {operatorSurfaces.map((surface) => (
          <span key={surface}>{surface}</span>
        ))}
      </div>
    </Card>
  );
}
