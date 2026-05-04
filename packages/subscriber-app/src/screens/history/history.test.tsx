import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { HistoryDetailX17, HistoryX16 } from './HistoryX16.js';

function renderHistoryAt(
  path: string,
  initialEntries: readonly string[] = [path],
): { locationRef: { current: string } } {
  const locationRef = { current: initialEntries.at(-1) ?? path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  function BrowserBackProbe(): ReactElement {
    const navigate = useNavigate();

    return (
      <button onClick={() => navigate(-1)} type="button">
        Browser back
      </button>
    );
  }

  render(
    <MemoryRouter initialEntries={[...initialEntries]} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route
          element={
            <>
              <HistoryX16 />
              <BrowserBackProbe />
              <Spy />
            </>
          }
          path="/history"
        />
        <Route
          element={
            <>
              <HistoryDetailX17 />
              <BrowserBackProbe />
              <Spy />
            </>
          }
          path="/history/:visitId"
        />
        <Route element={<Spy />} path="*" />
      </Routes>
    </MemoryRouter>,
  );

  return { locationRef };
}

describe('Subscriber history · X-16', () => {
  it('renders the locked deck copy, stats, and recent visit list', () => {
    renderHistoryAt('/history');

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-16');
    expect(screen.getByText('Vos visites')).toBeVisible();
    expect(screen.getByText('Akouvi')).toBeVisible();
    expect(screen.getByText(/depuis 8 mois/u)).toBeVisible();
    expect(screen.getByText('Compteur')).toBeVisible();
    expect(screen.getByText('32')).toBeVisible();
    expect(screen.getByText('Total payé')).toBeVisible();
    expect(screen.getByText(/80\s000/u)).toBeVisible();
    expect(screen.getByText('Récentes')).toBeVisible();
    expect(screen.getByRole('button', { name: /28 avr · 9 h 02/u })).toBeVisible();
    expect(screen.getByText('1 h 06 · pas de souci')).toBeVisible();
  });

  it('routes a recent visit card to X-17 detail', () => {
    const { locationRef } = renderHistoryAt('/history');

    fireEvent.click(screen.getByRole('button', { name: /28 avr · 9 h 02/u }));

    expect(locationRef.current).toBe('/history/visit-2026-04-28');
  });

  it('routes the Accueil nav item back to the hub', () => {
    const { locationRef } = renderHistoryAt('/history');

    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }));

    expect(locationRef.current).toBe('/hub');
  });
});

describe('Subscriber history detail · X-17', () => {
  it('renders the past visit detail, before/after panels, timeline, and payment recap', () => {
    renderHistoryAt('/history/visit-2026-04-28');

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-17');
    expect(screen.getByText('Visite · 28 avril')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Bonne visite\. 1 h 06 avec Akouvi\./u }),
    ).toBeVisible();
    expect(screen.getByLabelText('Photos avant et après')).toBeVisible();
    expect(screen.getByText('Avant')).toBeVisible();
    expect(screen.getByText('Après')).toBeVisible();
    expect(screen.getByText('Déroulé')).toBeVisible();
    expect(screen.getByText('Arrivée')).toBeVisible();
    expect(screen.getByText('9 h 02')).toBeVisible();
    expect(screen.getByText('Photo avant')).toBeVisible();
    expect(screen.getByText('9 h 03')).toBeVisible();
    expect(screen.getByText('Photo après')).toBeVisible();
    expect(screen.getByText('10 h 04')).toBeVisible();
    expect(screen.getByText('Fin')).toBeVisible();
    expect(screen.getByText('10 h 07')).toBeVisible();
    expect(screen.getByText('Paiement')).toBeVisible();
    expect(screen.getByText('Visite incluse au forfait')).toBeVisible();
    expect(screen.getByText(/0\sXOF/u)).toBeVisible();
  });

  it('routes the back control to X-16 history when opened directly', () => {
    const { locationRef } = renderHistoryAt('/history/visit-2026-04-28');

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/history');
  });

  it('replaces direct-open fallback entries so browser back does not loop to detail', () => {
    const { locationRef } = renderHistoryAt('/history/visit-2026-04-28');

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/history');

    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));

    expect(locationRef.current).toBe('/history');
  });

  it('routes the back control to the actual previous in-app page when history exists', () => {
    const { locationRef } = renderHistoryAt('/history/visit-2026-04-28', [
      '/plan',
      '/history/visit-2026-04-28',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/plan');
  });

  it('routes posteriori report action to the issue branch', () => {
    const { locationRef } = renderHistoryAt('/history/visit-2026-04-28');

    fireEvent.click(screen.getByRole('button', { name: 'Signaler a posteriori' }));

    expect(locationRef.current).toBe('/visit/issue');
  });

  it('redirects an unknown past visit id back to history', async () => {
    const { locationRef } = renderHistoryAt('/history/unknown');

    await waitFor(() => {
      expect(locationRef.current).toBe('/history');
    });
  });
});
