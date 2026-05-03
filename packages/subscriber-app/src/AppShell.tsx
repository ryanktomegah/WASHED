import type { ReactElement } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { WashedThemeProvider } from '@washed/ui';

import { App as LegacyHub } from './App.js';
import { SplashX01 } from './screens/onboarding/SplashX01.js';
import { PhoneX02 } from './screens/onboarding/PhoneX02.js';
import { OtpX03 } from './screens/onboarding/OtpX03.js';

import './screens/onboarding/onboarding.css';

export function AppShell(): ReactElement {
  return (
    <WashedThemeProvider theme="subscriber">
      <HashRouter>
        <Routes>
          <Route element={<Navigate replace to="/welcome" />} path="/" />
          <Route element={<SplashX01 />} path="/welcome" />
          <Route element={<PhoneX02 />} path="/signup/phone" />
          <Route element={<OtpX03 />} path="/signup/otp" />
          <Route element={<LegacyHub />} path="/hub/*" />
          <Route element={<Navigate replace to="/welcome" />} path="*" />
        </Routes>
      </HashRouter>
    </WashedThemeProvider>
  );
}
