import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getActiveLocale, setActiveLocale } from '@washed/i18n';

import { SUBSCRIBER_APPEARANCE_STORAGE_KEY } from './appearance/AppearanceContext.js';
import { AppShell } from './AppShell.js';
import { SUBSCRIBER_LANGUAGE_STORAGE_KEY } from './language/languageOptions.js';
import { TOUR_STORAGE_KEY } from './screens/hub/useTourState.js';

describe('Subscriber app shell · launch preferences', () => {
  beforeEach(() => {
    window.location.hash = '#/hub';
    window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    setActiveLocale('fr');
  });

  afterEach(() => {
    window.location.hash = '';
    window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
    setActiveLocale('fr');
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

  it('still shows the launch choices when preferences are already saved', async () => {
    window.localStorage.setItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY, 'en');
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');

    render(<AppShell />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-00L');
    expect(screen.getByRole('heading', { name: 'Choose language' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await waitFor(() => expect(document.body).toHaveAttribute('data-color-mode', 'dark'));

    fireEvent.click(screen.getByRole('radio', { name: /Français/u }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(screen.getByRole('heading', { name: "Choisir l'apparence" })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Clair/u }));
    await waitFor(() => expect(document.body).toHaveAttribute('data-color-mode', 'light'));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(await screen.findByRole('heading', { name: 'Accueil' })).toBeVisible();
    await waitFor(() =>
      expect(window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY)).toBe('light'),
    );
  });
});
