import { useMemo, useState } from 'react';

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
import { formatVisitDate, formatXof, translate, type WashedLocale } from '@washed/i18n';
import type { ReactElement } from 'react';

const subscriberScreens = [
  'Splash',
  'Phone',
  'OTP',
  'Address',
  'Tier',
  'Schedule',
  'Payment',
  'Confirm',
  'Home',
  'En-route map',
  'Rating',
  'Dispute',
  'Messages',
  'Subscription',
  'Profile',
  'Privacy',
] as const;

const visitStates = ['Scheduled', 'En route', 'Arrived', 'In progress', 'Completed'] as const;

export function App(): ReactElement {
  const [locale, setLocale] = useState<WashedLocale>('fr');
  const nextVisit = useMemo(() => formatVisitDate('2026-05-05T09:00:00.000Z', locale), [locale]);

  return (
    <WashedThemeProvider className="app-frame" theme="subscriber">
      <main className="subscriber-shell">
        <section className="hero-panel" aria-labelledby="subscriber-title">
          <div>
            <Badge>Closed beta shell</Badge>
            <h1 id="subscriber-title">{translate('app.name', locale)}</h1>
            <p>
              In-home laundry subscriptions for Lomé households, with bounded tracking, support,
              billing, privacy, and visit controls prepared for production.
            </p>
          </div>
          <Button
            aria-label="Switch language"
            onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
            variant="secondary"
          >
            {locale === 'fr' ? 'EN' : 'FR'}
          </Button>
        </section>

        <Card className="visit-card" elevated>
          <div className="card-header">
            <div>
              <span className="eyebrow">{translate('subscriber.home.nextVisit', locale)}</span>
              <h2>{nextVisit}</h2>
            </div>
            <Badge tone="success">Assigned</Badge>
          </div>
          <ListItem
            after={<Badge tone="accent">9-11</Badge>}
            description="Akouvi, Cellule Adidogomé"
            title="Washerwoman confirmed"
          />
          <ListItem
            after={<Badge>{formatXof(4500, locale)}</Badge>}
            description="Mobile-money recovery remains platform-controlled"
            title={translate('subscriber.subscription.price', locale)}
          />
          <Alert title="Bounded tracking" tone="primary">
            The map appears only after the worker taps Heading to subscriber and stops at check-in.
          </Alert>
        </Card>

        <Card>
          <div className="card-header">
            <h2>Production route inventory</h2>
            <Badge>{subscriberScreens.length}+ surfaces</Badge>
          </div>
          <Tabs
            tabs={[{ active: true, label: 'Core' }, { label: 'Billing' }, { label: 'Privacy' }]}
          />
          <div className="screen-grid" aria-label="Subscriber screen inventory">
            {subscriberScreens.map((screen) => (
              <span key={screen}>{screen}</span>
            ))}
          </div>
        </Card>

        <Card>
          <div className="card-header">
            <h2>Visit states</h2>
            <Badge tone="muted">Home-ready</Badge>
          </div>
          <div className="timeline">
            {visitStates.map((state, index) => (
              <div className="timeline-step" key={state}>
                <span>{index + 1}</span>
                <strong>{state}</strong>
              </div>
            ))}
          </div>
        </Card>
      </main>
      <BottomNav
        items={[
          { active: true, href: '#home', label: 'Home' },
          { href: '#subscription', label: 'Subscription' },
          { href: '#messages', label: 'Messages' },
          { href: '#profile', label: 'Profile' },
        ]}
      />
    </WashedThemeProvider>
  );
}
