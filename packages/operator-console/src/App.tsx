import { useState } from 'react';

import { Alert, Badge, Button, Card, ListItem, Tabs, WashedThemeProvider } from '@washed/ui';
import type { ReactElement, ReactNode } from 'react';

import {
  liveVisits,
  matchingCandidates,
  navItems,
  operatorSurfaces,
  queueMetrics,
  type MatchingCandidate,
  type OperatorRoute,
} from './appData.js';

export function App(): ReactElement {
  const [route, setRoute] = useState<OperatorRoute>('dashboard');
  const [acceptedMatch, setAcceptedMatch] = useState<string | null>(null);

  return (
    <WashedThemeProvider className="operator-frame" theme="operator">
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

          {route === 'dashboard' ? <Dashboard onRouteChange={setRoute} /> : null}
          {route === 'matching' ? (
            <Matching acceptedMatch={acceptedMatch} onAccept={setAcceptedMatch} />
          ) : null}
          {route === 'liveOps' ? <LiveOps /> : null}
          {route === 'profiles' ? <Profiles /> : null}
          {route === 'disputes' ? <Disputes /> : null}
          {route === 'payments' ? <Payments /> : null}
          {route === 'audit' ? <Audit /> : null}
          {route === 'settings' ? <Settings /> : null}
        </main>
      </div>
    </WashedThemeProvider>
  );
}

function OperatorHeader({ route }: { readonly route: OperatorRoute }): ReactElement {
  const title = {
    audit: 'Audit and governance',
    dashboard: 'Operations dashboard',
    disputes: 'Dispute desk',
    liveOps: 'Live Ops board',
    matching: 'Matching command center',
    payments: 'Payments and payouts',
    profiles: 'Worker and subscriber profiles',
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
  onRouteChange,
}: {
  readonly onRouteChange: (route: OperatorRoute) => void;
}): ReactElement {
  return (
    <>
      <section className="metric-grid" aria-label="Operator queue metrics">
        {queueMetrics.map((metric) => (
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
              <Button onClick={() => onRouteChange('liveOps')} size="sm">
                Open
              </Button>
            }
            description="Akouvi route is 18 minutes behind schedule"
            title="Visit at risk"
          />
          <ListItem
            after={
              <Button onClick={() => onRouteChange('payments')} size="sm">
                Open
              </Button>
            }
            description="4 mobile-money recovery exceptions"
            title="Payment exceptions"
          />
        </Card>

        <SurfaceInventory />
      </section>
    </>
  );
}

function Matching({
  acceptedMatch,
  onAccept,
}: {
  readonly acceptedMatch: string | null;
  readonly onAccept: (matchId: string) => void;
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
            accepted={acceptedMatch === candidate.id}
            candidate={candidate}
            key={candidate.id}
            onAccept={onAccept}
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

function Profiles(): ReactElement {
  return (
    <section className="console-grid">
      <Card elevated>
        <div className="card-header">
          <h2>Worker profile</h2>
          <Badge tone="success">Active</Badge>
        </div>
        <ListItem description="Visits, ratings, payouts, advances, disputes" title="Akouvi A." />
        <ListItem
          description="blocked_for_worker, watchlist, relationship block"
          title="Safety flags"
        />
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
          description="Export, erasure, account deletion"
          title="Privacy request handling"
        />
      </Card>
    </section>
  );
}

function Disputes(): ReactElement {
  return (
    <Panel
      badge="4 open"
      body="Missed visit, damaged clothes, late worker, and safety reports route here before refunds or worker sanctions."
      title="Dispute triage"
    />
  );
}

function Payments(): ReactElement {
  return (
    <section className="console-grid">
      <Card elevated>
        <div className="card-header">
          <h2>Payment ops</h2>
          <Badge tone="accent">4 exceptions</Badge>
        </div>
        <ListItem description="Retry mobile-money recovery" title="Manual payment retry" />
        <ListItem description="Reason, amount, audit event" title="Refund issuance" />
      </Card>
      <Card>
        <div className="card-header">
          <h2>Payouts</h2>
          <Badge>May batch</Badge>
        </div>
        <ListItem description="Worker floor, bonuses, advances" title="Batch initiation" />
        <ListItem
          description="Retry failed payout with provider trace"
          title="Failed payout retry"
        />
      </Card>
    </section>
  );
}

function Audit(): ReactElement {
  return (
    <Panel
      badge="Immutable"
      body="Search and filter matching decisions, refunds, privacy requests, SOS incidents, and blocklist changes."
      title="Audit log"
    />
  );
}

function Settings(): ReactElement {
  return (
    <section className="console-grid">
      <Card elevated>
        <div className="card-header">
          <h2>Provider readiness</h2>
          <Badge tone="success">Ready</Badge>
        </div>
        <ListItem
          description="OTP, push, payment, storage, observability"
          title="Readiness checks"
        />
        <ListItem description="Quiet hours, beta mode, forced update" title="Feature flags" />
      </Card>
      <SurfaceInventory />
    </section>
  );
}

function CandidateRow({
  accepted,
  candidate,
  onAccept,
}: {
  readonly accepted: boolean;
  readonly candidate: MatchingCandidate;
  readonly onAccept: (matchId: string) => void;
}): ReactElement {
  return (
    <ListItem
      after={
        accepted ? (
          <Badge tone="success">Accepted</Badge>
        ) : (
          <Button onClick={() => onAccept(candidate.id)} size="sm">
            Accept
          </Button>
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

function Panel({
  badge,
  body,
  title,
}: {
  readonly badge: string;
  readonly body: ReactNode;
  readonly title: string;
}): ReactElement {
  return (
    <Card elevated>
      <div className="card-header">
        <h2>{title}</h2>
        <Badge>{badge}</Badge>
      </div>
      <Alert tone="primary">{body}</Alert>
    </Card>
  );
}
