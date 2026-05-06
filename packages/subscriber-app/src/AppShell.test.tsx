import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getActiveLocale, setActiveLocale } from '@washed/i18n';

import { SUBSCRIBER_APPEARANCE_STORAGE_KEY } from './appearance/AppearanceContext.js';
import {
  AppShell,
  SUBSCRIBER_HOME_REVEAL_MS,
  SUBSCRIBER_LAUNCH_SPLASH_MS,
  SUBSCRIBER_RESTORE_MIN_MS,
} from './AppShell.js';
import { SUBSCRIBER_AUTH_STORAGE_KEY } from './api/SubscriberApiContext.js';
import { SUBSCRIBER_LANGUAGE_STORAGE_KEY } from './language/languageOptions.js';
import { SUBSCRIBER_SIGNUP_STORAGE_KEY } from './screens/onboarding/SignupContext.js';
import { TOUR_STORAGE_KEY } from './screens/hub/useTourState.js';
import { SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY } from './subscription/SubscriberSubscriptionContext.js';

const STARTUP_VISIBLE_TIMEOUT_MS =
  SUBSCRIBER_LAUNCH_SPLASH_MS + SUBSCRIBER_RESTORE_MIN_MS + SUBSCRIBER_HOME_REVEAL_MS + 1000;

async function expectHeadingVisible(name: string): Promise<void> {
  await waitFor(() => expect(screen.getByRole('heading', { name })).toBeVisible(), {
    timeout: STARTUP_VISIBLE_TIMEOUT_MS,
  });
}

async function expectExistingAccountCtaVisible(): Promise<void> {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'I already have an account' })).toBeVisible(),
  );
}

function storeFreshSubscriberAuthSession(): void {
  window.localStorage.setItem(
    SUBSCRIBER_AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken: 'subscriber-access-token',
      accessTokenExpiresAt: '2027-05-05T10:00:00.000Z',
      refreshToken: 'subscriber-refresh-token',
      refreshTokenExpiresAt: '2027-06-05T10:00:00.000Z',
      role: 'subscriber',
      sessionId: '22222222-2222-4222-8222-222222222222',
      userId: '99999999-9999-4999-8999-999999999999',
    }),
  );
}

describe('Subscriber app shell · launch preferences', () => {
  beforeEach(() => {
    window.location.hash = '#/hub';
    window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_SIGNUP_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY);
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    setActiveLocale('fr');
  });

  afterEach(() => {
    window.location.hash = '';
    window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_SIGNUP_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY);
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
    setActiveLocale('fr');
    vi.useRealTimers();
  });

  it('blocks the app behind required language and appearance choices before entry', async () => {
    render(<AppShell />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00L');
    expect(screen.getByRole('heading', { name: 'Choisir la langue' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Accueil' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /English/u }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    expect(window.localStorage.getItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(getActiveLocale()).toBe('en');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00A');
    expect(screen.getByRole('heading', { name: 'Choose appearance' })).toBeVisible();
    const appearanceContinue = screen.getByRole('button', { name: 'Continue' });
    expect(appearanceContinue).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Dark/u }));
    expect(appearanceContinue).toBeEnabled();
    await waitFor(() => expect(document.body).toHaveAttribute('data-color-mode', 'dark'));
    expect(window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY)).toBeNull();

    fireEvent.click(appearanceContinue);

    await expectExistingAccountCtaVisible();
    expect(
      screen.queryByRole('status', { name: 'Restoring your session…' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY)).toBe('dark'),
    );
  });

  it('sends signed-out launches to sign-in without the home restore skeleton', async () => {
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'en');
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');

    render(<AppShell />);

    await expectExistingAccountCtaVisible();
    expect(screen.queryByRole('main', { busy: true })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: 'Restoring your session…' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Choose language' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Choose appearance' })).not.toBeInTheDocument();
    await waitFor(() => expect(document.body).toHaveAttribute('data-color-mode', 'dark'));
  });

  it('opens the restore path only when a returning auth session is saved', async () => {
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'en');
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');
    storeFreshSubscriberAuthSession();

    render(<AppShell />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00S');
    expect(screen.getByRole('heading', { name: 'washed.' })).toBeVisible();
    expect(
      await screen.findByRole(
        'status',
        {
          name: 'Restoring your session…',
        },
        { timeout: STARTUP_VISIBLE_TIMEOUT_MS },
      ),
    ).toBeInTheDocument();
    await expectHeadingVisible('Home');
    expect(screen.queryByRole('heading', { name: 'Choose language' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Choose appearance' })).not.toBeInTheDocument();
    await waitFor(() => expect(document.body).toHaveAttribute('data-color-mode', 'dark'));
  });

  it('keeps the restore skeleton visible for the startup minimum', async () => {
    vi.useFakeTimers();
    expect(SUBSCRIBER_LAUNCH_SPLASH_MS).toBe(1200);
    expect(SUBSCRIBER_RESTORE_MIN_MS).toBe(1500);
    expect(SUBSCRIBER_HOME_REVEAL_MS).toBe(480);
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'en');
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');
    storeFreshSubscriberAuthSession();

    const { container } = render(<AppShell />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00S');
    expect(screen.getByRole('heading', { name: 'washed.' })).toBeVisible();
    expect(
      screen.queryByRole('status', { name: 'Restoring your session…' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(SUBSCRIBER_LAUNCH_SPLASH_MS - 1);
    });
    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00S');

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00R');
    expect(screen.getByRole('status', { name: 'Restoring your session…' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(SUBSCRIBER_RESTORE_MIN_MS - 1);
    });
    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00R');

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('heading', { name: 'Home' })).toBeVisible();
    expect(container.querySelector('.subscriber-startup-overlay')).not.toBeNull();

    await act(async () => undefined);
    expect(container.querySelector('.subscriber-startup-overlay')).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(SUBSCRIBER_HOME_REVEAL_MS + 1);
    });
    expect(container.querySelector('.subscriber-startup-overlay')).toBeNull();
  });

  it('asks only for the missing appearance choice after language is saved', async () => {
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'en');

    render(<AppShell />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00A');
    expect(screen.getByRole('heading', { name: 'Choose appearance' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Choose language' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Light/u }));
    await waitFor(() => expect(document.body).toHaveAttribute('data-color-mode', 'light'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await expectExistingAccountCtaVisible();
    expect(
      screen.queryByRole('status', { name: 'Restoring your session…' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY)).toBe('light'),
    );
  });

  it('resumes an already-created local subscription from the welcome route', async () => {
    window.location.hash = '#/welcome';
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'fr');
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'light');
    window.localStorage.setItem(
      SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY,
      JSON.stringify({
        createdAtIso: '2026-05-06T09:00:00.000Z',
        paymentProvider: 'mixx',
        status: 'ready_no_visit',
        tier: 'T1',
      }),
    );

    render(<AppShell />);

    await expectHeadingVisible('Accueil');
    expect(
      screen.queryByRole('heading', { name: 'Bienvenue chez Washed.' }),
    ).not.toBeInTheDocument();
  });
});
