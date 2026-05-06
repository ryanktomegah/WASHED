import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getActiveLocale, setActiveLocale } from '@washed/i18n';

import { SUBSCRIBER_APPEARANCE_STORAGE_KEY } from './appearance/AppearanceContext.js';
import { AppShell, SUBSCRIBER_RESTORE_MIN_MS } from './AppShell.js';
import { SUBSCRIBER_AUTH_STORAGE_KEY } from './api/SubscriberApiContext.js';
import { SUBSCRIBER_LANGUAGE_STORAGE_KEY } from './language/languageOptions.js';
import { TOUR_STORAGE_KEY } from './screens/hub/useTourState.js';
import { SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY } from './subscription/SubscriberSubscriptionContext.js';

describe('Subscriber app shell · launch preferences', () => {
  beforeEach(() => {
    window.location.hash = '#/hub';
    window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY);
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    setActiveLocale('fr');
  });

  afterEach(() => {
    window.location.hash = '';
    window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_AUTH_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
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

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeVisible();
    await waitFor(() =>
      expect(window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY)).toBe('dark'),
    );
  });

  it('opens the app directly when launch preferences are already saved', async () => {
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'en');
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');

    render(<AppShell />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00R');
    expect(screen.getByRole('status', { name: 'Restoring your session…' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Choose language' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Choose appearance' })).not.toBeInTheDocument();
    await waitFor(() => expect(document.body).toHaveAttribute('data-color-mode', 'dark'));
  });

  it('keeps the restore skeleton visible for the startup minimum', async () => {
    vi.useFakeTimers();
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'en');
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');

    render(<AppShell />);

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

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeVisible();
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

    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Bienvenue chez Washed.' }),
    ).not.toBeInTheDocument();
  });
});
