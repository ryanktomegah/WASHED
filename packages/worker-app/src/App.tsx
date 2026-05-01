import {
  Alert,
  Badge,
  BottomNav,
  Button,
  Card,
  ListItem,
  Tabs,
  WashedThemeProvider,
} from '@washed/ui';
import { translate } from '@washed/i18n';
import type { ReactElement } from 'react';

const routeSteps = [
  'Heading',
  'Check-in',
  'Before photo',
  'In visit',
  'After photo',
  'Check-out',
] as const;

const workerSurfaces = [
  "Aujourd'hui",
  'Planning',
  'Gains',
  'Profil',
  'SOS',
  'Offline queue',
  'Advance request',
  'Day summary',
] as const;

export function App(): ReactElement {
  return (
    <WashedThemeProvider className="worker-frame" theme="worker">
      <main className="worker-shell">
        <header className="worker-header">
          <div>
            <Badge tone="success">Route active</Badge>
            <h1>{translate('worker.route.today', 'fr')}</h1>
            <p>3 visites planifiées, 1 action en attente de synchronisation.</p>
          </div>
          <Button className="sos-button" variant="danger">
            {translate('worker.safety.sos', 'fr')}
          </Button>
        </header>

        <Alert title={translate('worker.sync.pendingActions', 'fr')} tone="accent">
          Le mode hors ligne reste visible pendant toute la route et les preuves sont rejouées dans
          l'ordre.
        </Alert>

        <Card elevated>
          <div className="card-header">
            <h2>Prochaine visite</h2>
            <Badge>9:00</Badge>
          </div>
          <ListItem
            after={<Badge tone="success">100 m GPS</Badge>}
            description="Repère: portail bleu, pharmacie à côté"
            title="Ama K., Adidogomé"
          />
          <Button fullWidth>Heading to subscriber</Button>
        </Card>

        <Card>
          <div className="card-header">
            <h2>Lifecycle offline-first</h2>
            <Badge>{routeSteps.length} steps</Badge>
          </div>
          <div className="route-steps" aria-label="Worker route lifecycle">
            {routeSteps.map((step, index) => (
              <div className="route-step" key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Tabs
            tabs={[
              { active: true, label: "Aujourd'hui" },
              { label: 'Planning' },
              { label: 'Gains' },
            ]}
          />
          <div className="surface-grid" aria-label="Worker app surfaces">
            {workerSurfaces.map((surface) => (
              <span key={surface}>{surface}</span>
            ))}
          </div>
        </Card>
      </main>
      <BottomNav
        items={[
          { active: true, href: '#today', label: "Aujourd'hui" },
          { href: '#planning', label: 'Planning' },
          { href: '#earnings', label: 'Gains' },
          { href: '#profile', label: 'Profil' },
        ]}
      />
    </WashedThemeProvider>
  );
}
