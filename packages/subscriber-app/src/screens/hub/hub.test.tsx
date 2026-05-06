import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BookingSubmittedX10C, BookingX10B } from './BookingScreens.js';
import { HubX10 } from './HubX10.js';
import { SubscriberApiProvider } from '../../api/SubscriberApiContext.js';
import { SignupProvider, type SignupInitialState } from '../onboarding/SignupContext.js';
import {
  DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY,
  SubscriberSubscriptionProvider,
  type SubscriberSubscriptionState,
} from '../../subscription/SubscriberSubscriptionContext.js';
import { TOUR_STORAGE_KEY } from './useTourState.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialSignupState: SignupInitialState = {},
  initialSubscriptionState: SubscriberSubscriptionState = DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  apiOptions: { readonly baseUrl?: string | null; readonly fetch?: typeof fetch } = {
    baseUrl: null,
  },
): { locationRef: { current: string } } {
  const locationRef = { current: path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }
  const apiProviderProps = {
    ...(apiOptions.baseUrl === undefined ? {} : { baseUrl: apiOptions.baseUrl }),
    ...(apiOptions.fetch === undefined ? {} : { fetch: apiOptions.fetch }),
  };

  render(
    <SubscriberApiProvider {...apiProviderProps}>
      <SignupProvider initialState={initialSignupState}>
        <SubscriberSubscriptionProvider initialState={initialSubscriptionState}>
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
          </MemoryRouter>
        </SubscriberSubscriptionProvider>
      </SignupProvider>
    </SubscriberApiProvider>,
  );

  return { locationRef };
}

