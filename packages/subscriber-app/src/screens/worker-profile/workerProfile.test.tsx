import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  WorkerChangeSubmittedX18C,
  WorkerChangeX18C,
  WorkerProfileX18,
} from './WorkerProfileX18.js';

function renderWorkerAt(
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
              <WorkerProfileX18 />
              <BrowserBackProbe />
              <Spy />
            </>
          }
          path="/worker/:workerId"
        />
        <Route
          element={
            <>
              <WorkerChangeX18C />
              <BrowserBackProbe />
              <Spy />
            </>
          }
          path="/worker/:workerId/change"
        />
        <Route
          element={
            <>
              <WorkerChangeSubmittedX18C />
              <BrowserBackProbe />
              <Spy />
            </>
          }
          path="/worker/:workerId/change/submitted"
        />
        <Route
          element={
            <>
              <BrowserBackProbe />
              <Spy />
            </>
          }
          path="*"
        />
      </Routes>
    </MemoryRouter>,
  );

  return { locationRef };
}

describe('Subscriber worker profile · X-18', () => {
  it('renders the locked deck copy, relationship metrics, path, and reliability', () => {
    renderWorkerAt('/worker/akouvi');

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-18');
    expect(screen.getByText('Profil de la laveuse')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Akouvi K.' })).toBeVisible();
    expect(screen.getByText('Tokoin · vit avec sa famille à 800 m de chez vous')).toBeVisible();
    expect(screen.getByText('Votre relation')).toBeVisible();
    expect(screen.getByText('8 mois')).toBeVisible();
    expect(screen.getByText('ensemble')).toBeVisible();
    expect(screen.getByText('32')).toBeVisible();
    expect(screen.getByText('visites')).toBeVisible();
    expect(screen.getByText('Son parcours')).toBeVisible();
    expect(
      screen.getByText(
        'Laveuse depuis septembre 2025. 14 foyers réguliers à Lomé. Parle français et éwé.',
      ),
    ).toBeVisible();
    expect(screen.getByText('Fiabilité')).toBeVisible();
    expect(
      screen.getByText("238 visites · 0 annulation de son fait · 100% à l'heure ce mois-ci."),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Demander un changement' })).toBeVisible();
  });

  it('routes the back control to the hub when opened directly', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi');

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/hub');
  });

  it('replaces direct-open fallback entries so browser back does not loop to profile', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi');

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/hub');

    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));

    expect(locationRef.current).toBe('/hub');
  });

  it('routes the back control to the actual previous in-app page when history exists', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi', ['/history', '/worker/akouvi']);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/history');
  });

  it('routes the change request CTA to X-18.C', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi');

    fireEvent.click(screen.getByRole('button', { name: 'Demander un changement' }));

    expect(locationRef.current).toBe('/worker/akouvi/change');
  });

  it('redirects an unknown worker id back to the hub', async () => {
    const { locationRef } = renderWorkerAt('/worker/unknown');

    await waitFor(() => {
      expect(locationRef.current).toBe('/hub');
    });
  });
});

describe('Subscriber worker change request · X-18.C', () => {
  it('renders reason choices, warning copy, and selected-state changes', () => {
    renderWorkerAt('/worker/akouvi/change');

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-18.C');
    expect(screen.getByText('Changer de laveuse')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Pourquoi voulez-vous changer ?' })).toBeVisible();
    expect(
      screen.getByText(
        'Le bureau vous appelle dans la journée pour comprendre. Akouvi ne voit pas cette demande.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Préférence personnelle')).toBeChecked();
    fireEvent.click(screen.getByText('Souci de qualité du travail'));
    expect(screen.getByLabelText('Souci de qualité du travail')).toBeChecked();
    expect(screen.getByText('À noter')).toBeVisible();
    expect(
      screen.getByText(
        'Délai habituel pour changement : 1 à 2 semaines. La prochaine visite est maintenue avec Akouvi.',
      ),
    ).toBeVisible();
  });

  it('routes back to X-18 when opened directly', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi/change');

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/worker/akouvi');
  });

  it('routes back to the actual previous in-app page when history exists', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi/change', [
      '/plan',
      '/worker/akouvi/change',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/plan');
  });

  it('submits to confirmation', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi/change');

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer la demande' }));

    expect(locationRef.current).toBe('/worker/akouvi/change/submitted');
  });
});

describe('Subscriber worker change submitted · X-18.C.S', () => {
  it('confirms the request and routes home', () => {
    const { locationRef } = renderWorkerAt('/worker/akouvi/change/submitted');

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-18.C.S');
    expect(screen.getByRole('heading', { name: 'Demande envoyée.' })).toBeVisible();
    expect(
      screen.getByText(
        'Le bureau vous appelle dans la journée. La prochaine visite reste maintenue avec Akouvi.',
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(locationRef.current).toBe('/hub');
  });
});
