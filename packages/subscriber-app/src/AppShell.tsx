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
import { SignupProvider } from './screens/onboarding/SignupContext.js';
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
          <SignupProvider>
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
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [bootstrapComplete, setBootstrapComplete] = useState(!subscriberApi.isConfigured);
  const [fallbackElapsed, setFallbackElapsed] = useState(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
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
  }, [subscriberApi, syncFromApi]);

  if (!minimumElapsed || (!bootstrapComplete && !fallbackElapsed)) {
    return <SubscriberRestoreSkeleton />;
  }

  return <>{children}</>;
}

function SubscriberRestoreSkeleton(): ReactElement {
  return (
    <main
      aria-busy="true"
      className="hub-screen subscriber-tab-screen subscriber-restore-screen"
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
      <Route element={<HubX10 />} path="/hub" />
      <Route element={<BookingX10B />} path="/booking" />
      <Route element={<BookingSubmittedX10C />} path="/booking/submitted" />
      <Route element={<HistoryX16 />} path="/history" />
      <Route element={<HistoryDetailX17 />} path="/history/:visitId" />
      <Route element={<PlanX19 />} path="/plan" />
      <Route element={<PlanPaymentHistoryX20 />} path="/plan/payments" />
      <Route element={<PlanPaymentMethodX21 />} path="/plan/payment-method" />
      <Route element={<PlanOverdueX23 />} path="/plan/overdue" />
      <Route element={<PlanUpgradeX19U />} path="/plan/upgrade" />
      <Route element={<PlanPauseConfirmX22 />} path="/plan/pause" />
      <Route element={<PlanPausedSuccessX22A />} path="/plan/pause/submitted" />
      <Route element={<PlanPausedX19R />} path="/plan/paused" />
      <Route element={<ProfileX24 />} path="/profile" />
      <Route element={<ProfileEditX24E />} path="/profile/edit" />
      <Route element={<AddressEditX25 />} path="/profile/address" />
      <Route element={<LanguageX24L />} path="/profile/language" />
      <Route element={<AppearanceX24A />} path="/profile/appearance" />
      <Route element={<NotificationsX26 />} path="/profile/notifications" />
      <Route element={<PrivacyX27 />} path="/profile/privacy" />
      <Route element={<DeleteAccountX28 />} path="/profile/delete" />
      <Route element={<HelpCenterX29 />} path="/support" />
      <Route element={<ContactBureauX30 />} path="/support/contact" />
      <Route element={<ContactSubmittedX30S />} path="/support/contact/submitted" />
      <Route element={<TicketsX31 />} path="/support/tickets" />
      <Route element={<TicketDetailX32 />} path="/support/tickets/:ticketId" />
      <Route element={<OfflineX33 />} path="/offline" />
      <Route element={<MaintenanceX34 />} path="/maintenance" />
      <Route element={<UpdateRequiredX35 />} path="/update-required" />
      <Route element={<WorkerProfileX18 />} path="/worker/:workerId" />
      <Route element={<WorkerChangeX18C />} path="/worker/:workerId/change" />
      <Route element={<WorkerChangeSubmittedX18C />} path="/worker/:workerId/change/submitted" />
      <Route element={<VisitDetailX11 />} path="/visit/detail" />
      <Route element={<VisitDetailX11 />} path="/visit/detail/:visitId" />
      <Route element={<VisitRescheduleX11M />} path="/visit/reschedule" />
      <Route element={<VisitRescheduleX11M />} path="/visit/reschedule/:visitId" />
      <Route element={<VisitEnRouteX12 />} path="/visit/en-route" />
      <Route element={<VisitInProgressX13 />} path="/visit/in-progress" />
      <Route element={<VisitRevealX14 />} path="/visit/reveal" />
      <Route element={<VisitFeedbackX15 />} path="/visit/feedback" />
      <Route element={<VisitIssueX15S />} path="/visit/issue" />
      <Route element={<VisitIssueX15S />} path="/visit/issue/:visitId" />
      <Route element={<VisitIssueSubmittedX15S />} path="/visit/issue/submitted" />
      <Route
        element={<VisitIssueSubmittedX15S />}
        path="/visit/issue/:visitId/submitted/:disputeId"
      />
      <Route element={<Navigate replace to="/welcome" />} path="*" />
    </Routes>
  );
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
