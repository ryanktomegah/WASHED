import { useMemo, useReducer, useState } from 'react';

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
import type { Dispatch, ReactElement, ReactNode } from 'react';

import {
  copy,
  onboardingSteps,
  subscriberSurfaceGroups,
  visitTimeline,
  type AppRoute,
  type LocalizedCopy,
} from './appData.js';
import {
  initialSubscriberState,
  subscriberReducer,
  type SubscriberAction,
  type SubscriberState,
} from './subscriberState.js';

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
  const [subscriberState, dispatch] = useReducer(subscriberReducer, initialSubscriberState);
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
        {subscriberState.lastFeedback === null ? null : (
          <Alert className="feedback-banner" tone="success">
            {t.feedback[subscriberState.lastFeedback]}
          </Alert>
        )}
        {route === 'home' ? (
          <HomeScreen
            activeGroup={activeGroup}
            currentGroup={currentGroup}
            dispatch={dispatch}
            locale={locale}
            onGroupChange={setActiveGroup}
            onRouteChange={setRoute}
            subscriberState={subscriberState}
            t={t}
          />
        ) : null}
        {route === 'onboarding' ? (
          <OnboardingScreen locale={locale} onRouteChange={setRoute} t={t} />
        ) : null}
        {route === 'subscription' ? (
          <SubscriptionScreen
            dispatch={dispatch}
            locale={locale}
            onRouteChange={setRoute}
            subscriberState={subscriberState}
            t={t}
          />
        ) : null}
        {route === 'support' ? (
          <SupportScreen onRouteChange={setRoute} subscriberState={subscriberState} t={t} />
        ) : null}
        {route === 'profile' ? (
          <ProfileScreen dispatch={dispatch} locale={locale} onRouteChange={setRoute} t={t} />
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
  dispatch,
  locale,
  onGroupChange,
  onRouteChange,
  subscriberState,
  t,
}: {
  readonly activeGroup: string;
  readonly currentGroup: (typeof subscriberSurfaceGroups)[number];
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly onGroupChange: (group: string) => void;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const nextVisit = formatVisitDate(subscriberState.nextVisit.startsAt, locale);
  const trackingIsVisible = subscriberState.nextVisit.stage === 'enRoute';

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
          after={<Badge tone="accent">{subscriberState.nextVisit.window}</Badge>}
          description={`${subscriberState.nextVisit.workerName}, ${subscriberState.nextVisit.cell}`}
          title={t.home.washerConfirmed}
        />
        <ListItem
          after={<Badge>{formatXof(subscriberState.subscription.monthlyPriceXof, locale)}</Badge>}
          description={t.subscription.priceNote}
          title={t.home.price}
        />

        <div className="visit-actions" aria-label={t.home.visitControls}>
          <Button
            onClick={() => dispatch({ type: 'visit/startTracking' })}
            size="sm"
            variant="secondary"
          >
            {t.action.startTracking}
          </Button>
          <Button
            onClick={() => dispatch({ type: 'visit/stopTracking' })}
            size="sm"
            variant="ghost"
          >
            {t.action.stopTracking}
          </Button>
          <Button onClick={() => onRouteChange('support')} size="sm" variant="ghost">
            {t.action.openSupport}
          </Button>
        </div>

        {trackingIsVisible ? (
          <BoundedTrackingMap onArrive={() => dispatch({ type: 'visit/arrive' })} t={t} />
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
          <Badge tone={subscriberState.nextVisit.stage === 'scheduled' ? 'muted' : 'success'}>
            {t.visitStage[subscriberState.nextVisit.stage]}
          </Badge>
        </div>
        <div className="timeline">
          {visitTimeline.map((stage, index) => (
            <button
              aria-label={t.visitStage[stage]}
              aria-pressed={stage === subscriberState.nextVisit.stage}
              className="timeline-step"
              key={stage}
              onClick={() =>
                dispatch(
                  stage === 'enRoute'
                    ? { type: 'visit/startTracking' }
                    : stage === 'arrived'
                      ? { type: 'visit/arrive' }
                      : stage === 'inProgress'
                        ? { type: 'visit/startProgress' }
                        : { type: 'visit/stopTracking' },
                )
              }
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
  readonly t: LocalizedCopy;
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
  dispatch,
  locale,
  onRouteChange,
  subscriberState,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const price = subscriberState.subscription.monthlyPriceXof;
  const tier = `${subscriberState.subscription.tier} · ${formatXof(price, locale)}`;

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
          after={<Badge>{formatXof(price, locale)}</Badge>}
          description={t.subscription.priceNote}
          title={tier}
        />
        <ActionGrid
          items={[
            {
              label: t.action.changeTier,
              onClick: () => dispatch({ type: 'subscription/changeTier' }),
              tone: 'primary',
            },
            {
              label: t.action.requestSwap,
              note: `${subscriberState.subscription.swapCreditsRemaining} / 2`,
              onClick: () => dispatch({ type: 'subscription/requestSwap' }),
              tone: 'primary',
            },
            {
              label: t.action.skipVisit,
              note: `${subscriberState.subscription.skipCreditsRemaining} / 2`,
              onClick: () => dispatch({ type: 'visit/skip' }),
              tone: 'accent',
            },
            {
              label: t.action.reschedule,
              onClick: () => dispatch({ type: 'visit/reschedule' }),
              tone: 'accent',
            },
          ]}
        />
      </Card>

      <Card>
        <ListItem
          description={`Mai 2026 · ${formatXof(price, locale)} · ${
            t.paymentStatus[subscriberState.subscription.paymentStatus]
          }`}
          title={t.subscription.billing}
        />
        <ListItem description="Avant / après, note, réclamation" title={t.subscription.history} />
        <Alert title={t.action.recoverPayment} tone="danger">
          A failed payment opens a recovery screen before the next scheduled visit.
        </Alert>
        <Button fullWidth onClick={() => dispatch({ type: 'payment/recover' })} variant="secondary">
          {t.action.recoverPayment}
        </Button>
        <Button
          fullWidth
          onClick={() => dispatch({ type: 'subscription/cancel' })}
          variant="danger"
        >
          {t.subscription.cancel}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function SupportScreen({
  onRouteChange,
  subscriberState,
  t,
}: {
  readonly onRouteChange: (route: AppRoute) => void;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
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
          after={<Badge tone="success">{subscriberState.inboxUnread}</Badge>}
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
  dispatch,
  locale,
  onRouteChange,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly t: LocalizedCopy;
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
            {
              label: t.profile.exportData,
              onClick: () => dispatch({ type: 'privacy/export' }),
              tone: 'primary',
            },
            {
              label: t.profile.erasure,
              onClick: () => dispatch({ type: 'privacy/erasure' }),
              tone: 'accent',
            },
            {
              label: t.profile.deleteAccount,
              onClick: () => dispatch({ type: 'subscription/cancel' }),
              tone: 'danger',
            },
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
  readonly t: LocalizedCopy;
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
        <Button
          aria-label={t.action.confirmArrival}
          onClick={onArrive}
          size="sm"
          variant="secondary"
        >
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
    readonly onClick?: () => void;
    readonly tone: 'accent' | 'danger' | 'primary';
  }[];
}): ReactElement {
  return (
    <div className="action-grid">
      {items.map((item) => (
        <button
          aria-label={item.note === undefined ? item.label : `${item.label} ${item.note}`}
          className={`action-tile action-tile-${item.tone}`}
          key={item.label}
          onClick={item.onClick}
          type="button"
        >
          <strong>{item.label}</strong>
          {item.note === undefined ? null : <span>{item.note}</span>}
        </button>
      ))}
    </div>
  );
}
