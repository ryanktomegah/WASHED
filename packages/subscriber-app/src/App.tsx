import { useEffect, useReducer, useState } from 'react';

import {
  Alert,
  Badge,
  BottomNav,
  Button,
  Card,
  EmptyState,
  ListItem,
  TextField,
  WashedThemeProvider,
} from '@washed/ui';
import { formatVisitDate, formatXof, translate, type WashedLocale } from '@washed/i18n';
import {
  Banknote,
  Bell,
  Check,
  ClipboardList,
  Clock3,
  Home,
  House,
  Languages,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import type { Dispatch, ReactElement, ReactNode } from 'react';

import {
  copy,
  onboardingSteps,
  visitTimeline,
  type AppRoute,
  type LocalizedCopy,
  type PrimaryAppRoute,
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
] as const satisfies readonly PrimaryAppRoute[];

const navIcons = {
  home: <House aria-hidden="true" size={18} strokeWidth={2.25} />,
  profile: <UserRound aria-hidden="true" size={18} strokeWidth={2.25} />,
  subscription: <ClipboardList aria-hidden="true" size={18} strokeWidth={2.25} />,
  support: <MessageCircle aria-hidden="true" size={18} strokeWidth={2.25} />,
} as const satisfies Record<PrimaryAppRoute, ReactNode>;

export function App(): ReactElement {
  const [locale, setLocale] = useState<WashedLocale>('fr');
  const [route, setRoute] = useState<AppRoute>('home');
  const [subscriberState, dispatch] = useReducer(subscriberReducer, initialSubscriberState);
  const t = copy[locale];

  const toggleLocale = (): void => {
    setLocale((currentLocale) => (currentLocale === 'fr' ? 'en' : 'fr'));
  };

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('.subscriber-shell');

    if (shell !== null) {
      shell.scrollTop = 0;
    }
  }, [route]);

  return (
    <WashedThemeProvider className="app-frame" theme="subscriber">
      <div className="phone-shell">
        <div className="status-bar" aria-hidden="true" hidden>
          <span>9:41</span>
          <span>●●● 5G ▰</span>
        </div>

        <header className="app-header" hidden>
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
              dispatch={dispatch}
              locale={locale}
              onLocaleToggle={toggleLocale}
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
          {route === 'visit' ? (
            <VisitDetailScreen
              dispatch={dispatch}
              locale={locale}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'inbox' ? <InboxScreen subscriberState={subscriberState} t={t} /> : null}
          {route === 'billing' ? (
            <BillingScreen
              dispatch={dispatch}
              locale={locale}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'paymentRecovery' ? (
            <PaymentRecoveryScreen
              dispatch={dispatch}
              locale={locale}
              subscriberState={subscriberState}
              t={t}
            />
          ) : null}
          {route === 'legal' ? <LegalScreen dispatch={dispatch} t={t} /> : null}
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
      </div>
    </WashedThemeProvider>
  );
}

function HomeScreen({
  dispatch,
  locale,
  onLocaleToggle,
  onRouteChange,
  subscriberState,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly onLocaleToggle: () => void;
  readonly onRouteChange: (route: AppRoute) => void;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const nextVisit = formatVisitDate(subscriberState.nextVisit.startsAt, locale);
  const trackingIsVisible = subscriberState.nextVisit.stage === 'enRoute';
  const isFrench = locale === 'fr';
  const nextVisitWindow = isFrench ? '9h00 - 11h00' : '9:00 - 11:00';

  return (
    <>
      <section className="subscriber-greeting" aria-labelledby="subscriber-home-title">
        <div>
          <span>{isFrench ? 'Bonjour,' : 'Hello,'}</span>
          <h1 id="subscriber-home-title">Essi Agbodzan</h1>
        </div>
        <div className="subscriber-greeting-actions">
          <button aria-label={t.nav.inbox} onClick={() => onRouteChange('inbox')} type="button">
            <Bell aria-hidden="true" size={16} strokeWidth={2.35} />
            <span className="notification-count">{subscriberState.inboxUnread}</span>
          </button>
          <button aria-label="Switch language" onClick={onLocaleToggle} type="button">
            <Languages aria-hidden="true" size={15} strokeWidth={2.35} />
            <span>{locale === 'fr' ? 'EN' : 'FR'}</span>
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

      <section className="home-hero-card" aria-label={t.home.nextVisit}>
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
        <div
          className="visit-assurance-grid"
          aria-label={isFrench ? 'Préparation de la visite' : 'Visit readiness'}
        >
          <span>
            <ShieldCheck aria-hidden="true" size={15} strokeWidth={2.35} />
            {isFrench ? 'Affectation validée' : 'Assignment verified'}
          </span>
          <span>
            <Home aria-hidden="true" size={15} strokeWidth={2.35} />
            {isFrench ? 'Consignes envoyées' : 'Notes sent'}
          </span>
        </div>
        <div className="hero-actions">
          <button
            className="hero-action-primary"
            onClick={() => onRouteChange('visit')}
            type="button"
          >
            {isFrench ? 'Voir la visite' : 'View visit'}
          </button>
          <button onClick={() => dispatch({ type: 'visit/reschedule' })} type="button">
            {isFrench ? 'Reporter' : 'Reschedule'}
          </button>
          <button onClick={() => onRouteChange('support')} type="button">
            {isFrench ? 'Messages' : 'Messages'}
          </button>
        </div>
      </section>

      <section
        className="mini-calendar"
        aria-label={isFrench ? 'Visites à venir' : 'Upcoming visits'}
      >
        <div className="section-row">
          <strong>{isFrench ? 'Visites à venir' : 'Upcoming visits'}</strong>
          <button onClick={() => onRouteChange('subscription')} type="button">
            {isFrench ? 'Tout voir →' : 'View all →'}
          </button>
        </div>
        <div className="calendar-strip">
          {[
            ['mai', '5', isFrench ? 'Suivante' : 'Next'],
            ['mai', '19', ''],
            ['juin', '2', ''],
            ['juin', '16', ''],
          ].map(([month, day, label], index) => (
            <button
              aria-current={index === 0 ? 'date' : undefined}
              key={`${month}-${day}`}
              onClick={() => onRouteChange('visit')}
              type="button"
            >
              <span>{month}</span>
              <strong>{day}</strong>
              {label === '' ? null : <em>{label}</em>}
            </button>
          ))}
        </div>
      </section>

      <section
        className="home-overview-grid"
        aria-label={isFrench ? 'Résumé abonnement' : 'Plan summary'}
      >
        <button onClick={() => onRouteChange('subscription')} type="button">
          <span>{isFrench ? 'Formule' : 'Plan'}</span>
          <strong>T2</strong>
          <small>{isFrench ? '2 visites / mois' : '2 visits / month'}</small>
        </button>
        <button onClick={() => onRouteChange('billing')} type="button">
          <span>{isFrench ? 'Paiement' : 'Payment'}</span>
          <strong>{formatXof(subscriberState.subscription.monthlyPriceXof, locale)}</strong>
          <small>{isFrench ? 'Prévu le 1 mai' : 'Due May 1'}</small>
        </button>
      </section>

      <section className="visit-status-card">
        {trackingIsVisible ? (
          <BoundedTrackingMap onArrive={() => dispatch({ type: 'visit/arrive' })} t={t} />
        ) : (
          <>
            <div className="section-row">
              <strong>{isFrench ? 'Tout est prêt' : 'Everything is ready'}</strong>
              <Badge tone="success">{t.visitStage[subscriberState.nextVisit.stage]}</Badge>
            </div>
            <p>
              {isFrench
                ? "Vous serez prévenue quand Akouvi démarre le trajet. Le suivi s'arrête automatiquement à son arrivée."
                : 'You will be notified when Akouvi starts the trip. Tracking stops automatically when she arrives.'}
            </p>
          </>
        )}
      </section>

      <section className="message-preview">
        <div>
          <span>{isFrench ? 'Dernier message' : 'Latest message'}</span>
          <strong>{isFrench ? 'Rappel visite mardi' : 'Tuesday visit reminder'}</strong>
          <p>
            {isFrench
              ? 'Akouvi est confirmée pour 9h00 - 11h00. Répondez ici si votre portail ou vos consignes changent.'
              : 'Akouvi is confirmed for 9:00 - 11:00. Reply here if your gate or notes change.'}
          </p>
        </div>
        <button onClick={() => onRouteChange('support')} type="button">
          {isFrench ? 'Ouvrir' : 'Open'}
        </button>
      </section>

      <section className="recent-activity">
        <strong>{isFrench ? 'Activité récente' : 'Recent activity'}</strong>
        {[
          {
            body: isFrench ? 'Notée 5★ · Akouvi' : 'Rated 5★ · Akouvi',
            icon: <Check aria-hidden="true" size={16} strokeWidth={2.5} />,
            route: 'visit' as const,
            title: isFrench ? 'Visite complétée — 15 avr' : 'Visit completed — Apr 15',
          },
          {
            body: 'T-Money · Reçu disponible',
            icon: <Banknote aria-hidden="true" size={17} strokeWidth={2.35} />,
            route: 'billing' as const,
            title: `${formatXof(subscriberState.subscription.monthlyPriceXof, locale)} ${isFrench ? 'prélevé — 1 avr' : 'charged — Apr 1'}`,
          },
        ].map((item) => (
          <button key={item.title} onClick={() => onRouteChange(item.route)} type="button">
            <span>{item.icon}</span>
            <strong>{item.title}</strong>
            <small>{item.body}</small>
          </button>
        ))}
      </section>

      <div className="timeline sr-utility" aria-label={t.home.visitControls}>
        {visitTimeline.map((stage) => (
          <button
            aria-label={t.visitStage[stage]}
            aria-pressed={stage === subscriberState.nextVisit.stage}
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
            {t.visitStage[stage]}
          </button>
        ))}
      </div>
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
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedTier, setSelectedTier] = useState<'T1' | 'T2' | 'T3'>('T2');
  const [selectedSchedule, setSelectedSchedule] = useState(
    locale === 'fr' ? 'Mardi · 9-11' : 'Tuesday · 9-11',
  );
  const currentStep = onboardingSteps[stepIndex] ?? 'language';
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === onboardingSteps.length - 1;
  const scheduleSlots =
    locale === 'fr'
      ? ['Mardi · 9-11', 'Jeudi · 13-15', 'Samedi · 9-11']
      : ['Tuesday · 9-11', 'Thursday · 13-15', 'Saturday · 9-11'];
  const helperCopy =
    locale === 'fr'
      ? {
          addressHint: 'Adidogomé, Tokoin, Agoè...',
          addressLabel: 'Quartier',
          back: 'Retour',
          continue: 'Continuer',
          landmark: 'Repère et consignes',
          languageBody: 'Le foyer pourra changer FR / EN plus tard depuis le profil.',
          momoHint: 'Numéro Mobile Money utilisé pour les prélèvements Washed.',
          momoLabel: 'Mobile Money',
          otpHint: 'Entrez le code reçu par SMS.',
          paymentBody:
            'Le prélèvement démarre après confirmation. En cas d’échec, vous pourrez régulariser depuis l’app.',
          phoneHint: 'Format Togo, utilisé pour OTP et support.',
          scheduleBody: 'Choisissez le créneau habituel; les reports restent possibles 24h avant.',
          stepPrefix: 'Étape',
          tierBody: 'La formule pourra être ajustée au prochain cycle depuis Abonnement.',
        }
      : {
          addressHint: 'Adidogome, Tokoin, Agoe...',
          addressLabel: 'Neighborhood',
          back: 'Back',
          continue: 'Continue',
          landmark: 'Landmark and access notes',
          languageBody: 'The household can switch FR / EN later from profile.',
          momoHint: 'Mobile Money number used for Washed collections.',
          momoLabel: 'Mobile Money',
          otpHint: 'Enter the code received by SMS.',
          paymentBody:
            'Collection starts after confirmation. Failed payments can be fixed in the app.',
          phoneHint: 'Togo format, used for OTP and support.',
          scheduleBody: 'Pick the usual window; rescheduling stays available 24h before.',
          stepPrefix: 'Step',
          tierBody: 'The tier can be adjusted next cycle from Subscription.',
        };
  const stepDescription = {
    address:
      locale === 'fr'
        ? 'Ajoutez les repères qui évitent les appels le jour de la visite.'
        : 'Add landmarks that prevent calls on visit day.',
    confirm:
      locale === 'fr'
        ? 'Relisez les informations avant l’activation du foyer.'
        : 'Review the details before the household is activated.',
    language:
      locale === 'fr'
        ? 'Choisissez la langue principale du foyer.'
        : 'Choose the household’s primary language.',
    otp:
      locale === 'fr'
        ? 'Le code protège l’accès au compte sans mot de passe.'
        : 'The code protects the account without a password.',
    payment:
      locale === 'fr'
        ? 'Le numéro Mobile Money sert aux prélèvements mensuels.'
        : 'The Mobile Money number is used for monthly collections.',
    phone:
      locale === 'fr'
        ? 'Ce numéro recevra les rappels, codes et alertes importantes.'
        : 'This number receives reminders, codes, and important alerts.',
    schedule:
      locale === 'fr'
        ? 'Sélectionnez le créneau que le foyer peut tenir chaque semaine.'
        : 'Pick the window the household can keep each week.',
    tier:
      locale === 'fr'
        ? 'Comparez le rythme de visite et le prix mensuel.'
        : 'Compare visit cadence and monthly price.',
  } satisfies Record<(typeof onboardingSteps)[number], string>;

  const goNext = (): void => {
    if (isLastStep) {
      onRouteChange('home');
      return;
    }

    setStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1));
  };

  const goBack = (): void => {
    if (isFirstStep) {
      onRouteChange('home');
      return;
    }

    setStepIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <ScreenFrame
      action={
        <Badge tone="accent">
          {stepIndex + 1} / {onboardingSteps.length}
        </Badge>
      }
      eyebrow={locale === 'fr' ? 'Inscription' : 'Signup'}
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
              {helperCopy.stepPrefix} {stepIndex + 1}
            </span>
            <h2>{t.onboarding[currentStep]}</h2>
            <p className="onboarding-step-copy">{stepDescription[currentStep]}</p>
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
                  <span>{helperCopy.languageBody}</span>
                </button>
              ))}
            </div>
          ) : null}

          {currentStep === 'phone' ? (
            <TextField
              defaultValue="+228 90 00 00 00"
              hint={helperCopy.phoneHint}
              inputMode="tel"
              label={t.onboarding.phone}
              placeholder="+228"
            />
          ) : null}

          {currentStep === 'otp' ? (
            <TextField
              defaultValue="0426"
              hint={helperCopy.otpHint}
              inputMode="numeric"
              label={t.onboarding.otp}
              maxLength={6}
            />
          ) : null}

          {currentStep === 'address' ? (
            <div className="form-stack">
              <TextField
                defaultValue="Adidogomé"
                hint={helperCopy.addressHint}
                label={helperCopy.addressLabel}
              />
              <TextField
                defaultValue="Portail bleu, pharmacie à côté"
                label={helperCopy.landmark}
              />
            </div>
          ) : null}

          {currentStep === 'tier' ? (
            <>
              <Alert tone="primary">{helperCopy.tierBody}</Alert>
              <div className="choice-grid" aria-label={t.onboarding.tier}>
                {[
                  ['T1', 2500, '2 visites / mois'],
                  ['T2', 4500, '4 visites / mois'],
                  ['T3', 6500, '6 visites / mois'],
                ].map(([tier, price, cadence]) => (
                  <button
                    aria-pressed={tier === selectedTier}
                    className="choice-card"
                    key={tier}
                    onClick={() => setSelectedTier(tier as 'T1' | 'T2' | 'T3')}
                    type="button"
                  >
                    <strong>{tier}</strong>
                    <span>{cadence}</span>
                    <Badge>{formatXof(Number(price), locale)}</Badge>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {currentStep === 'schedule' ? (
            <>
              <Alert tone="primary">{helperCopy.scheduleBody}</Alert>
              <div className="choice-grid" aria-label={t.onboarding.schedule}>
                {scheduleSlots.map((slot) => (
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
            </>
          ) : null}

          {currentStep === 'payment' ? (
            <div className="form-stack">
              <TextField
                defaultValue="+228 90 00 00 00"
                hint={helperCopy.momoHint}
                inputMode="tel"
                label={helperCopy.momoLabel}
              />
              <Alert title={t.onboarding.payment} tone="accent">
                {helperCopy.paymentBody}
              </Alert>
            </div>
          ) : null}

          {currentStep === 'confirm' ? (
            <div className="form-stack">
              <ListItem
                after={<Badge>{selectedTier}</Badge>}
                description={`${selectedTier} · ${
                  selectedTier === 'T1'
                    ? formatXof(2500, locale)
                    : selectedTier === 'T2'
                      ? formatXof(4500, locale)
                      : formatXof(6500, locale)
                }`}
                title={t.onboarding.tier}
              />
              <ListItem description={selectedSchedule} title={t.onboarding.schedule} />
              <ListItem description="+228 90 00 00 00" title={t.onboarding.phone} />
              <Alert title={t.onboarding.confirm} tone="success">
                {locale === 'fr'
                  ? 'Le foyer est prêt pour validation Washed et première attribution.'
                  : 'The household is ready for Washed review and first assignment.'}
              </Alert>
            </div>
          ) : null}
        </div>

        <div className="onboarding-actions">
          <Button onClick={goBack} variant="secondary">
            {helperCopy.back}
          </Button>
          <Button onClick={goNext} variant="primary">
            {isLastStep ? translate('common.done', locale) : helperCopy.continue}
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
        <Button fullWidth onClick={() => onRouteChange('billing')} variant="secondary">
          {t.nav.billing}
        </Button>
        <Button fullWidth onClick={() => onRouteChange('paymentRecovery')} variant="secondary">
          {t.nav.paymentRecovery}
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
  const isFrench = t.nav.home === 'Accueil';

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
          description={
            isFrench
              ? 'Akouvi est confirmée pour mardi 9-11.'
              : 'Akouvi is confirmed for Tuesday 9-11.'
          }
          title={t.support.inbox}
        />
        <ListItem
          description={
            isFrench
              ? 'Vos messages arrivent à l’équipe Washed pour garder un suivi clair.'
              : 'Messages go to the Washed team so every case stays tracked.'
          }
          title={t.support.messages}
        />
        <ListItem
          description={
            isFrench
              ? 'Rappels de visite, paiements, changements de planning et alertes service.'
              : 'Visit reminders, payments, schedule changes, and service alerts.'
          }
          title={t.support.notificationCenter}
        />
        <Button onClick={() => onRouteChange('inbox')} variant="secondary">
          {t.nav.inbox}
        </Button>
      </Card>

      <EmptyState
        action={<Button variant="danger">{t.support.dispute}</Button>}
        description={
          isFrench
            ? 'À utiliser pour une visite manquée, un paiement, un vêtement abîmé ou une situation sensible.'
            : 'Use this for a missed visit, payment issue, damaged clothing, or sensitive situation.'
        }
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
  const isFrench = locale === 'fr';

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
        <ListItem
          description={isFrench ? 'Conditions, confidentialité, aide' : 'Terms, privacy, help'}
          title={t.profile.legal}
        />
        <div className="inline-actions">
          <Button onClick={() => onRouteChange('legal')} size="sm" variant="secondary">
            {t.nav.legal}
          </Button>
          <Button onClick={() => onRouteChange('accountRecovery')} size="sm" variant="secondary">
            {t.nav.accountRecovery}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="card-header">
          <h2>{t.profile.privacy}</h2>
          <Badge tone="muted">Confidentiel</Badge>
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

function VisitDetailScreen({
  dispatch,
  locale,
  subscriberState,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  const nextVisit = formatVisitDate(subscriberState.nextVisit.startsAt, locale);

  return (
    <ScreenFrame
      action={<Badge tone="success">{t.visitStage[subscriberState.nextVisit.stage]}</Badge>}
      eyebrow="Visit"
      title={t.surfaces.visit.title}
    >
      <Card className="visit-card" elevated>
        <ListItem
          after={<Badge tone="accent">{subscriberState.nextVisit.window}</Badge>}
          description={`${subscriberState.nextVisit.workerName}, ${subscriberState.nextVisit.cell}`}
          title={nextVisit}
        />
        <ListItem description={t.surfaces.visit.access} title="Adresse et accès" />
        <ListItem description={t.surfaces.visit.photos} title="Avant / après" />
        <ListItem
          description={t.surfaces.visit.rating}
          title={locale === 'fr' ? 'Note' : 'Rating'}
        />
        <div className="visit-actions" aria-label={t.home.visitControls}>
          <Button onClick={() => dispatch({ type: 'visit/startTracking' })} size="sm">
            {t.action.startTracking}
          </Button>
          <Button onClick={() => dispatch({ type: 'visit/skip' })} size="sm" variant="secondary">
            {t.action.skipVisit}
          </Button>
          <Button
            onClick={() => dispatch({ type: 'visit/reschedule' })}
            size="sm"
            variant="secondary"
          >
            {t.action.reschedule}
          </Button>
        </div>
        {subscriberState.nextVisit.stage === 'enRoute' ? (
          <BoundedTrackingMap onArrive={() => dispatch({ type: 'visit/arrive' })} t={t} />
        ) : null}
      </Card>
    </ScreenFrame>
  );
}

function InboxScreen({
  subscriberState,
  t,
}: {
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  return (
    <ScreenFrame
      action={<Badge tone="success">{subscriberState.inboxUnread}</Badge>}
      eyebrow="Inbox"
      title={t.surfaces.inbox.title}
    >
      <Card elevated>
        <ListItem description="T-24h · mardi 5 mai · 9-11" title={t.surfaces.inbox.reminder} />
        <ListItem
          description="Mobile money · prochaine tentative"
          title={t.surfaces.inbox.payment}
        />
        <ListItem description={t.surfaces.inbox.outage} title={t.profile.maintenance} />
      </Card>
    </ScreenFrame>
  );
}

function BillingScreen({
  dispatch,
  locale,
  subscriberState,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
  readonly subscriberState: SubscriberState;
  readonly t: LocalizedCopy;
}): ReactElement {
  return (
    <ScreenFrame
      action={
        <Badge tone="accent">{t.paymentStatus[subscriberState.subscription.paymentStatus]}</Badge>
      }
      eyebrow="Billing"
      title={t.surfaces.billing.title}
    >
      <Card elevated>
        <ListItem
          description={t.surfaces.billing.receipt}
          title={formatXof(subscriberState.subscription.monthlyPriceXof, locale)}
        />
        <ListItem
          description={t.surfaces.billing.refund}
          title={t.surfaces.billing.supportCredit}
        />
        <Button fullWidth onClick={() => dispatch({ type: 'payment/recover' })} variant="secondary">
          {t.action.recoverPayment}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function PaymentRecoveryScreen({
  dispatch,
  locale,
  subscriberState,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
  readonly locale: WashedLocale;
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
        <Button fullWidth onClick={() => dispatch({ type: 'payment/recover' })}>
          {t.action.recoverPayment}
        </Button>
      </Card>
    </ScreenFrame>
  );
}

function LegalScreen({
  dispatch,
  t,
}: {
  readonly dispatch: Dispatch<SubscriberAction>;
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
          <Button
            onClick={() => dispatch({ type: 'privacy/export' })}
            size="sm"
            variant="secondary"
          >
            {t.profile.exportData}
          </Button>
          <Button
            onClick={() => dispatch({ type: 'privacy/erasure' })}
            size="sm"
            variant="secondary"
          >
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
