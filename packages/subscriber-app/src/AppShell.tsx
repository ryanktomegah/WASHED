import type { ReactElement } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { WashedThemeProvider } from '@washed/ui';

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
import './screens/visits/visit.css';

export function AppShell(): ReactElement {
  return (
    <WashedThemeProvider theme="subscriber">
      <SignupProvider>
        <HashRouter>
          <Routes>
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
        </HashRouter>
      </SignupProvider>
    </WashedThemeProvider>
  );
}
