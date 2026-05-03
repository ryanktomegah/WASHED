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

import './screens/onboarding/onboarding.css';

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
            <Route element={<Navigate replace to="/welcome" />} path="*" />
          </Routes>
        </HashRouter>
      </SignupProvider>
    </WashedThemeProvider>
  );
}
