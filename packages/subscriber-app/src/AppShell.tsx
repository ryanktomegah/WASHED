import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { translate } from '@washed/i18n';
import { LocaleProvider, WashedThemeProvider, useActiveLocale } from '@washed/ui';

import { AppearanceLaunchGate } from './appearance/AppearanceLaunchGate.js';
import {
  hasStoredSubscriberAppearancePreference,
  SubscriberAppearanceProvider,
  useSubscriberAppearance,
} from './appearance/AppearanceContext.js';
import {
  hasStoredSubscriberLanguagePreference,
  SUBSCRIBER_LANGUAGE_OPTIONS,
  SUBSCRIBER_LANGUAGE_STORAGE_KEY,
} from './language/languageOptions.js';
import {
  hasStoredSubscriberAuthSession,
  SubscriberApiProvider,
  useSubscriberApi,
} from './api/SubscriberApiContext.js';
import { BookingSubmittedX10C, BookingX10B } from './screens/hub/BookingScreens.js';
import {
  SUBSCRIBER_SIGNUP_STORAGE_KEY,
  SignupProvider,
} from './screens/onboarding/SignupContext.js';
import {
  hasStoredSubscriberSubscription,
  SubscriberSubscriptionProvider,
  useSubscriberSubscription,
} from './subscription/SubscriberSubscriptionContext.js';
import { SplashX01 } from './screens/onboarding/SplashX01.js';
import { PhoneX02 } from './screens/onboarding/PhoneX02.js';
import { OtpX03 } from './screens/onboarding/OtpX03.js';
import { IdentityX03I } from './screens/onboarding/IdentityX03I.js';
import { AddressX04 } from './screens/onboarding/AddressX04.js';
import { TierX05 } from './screens/onboarding/TierX05.js';
import { PaymentX06 } from './screens/onboarding/PaymentX06.js';
import { ReviewX07 } from './screens/onboarding/ReviewX07.js';
import { WelcomeX08 } from './screens/onboarding/WelcomeX08.js';
import { HubX10 } from './screens/hub/HubX10.js';
import { HistoryDetailX17, HistoryX16 } from './screens/history/HistoryX16.js';
import {
  PlanOverdueX23,
  PlanPauseConfirmX22,
  PlanPausedSuccessX22A,
  PlanPausedX19R,
  PlanPaymentHistoryX20,
  PlanPaymentMethodX21,
  PlanUpgradeX19U,
  PlanX19,
} from './screens/plan/PlanScreens.js';
import {
  AddressEditX25,
  AppearanceX24A,
  DeleteAccountX28,
  LanguageX24L,
  NotificationsX26,
  ProfileEditX24E,
  PrivacyX27,
  ProfileX24,
} from './screens/profile/ProfileScreens.js';
import {
  ContactBureauX30,
  ContactSubmittedX30S,
  HelpCenterX29,
  MaintenanceX34,
  OfflineX33,
  TicketDetailX32,
  TicketsX31,
  UpdateRequiredX35,
} from './screens/support/SupportScreens.js';
import {
  WorkerChangeSubmittedX18C,
  WorkerChangeX18C,
  WorkerProfileX18,
} from './screens/worker-profile/WorkerProfileX18.js';
import {
  VisitDetailX11,
  VisitEnRouteX12,
  VisitFeedbackX15,
  VisitInProgressX13,
  VisitIssueSubmittedX15S,
  VisitIssueX15S,
  VisitRescheduleX11M,
  VisitRevealX14,
} from './screens/visits/VisitScreens.js';

import './screens/onboarding/onboarding.css';
import './appearance/appearance.css';
import './screens/hub/hub.css';
import './screens/history/history.css';
import './screens/plan/plan.css';
import './screens/profile/profile.css';
import './screens/support/support.css';
import './screens/worker-profile/workerProfile.css';
import './screens/visits/visit.css';

export const SUBSCRIBER_RESTORE_MIN_MS = 1500;
export const SUBSCRIBER_RESTORE_FALLBACK_MS = 2000;
export const SUBSCRIBER_LAUNCH_SPLASH_MS = 1200;
export const SUBSCRIBER_HOME_REVEAL_MS = 480;

export function AppShell(): ReactElement {
  return (
    <LocaleProvider
      defaultLocale="fr"
      storageKey={SUBSCRIBER_LANGUAGE_STORAGE_KEY}
      supportedLocales={SUBSCRIBER_LANGUAGE_OPTIONS}
    >
      <SubscriberAppearanceProvider>
        <SubscriberThemedShell />
      </SubscriberAppearanceProvider>
    </LocaleProvider>
  );
}

