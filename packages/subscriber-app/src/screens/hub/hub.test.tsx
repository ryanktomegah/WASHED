import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HubX10 } from './HubX10.js';

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
  });
  afterEach(() => {
    vi.useRealTimers();
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

    // Nav — Accueil active, Visites/Forfait/Profil disabled in this sprint.
    const home = screen.getByRole('button', { name: 'Accueil' });
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Visites' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Forfait' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Profil' })).toBeDisabled();
  });

  it('routes the Détail and Voir les visites CTAs to /visit/detail', () => {
    vi.setSystemTime(new Date('2026-05-03T09:30:00.000'));

    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: 'Détail' }));
    expect(locationRef.current).toBe('/visit/detail');
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
