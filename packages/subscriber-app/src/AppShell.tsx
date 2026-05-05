import type { ReactElement } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { LocaleProvider, WashedThemeProvider, useActiveLocale } from '@washed/ui';

import { SignupProvider } from './screens/onboarding/SignupContext.js';
import { SplashX01 } from './screens/onboarding/SplashX01.js';
import { PhoneX02 } from './screens/onboarding/PhoneX02.js';
import { OtpX03 } from './screens/onboarding/OtpX03.js';
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
  DeleteAccountX28,
  NotificationsX26,
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
import './screens/hub/hub.css';
import './screens/history/history.css';
import './screens/plan/plan.css';
import './screens/profile/profile.css';
import './screens/support/support.css';
import './screens/worker-profile/workerProfile.css';
import './screens/visits/visit.css';

const SUBSCRIBER_LOCALES = ['fr'] as const;

export function AppShell(): ReactElement {
  return (
    <LocaleProvider defaultLocale="fr" supportedLocales={SUBSCRIBER_LOCALES}>
      <WashedThemeProvider theme="subscriber">
        <SignupProvider>
          <HashRouter>
            <LocaleScopedRoutes />
          </HashRouter>
        </SignupProvider>
      </WashedThemeProvider>
    </LocaleProvider>
  );
}

function LocaleScopedRoutes(): ReactElement {
  const locale = useActiveLocale();

  return (
    <Routes key={locale}>
      <Route element={<Navigate replace to="/welcome" />} path="/" />
      <Route element={<SplashX01 />} path="/welcome" />
      <Route element={<PhoneX02 />} path="/signup/phone" />
      <Route element={<OtpX03 />} path="/signup/otp" />
      <Route element={<AddressX04 />} path="/signup/address" />
      <Route element={<TierX05 />} path="/signup/tier" />
      <Route element={<PaymentX06 />} path="/signup/payment" />
      <Route element={<ReviewX07 />} path="/signup/review" />
      <Route element={<WelcomeX08 />} path="/signup/welcome" />
      <Route element={<HubX10 />} path="/hub" />
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
      <Route element={<AddressEditX25 />} path="/profile/address" />
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
      <Route element={<VisitRescheduleX11M />} path="/visit/reschedule" />
      <Route element={<VisitEnRouteX12 />} path="/visit/en-route" />
      <Route element={<VisitInProgressX13 />} path="/visit/in-progress" />
      <Route element={<VisitRevealX14 />} path="/visit/reveal" />
      <Route element={<VisitFeedbackX15 />} path="/visit/feedback" />
      <Route element={<VisitIssueX15S />} path="/visit/issue" />
      <Route element={<VisitIssueSubmittedX15S />} path="/visit/issue/submitted" />
      <Route element={<Navigate replace to="/welcome" />} path="*" />
    </Routes>
  );
}
