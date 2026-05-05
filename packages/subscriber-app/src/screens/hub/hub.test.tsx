import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
  });
  afterEach(() => {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  });

  it('renders the locked deck copy: greeting, visit card, actions, and plan progress', () => {
    renderAt('/hub', <HubX10 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-10');
    expect(screen.getByText('bonjour Mariam')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Accueil' })).toBeVisible();
    expect(screen.getByText('Prochaine visite')).toBeVisible();
    expect(screen.getByText('confirmée')).toBeVisible();
    expect(screen.getByText('9:00')).toBeVisible();
    expect(screen.getByText('mar 7 mai')).toBeVisible();
    expect(screen.getByText('Akouvi K.')).toBeVisible();
    expect(screen.getByText('votre laveuse · 8 mois')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reporter' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Détails' })).toBeEnabled();
    expect(screen.getByText('forfait actif')).toBeVisible();
    expect(screen.getByText('31 mai')).toBeVisible();
  });

  it('routes Détails to X-11 visit detail', () => {
    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: 'Détails' }));
    expect(locationRef.current).toBe('/visit/detail');
  });

  it('routes Reporter to X-11.M reschedule', () => {
    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: 'Reporter' }));
    expect(locationRef.current).toBe('/visit/reschedule');
  });

  it('routes the worker card to X-18 worker profile', () => {
    const { locationRef } = renderAt('/hub', <HubX10 />);

    fireEvent.click(screen.getByRole('button', { name: 'Akouvi K.' }));

    expect(locationRef.current).toBe('/worker/akouvi');
  });
});

describe('Subscriber tour · X-09', () => {
  beforeEach(() => {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
  });

  it('mounts the locked first-session screen on first visit', () => {
    renderAt('/hub', <HubX10 />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-screen-id', 'X-09');
    expect(dialog).toHaveAccessibleName('Votre accueil reste simple');
    expect(screen.getByText('Première session')).toBeVisible();
    expect(
      screen.getByText('Prochaine visite, laveuse, forfait et aide sont toujours à portée.'),
    ).toBeVisible();
    expect(screen.getByText('1 / 3')).toBeVisible();
    expect(screen.getByText('nouveau')).toBeVisible();
    expect(screen.getByText('Touchez la carte de visite pour voir le détail.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('dismisses with Suivant and persists the completed flag', () => {
    renderAt('/hub', <HubX10 />);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });

  it('does not remount the tour on subsequent visits to the hub', () => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    renderAt('/hub', <HubX10 />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