function SubscriberThemedShell(): ReactElement {
  const { effectiveMode } = useSubscriberAppearance();
  const [hasEnteredApp, setHasEnteredApp] = useState(hasCompletedLaunchPreferences);
  const requiresLanguage = !hasStoredSubscriberLanguagePreference();
  const requiresAppearance = !hasStoredSubscriberAppearancePreference();

  return (
    <WashedThemeProvider colorMode={effectiveMode} theme="subscriber">
      {hasEnteredApp ? (
        <SubscriberApiProvider>
          <SignupProvider storageKey={SUBSCRIBER_SIGNUP_STORAGE_KEY}>
            <SubscriberSubscriptionProvider>
              <SubscriberStartupGate>
                <HashRouter>
                  <LocaleScopedRoutes />
                </HashRouter>
              </SubscriberStartupGate>
            </SubscriberSubscriptionProvider>
          </SignupProvider>
        </SubscriberApiProvider>
      ) : (
        <AppearanceLaunchGate
          initialStep={requiresLanguage ? 'language' : 'appearance'}
          onContinue={() => setHasEnteredApp(true)}
          requiresAppearance={requiresAppearance}
        />
      )}
    </WashedThemeProvider>
  );
}

function hasCompletedLaunchPreferences(): boolean {
  return hasStoredSubscriberLanguagePreference() && hasStoredSubscriberAppearancePreference();
}

