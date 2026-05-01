import { Alert, Badge, Button, Card, ListItem, Tabs, WashedThemeProvider } from '@washed/ui';
import { translate } from '@washed/i18n';
import type { ReactElement } from 'react';

const navItems = [
  translate('operator.nav.matching', 'fr'),
  translate('operator.nav.liveOps', 'fr'),
  'Travailleuses',
  'Abonnés',
  'Litiges',
  translate('operator.nav.payments', 'fr'),
  'Notifications',
  'Audit',
] as const;

const queues = [
  ['Matching pending', '7'],
  ['Visits at risk', '2'],
  ['Payment exceptions', '4'],
  ['SOS incidents', '0'],
] as const;

const operatorSurfaces = [
  'Dashboard',
  'Matching',
  'Live Ops',
  'Route planning',
  'Worker profiles',
  'Subscriber support',
  'Disputes',
  'Payments',
  'Payouts',
  'Audit',
  'Reports',
  'Settings',
] as const;

export function App(): ReactElement {
  return (
    <WashedThemeProvider className="operator-frame" theme="operator">
      <div className="operator-layout">
        <aside className="sidebar">
          <strong className="brand">Washed Ops</strong>
          <nav aria-label="Operator navigation">
            {navItems.map((item, index) => (
              <a aria-current={index === 0 ? 'page' : undefined} href={`#${item}`} key={item}>
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <main className="operator-main">
          <header className="operator-header">
            <div>
              <Badge>Closed beta console</Badge>
              <h1>Matching command center</h1>
              <p>Dense internal tool shell for assignment, support, payments, and governance.</p>
            </div>
            <Button variant="secondary">Command palette</Button>
          </header>

          <section className="metric-grid" aria-label="Operator queue metrics">
            {queues.map(([label, value]) => (
              <Card key={label}>
                <span className="metric-label">{label}</span>
                <strong className="metric-value">{value}</strong>
              </Card>
            ))}
          </section>

          <section className="console-grid">
            <Card className="worklist" elevated>
              <div className="card-header">
                <h2>Top candidate queue</h2>
                <Badge>{translate('operator.nav.matching', 'fr')}</Badge>
              </div>
              <Tabs
                tabs={[
                  { active: true, label: 'Pending' },
                  { label: 'Assigned' },
                  { label: 'Rejected' },
                ]}
              />
              <ListItem
                after={<Badge tone="success">94</Badge>}
                description="Adidogomé, T2, mardi matin"
                title="Afi Mensah"
              />
              <ListItem
                after={<Badge tone="accent">88</Badge>}
                description="Tokoin, T1, vendredi après-midi"
                title="Kossi Family"
              />
            </Card>

            <Card>
              <div className="card-header">
                <h2>Operational coverage</h2>
                <Badge>{operatorSurfaces.length} surfaces</Badge>
              </div>
              <Alert title="Internal quality bar" tone="primary">
                Visual polish can stay practical; auditability, permissions, privacy queues, and
                money movement cannot be skipped.
              </Alert>
              <div className="surface-grid" aria-label="Operator console surfaces">
                {operatorSurfaces.map((surface) => (
                  <span key={surface}>{surface}</span>
                ))}
              </div>
            </Card>
          </section>
        </main>
      </div>
    </WashedThemeProvider>
  );
}
