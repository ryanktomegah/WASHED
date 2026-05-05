import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BookingSubmittedX10C, BookingX10B } from './BookingScreens.js';
import { HubX10 } from './HubX10.js';
import { SUBSCRIBER_FIRST_VISIT_REQUEST_STORAGE_KEY } from './subscriberHubData.js';
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
    window.localStorage.removeItem(SUBSCRIBER_FIRST_VISIT_REQUEST_STORAGE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_FIRST_VISIT_REQUEST_STORAGE_KEY);
  });

  it('renders the first-time home state without a fake scheduled visit', () => {
    renderAt('/hub', <HubX10 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-10');
    expect(screen.getByText('bonjour Mariam')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Accueil' })).toBeVisible();
    expect(screen.queryByText('Prochaine visite')).not.toBeInTheDocument();
    expect(screen.queryByText('confirmée')).not.toBeInTheDocument();
    expect(screen.queryByText('9:00')).not.toBeInTheDocument();
    expect(screen.queryByText('Akouvi K.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reporter' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Détails' })).not.toBeInTheDocument();
    expect(screen.getByText('Première visite')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Planifiez votre première visite' })).toBeVisible();
    expect(screen.getByText(/Le bureau confirme avant d'assigner votre laveuse/u)).toBeVisible();
    expect(screen.getByRole('button', { name: /Planifier ma première visite/u })).toBeEnabled();
    const plan = screen.getByRole('region', { name: 'Forfait' });
    expect(within(plan).getByText('Forfait')).toBeVisible();
    expect(within(plan).getByText('Visite à planifier')).toBeVisible();
  });

  it('renders the pending first-visit request state after a booking request', () => {
    window.localStorage.setItem(SUBSCRIBER_FIRST_VISIT_REQUEST_STORAGE_KEY, '1');
    renderAt('/hub', <HubX10 />);

    expect(screen.getByRole('heading', { name: 'Première visite en confirmation' })).toBeVisible();
    expect(screen.getByText(/Le bureau confirme votre créneau/u)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Modifier ma demande' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Planifier ma première visite/u })).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Forfait' })).getByText('Demande en confirmation'),
    ).toBeVisible();
  });

  it('routes Planifier ma première visite to the booking request screen', () => {
    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: /Planifier ma première visite/u }));
    expect(locationRef.current).toBe('/booking');
  });
});

describe('Subscriber booking · X-10B and X-10C', () => {
  it('renders day and time preferences before submitting a booking request', () => {
    const { locationRef } = renderAt('/booking', <BookingX10B />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-10B');
    expect(screen.getByRole('heading', { name: 'Quel jour vous convient ?' })).toBeVisible();
    expect(screen.getByText('1 / 2')).toBeVisible();
    expect(screen.getByText('Lundi')).toBeVisible();
    expect(screen.getByText('Mercredi')).toBeVisible();
    expect(screen.getByText('Vendredi')).toBeVisible();
    expect(screen.getByText('Samedi')).toBeVisible();
    expect(screen.getByText('Dimanche')).toBeVisible();
    expect(screen.queryByText('Matin')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Envoyer la demande/u })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Samedi'));
    expect(screen.getByRole('heading', { name: 'Quel moment ce samedi ?' })).toBeVisible();
    expect(screen.getByText('2 / 2')).toBeVisible();
    expect(screen.getByText('Jour choisi')).toBeVisible();
    expect(screen.getByText('Matin')).toBeVisible();
    expect(screen.getByText('Après-midi')).toBeVisible();
    expect(screen.getByRole('button', { name: /Envoyer la demande/u })).toBeDisabled();

    fireEvent.click(screen.getByText('Matin'));
    expect(screen.getByLabelText(/Matin/u)).toBeChecked();
    expect(screen.getByRole('button', { name: /Envoyer la demande/u })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/u }));
    expect(locationRef.current).toBe('/booking/submitted');
    expect(window.localStorage.getItem(SUBSCRIBER_FIRST_VISIT_REQUEST_STORAGE_KEY)).toBe('1');
  });

  it('returns from booking to the hub', () => {
    const { locationRef } = renderAt('/booking', <BookingX10B />);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/hub');
  });

  it('returns from the time step to day selection', () => {
    const { locationRef } = renderAt('/booking', <BookingX10B />);

    fireEvent.click(screen.getByText('Samedi'));
    expect(screen.getByRole('heading', { name: 'Quel moment ce samedi ?' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/booking');
    expect(screen.getByRole('heading', { name: 'Quel jour vous convient ?' })).toBeVisible();
    expect(screen.getByLabelText('Samedi')).toBeChecked();
  });

  it('confirms the request and returns home', () => {
    const { locationRef } = renderAt('/booking/submitted', <BookingSubmittedX10C />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-10C');
    expect(screen.getByRole('heading', { name: 'Demande envoyée.' })).toBeVisible();
    expect(
      screen.getByText('Le bureau confirme votre créneau par appel ou SMS avant la visite.'),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(locationRef.current).toBe('/hub');
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
    expect(dialog).toHaveAccessibleName('Votre accueil commence ici');
    expect(screen.getByText('Première session')).toBeVisible();
    expect(
      screen.getByText(
        'Planification, forfait et aide sont toujours à portée avant la première visite.',
      ),
    ).toBeVisible();
    expect(screen.getByText('1 / 3')).toBeVisible();
    expect(screen.getByText('nouveau')).toBeVisible();
    expect(screen.getByText('Touchez Planifier pour choisir votre premier créneau.')).toBeVisible();
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