describe('Subscriber hub · X-10', () => {
  beforeEach(() => {
    window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    window.localStorage.removeItem(SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(TOUR_STORAGE_KEY);
    window.localStorage.removeItem(SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY);
  });

  it('personalizes the greeting only after the first name has been collected', () => {
    renderAt('/hub', <HubX10 />, {
      identity: { firstName: 'Afi', lastName: 'Mensah', email: '', isAdult: true },
    });

    expect(screen.getByText('bonjour Afi')).toBeVisible();
    expect(screen.queryByText('Bonjour')).not.toBeInTheDocument();
    expect(screen.queryByText('bonjour Mariam')).not.toBeInTheDocument();
  });

  it('renders the first-time home state without a fake scheduled visit', () => {
    renderAt('/hub', <HubX10 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-10');
    expect(screen.getByText('Bonjour')).toBeVisible();
    expect(screen.queryByText('bonjour Mariam')).not.toBeInTheDocument();
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
    renderAt(
      '/hub',
      <HubX10 />,
      {},
      {
        ...DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
        firstVisitRequest: {
          dayId: 'saturday',
          requestedAtIso: '2026-05-05T10:00:00.000Z',
          timeWindowId: 'morning',
        },
        status: 'visit_request_pending',
      },
    );

    expect(screen.getByRole('heading', { name: 'Première visite en confirmation' })).toBeVisible();
    expect(screen.getByText(/Le bureau confirme votre créneau/u)).toBeVisible();
    expect(screen.getByText('Samedi · Matin')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Modifier ma demande' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Planifier ma première visite/u })).toBeNull();
    expect(
      within(screen.getByRole('region', { name: 'Forfait' })).getByText('Demande en confirmation'),
    ).toBeVisible();
  });

  it('routes scheduled visit actions with the real upcoming visit id', () => {
    const visitId = '44444444-4444-4444-8444-444444444444';
    const { locationRef } = renderAt(
      '/hub',
      <HubX10 />,
      {},
      {
        ...DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
        addressNeighborhood: 'Tokoin',
        assignedWorker: {
          averageRating: null,
          completedVisitCount: 1,
          displayName: 'Akouvi K.',
          disputeCount: 0,
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        billingStatus: {
          nextChargeAt: '2026-06-01T08:00:00.000Z',
          overdueSince: null,
          paymentAuthorizationStatus: 'ready',
        },
        isHydratedFromApi: true,
        status: 'active',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        upcomingVisits: [
          {
            scheduledDate: '2026-05-12',
            scheduledTimeWindow: 'morning',
            status: 'scheduled',
            visitId,
            workerId: '22222222-2222-4222-8222-222222222222',
          },
        ],
      },
    );

    expect(screen.getByText('Mardi 12 mai')).toBeVisible();
    expect(screen.getByText('Matin')).toBeVisible();
    expect(screen.getByText('prévue')).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Forfait' })).getByText('1 juin · auto'),
    ).toBeVisible();
    expect(screen.queryByText('Visite à planifier')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reporter' }));
    expect(locationRef.current).toBe(`/visit/reschedule/${visitId}`);
  });

  it('routes scheduled visit details with the real upcoming visit id', () => {
    const visitId = '44444444-4444-4444-8444-444444444444';
    const { locationRef } = renderAt(
      '/hub',
      <HubX10 />,
      {},
      {
        ...DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
        addressNeighborhood: 'Tokoin',
        assignedWorker: {
          averageRating: null,
          completedVisitCount: 1,
          displayName: 'Akouvi K.',
          disputeCount: 0,
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        isHydratedFromApi: true,
        status: 'active',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        upcomingVisits: [
          {
            scheduledDate: '2026-05-12',
            scheduledTimeWindow: 'morning',
            status: 'scheduled',
            visitId,
            workerId: '22222222-2222-4222-8222-222222222222',
          },
        ],
      },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Détails' }));
    expect(locationRef.current).toBe(`/visit/detail/${visitId}`);
  });

  it('routes Planifier ma première visite to the booking request screen', () => {
    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: /Planifier ma première visite/u }));
    expect(locationRef.current).toBe('/booking');
  });

  it('routes the home profile picture to the profile screen', () => {
    const { locationRef } = renderAt('/hub', <HubX10 />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le profil' }));
    expect(locationRef.current).toBe('/profile');
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
    expect(window.localStorage.getItem(SUBSCRIBER_SUBSCRIPTION_STORAGE_KEY)).toContain(
      '"status":"visit_request_pending"',
    );
  });

  it('sends the first visit request to the backend when configured', async () => {
    const requests: Request[] = [];
    const fetchStub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({
        address: {
          gpsLatitude: 6.1319,
          gpsLongitude: 1.2228,
          landmark: 'rue 254',
          neighborhood: 'Tokoin',
        },
        assignedWorker: null,
        countryCode: 'TG',
        monthlyPriceMinor: '2500',
        phoneNumber: '+22890123456',
        recentVisits: [],
        schedulePreference: {
          dayOfWeek: 'saturday',
          timeWindow: 'morning',
        },
        status: 'pending_match',
        subscriberId: '99999999-9999-4999-8999-999999999999',
        subscriptionId: '33333333-3333-4333-8333-333333333333',
        supportCredits: [],
        tierCode: 'T1',
        upcomingVisits: [],
        visitsPerCycle: 1,
      });
    };
    const { locationRef } = renderAt(
      '/booking',
      <BookingX10B />,
      {},
      {
        ...DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
        subscriptionId: '33333333-3333-4333-8333-333333333333',
      },
      { baseUrl: 'http://api.test', fetch: fetchStub as typeof fetch },
    );

    fireEvent.click(screen.getByText('Samedi'));
    fireEvent.click(screen.getByText('Matin'));
    fireEvent.click(screen.getByRole('button', { name: /Envoyer la demande/u }));

    await waitFor(() => expect(locationRef.current).toBe('/booking/submitted'));
    expect(requests[0]?.url).toBe('http://api.test/v1/subscriber/subscription/first-visit-request');
    await expect(requests[0]?.json()).resolves.toMatchObject({
      schedulePreference: {
        dayOfWeek: 'saturday',
        timeWindow: 'morning',
      },
    });
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
