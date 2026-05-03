import { useEffect, useReducer, useState } from 'react';

import {
  Alert,
  Badge,
  BottomNav,
  Button,
  Card,
  ListItem,
  TextField,
  WashedThemeProvider,
} from '@washed/ui';
import { formatVisitDate, formatXof, translate, type WashedLocale } from '@washed/i18n';
import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  CircleAlert,
  ClipboardList,
  Clock3,
  FileText,
  Home,
  House,
  Languages,
  MapPinned,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Star,
  ArrowRight,
  UserRound,
  WalletCards,
} from 'lucide-react';
import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  ReactElement,
  ReactNode,
} from 'react';

import {
  copy,
  onboardingSteps,
  type AppRoute,
  type LocalizedCopy,
  type PrimaryAppRoute,
  type SubscriberSheet,
  type SupportIssueKind,
} from './appData.js';
import {
  initialSubscriberState,
  subscriberReducer,
  type SubscriberAction,
  type SubscriberFeedback,
  type SubscriberState,
} from './subscriberState.js';
import {
  buildSubscriberPipeline,
  type SubscriberMessageKind,
  type SubscriberPipeline,
} from './subscriberPipeline.js';

const navOrder = [
  'home',
  'subscription',
  'support',
  'profile',
] as const satisfies readonly PrimaryAppRoute[];

const navIcons = {
  home: <House aria-hidden="true" size={18} strokeWidth={2.25} />,
  profile: <UserRound aria-hidden="true" size={18} strokeWidth={2.25} />,
  subscription: <ClipboardList aria-hidden="true" size={18} strokeWidth={2.25} />,
  support: <MessageCircle aria-hidden="true" size={18} strokeWidth={2.25} />,
} as const satisfies Record<PrimaryAppRoute, ReactNode>;

const supportIssueOrder = [
  'missed_visit',
  'quality',
  'damaged_item',
  'payment',
  'safety',
  'other',
] as const satisfies readonly SupportIssueKind[];

