import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HubX10 } from './HubX10.js';
import { TOUR_STORAGE_KEY } from './useTourState.js';

function renderAt(path: string, element: ReactElement): { locationRef: { current: string } } {
  const locationRef = { current: path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          element={
            <>
              {element}
              <Spy />
            </>
          }
          path={path}
        />
        <Route element={<Spy />} path="*" />
      </Routes>
    </MemoryRouter>,
  );

  return { locationRef };
}

describe('Subscriber hub · X-10', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Hub tests assert hub-only behavior — pre-mark the X-09 tour
    // completed so it doesn't overlay the queries below.
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
  });
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  });

  it('renders the locked deck copy: greeting, next visit, worker tenure, streak, nav', () => {
    // Pin time-of-day so the greeting selection is deterministic.
    vi.setSystemTime(new Date('2026-05-03T09:30:00.000'));

    renderAt('/hub', <HubX10 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-10');

    // Time-of-day greeting selected from the deck (morning bucket).
    expect(screen.getByText('Bonjour Yawa.')).toBeVisible();

    // Next visit eyebrow + italic Fraunces day/time.
    expect(screen.getByText('Prochaine visite')).toBeVisible();
    expect(screen.getByText('Mardi')).toBeVisible();
    expect(screen.getByText('9 h 00')).toBeVisible();
    expect(screen.getByText('Dans 2 jours · 21 h')).toBeVisible();

    // Worker card.
    expect(screen.getByText('Akouvi K.')).toBeVisible();
    expect(screen.getByText('Tokoin · 8 mois chez vous')).toBeVisible();
    expect(screen.getByText('prête')).toBeVisible();

    // Streak card.
    expect(screen.getByText('Dernière visite · 28 avril')).toBeVisible();
    expect(screen.getByText('32 visites')).toBeVisible();

    // Nav — Accueil active; Visites + Forfait deliver. Profil still pending.
    const home = screen.getByRole('button', { name: 'Accueil' });
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Visites' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Forfait' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Profil' })).toBeDisabled();
  });

  it('routes the Forfait nav item to X-19 plan', () => {
    vi.setSystemTime(new Date('2026-05-03T09:30:00.000'));

    const { locationRef } = renderAt('/hub', <HubX10 />);

    fireEvent.click(screen.getByRole('button', { name: 'Forfait' }));

    expect(locationRef.current).toBe('/plan');
  });

  it('routes Détail to X-11 visit detail', () => {
    vi.setSystemTime(new Date('2026-05-03T09:30:00.000'));

    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: 'Détail' }));
    expect(locationRef.current).toBe('/visit/detail');
  });

  it('routes Voir les visites to X-16 history', () => {
    vi.setSystemTime(new Date('2026-05-03T09:30:00.000'));

    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: 'Voir les visites' }));
    expect(locationRef.current).toBe('/history');
  });

  it('routes the worker card to X-18 worker profile', () => {
    vi.setSystemTime(new Date('2026-05-03T09:30:00.000'));

    const { locationRef } = renderAt('/hub', <HubX10 />);

    fireEvent.click(screen.getByRole('button', { name: 'Akouvi K.' }));

    expect(locationRef.current).toBe('/worker/akouvi');
  });

  it('routes the Visites nav item to X-16 history', () => {
    vi.setSystemTime(new Date('2026-05-03T09:30:00.000'));

    const { locationRef } = renderAt('/hub', <HubX10 />);

    fireEvent.click(screen.getByRole('button', { name: 'Visites' }));

    expect(locationRef.current).toBe('/history');
  });

  it('switches the greeting to afternoon between 12h and 18h', () => {
    vi.setSystemTime(new Date('2026-05-03T14:00:00.000'));

    renderAt('/hub', <HubX10 />);
    expect(screen.getByText('Bon après-midi Yawa.')).toBeVisible();
  });

  it('switches the greeting to evening after 18h', () => {
    vi.setSystemTime(new Date('2026-05-03T20:00:00.000'));

    renderAt('/hub', <HubX10 />);
    expect(screen.getByText('Bonsoir Yawa.')).toBeVisible();
  });
});

describe('Subscriber tour · X-09 (overlay on hub)', () => {
  beforeEach(() => {
    // Tour assertions need a clean storage so the overlay mounts.
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  });

  it('mounts step 1 over the hub on first visit, with deck copy', () => {
    renderAt('/hub', <HubX10 />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-screen-id', 'X-09');
    expect(dialog).toHaveAccessibleName('Votre prochaine visite est ici.');
    expect(screen.getByText(/1 \/ 3 · DÉCOUVERTE/u)).toBeVisible();
    expect(
      screen.getByText(
        "Toutes les semaines, votre laveuse vient le jour convenu. Vous saurez quand elle arrive — par SMS et dans l'app.",
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('advances through step 2 → 3 then commits the completed flag on finish', () => {
    renderAt('/hub', <HubX10 />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText(/2 \/ 3 · DÉCOUVERTE/u)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Votre laveuse, toujours la même.' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Précédent' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText(/3 \/ 3 · DÉCOUVERTE/u)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Une relation qui dure.' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Commencer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('Passer dismisses immediately and persists the flag', () => {
    renderAt('/hub', <HubX10 />);

    fireEvent.click(screen.getByRole('button', { name: 'Passer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('does not remount the tour on subsequent visits to the hub', () => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    renderAt('/hub', <HubX10 />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
