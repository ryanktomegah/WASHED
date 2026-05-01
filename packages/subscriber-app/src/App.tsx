import { useMemo, useState } from 'react';

import {
  Alert,
  Badge,
  BottomNav,
  Button,
  Card,
  EmptyState,
  ListItem,
  Tabs,
  TextField,
  WashedThemeProvider,
} from '@washed/ui';
import { formatVisitDate, formatXof, translate, type WashedLocale } from '@washed/i18n';
import type { ReactElement, ReactNode } from 'react';

import {
  copy,
  onboardingSteps,
  subscriberSurfaceGroups,
  visitTimeline,
  type AppRoute,
  type VisitStage,
} from './appData.js';

const navOrder = [
  'home',
  'subscription',
  'support',
  'profile',
] as const satisfies readonly AppRoute[];

export function App(): ReactElement {
  const [locale, setLocale] = useState<WashedLocale>('fr');
  const [route, setRoute] = useState<AppRoute>('home');
  const [activeGroup, setActiveGroup] = useState<string>(subscriberSurfaceGroups[0].label);
  const [visitStage, setVisitStage] = useState<VisitStage>('scheduled');
  const t = copy[locale];

  const currentGroup = useMemo(
    () =>
      subscriberSurfaceGroups.find((group) => group.label === activeGroup) ??
      subscriberSurfaceGroups[0],
    [activeGroup],
  );

  const toggleLocale = (): void => {
    setLocale((currentLocale) => (currentLocale === 'fr' ? 'en' : 'fr'));
  };

  return (
    <WashedThemeProvider className="app-frame" theme="subscriber">
      <div className="status-spacer" />
      <header className="app-header">
        <button className="brand-button" onClick={() => setRoute('home')} type="button">
          <span>{translate('app.name', locale)}</span>
          <small>Beta Lomé</small>
        </button>
        <Button aria-label="Switch language" onClick={toggleLocale} size="sm" variant="secondary">
          {locale === 'fr' ? 'EN' : 'FR'}
        </Button>
      </header>

      <main className="subscriber-shell">
        {route === 'home' ? (
          <HomeScreen
            activeGroup={activeGroup}
            currentGroup={currentGroup}
            locale={locale}
            onGroupChange={setActiveGroup}
            onRouteChange={setRoute}
            onVisitStageChange={setVisitStage}
            t={t}
            visitStage={visitStage}
          />
        ) : null}
        {route === 'onboarding' ? (
          <OnboardingScreen locale={locale} onRouteChange={setRoute} t={t} />
        ) : null}
        {route === 'subscription' ? (
          <SubscriptionScreen locale={locale} onRouteChange={setRoute} t={t} />
        ) : null}
        {route === 'support' ? <SupportScreen onRouteChange={setRoute} t={t} /> : null}
        {route === 'profile' ? (
          <ProfileScreen locale={locale} onRouteChange={setRoute} t={t} />
        ) : null}
      </main>

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

function HomeScreen({
  activeGroup,
  currentGroup,
  locale,
  onGroupChange,
  onRouteChange,
  onVisitStageChange,
  t,
  visitStage,
}: {
  readonly activeGroup: string;
  readonly currentGroup: (typeof subscriberSurfaceGroups)[number];
  readonly locale: WashedLocale;
  readonly onGroupChange: (group: string) => void;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly onVisitStageChange: (stage: VisitStage) => void;
  readonly t: (typeof copy)[WashedLocale];
  readonly visitStage: VisitStage;
}): ReactElement {
  const nextVisit = formatVisitDate('2026-05-05T09:00:00.000Z', locale);
  const trackingIsVisible = visitStage === 'enRoute';

  return (
    <>
      <section className="home-summary" aria-labelledby="subscriber-home-title">
        <div>
          <Badge tone="success">{t.home.greeting}</Badge>
          <h1 id="subscriber-home-title">{nextVisit}</h1>
          <p>{t.home.hero}</p>
        </div>
        <div className="setup-cta">
          <Button onClick={() => onRouteChange('onboarding')} size="sm" variant="secondary">
            {t.onboarding.start}
          </Button>
          <small>{t.home.setupNote}</small>
        </div>
      </section>

      <Card className="visit-card" elevated>
        <div className="card-header">
          <div>
            <span className="eyebrow">{t.home.nextVisit}</span>
            <h2>{nextVisit}</h2>
          </div>
          <Badge tone="success">{t.home.assigned}</Badge>
        </div>

        <ListItem
          after={<Badge tone="accent">9-11</Badge>}
          description="Akouvi, Cellule Adidogomé"
          title={t.home.washerConfirmed}
        />
        <ListItem
          after={<Badge>{formatXof(4500, locale)}</Badge>}
          description={t.subscription.priceNote}
          title={t.home.price}
        />

        <div className="visit-actions" aria-label={t.home.visitControls}>
          <Button onClick={() => onVisitStageChange('enRoute')} size="sm" variant="secondary">
            {t.action.startTracking}
          </Button>
          <Button onClick={() => onVisitStageChange('scheduled')} size="sm" variant="ghost">
            {t.action.stopTracking}
          </Button>
          <Button onClick={() => onRouteChange('support')} size="sm" variant="ghost">
            {t.action.openSupport}
          </Button>
        </div>

        {trackingIsVisible ? (
          <BoundedTrackingMap onArrive={() => onVisitStageChange('arrived')} t={t} />
        ) : (
          <Alert title={t.home.boundedTrackingTitle} tone="primary">
            {t.home.boundedTrackingBody}
          </Alert>
        )}
      </Card>

      <Card>
        <div className="card-header">
          <h2>{t.home.routeInventory}</h2>
          <Badge>{t.home.surfaceCount}</Badge>
        </div>
        <Tabs
          tabs={subscriberSurfaceGroups.map((group) => ({
            active: group.label === activeGroup,
            label: group.label,
            onClick: () => onGroupChange(group.label),
          }))}
        />
        <div className="screen-grid" aria-label="Subscriber screen inventory">
          {currentGroup.screens.map((screen) => (
            <span key={screen}>{screen}</span>
          ))}
        </div>
      </Card>

      <Card>
        <div className="card-header">
          <h2>{t.home.visitControls}</h2>
          <Badge tone={visitStage === 'scheduled' ? 'muted' : 'success'}>
            {t.visitStage[visitStage]}
          </Badge>
        </div>
        <div className="timeline">
          {visitTimeline.map((stage, index) => (
            <button
              aria-pressed={stage === visitStage}
              className="timeline-step"
              key={stage}
              onClick={() => onVisitStageChange(stage)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{t.visitStage[stage]}</strong>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

function OnboardingScreen({
  locale,
  onRouteChange,
  t,
}: {
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly t: (typeof copy)[WashedLocale];
}): ReactElement {
  return (
    <ScreenFrame
      action={
        <Button onClick={() => onRouteChange('home')} variant="primary">
          {translate('common.done', locale)}
        </Button>
      }
      eyebrow="C1"
      title={t.onboarding.title}
    >
      <div className="progress-rail" aria-label="Onboarding steps">
        {onboardingSteps.map((step, index) => (
          <div className="progress-step" key={step}>
            <span>{index + 1}</span>
            <strong>{t.onboarding[step]}</strong>
          </div>
        ))}
      </div>

      <Card>
        <div className="form-stack">
          <TextField
            defaultValue="+228 90 00 00 00"
            inputMode="tel"
            label={t.onboarding.phone}
            placeholder="+228"
          />
          <TextField defaultValue="Adidogomé, près du carrefour" label={t.onboarding.address} />
          <ListItem
            after={<Badge>{formatXof(4500, locale)}</Badge>}
            description="T2 · Mardi matin · 9-11"
            title={`${t.onboarding.tier} + ${t.onboarding.schedule}`}
          />
          <Alert title={t.onboarding.payment} tone="accent">
            Mobile money is captured during signup but recovery remains platform-controlled.
          </Alert>
        </div>
      </Card>
    </ScreenFrame>
  );
}

function SubscriptionScreen({
  locale,
  onRouteChange,
  t,
}: {
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly t: (typeof copy)[WashedLocale];
}): ReactElement {
  return (
    <ScreenFrame
      action={
        <Button onClick={() => onRouteChange('support')} variant="secondary">
          {t.action.openSupport}
        </Button>
      }
      eyebrow="Billing"
      title={t.subscription.title}
    >
      <Card elevated>
        <ListItem
          after={<Badge>{formatXof(4500, locale)}</Badge>}
          description={t.subscription.priceNote}
          title={t.subscription.tier}
        />
        <ActionGrid
          items={[
            { label: t.action.changeTier, tone: 'primary' },
            { label: t.action.requestSwap, note: t.subscription.swapLimit, tone: 'primary' },
            { label: t.action.skipVisit, tone: 'accent' },
            { label: t.action.reschedule, tone: 'accent' },
          ]}
        />
      </Card>

      <Card>
        <ListItem description="Mai 2026 · 4 500 FCFA" title={t.subscription.billing} />
        <ListItem description="Avant / après, note, réclamation" title={t.subscription.history} />
        <Alert title={t.action.recoverPayment} tone="danger">
          A failed payment opens a recovery screen before the next scheduled visit.
        </Alert>
        <Button fullWidth variant="danger">
          {t.subscription.cancel}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function SupportScreen({
  onRouteChange,
  t,
}: {
  readonly onRouteChange: (route: AppRoute) => void;
  readonly t: (typeof copy)[WashedLocale];
}): ReactElement {
  return (
    <ScreenFrame
      action={
        <Button onClick={() => onRouteChange('home')} variant="secondary">
          {t.nav.home}
        </Button>
      }
      eyebrow="Care"
      title={t.support.title}
    >
      <Card elevated>
        <ListItem
          after={<Badge tone="success">2</Badge>}
          description="Akouvi est confirmée pour mardi 9-11."
          title={t.support.inbox}
        />
        <ListItem
          description="No direct chat in v1; operators mediate every thread."
          title={t.support.messages}
        />
        <ListItem
          description="Push history, unread state, outage notices."
          title={t.support.notificationCenter}
        />
      </Card>

      <EmptyState
        action={<Button variant="danger">{t.support.dispute}</Button>}
        description="Use for missed visit, damaged clothes, payment mismatch, or safety concerns."
        title={t.support.dispute}
      />
    </ScreenFrame>
  );
}

function ProfileScreen({
  locale,
  onRouteChange,
  t,
}: {
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly t: (typeof copy)[WashedLocale];
}): ReactElement {
  return (
    <ScreenFrame
      action={
        <Button onClick={() => onRouteChange('onboarding')} variant="secondary">
          {t.nav.onboarding}
        </Button>
      }
      eyebrow="Account"
      title={t.profile.title}
    >
      <Card elevated>
        <ListItem description="+228 90 00 00 00" title={t.profile.account} />
        <ListItem
          after={<Badge>{locale.toUpperCase()}</Badge>}
          description="FR / EN"
          title={t.onboarding.language}
        />
        <ListItem description="ToS, Privacy Policy, Help / FAQ" title={t.profile.legal} />
      </Card>

      <Card>
        <div className="card-header">
          <h2>{t.profile.privacy}</h2>
          <Badge tone="muted">GDPR-ready</Badge>
        </div>
        <ActionGrid
          items={[
            { label: t.profile.exportData, tone: 'primary' },
            { label: t.profile.erasure, tone: 'accent' },
            { label: t.profile.deleteAccount, tone: 'danger' },
            { label: t.profile.maintenance, tone: 'primary' },
          ]}
        />
      </Card>
    </ScreenFrame>
  );
}

function BoundedTrackingMap({
  onArrive,
  t,
}: {
  readonly onArrive: () => void;
  readonly t: (typeof copy)[WashedLocale];
}): ReactElement {
  return (
    <div className="tracking-panel" aria-label="Bounded live map">
      <div className="map-grid">
        <span className="map-dot worker-dot" />
        <span className="map-dot home-dot" />
        <span className="map-route" />
      </div>
      <div className="tracking-copy">
        <Badge tone="success">{t.visitStage.enRoute}</Badge>
        <strong>Akouvi · 12 min</strong>
        <span>{t.home.boundedTrackingBody}</span>
        <Button onClick={onArrive} size="sm" variant="secondary">
          {t.visitStage.arrived}
        </Button>
      </div>
    </div>
  );
}

function ScreenFrame({
  action,
  children,
  eyebrow,
  title,
}: {
  readonly action: ReactNode;
  readonly children: ReactNode;
  readonly eyebrow: string;
  readonly title: string;
}): ReactElement {
  return (
    <>
      <section className="section-title">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        {action}
      </section>
      {children}
    </>
  );
}

function ActionGrid({
  items,
}: {
  readonly items: readonly {
    readonly label: string;
    readonly note?: string;
    readonly tone: 'accent' | 'danger' | 'primary';
  }[];
}): ReactElement {
  return (
    <div className="action-grid">
      {items.map((item) => (
        <button className={`action-tile action-tile-${item.tone}`} key={item.label} type="button">
          <strong>{item.label}</strong>
          {item.note === undefined ? null : <span>{item.note}</span>}
        </button>
      ))}
    </div>
  );
}