export function App(): ReactElement {
  const [locale, setLocale] = useState<WashedLocale>('fr');
  const [route, setRoute] = useState<AppRoute>('home');
  const [subscriberState, dispatch] = useReducer(subscriberReducer, initialSubscriberState);
  const [activeSheet, setActiveSheet] = useState<SubscriberSheet | null>(null);
  const [activeMessage, setActiveMessage] = useState<SubscriberMessageKind | null>(null);
  const [visibleFeedback, setVisibleFeedback] = useState<SubscriberFeedback | null>(null);
  const [supportIssue, setSupportIssue] = useState<SupportIssueKind>('quality');
  const t = copy[locale];
  const pipeline = buildSubscriberPipeline(subscriberState);

  const openSheet = (sheet: SubscriberSheet, issue?: SupportIssueKind): void => {
    if (issue !== undefined) {
      setSupportIssue(issue);
    }

    setActiveSheet(sheet);
  };

  const confirmSheet = (): void => {
    if (activeSheet === null) return;

    const actionBySheet = {
      accountDelete: { type: 'account/delete' },
      cancel: { type: 'subscription/cancel' },
      dispute: { type: 'visit/dispute' },
      orderWash: { type: 'order/wash' },
      paymentRecovery: { type: 'payment/recover' },
      privacyErasure: { type: 'privacy/erasure' },
      privacyExport: { type: 'privacy/export' },
      rating: { type: 'visit/rate' },
      reschedule: { type: 'visit/reschedule' },
      skip: { type: 'visit/skip' },
      workerSwap: { type: 'subscription/requestSwap' },
    } as const satisfies Record<SubscriberSheet, SubscriberAction>;

    dispatch(actionBySheet[activeSheet]);
    setActiveSheet(null);
  };

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.subscriber-shell');

    if (shell !== null) {
      shell.scrollTop = 0;
    }
  }, [route]);

  useEffect(() => {
    if (subscriberState.lastFeedback === null) return;

    setVisibleFeedback(subscriberState.lastFeedback);
    const timeout = window.setTimeout(() => setVisibleFeedback(null), 4200);

    return () => window.clearTimeout(timeout);
  }, [subscriberState.lastFeedback]);

  return (
    <WashedThemeProvider className="app-frame" theme="worker">
      <div className="phone-shell">
        <main className="subscriber-shell">
          {visibleFeedback === null ? null : (
            <div className="feedback-toast" role="status">
              <span>{t.feedback[visibleFeedback]}</span>
              <button
                aria-label={t.action.close}
                onClick={() => setVisibleFeedback(null)}
                type="button"
              >
                {t.action.close}
              </button>
            </div>
          )}
          {route === 'home' ? (
            <HomeScreen
              locale={locale}
              onRouteChange={setRoute}
              onSheetOpen={openSheet}
              pipeline={pipeline}
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
              onSheetOpen={openSheet}
              pipeline={pipeline}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'support' ? (
            <SupportScreen
              onMessageOpen={setActiveMessage}
              onRouteChange={setRoute}
              onSheetOpen={openSheet}
              pipeline={pipeline}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'profile' ? (
            <ProfileScreen
              locale={locale}
              onLocaleChange={setLocale}
              onRouteChange={setRoute}
              onSheetOpen={openSheet}
              t={t}
            />
          ) : null}
          {route === 'visit' ? (
            <VisitDetailScreen
              dispatch={dispatch}
              locale={locale}
              onRouteChange={setRoute}
              onSheetOpen={openSheet}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'inbox' ? (
            <InboxScreen
              onMessageOpen={setActiveMessage}
              pipeline={pipeline}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'billing' ? (
            <BillingScreen
              locale={locale}
              onSheetOpen={openSheet}
              pipeline={pipeline}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'paymentRecovery' ? (
            <PaymentRecoveryScreen
              locale={locale}
              onSheetOpen={openSheet}
              pipeline={pipeline}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'legal' ? <LegalScreen onSheetOpen={openSheet} t={t} /> : null}
          {route === 'accountRecovery' ? <AccountRecoveryScreen t={t} /> : null}
        </main>

        <BottomNav
          className="bottom-nav"
          items={navOrder.map((navRoute) => ({
            active: route === navRoute,
            icon: navIcons[navRoute],
            label: t.nav[navRoute],
            onClick: () => setRoute(navRoute),
          }))}
        />

        {activeSheet === null ? null : (
          <ConfirmationSheet
            activeSheet={activeSheet}
            onClose={() => setActiveSheet(null)}
            onConfirm={confirmSheet}
            onIssueChange={setSupportIssue}
            supportIssue={supportIssue}
            t={t}
          />
        )}
        {activeMessage === null ? null : (
          <MessageDetailSheet
            message={activeMessage}
            onClose={() => setActiveMessage(null)}
            onRouteChange={setRoute}
            onSheetOpen={openSheet}
            pipeline={pipeline}
            t={t}
          />
        )}
      </div>
    </WashedThemeProvider>
  );
}

function HomeScreen({
  locale,
  onRouteChange,
  onSheetOpen,
  pipeline,
  subscriberState,
  t,
}: {
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly onSheetOpen: (sheet: SubscriberSheet, issue?: SupportIssueKind) => void;
  readonly pipeline: SubscriberPipeline;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const nextVisit = formatVisitDate(subscriberState.nextVisit.startsAt, locale);
  const trackingIsVisible = subscriberState.nextVisit.stage === 'enRoute';
  const isFrench = locale === 'fr';
  const nextVisitWindow = isFrench
    ? pipeline.visitPlan.nextVisits[0]?.windowFr
    : pipeline.visitPlan.nextVisits[0]?.windowEn;
  const paymentNeedsAttention = pipeline.homeIntent === 'paymentRecovery';
  const statusCopy = isFrench
    ? `Abonnement actif · ${subscriberState.subscription.tier} · ${
        paymentNeedsAttention ? 'paiement à régulariser' : 'paiement à jour'
      }`
    : `Active plan · ${subscriberState.subscription.tier} · ${
        paymentNeedsAttention ? 'payment needs attention' : 'payment current'
      }`;
  const preparationSummary = paymentNeedsAttention
    ? isFrench
      ? 'Paiement · savon · eau · accès'
      : 'Payment · soap · water · access'
    : isFrench
      ? 'Savon · eau · bassine · accès'
      : 'Soap · water · basin · access';
  const readinessItems = [
    {
      detail: paymentNeedsAttention
        ? isFrench
          ? pipeline.billing.nextRetryLabelFr
          : pipeline.billing.nextRetryLabelEn
        : isFrench
          ? 'Aucun blocage de facturation'
          : 'No billing block',
      done: !paymentNeedsAttention,
      label: paymentNeedsAttention
        ? isFrench
          ? 'Paiement'
          : 'Payment'
        : isFrench
          ? 'Paiement à jour'
          : 'Payment current',
    },
    {
      detail: isFrench ? 'Akouvi Koffi est assignée' : 'Akouvi Koffi is assigned',
      done: true,
      label: isFrench ? 'Laveuse confirmée' : 'Washerwoman confirmed',
    },
    {
      detail: isFrench ? 'Accès et préférences attachés' : 'Access and preferences attached',
      done: true,
      label: isFrench ? 'Consignes envoyées' : 'Notes sent',
    },
    {
      detail: isFrench ? 'Notification prévue avant mardi' : 'Reminder scheduled before Tuesday',
      done: true,
      label: isFrench ? 'Rappel programmé' : 'Reminder scheduled',
    },
  ];

  useEffect(() => {
    setReadinessExpanded(false);

    const readinessTimeout = window.setTimeout(() => setReadinessExpanded(false), 120000);

    return () => {
      window.clearTimeout(readinessTimeout);
    };
  }, [subscriberState.nextVisit.startsAt, subscriberState.subscription.paymentStatus]);

  const handlePrepareVisit = (): void => {
    setReadinessExpanded(true);
  };

  return (
    <>
      <section className="subscriber-greeting" aria-labelledby="subscriber-home-title">
        <div>
          <span>{isFrench ? 'Bonjour,' : 'Hello,'}</span>
          <h1 id="subscriber-home-title">Essi Agbodzan</h1>
          <p className="home-status-pill">{statusCopy}</p>
        </div>
        <div className="subscriber-greeting-actions">
          <button aria-label={t.nav.inbox} onClick={() => onRouteChange('inbox')} type="button">
            <Bell aria-hidden="true" size={16} strokeWidth={2.35} />
            <span className="notification-count">{subscriberState.inboxUnread}</span>
          </button>
          <button
            aria-label={isFrench ? 'Ouvrir le profil Essi' : 'Open Essi profile'}
            onClick={() => onRouteChange('profile')}
            type="button"
          >
            EA
          </button>
        </div>
      </section>

      <section className="home-hero-card home-hero-card-premium" aria-label={t.home.nextVisit}>
        <div className="hero-card-topline">
          <Badge>{isFrench ? 'PROCHAINE VISITE' : 'NEXT VISIT'}</Badge>
          <span>{isFrench ? 'Adidogomé' : 'Adidogome'}</span>
        </div>
        <div className="hero-date-block">
          <h2>{nextVisit}</h2>
          <span>
            <Clock3 aria-hidden="true" size={15} strokeWidth={2.35} />
            {nextVisitWindow}
          </span>
        </div>
        <div className="hero-worker-row">
          <div className="worker-avatar" aria-hidden="true">
            AK
          </div>
          <div>
            <strong>Akouvi Koffi</strong>
            <span>{isFrench ? 'Votre laveuse' : 'Your washerwoman'} · ★ 4.9</span>
          </div>
          <span className="ok-pill">
            <Check aria-hidden="true" size={12} strokeWidth={3} />
            {isFrench ? 'Confirmée' : 'Confirmed'}
          </span>
        </div>
        <div className="hero-actions">
          <SwipePrepareAction isFrench={isFrench} onComplete={handlePrepareVisit} />
        </div>
      </section>

      <section className="home-prep-card" aria-label={isFrench ? 'À préparer' : 'To prepare'}>
        <span>
          <strong>{isFrench ? 'À préparer avant mardi' : 'Prepare before Tuesday'}</strong>
          <small>{preparationSummary}</small>
        </span>
        <button
          onClick={() =>
            paymentNeedsAttention ? onSheetOpen('paymentRecovery') : setReadinessExpanded(true)
          }
          type="button"
        >
          {paymentNeedsAttention
            ? isFrench
              ? 'Régulariser'
              : 'Recover'
            : isFrench
              ? 'Confirmer'
              : 'Confirm'}
        </button>
      </section>

      {readinessExpanded ? (
        <section
          className={`visit-readiness-panel home-prep-details${
            paymentNeedsAttention ? ' has-pending-item' : ''
          } is-expanded`}
          aria-label={isFrench ? 'Préparation de la visite' : 'Visit readiness'}
        >
          <div className="readiness-heading">
            <strong>{isFrench ? 'Préparation de la visite' : 'Visit readiness'}</strong>
            {paymentNeedsAttention ? (
              <button onClick={() => onSheetOpen('paymentRecovery')} type="button">
                {isFrench ? 'Régulariser' : 'Recover'}
              </button>
            ) : null}
          </div>
          <ul className="visit-readiness-list">
            {readinessItems.map((item) => (
              <li className={item.done ? 'is-done' : 'is-pending'} key={item.label}>
                {item.done ? (
                  <Check aria-hidden="true" size={13} strokeWidth={3} />
                ) : (
                  <span className="readiness-dot" aria-hidden="true" />
                )}
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        className="home-action-strip"
        aria-label={isFrench ? 'Actions visite' : 'Visit actions'}
      >
        <button onClick={() => onSheetOpen('reschedule')} type="button">
          {isFrench ? 'Reporter' : 'Reschedule'}
        </button>
        <button onClick={() => onSheetOpen('skip')} type="button">
          {isFrench ? 'Sauter' : 'Skip'}
        </button>
        <button onClick={() => onRouteChange('support')} type="button">
          Support
        </button>
      </section>

      {trackingIsVisible ? (
        <section className="visit-status-card">
          <BoundedTrackingMap onArrive={() => onSheetOpen('rating')} t={t} />
        </section>
      ) : null}

      <section
        className="mini-calendar"
        aria-label={isFrench ? 'Visites à venir' : 'Upcoming visits'}
      >
        <div className="section-row">
          <strong>{isFrench ? 'Visites à venir' : 'Upcoming visits'}</strong>
          <button onClick={() => onRouteChange('subscription')} type="button">
            {isFrench ? 'Tout voir' : 'View all'}
          </button>
        </div>
        <div className="upcoming-visit-list">
          {pipeline.visitPlan.nextVisits.slice(1).map((visit, index) => (
            <button
              aria-current={index === 0 ? 'date' : undefined}
              key={visit.id}
              onClick={() => onRouteChange('visit')}
              type="button"
            >
              <span>
                <strong>{isFrench ? visit.dateFr : visit.dateEn}</strong>
                <small>{isFrench ? visit.windowFr : visit.windowEn}</small>
              </span>
              <em>{isFrench ? visit.labelFr : visit.labelEn}</em>
            </button>
          ))}
        </div>
      </section>

      <button
        className="home-extra-visit-card"
        onClick={() => onSheetOpen('orderWash')}
        type="button"
      >
        <span>
          <strong>{isFrench ? 'Besoin de plus ce mois-ci ?' : 'Need more this month?'}</strong>
          <small>{isFrench ? 'Ajouter une visite ponctuelle' : 'Add a one-time visit'}</small>
        </span>
        <em>{isFrench ? 'Ajouter' : 'Add'}</em>
      </button>
    </>
  );
}

function SwipePrepareAction({
  isFrench,
  onComplete,
}: {
  readonly isFrench: boolean;
  readonly onComplete: () => void;
}): ReactElement {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const label = isFrench ? 'Préparer ma visite' : 'Prepare my visit';
  const style = { '--swipe-progress': progress } as CSSProperties;

  const complete = (): void => {
    setProgress(1);
    onComplete();
    window.setTimeout(() => setProgress(0), 520);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    setDragStart(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (dragStart === null) {
      return;
    }

    const distance = Math.max(0, event.clientX - dragStart);
    setProgress(Math.min(1, distance / 150));
  };

  const handlePointerUp = (): void => {
    if (dragStart === null) {
      return;
    }

    const shouldComplete = progress >= 0.62;
    setDragStart(null);

    if (shouldComplete) {
      complete();
      return;
    }

    setProgress(0);
  };

  return (
    <button
      aria-label={label}
      className="swipe-prepare-action"
      onClick={complete}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={style}
      type="button"
    >
      <span className="swipe-prepare-fill" aria-hidden="true" />
      <strong>{label}</strong>
      <span className="swipe-prepare-thumb" aria-hidden="true">
        <ArrowRight size={18} strokeWidth={3} />
      </span>
    </button>
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
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<'T1' | 'T2'>('T2');
  const [selectedSchedule, setSelectedSchedule] = useState(
    locale === 'fr' ? 'Mardi · 9-11' : 'Tuesday · 9-11',
  );
  const currentStep = onboardingSteps[stepIndex] ?? 'language';
  const isLastStep = stepIndex === onboardingSteps.length - 1;
  const isFrench = locale === 'fr';

  const goNext = (): void => {
    if (isLastStep) {
      onRouteChange('home');
      return;
    }

    setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1));
  };

  return (
    <ScreenFrame
      action={
        <Badge tone="accent">
          {stepIndex + 1} / {onboardingSteps.length}
        </Badge>
      }
      eyebrow={isFrench ? 'Inscription' : 'Signup'}
      title={t.onboarding.title}
    >
      <Card className="onboarding-rail-card" elevated>
        <div className="onboarding-progress" aria-label="Onboarding steps">
          {onboardingSteps.map((step, index) => (
            <button
              aria-current={index === stepIndex ? 'step' : undefined}
              className="onboarding-step-pill"
              key={step}
              onClick={() => setStepIndex(index)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{t.onboarding[step]}</strong>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="onboarding-panel">
          <div>
            <span className="eyebrow">
              {isFrench ? 'Étape' : 'Step'} {stepIndex + 1}
            </span>
            <h2>{t.onboarding[currentStep]}</h2>
            <p className="onboarding-step-copy">
              {isFrench
                ? 'Une information à la fois, pour garder l’inscription claire.'
                : 'One detail at a time, so setup stays clear.'}
            </p>
          </div>

          {currentStep === 'language' ? (
            <div className="choice-grid" aria-label={t.onboarding.language}>
              {['Français', 'English'].map((language) => (
                <button
                  aria-pressed={
                    (locale === 'fr' && language === 'Français') ||
                    (locale === 'en' && language === 'English')
                  }
                  className="choice-card"
                  key={language}
                  type="button"
                >
                  <strong>{language}</strong>
                  <span>
                    {isFrench ? 'Modifiable depuis le profil.' : 'Change later in profile.'}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {currentStep === 'phone' ? (
            <TextField defaultValue="+228 90 00 00 00" inputMode="tel" label={t.onboarding.phone} />
          ) : null}
          {currentStep === 'otp' ? (
            <TextField
              defaultValue="0426"
              inputMode="numeric"
              label={t.onboarding.otp}
              maxLength={6}
            />
          ) : null}
          {currentStep === 'address' ? (
            <div className="form-stack">
              <TextField defaultValue="Adidogomé" label={isFrench ? 'Quartier' : 'Neighborhood'} />
              <TextField
                defaultValue="Portail bleu, pharmacie à côté"
                label={isFrench ? 'Repère' : 'Landmark'}
              />
            </div>
          ) : null}
          {currentStep === 'tier' ? (
            <div className="choice-grid" aria-label={t.onboarding.tier}>
              {[
                ['T1', 2500, isFrench ? '1 visite / mois' : '1 visit / month'],
                ['T2', 4500, isFrench ? '2 visites / mois' : '2 visits / month'],
              ].map(([tier, price, cadence]) => (
                <button
                  aria-pressed={tier === selectedTier}
                  className="choice-card"
                  key={tier}
                  onClick={() => setSelectedTier(tier as 'T1' | 'T2')}
                  type="button"
                >
                  <strong>{tier}</strong>
                  <span>{cadence}</span>
                  <Badge>{formatXof(Number(price), locale)}</Badge>
                </button>
              ))}
            </div>
          ) : null}
          {currentStep === 'schedule' ? (
            <div className="choice-grid" aria-label={t.onboarding.schedule}>
              {(isFrench
                ? ['Mardi · 9-11', 'Jeudi · 13-15', 'Samedi · 9-11']
                : ['Tuesday · 9-11', 'Thursday · 13-15', 'Saturday · 9-11']
              ).map((slot) => (
                <button
                  aria-pressed={slot === selectedSchedule}
                  className="choice-card"
                  key={slot}
                  onClick={() => setSelectedSchedule(slot)}
                  type="button"
                >
                  <strong>{slot}</strong>
                  <span>{t.onboarding.schedule}</span>
                </button>
              ))}
            </div>
          ) : null}
          {currentStep === 'payment' ? (
            <div className="form-stack">
              <TextField defaultValue="+228 90 00 00 00" inputMode="tel" label="Mobile Money" />
              <Alert title={t.onboarding.payment} tone="accent">
                {isFrench
                  ? 'Le paiement reste contrôlé par Washed, jamais en espèces avec la laveuse.'
                  : 'Payment stays controlled by Washed, never cash with the washerwoman.'}
              </Alert>
            </div>
          ) : null}
          {currentStep === 'confirm' ? (
            <div className="form-stack">
              <ListItem
                after={<Badge>{selectedTier}</Badge>}
                description={selectedSchedule}
                title={t.onboarding.confirm}
              />
              <Alert title={t.onboarding.confirm} tone="success">
                {isFrench
                  ? 'Le foyer est prêt pour validation Washed et première attribution.'
                  : 'The household is ready for Washed review and first assignment.'}
              </Alert>
            </div>
          ) : null}
        </div>

        <div className="onboarding-actions">
          <Button
            onClick={() => (stepIndex === 0 ? onRouteChange('home') : setStepIndex(stepIndex - 1))}
            variant="secondary"
          >
            {isFrench ? 'Retour' : 'Back'}
          </Button>
          <Button onClick={goNext} variant="primary">
            {isLastStep ? translate('common.done', locale) : translate('common.continue', locale)}
          </Button>
        </div>
      </Card>
    </ScreenFrame>
  );
}

function SubscriptionScreen({
  dispatch,
  locale,
  onRouteChange,
  onSheetOpen,
  pipeline,
  subscriberState,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly onSheetOpen: (sheet: SubscriberSheet) => void;
  readonly pipeline: SubscriberPipeline;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const price = subscriberState.subscription.monthlyPriceXof;
  const isFrench = locale === 'fr';
  const subscriptionCadence =
    subscriberState.subscription.tier === 'T2'
      ? isFrench
        ? '2 visites / mois'
        : '2 visits / month'
      : isFrench
        ? '1 visite / mois'
        : '1 visit / month';

  return (
    <ScreenFrame
      action={<Badge tone="success">{isFrench ? 'Actif' : 'Active'}</Badge>}
      eyebrow={isFrench ? 'Service' : 'Service'}
      title={t.subscription.title}
    >
      <section className="subscription-service-hero" aria-label={t.subscription.title}>
        <span className="subscription-service-status">
          {isFrench ? 'Renouvellement le 1 juin' : 'Renews June 1'}
        </span>
        <div>
          <Badge tone="success">{subscriberState.subscription.tier}</Badge>
          <h2>{subscriptionCadence}</h2>
          <p>
            {isFrench
              ? 'Votre rythme, votre laveuse et les règles de facturation au même endroit.'
              : 'Your cadence, washerwoman, and billing rules in one place.'}
          </p>
        </div>
        <div className="subscription-service-metrics">
          <span>
            <strong>{formatXof(price, locale)}</strong>
            <small>{isFrench ? 'par mois' : 'per month'}</small>
          </span>
          <span>
            <strong>mardi</strong>
            <small>9h00 - 11h00</small>
          </span>
        </div>
      </section>

      <section
        className="subscription-profile-panel"
        aria-label={isFrench ? 'Détails du service' : 'Service details'}
      >
        <div className="subscription-profile-row">
          <CalendarDays aria-hidden="true" size={19} strokeWidth={2.35} />
          <span>
            <strong>{isFrench ? 'Prochain passage' : 'Next visit'}</strong>
            <small>
              {isFrench ? 'mardi 5 mai · 9h00 - 11h00' : 'Tuesday, May 5 · 9:00 - 11:00'}
            </small>
          </span>
          <Badge tone="success">{t.visitStage.scheduled}</Badge>
        </div>
        <div className="subscription-profile-row">
          <UserRound aria-hidden="true" size={19} strokeWidth={2.35} />
          <span>
            <strong>Akouvi Koffi</strong>
            <small>{isFrench ? '18 visites · note 4.9' : '18 visits · 4.9 rating'}</small>
          </span>
          <button onClick={() => onSheetOpen('workerSwap')} type="button">
            {isFrench ? 'Changer' : 'Change'}
          </button>
        </div>
        <div className="subscription-profile-row">
          <ReceiptText aria-hidden="true" size={19} strokeWidth={2.35} />
          <span>
            <strong>{isFrench ? 'Facturation' : 'Billing'}</strong>
            <small>
              {formatXof(price, locale)} ·{' '}
              {t.paymentStatus[subscriberState.subscription.paymentStatus]}
            </small>
          </span>
          <button onClick={() => onRouteChange('billing')} type="button">
            {isFrench ? 'Voir' : 'View'}
          </button>
        </div>
      </section>

      <section
        className="subscriber-control-stack subscription-actions-panel"
        aria-label={t.home.visitControls}
      >
        <button
          aria-label={`${t.action.reschedule}`}
          onClick={() => onSheetOpen('reschedule')}
          type="button"
        >
          <div>
            <strong>{t.action.reschedule}</strong>
            <span>{isFrench ? 'Déplacer la prochaine visite.' : 'Move the next visit.'}</span>
          </div>
          <CalendarDays aria-hidden="true" size={20} strokeWidth={2.35} />
        </button>
        <button
          aria-label={`${t.action.skipVisit} ${subscriberState.subscription.skipCreditsRemaining} / 2`}
          onClick={() => onSheetOpen('skip')}
          type="button"
        >
          <div>
            <strong>{t.action.skipVisit}</strong>
            <span>
              {isFrench
                ? 'Garder le rythme sans cette visite.'
                : 'Keep cadence without this visit.'}
            </span>
          </div>
          <Badge tone="accent">{subscriberState.subscription.skipCreditsRemaining} / 2</Badge>
        </button>
        <button
          aria-label={`${t.action.requestSwap} ${subscriberState.subscription.swapCreditsRemaining} / 2`}
          onClick={() => onSheetOpen('workerSwap')}
          type="button"
        >
          <div>
            <strong>{t.action.requestSwap}</strong>
            <span>{isFrench ? 'Demande revue par opérations.' : 'Reviewed by operations.'}</span>
          </div>
          <Badge>{subscriberState.subscription.swapCreditsRemaining} / 2</Badge>
        </button>
      </section>

      <section className="subscription-billing-summary">
        <div className="card-header">
          <div>
            <h2>{isFrench ? 'Paiement et reçus' : 'Payment and receipts'}</h2>
            <p>
              Mai 2026 · {formatXof(price, locale)} ·{' '}
              {t.paymentStatus[subscriberState.subscription.paymentStatus]}
            </p>
          </div>
          <Badge
            tone={subscriberState.subscription.paymentStatus === 'overdue' ? 'danger' : 'success'}
          >
            {t.paymentStatus[subscriberState.subscription.paymentStatus]}
          </Badge>
        </div>
        <button
          aria-label={t.action.recoverPayment}
          className="billing-recovery-strip"
          onClick={() => onSheetOpen('paymentRecovery')}
          type="button"
        >
          <strong>{isFrench ? 'Paiement en attente' : 'Payment pending'}</strong>
          <span>
            {isFrench ? pipeline.billing.nextRetryLabelFr : pipeline.billing.nextRetryLabelEn}
          </span>
          <em>{isFrench ? 'Régler' : 'Settle'}</em>
        </button>
        <div className="subscription-secondary-actions">
          <button onClick={() => onRouteChange('billing')} type="button">
            <ReceiptText aria-hidden="true" size={18} strokeWidth={2.35} />
            <span>{t.nav.billing}</span>
          </button>
          <button onClick={() => onRouteChange('paymentRecovery')} type="button">
            <WalletCards aria-hidden="true" size={18} strokeWidth={2.35} />
            <span>{t.nav.paymentRecovery}</span>
          </button>
          <button
            className="subscription-cancel-action"
            onClick={() => onSheetOpen('cancel')}
            type="button"
          >
            <CircleAlert aria-hidden="true" size={18} strokeWidth={2.35} />
            <span>{t.subscription.cancel}</span>
          </button>
        </div>
      </section>
    </ScreenFrame>
  );
}

function SupportScreen({
  onMessageOpen,
  onRouteChange,
  onSheetOpen,
  pipeline,
  subscriberState,
  t,
}: {
  readonly onMessageOpen: (message: SubscriberMessageKind) => void;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly onSheetOpen: (sheet: SubscriberSheet, issue?: SupportIssueKind) => void;
  readonly pipeline: SubscriberPipeline;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const isFrench = t.nav.home === 'Accueil';
  const headlineMessage = pipeline.messages[0];

  return (
    <ScreenFrame
      action={
        <Button onClick={() => onRouteChange('inbox')} variant="secondary">
          {t.nav.inbox}
        </Button>
      }
      eyebrow={isFrench ? 'Messages' : 'Messages'}
      title={t.nav.support}
    >
      <section className="messages-hub-hero" aria-label={t.nav.support}>
        <div>
          <span>
            {headlineMessage?.needsAttention
              ? isFrench
                ? 'À traiter'
                : 'Needs attention'
              : isFrench
                ? 'Dernière réponse'
                : 'Latest reply'}
          </span>
          <h2>{isFrench ? headlineMessage?.titleFr : headlineMessage?.titleEn}</h2>
          <p>{isFrench ? headlineMessage?.bodyFr : headlineMessage?.bodyEn}</p>
        </div>
        <Badge tone="success">{subscriberState.inboxUnread}</Badge>
      </section>

      <section className="message-thread-list" aria-label={t.support.messages}>
        {pipeline.messages
          .filter((message) => message.id !== 'maintenance')
          .map((message) => (
            <button key={message.id} onClick={() => onMessageOpen(message.id)} type="button">
              <span />
              <div>
                <strong>{isFrench ? message.titleFr : message.titleEn}</strong>
                <p>{isFrench ? message.bodyFr : message.bodyEn}</p>
                <small>{isFrench ? message.createdLabelFr : message.createdLabelEn}</small>
              </div>
            </button>
          ))}
      </section>

      <section className="support-issue-grid support-compact" aria-label={t.support.dispute}>
        <div className="section-row">
          <strong>{isFrench ? 'Besoin d’aide ?' : 'Need help?'}</strong>
          <Badge tone="accent">{isFrench ? 'Support' : 'Support'}</Badge>
        </div>
        {supportIssueOrder.map((issue) => (
          <button key={issue} onClick={() => onSheetOpen('dispute', issue)} type="button">
            <strong>{t.support.issueKinds[issue]}</strong>
            <span>
              {isFrench
                ? 'Ouvre un suivi avec le contexte de visite.'
                : 'Opens a case with visit context.'}
            </span>
          </button>
        ))}
      </section>
    </ScreenFrame>
  );
}

function ProfileScreen({
  locale,
  onLocaleChange,
  onRouteChange,
  onSheetOpen,
  t,
}: {
  readonly locale: WashedLocale;
  readonly onLocaleChange: (locale: WashedLocale) => void;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly onSheetOpen: (sheet: SubscriberSheet) => void;
  readonly t: LocalizedCopy;
}): ReactElement {
  const isFrench = locale === 'fr';

  return (
    <ScreenFrame
      action={<Badge tone="success">{isFrench ? 'Vérifié' : 'Verified'}</Badge>}
      eyebrow={isFrench ? 'Compte' : 'Account'}
      title={t.profile.title}
    >
      <section className="profile-summary-panel" aria-label={t.profile.account}>
        <div className="profile-identity-row">
          <div className="profile-avatar" aria-hidden="true">
            EA
          </div>
          <div>
            <h2>Essi Agbodzan</h2>
            <span>+228 90 00 00 00</span>
          </div>
        </div>
        <div className="profile-summary-grid">
          <span>
            <MapPinned aria-hidden="true" size={17} strokeWidth={2.35} />
            <strong>{isFrench ? 'Adidogomé' : 'Adidogome'}</strong>
            <small>{isFrench ? 'Portail bleu' : 'Blue gate'}</small>
          </span>
          <span>
            <WalletCards aria-hidden="true" size={17} strokeWidth={2.35} />
            <strong>{t.paymentStatus.overdue}</strong>
            <small>Mobile Money</small>
          </span>
        </div>
      </section>

      <section
        className="profile-settings-panel"
        aria-label={isFrench ? 'Préférences' : 'Preferences'}
      >
        <div className="profile-section-heading">
          <span>{isFrench ? 'Préférences' : 'Preferences'}</span>
          <strong>{t.onboarding.language}</strong>
        </div>
        <div className="language-segmented-control" aria-label={t.onboarding.language}>
          {[
            ['fr', 'Français'],
            ['en', 'English'],
          ].map(([language, label]) => (
            <button
              aria-pressed={locale === language}
              key={language}
              onClick={() => onLocaleChange(language as WashedLocale)}
              type="button"
            >
              <Languages aria-hidden="true" size={15} strokeWidth={2.35} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section
        className="profile-link-list"
        aria-label={isFrench ? 'Compte et aide' : 'Account and help'}
      >
        <button onClick={() => onRouteChange('accountRecovery')} type="button">
          <UserRound aria-hidden="true" size={18} strokeWidth={2.35} />
          <span>
            <strong>{t.profile.account}</strong>
            <small>
              {isFrench ? 'Numéro, changement de SIM, accès' : 'Phone, SIM changes, access'}
            </small>
          </span>
        </button>
        <button onClick={() => onRouteChange('billing')} type="button">
          <ReceiptText aria-hidden="true" size={18} strokeWidth={2.35} />
          <span>
            <strong>{isFrench ? 'Adresse et paiement' : 'Address and payment'}</strong>
            <small>{isFrench ? 'Résumé foyer et reçus' : 'Home summary and receipts'}</small>
          </span>
        </button>
        <button onClick={() => onRouteChange('legal')} type="button">
          <FileText aria-hidden="true" size={18} strokeWidth={2.35} />
          <span>
            <strong>{t.profile.legal}</strong>
            <small>
              {isFrench
                ? 'Conditions, confidentialité, obligations'
                : 'Terms, privacy, obligations'}
            </small>
          </span>
        </button>
        <button onClick={() => onRouteChange('onboarding')} type="button">
          <CircleAlert aria-hidden="true" size={18} strokeWidth={2.35} />
          <span>
            <strong>{t.nav.onboarding}</strong>
            <small>
              {isFrench ? "Revoir le parcours d'inscription" : 'Review subscriber setup'}
            </small>
          </span>
        </button>
      </section>

      <section className="profile-privacy-panel" aria-label={t.profile.privacy}>
        <div className="profile-section-heading">
          <span>{isFrench ? 'Contrôle des données' : 'Data control'}</span>
          <strong>{t.profile.privacy}</strong>
        </div>
        <div className="profile-privacy-actions">
          <button onClick={() => onSheetOpen('privacyExport')} type="button">
            <ShieldCheck aria-hidden="true" size={18} strokeWidth={2.35} />
            <span>{t.profile.exportData}</span>
          </button>
          <button onClick={() => onSheetOpen('privacyErasure')} type="button">
            <FileText aria-hidden="true" size={18} strokeWidth={2.35} />
            <span>{t.profile.erasure}</span>
          </button>
          <button
            className="profile-danger-row"
            onClick={() => onSheetOpen('accountDelete')}
            type="button"
          >
            <CircleAlert aria-hidden="true" size={18} strokeWidth={2.35} />
            <span>{t.profile.deleteAccount}</span>
          </button>
        </div>
      </section>
    </ScreenFrame>
  );
}

function VisitDetailScreen({
  dispatch,
  locale,
  onRouteChange,
  onSheetOpen,
  subscriberState,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly onSheetOpen: (sheet: SubscriberSheet, issue?: SupportIssueKind) => void;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const nextVisit = formatVisitDate(subscriberState.nextVisit.startsAt, locale);
  const isFrench = locale === 'fr';

  return (
    <ScreenFrame
      action={<Badge tone="success">{t.visitStage[subscriberState.nextVisit.stage]}</Badge>}
      eyebrow={isFrench ? 'Visite' : 'Visit'}
      title={t.surfaces.visit.title}
    >
      <section className="visit-detail-hero" aria-label={t.surfaces.visit.title}>
        <div className="visit-detail-topline">
          <span>
            <CalendarDays aria-hidden="true" size={16} strokeWidth={2.35} />
            {nextVisit}
          </span>
          <Badge tone="accent">{subscriberState.nextVisit.window}</Badge>
        </div>
        <h2>
          {isFrench ? 'Akouvi est confirmée pour votre foyer' : 'Akouvi is confirmed for your home'}
        </h2>
        <div className="visit-quick-status">
          <span>
            <Clock3 aria-hidden="true" size={15} strokeWidth={2.35} />
            {subscriberState.nextVisit.window}
          </span>
          <span>
            <ShieldCheck aria-hidden="true" size={15} strokeWidth={2.35} />
            {isFrench ? 'Suivi borné' : 'Bounded tracking'}
          </span>
        </div>
        <div className="visit-worker-profile">
          <div className="worker-avatar" aria-hidden="true">
            AK
          </div>
          <div>
            <strong>{subscriberState.nextVisit.workerName}</strong>
            <span>
              {subscriberState.nextVisit.cell} · ★ 4.9 · {isFrench ? '18 visites' : '18 visits'}
            </span>
          </div>
        </div>
      </section>

      <section
        className="visit-proof-grid"
        aria-label={isFrench ? 'Preuves de visite' : 'Visit proofs'}
      >
        <button onClick={() => onRouteChange('support')} type="button">
          <MapPinned aria-hidden="true" size={18} strokeWidth={2.35} />
          <strong>{isFrench ? 'Adresse et accès' : 'Address and access'}</strong>
          <span>{t.surfaces.visit.access}</span>
        </button>
        <button onClick={() => onSheetOpen('dispute', 'quality')} type="button">
          <Camera aria-hidden="true" size={18} strokeWidth={2.35} />
          <strong>{isFrench ? 'Avant / après' : 'Before / after'}</strong>
          <span>{t.surfaces.visit.photos}</span>
        </button>
        <button onClick={() => onSheetOpen('rating')} type="button">
          <Star aria-hidden="true" size={18} strokeWidth={2.35} />
          <strong>{isFrench ? 'Note' : 'Rating'}</strong>
          <span>{t.surfaces.visit.rating}</span>
        </button>
      </section>

      <section className="visit-command-bar" aria-label={t.home.visitControls}>
        <Button onClick={() => dispatch({ type: 'visit/startTracking' })}>
          {t.action.startTracking}
        </Button>
        <Button onClick={() => onSheetOpen('skip')} variant="secondary">
          {t.action.skipVisit}
        </Button>
        <Button onClick={() => onSheetOpen('reschedule')} variant="secondary">
          {t.action.reschedule}
        </Button>
      </section>

      <Button fullWidth onClick={() => onSheetOpen('dispute', 'other')} variant="danger">
        {t.action.reportIssue}
      </Button>

      {subscriberState.nextVisit.stage === 'enRoute' ? (
        <BoundedTrackingMap onArrive={() => dispatch({ type: 'visit/arrive' })} t={t} />
      ) : (
        <section className="visit-privacy-note">
          <ShieldCheck aria-hidden="true" size={18} strokeWidth={2.35} />
          <span>
            {isFrench
              ? "Le suivi GPS n'apparaît qu'après le départ d'Akouvi et s'arrête à l'arrivée."
              : 'GPS tracking appears only after Akouvi starts traveling and stops on arrival.'}
          </span>
        </section>
      )}
    </ScreenFrame>
  );
}

function InboxScreen({
  onMessageOpen,
  pipeline,
  subscriberState,
  t,
}: {
  readonly onMessageOpen: (message: SubscriberMessageKind) => void;
  readonly pipeline: SubscriberPipeline;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const isFrench = t.nav.home === 'Accueil';
  const priorityMessage =
    pipeline.messages.find((message) => message.needsAttention) ?? pipeline.messages[0];

  return (
    <ScreenFrame
      action={<Badge tone="success">{subscriberState.inboxUnread}</Badge>}
      eyebrow="Inbox"
      title={t.surfaces.inbox.title}
    >
      <section className="inbox-priority-card" aria-label={isFrench ? 'Priorité' : 'Priority'}>
        <span>{isFrench ? 'À traiter' : 'Needs attention'}</span>
        <strong>{isFrench ? priorityMessage?.titleFr : priorityMessage?.titleEn}</strong>
        <p>{isFrench ? priorityMessage?.bodyFr : priorityMessage?.bodyEn}</p>
      </section>
      <section className="inbox-stack" aria-label={t.surfaces.inbox.title}>
        {pipeline.messages.map((message) => (
          <button
            className={`inbox-message inbox-message-${message.id}`}
            key={message.id}
            onClick={() => onMessageOpen(message.id)}
            type="button"
          >
            <span aria-hidden="true" />
            <div>
              <strong>{isFrench ? message.titleFr : message.titleEn}</strong>
              <p>{isFrench ? message.createdLabelFr : message.createdLabelEn}</p>
            </div>
            <em>{isFrench ? 'Ouvrir' : 'Open'}</em>
          </button>
        ))}
      </section>
    </ScreenFrame>
  );
}

function BillingScreen({
  locale,
  onSheetOpen,
  pipeline,
  subscriberState,
  t,
}: {
  readonly locale: WashedLocale;
  readonly onSheetOpen: (sheet: SubscriberSheet) => void;
  readonly pipeline: SubscriberPipeline;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const isFrench = locale === 'fr';

  return (
    <ScreenFrame
      action={
        <Badge tone="accent">{t.paymentStatus[subscriberState.subscription.paymentStatus]}</Badge>
      }
      eyebrow="Billing"
      title={t.surfaces.billing.title}
    >
      <section className="billing-overview-card" aria-label={t.surfaces.billing.title}>
        <div className="billing-overview-top">
          <div>
            <span>{isFrench ? 'Solde à régulariser' : 'Balance due'}</span>
            <strong>{formatXof(pipeline.billing.balanceDueXof, locale)}</strong>
          </div>
          <Badge tone="accent">{t.paymentStatus[subscriberState.subscription.paymentStatus]}</Badge>
        </div>
        <div
          className="billing-timeline"
          aria-label={isFrench ? 'Cycle de facturation' : 'Billing cycle'}
        >
          {pipeline.billing.retrySteps.map((step) => (
            <span aria-current={step.isCurrent ? 'step' : undefined} key={step.id}>
              <strong>{isFrench ? step.valueFr : step.valueEn}</strong>
              <small>{isFrench ? step.labelFr : step.labelEn}</small>
            </span>
          ))}
        </div>
        <button onClick={() => onSheetOpen('paymentRecovery')} type="button">
          {t.action.recoverPayment}
        </button>
      </section>

      <section
        className="billing-method-card"
        aria-label={isFrench ? 'Moyen de paiement' : 'Payment method'}
      >
        <div>
          <WalletCards aria-hidden="true" size={20} strokeWidth={2.35} />
          <span>
            <strong>{isFrench ? 'Wallet lié' : 'Linked wallet'}</strong>
            <small>{pipeline.billing.paymentMethodLabel}</small>
          </span>
        </div>
        <button onClick={() => onSheetOpen('paymentRecovery')} type="button">
          {isFrench ? 'Modifier' : 'Update'}
        </button>
      </section>

      <section
        className="billing-ledger-section"
        aria-label={isFrench ? 'Paiements passés' : 'Past payments'}
      >
        <div className="section-row">
          <strong>{isFrench ? 'Paiements passés' : 'Past payments'}</strong>
          <button type="button">{isFrench ? 'Tous' : 'All'}</button>
        </div>
        <div className="billing-ledger-list">
          {pipeline.billing.ledger.map((payment) => (
            <article key={payment.id}>
              <span>
                <strong>{isFrench ? payment.periodFr : payment.periodEn}</strong>
                <small>{payment.method}</small>
              </span>
              <span>
                <strong>{formatXof(payment.amountXof, locale)}</strong>
                <small>{isFrench ? payment.statusFr : payment.statusEn}</small>
              </span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="billing-support-grid"
        aria-label={isFrench ? 'Facturation et support' : 'Billing and support'}
      >
        <button type="button">
          <ReceiptText aria-hidden="true" size={18} strokeWidth={2.35} />
          <div>
            <strong>{t.surfaces.billing.supportCredit}</strong>
            <p>{t.surfaces.billing.refund}</p>
          </div>
        </button>
        <button type="button">
          <FileText aria-hidden="true" size={18} strokeWidth={2.35} />
          <div>
            <strong>{isFrench ? 'Reçu disponible' : 'Receipt available'}</strong>
            <p>PDF · Mai 2026 · T-Money</p>
          </div>
        </button>
      </section>

      <section className="billing-next-card" aria-label={isFrench ? 'Suite' : 'What happens next'}>
        <strong>{isFrench ? 'Ce qui se passe ensuite' : 'What happens next'}</strong>
        <p>
          {isFrench
            ? 'Washed réessaie le wallet lié. Si le paiement échoue encore, le support vous contacte avant toute suspension.'
            : 'Washed retries the linked wallet. If it fails again, support contacts you before any suspension.'}
        </p>
      </section>
    </ScreenFrame>
  );
}

function PaymentRecoveryScreen({
  locale,
  onSheetOpen,
  pipeline,
  subscriberState,
  t,
}: {
  readonly locale: WashedLocale;
  readonly onSheetOpen: (sheet: SubscriberSheet) => void;
  readonly pipeline: SubscriberPipeline;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  return (
    <ScreenFrame
      action={
        <Badge tone="danger">{t.paymentStatus[subscriberState.subscription.paymentStatus]}</Badge>
      }
      eyebrow="Payment"
      title={t.surfaces.paymentRecovery.title}
    >
      <Card elevated>
        <Alert
          title={formatXof(subscriberState.subscription.monthlyPriceXof, locale)}
          tone="danger"
        >
          {t.surfaces.paymentRecovery.body}
        </Alert>
        <ListItem
          description={
            locale === 'fr' ? pipeline.billing.nextRetryLabelFr : pipeline.billing.nextRetryLabelEn
          }
          title={locale === 'fr' ? 'Prochaine étape' : 'Next step'}
        />
        <Button fullWidth onClick={() => onSheetOpen('paymentRecovery')}>
          {t.action.recoverPayment}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function LegalScreen({
  onSheetOpen,
  t,
}: {
  readonly onSheetOpen: (sheet: SubscriberSheet) => void;
  readonly t: LocalizedCopy;
}): ReactElement {
  const isFrench = t.nav.home === 'Accueil';

  return (
    <ScreenFrame action={<Badge>Documents</Badge>} eyebrow="Legal" title={t.surfaces.legal.title}>
      <Card elevated>
        <ListItem
          description={
            isFrench ? 'Conditions d’utilisation du service Washed' : 'Washed service terms'
          }
          title={t.surfaces.legal.terms}
        />
        <ListItem
          description={
            isFrench
              ? 'Comment vos données et preuves de visite sont protégées'
              : 'How your data and visit proofs are protected'
          }
          title={t.surfaces.legal.privacyPolicy}
        />
        <ListItem description={t.surfaces.legal.export} title={t.profile.exportData} />
        <ListItem description={t.surfaces.legal.erasure} title={t.profile.erasure} />
        <div className="inline-actions">
          <Button onClick={() => onSheetOpen('privacyExport')} size="sm" variant="secondary">
            {t.profile.exportData}
          </Button>
          <Button onClick={() => onSheetOpen('privacyErasure')} size="sm" variant="secondary">
            {t.profile.erasure}
          </Button>
        </div>
      </Card>
    </ScreenFrame>
  );
}

function AccountRecoveryScreen({ t }: { readonly t: LocalizedCopy }): ReactElement {
  const isFrench = t.nav.home === 'Accueil';

  return (
    <ScreenFrame
      action={<Badge tone="accent">{t.surfaces.accountRecovery.operatorReview}</Badge>}
      eyebrow="Recovery"
      title={t.surfaces.accountRecovery.title}
    >
      <Card elevated>
        <Alert tone="primary">{t.surfaces.accountRecovery.body}</Alert>
        <ListItem
          description={
            isFrench
              ? 'Propriété du numéro +228, dernier paiement, adresse du foyer'
              : '+228 phone ownership, last payment reference, household address'
          }
          title={t.surfaces.accountRecovery.identity}
        />
        <ListItem
          description={
            isFrench
              ? 'L’équipe Washed vérifie la demande avant de changer le numéro du compte.'
              : 'The Washed team verifies the request before changing the account number.'
          }
          title={t.surfaces.accountRecovery.operatorReview}
        />
      </Card>
    </ScreenFrame>
  );
}

function ConfirmationSheet({
  activeSheet,
  onClose,
  onConfirm,
  onIssueChange,
  supportIssue,
  t,
}: {
  readonly activeSheet: SubscriberSheet;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly onIssueChange: (issue: SupportIssueKind) => void;
  readonly supportIssue: SupportIssueKind;
  readonly t: LocalizedCopy;
}): ReactElement {
  const sheet = t.sheet[activeSheet];
  const isDispute = activeSheet === 'dispute';
  const isOrderWash = activeSheet === 'orderWash';

  return (
    <div className="sheet-backdrop" role="presentation">
      <section
        aria-labelledby="active-sheet-title"
        aria-modal="true"
        className={`bottom-sheet${isOrderWash ? ' order-wash-sheet' : ''}`}
        role="dialog"
      >
        <div className="sheet-handle" />
        <div className="sheet-title-row">
          <div>
            <span className="eyebrow">
              {isDispute
                ? t.action.reportIssue
                : isOrderWash
                  ? t.nav.home === 'Accueil'
                    ? 'Demande ponctuelle'
                    : 'One-time request'
                  : t.action.confirm}
            </span>
            <h2 id="active-sheet-title">{sheet.title}</h2>
          </div>
          <button aria-label={t.action.close} onClick={onClose} type="button">
            {t.action.close}
          </button>
        </div>
        <p>{sheet.body}</p>
        {isDispute ? (
          <div className="sheet-choice-list" aria-label={t.support.dispute}>
            {supportIssueOrder.map((issue) => (
              <button
                aria-pressed={supportIssue === issue}
                key={issue}
                onClick={() => onIssueChange(issue)}
                type="button"
              >
                {t.support.issueKinds[issue]}
              </button>
            ))}
          </div>
        ) : null}
        <div className="sheet-actions">
          <Button onClick={onClose} variant="secondary">
            {t.action.close}
          </Button>
          <Button
            onClick={onConfirm}
            variant={
              activeSheet === 'cancel' || activeSheet === 'accountDelete' ? 'danger' : 'primary'
            }
          >
            {sheet.confirm}
          </Button>
        </div>
      </section>
    </div>
  );
}

function MessageDetailSheet({
  message,
  onClose,
  onRouteChange,
  onSheetOpen,
  pipeline,
  t,
}: {
  readonly message: SubscriberMessageKind;
  readonly onClose: () => void;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly onSheetOpen: (sheet: SubscriberSheet, issue?: SupportIssueKind) => void;
  readonly pipeline: SubscriberPipeline;
  readonly t: LocalizedCopy;
}): ReactElement {
  const isFrench = t.nav.home === 'Accueil';
  const detail = pipeline.messages.find((candidate) => candidate.id === message);

  if (detail === undefined) {
    return <></>;
  }

  const handleAction = (): void => {
    if ('route' in detail.target) {
      onRouteChange(detail.target.route);
    } else {
      onSheetOpen(detail.target.sheet, detail.target.issue);
    }
    onClose();
  };

  return (
    <div className="sheet-backdrop" role="presentation">
      <section
        aria-labelledby="message-sheet-title"
        aria-modal="true"
        className="bottom-sheet message-detail-sheet"
        role="dialog"
      >
        <div className="sheet-handle" />
        <div className="sheet-title-row">
          <div>
            <span className="eyebrow">
              {isFrench ? detail.createdLabelFr : detail.createdLabelEn}
            </span>
            <h2 id="message-sheet-title">{isFrench ? detail.titleFr : detail.titleEn}</h2>
          </div>
          <button aria-label={t.action.close} onClick={onClose} type="button">
            {t.action.close}
          </button>
        </div>
        <p>{isFrench ? detail.bodyFr : detail.bodyEn}</p>
        <div className="message-detail-actions">
          <Button onClick={handleAction}>
            {isFrench ? detail.actionLabelFr : detail.actionLabelEn}
          </Button>
          <Button onClick={() => onSheetOpen('dispute', 'other')} variant="secondary">
            {t.action.openSupport}
          </Button>
        </div>
      </section>
    </div>
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