function SubscriberStartupGate({ children }: { readonly children: ReactNode }): ReactElement {
  const subscriberApi = useSubscriberApi();
  const { syncFromApi } = useSubscriberSubscription();
  const [shouldRestoreAtLaunch] = useState(shouldResumeSubscriberApp);
  const [launchSplashElapsed, setLaunchSplashElapsed] = useState(!shouldRestoreAtLaunch);
  const [minimumElapsed, setMinimumElapsed] = useState(!shouldRestoreAtLaunch);
  const [bootstrapComplete, setBootstrapComplete] = useState(
    !shouldRestoreAtLaunch || !subscriberApi.isConfigured,
  );
  const [fallbackElapsed, setFallbackElapsed] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [transitionComplete, setTransitionComplete] = useState(false);

  useEffect(() => {
    if (!shouldRestoreAtLaunch) return;

    const splashTimer = window.setTimeout(
      () => setLaunchSplashElapsed(true),
      SUBSCRIBER_LAUNCH_SPLASH_MS,
    );

    return () => window.clearTimeout(splashTimer);
  }, [shouldRestoreAtLaunch]);

  useEffect(() => {
    if (!shouldRestoreAtLaunch || !launchSplashElapsed) return;

    const minimumTimer = window.setTimeout(
      () => setMinimumElapsed(true),
      SUBSCRIBER_RESTORE_MIN_MS,
    );
    const fallbackTimer = window.setTimeout(
      () => setFallbackElapsed(true),
      SUBSCRIBER_RESTORE_FALLBACK_MS,
    );

    return () => {
      window.clearTimeout(minimumTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [launchSplashElapsed, shouldRestoreAtLaunch]);

  useEffect(() => {
    if (!shouldRestoreAtLaunch) {
      setBootstrapComplete(true);
      return;
    }

    if (!subscriberApi.isConfigured) {
      setBootstrapComplete(true);
      return;
    }

    let cancelled = false;
    setBootstrapComplete(false);

    void subscriberApi
      .getCurrentSubscription()
      .then((response) => {
        if (!cancelled) syncFromApi(response.subscription);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBootstrapComplete(true);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldRestoreAtLaunch, subscriberApi, syncFromApi]);

  const startupReady = minimumElapsed && (bootstrapComplete || fallbackElapsed);

  useEffect(() => {
    if (!startupReady || contentVisible) return;

    setContentVisible(true);
  }, [contentVisible, startupReady]);

  useEffect(() => {
    if (!contentVisible || transitionComplete) return;

    const transitionTimer = window.setTimeout(
      () => setTransitionComplete(true),
      SUBSCRIBER_HOME_REVEAL_MS,
    );

    return () => window.clearTimeout(transitionTimer);
  }, [contentVisible, transitionComplete]);

  if (!launchSplashElapsed) {
    return <SubscriberLaunchSplash />;
  }

  if (!shouldRestoreAtLaunch) {
    return <>{children}</>;
  }

  if (contentVisible) {
    return (
      <div
        className="subscriber-startup-stack"
        data-startup-phase={transitionComplete ? 'ready' : 'revealing'}
      >
        <div className="subscriber-startup-content">{children}</div>
        {transitionComplete ? null : (
          <div className="subscriber-startup-overlay">
            <SubscriberRestoreSkeleton isExiting />
          </div>
        )}
      </div>
    );
  }

  if (!startupReady) {
    return <SubscriberRestoreSkeleton />;
  }

  return <>{children}</>;
}

function SubscriberLaunchSplash(): ReactElement {
  return (
    <main
      aria-busy="true"
      aria-labelledby="subscriber-launch-splash-title"
      className="subscriber-launch-screen"
      data-screen-id="X-00S"
    >
      <h1
        aria-label="washed."
        className="subscriber-launch-mark"
        id="subscriber-launch-splash-title"
      >
        <span aria-hidden="true">
          washed<span className="subscriber-launch-mark-dot">.</span>
        </span>
      </h1>
    </main>
  );
}

function SubscriberRestoreSkeleton({
  isExiting = false,
}: {
  readonly isExiting?: boolean;
}): ReactElement {
  return (
    <main
      aria-hidden={isExiting ? true : undefined}
      aria-busy="true"
      className={`hub-screen subscriber-tab-screen subscriber-restore-screen${
        isExiting ? ' exiting' : ''
      }`}
      data-screen-id="X-00R"
    >
      <span
        aria-label={translate('subscriber.launch.restore.status')}
        className="subscriber-restore-status"
        role="status"
      >
        {translate('subscriber.launch.restore.status')}
      </span>

      <div aria-hidden="true" className="hub-body subscriber-restore-body">
        <header className="hub-header subscriber-restore-header">
          <span className="subscriber-restore-heading">
            <span className="subscriber-restore-line subscriber-restore-eyebrow" />
            <span className="subscriber-restore-line subscriber-restore-title" />
          </span>
          <span className="subscriber-restore-avatar" />
        </header>

        <section className="hub-visit-card subscriber-restore-card">
          <div className="hub-card-head">
            <span className="subscriber-restore-line subscriber-restore-eyebrow" />
            <span className="subscriber-restore-pill" />
          </div>
          <span className="subscriber-restore-line subscriber-restore-time" />
          <span className="subscriber-restore-line subscriber-restore-date" />
          <div className="hub-rule" />
          <div className="hub-worker-row">
            <span className="subscriber-restore-avatar worker" />
            <span className="hub-worker-copy">
              <span className="subscriber-restore-line subscriber-restore-worker-name" />
              <span className="subscriber-restore-line subscriber-restore-worker-detail" />
            </span>
          </div>
        </section>

        <div className="hub-actions subscriber-restore-actions">
          <span className="subscriber-restore-button" />
          <span className="subscriber-restore-button primary" />
        </div>

        <section className="hub-plan subscriber-restore-plan">
          <div className="hub-plan-row">
            <span className="subscriber-restore-line subscriber-restore-eyebrow" />
            <span className="subscriber-restore-line subscriber-restore-plan-date" />
          </div>
          <span className="subscriber-restore-progress" />
        </section>
      </div>

      <div aria-hidden="true" className="hub-nav subscriber-restore-nav">
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}

function LocaleScopedRoutes(): ReactElement {
  const locale = useActiveLocale();

  return (
    <Routes key={locale}>
      <Route element={<EntryRoute />} path="/" />
      <Route element={<WelcomeRoute />} path="/welcome" />
      <Route element={<PhoneX02 />} path="/signup/phone" />
      <Route element={<OtpX03 />} path="/signup/otp" />
      <Route element={<IdentityX03I />} path="/signup/identity" />
      <Route element={<AddressX04 />} path="/signup/address" />
      <Route element={<TierX05 />} path="/signup/tier" />
      <Route element={<PaymentX06 />} path="/signup/payment" />
      <Route element={<ReviewX07 />} path="/signup/review" />
      <Route element={<WelcomeX08 />} path="/signup/welcome" />
      <Route element={protectSubscriberRoute(<HubX10 />)} path="/hub" />
      <Route element={protectSubscriberRoute(<BookingX10B />)} path="/booking" />
      <Route element={protectSubscriberRoute(<BookingSubmittedX10C />)} path="/booking/submitted" />
      <Route element={protectSubscriberRoute(<HistoryX16 />)} path="/history" />
      <Route element={protectSubscriberRoute(<HistoryDetailX17 />)} path="/history/:visitId" />
      <Route element={protectSubscriberRoute(<PlanX19 />)} path="/plan" />
      <Route element={protectSubscriberRoute(<PlanPaymentHistoryX20 />)} path="/plan/payments" />
      <Route
        element={protectSubscriberRoute(<PlanPaymentMethodX21 />)}
        path="/plan/payment-method"
      />
      <Route element={protectSubscriberRoute(<PlanOverdueX23 />)} path="/plan/overdue" />
      <Route element={protectSubscriberRoute(<PlanUpgradeX19U />)} path="/plan/upgrade" />
      <Route element={protectSubscriberRoute(<PlanPauseConfirmX22 />)} path="/plan/pause" />
      <Route
        element={protectSubscriberRoute(<PlanPausedSuccessX22A />)}
        path="/plan/pause/submitted"
      />
      <Route element={protectSubscriberRoute(<PlanPausedX19R />)} path="/plan/paused" />
      <Route element={protectSubscriberRoute(<ProfileX24 />)} path="/profile" />
      <Route element={protectSubscriberRoute(<ProfileEditX24E />)} path="/profile/edit" />
      <Route element={protectSubscriberRoute(<AddressEditX25 />)} path="/profile/address" />
      <Route element={protectSubscriberRoute(<LanguageX24L />)} path="/profile/language" />
      <Route element={protectSubscriberRoute(<AppearanceX24A />)} path="/profile/appearance" />
      <Route element={protectSubscriberRoute(<NotificationsX26 />)} path="/profile/notifications" />
      <Route element={protectSubscriberRoute(<PrivacyX27 />)} path="/profile/privacy" />
      <Route element={protectSubscriberRoute(<DeleteAccountX28 />)} path="/profile/delete" />
      <Route element={protectSubscriberRoute(<HelpCenterX29 />)} path="/support" />
      <Route element={protectSubscriberRoute(<ContactBureauX30 />)} path="/support/contact" />
      <Route
        element={protectSubscriberRoute(<ContactSubmittedX30S />)}
        path="/support/contact/submitted"
      />
      <Route element={protectSubscriberRoute(<TicketsX31 />)} path="/support/tickets" />
      <Route
        element={protectSubscriberRoute(<TicketDetailX32 />)}
        path="/support/tickets/:ticketId"
      />
      <Route element={protectSubscriberRoute(<OfflineX33 />)} path="/offline" />
      <Route element={protectSubscriberRoute(<MaintenanceX34 />)} path="/maintenance" />
      <Route element={protectSubscriberRoute(<UpdateRequiredX35 />)} path="/update-required" />
      <Route element={protectSubscriberRoute(<WorkerProfileX18 />)} path="/worker/:workerId" />
      <Route
        element={protectSubscriberRoute(<WorkerChangeX18C />)}
        path="/worker/:workerId/change"
      />
      <Route
        element={protectSubscriberRoute(<WorkerChangeSubmittedX18C />)}
        path="/worker/:workerId/change/submitted"
      />
      <Route element={protectSubscriberRoute(<VisitDetailX11 />)} path="/visit/detail" />
      <Route element={protectSubscriberRoute(<VisitDetailX11 />)} path="/visit/detail/:visitId" />
      <Route element={protectSubscriberRoute(<VisitRescheduleX11M />)} path="/visit/reschedule" />
      <Route
        element={protectSubscriberRoute(<VisitRescheduleX11M />)}
        path="/visit/reschedule/:visitId"
      />
      <Route element={protectSubscriberRoute(<VisitEnRouteX12 />)} path="/visit/en-route" />
      <Route element={protectSubscriberRoute(<VisitInProgressX13 />)} path="/visit/in-progress" />
      <Route element={protectSubscriberRoute(<VisitRevealX14 />)} path="/visit/reveal" />
      <Route element={protectSubscriberRoute(<VisitFeedbackX15 />)} path="/visit/feedback" />
      <Route element={protectSubscriberRoute(<VisitIssueX15S />)} path="/visit/issue" />
      <Route element={protectSubscriberRoute(<VisitIssueX15S />)} path="/visit/issue/:visitId" />
      <Route
        element={protectSubscriberRoute(<VisitIssueSubmittedX15S />)}
        path="/visit/issue/submitted"
      />
      <Route
        element={protectSubscriberRoute(<VisitIssueSubmittedX15S />)}
        path="/visit/issue/:visitId/submitted/:disputeId"
      />
      <Route element={<Navigate replace to="/welcome" />} path="*" />
    </Routes>
  );
}

function protectSubscriberRoute(element: ReactElement): ReactElement {
  return <SubscriberRouteGuard>{element}</SubscriberRouteGuard>;
}

function SubscriberRouteGuard({ children }: { readonly children: ReactElement }): ReactElement {
  if (!shouldResumeSubscriberApp()) return <Navigate replace to="/welcome" />;
  return children;
}

function EntryRoute(): ReactElement {
  return <Navigate replace to={shouldResumeSubscriberApp() ? '/hub' : '/welcome'} />;
}

function WelcomeRoute(): ReactElement {
  if (shouldResumeSubscriberApp()) return <Navigate replace to="/hub" />;
  return <SplashX01 />;
}

function shouldResumeSubscriberApp(): boolean {
  return hasStoredSubscriberAuthSession() || hasStoredSubscriberSubscription();
}
