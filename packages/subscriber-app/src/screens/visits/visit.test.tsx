import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SubscriberApiProvider } from '../../api/SubscriberApiContext.js';
import {
  DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  SubscriberSubscriptionProvider,
  type SubscriberSubscriptionState,
} from '../../subscription/SubscriberSubscriptionContext.js';
import {
  VisitDetailX11,
  VisitEnRouteX12,
  VisitFeedbackX15,
  VisitInProgressX13,
  VisitIssueSubmittedX15S,
  VisitIssueX15S,
  VisitRescheduleX11M,
  VisitRevealX14,
} from './VisitScreens.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialEntries: readonly string[] = [path],
  options: {
    readonly api?: { readonly baseUrl?: string | null; readonly fetch?: typeof fetch };
    readonly routePath?: string;
    readonly subscriptionState?: SubscriberSubscriptionState;
  } = {},
): { locationRef: { current: string } } {
  const locationRef = { current: initialEntries.at(-1) ?? path };
  const api = options.api ?? { baseUrl: null };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <SubscriberApiProvider
      {...(api.baseUrl === undefined ? {} : { baseUrl: api.baseUrl })}
      {...(api.fetch === undefined ? {} : { fetch: api.fetch })}
    >
      <SubscriberSubscriptionProvider
        initialState={options.subscriptionState ?? DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE}
        storageKey={null}
      >
        <MemoryRouter initialEntries={[...initialEntries]} initialIndex={initialEntries.length - 1}>
          <Routes>
            <Route
              element={
                <>
                  {element}
                  <Spy />
                </>
              }
              path={options.routePath ?? path}
            />
            <Route element={<Spy />} path="*" />
          </Routes>
        </MemoryRouter>
      </SubscriberSubscriptionProvider>
    </SubscriberApiProvider>,
  );

  return { locationRef };
}

const LIVE_VISIT_ID = '44444444-4444-4444-8444-444444444444';
const LIVE_DISPUTE_ID = '55555555-5555-4555-8555-555555555555';

const LIVE_SUBSCRIPTION_STATE: SubscriberSubscriptionState = {
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
  recentVisits: [
    {
      scheduledDate: '2026-05-05',
      scheduledTimeWindow: 'morning',
      status: 'completed',
      visitId: LIVE_VISIT_ID,
      workerId: '22222222-2222-4222-8222-222222222222',
    },
  ],
  status: 'active',
  subscriptionId: '33333333-3333-4333-8333-333333333333',
  upcomingVisits: [
    {
      scheduledDate: '2026-05-12',
      scheduledTimeWindow: 'morning',
      status: 'scheduled',
      visitId: LIVE_VISIT_ID,
      workerId: '22222222-2222-4222-8222-222222222222',
    },
  ],
};

function liveSubscriptionDetail(upcomingDate = '2026-05-12'): unknown {
  return {
    address: {
      gpsLatitude: 6.1319,
      gpsLongitude: 1.2228,
      landmark: 'rue 254',
      neighborhood: 'Tokoin',
    },
    assignedWorker: {
      averageRating: null,
      completedVisitCount: 0,
      displayName: 'Akouvi K.',
      disputeCount: 0,
      workerId: '22222222-2222-4222-8222-222222222222',
    },
    countryCode: 'TG',
    monthlyPriceMinor: '2500',
    paymentMethod: null,
    phoneNumber: '+22890123456',
    recentVisits: LIVE_SUBSCRIPTION_STATE.recentVisits,
    schedulePreference: null,
    status: 'active',
    subscriberId: '99999999-9999-4999-8999-999999999999',
    subscriptionId: '33333333-3333-4333-8333-333333333333',
    supportCredits: [],
    tierCode: 'T1',
    upcomingVisits: [
      {
        scheduledDate: upcomingDate,
        scheduledTimeWindow: 'morning',
        status: 'scheduled',
        visitId: LIVE_VISIT_ID,
        workerId: '22222222-2222-4222-8222-222222222222',
      },
    ],
    visitsPerCycle: 1,
  };
}

describe('Subscriber visit · X-11 Detail', () => {
  it('renders the locked visit detail and routes the report action', () => {
    const { locationRef } = renderAt('/visit/detail', <VisitDetailX11 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-11');
    expect(screen.getByText('Prochaine visite')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Mardi 7 mai · 9:00' })).toBeVisible();
    expect(screen.getByText('Akouvi K. vient pour votre visite mensuelle.')).toBeVisible();
    expect(screen.getByText('Tokoin Casablanca')).toBeVisible();
    expect(screen.getByText('1 h 15')).toBeVisible();
    expect(screen.getByText('1 visite / mois')).toBeVisible();
    expect(screen.getByText("Vous pouvez reporter jusqu'à 18 h la veille.")).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Reporter la visite' }));
    expect(locationRef.current).toBe('/visit/reschedule');
  });

  it('uses the real upcoming visit id when routing to reschedule', () => {
    const { locationRef } = renderAt(
      `/visit/detail/${LIVE_VISIT_ID}`,
      <VisitDetailX11 />,
      [`/visit/detail/${LIVE_VISIT_ID}`],
      {
        api: { baseUrl: 'http://api.test', fetch: async () => Response.json({}) },
        routePath: '/visit/detail/:visitId',
        subscriptionState: LIVE_SUBSCRIPTION_STATE,
      },
    );

    expect(screen.getByRole('heading', { name: 'Mardi 12 mai · Matin' })).toBeVisible();
    expect(screen.getByText('Tokoin')).toBeVisible();
    expect(screen.queryByText('1 h 15')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reporter la visite' }));
    expect(locationRef.current).toBe(`/visit/reschedule/${LIVE_VISIT_ID}`);
  });
});

describe('Subscriber visit · X-11.M Reschedule', () => {
  it('lets the user pick a date and confirms back to visit detail', () => {
    const { locationRef } = renderAt('/visit/reschedule', <VisitRescheduleX11M />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-11.M');
    expect(screen.getByRole('heading', { name: 'Choisir un autre créneau.' })).toBeVisible();

    const saturday = screen.getByLabelText(/Samedi 9 mai/u) as HTMLInputElement;
    fireEvent.click(saturday);
    expect(saturday.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));
    expect(locationRef.current).toBe('/visit/detail');
  });

  it('returns to the actual previous visit page from the header control', () => {
    const { locationRef } = renderAt('/visit/reschedule', <VisitRescheduleX11M />, [
      '/visit/detail',
      '/visit/reschedule',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/visit/detail');
  });

  it('posts reschedule requests with the real upcoming visit id', async () => {
    const requests: Request[] = [];
    const fetchStub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);
      requests.push(request);

      if (request.url.endsWith(`/visits/${LIVE_VISIT_ID}/reschedule`)) {
        return Response.json({
          scheduledDate: '2026-05-09',
          scheduledTimeWindow: 'morning',
          status: 'scheduled',
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          visitId: LIVE_VISIT_ID,
          workerId: '22222222-2222-4222-8222-222222222222',
        });
      }

      return Response.json({ subscription: liveSubscriptionDetail('2026-05-09') });
    };
    const { locationRef } = renderAt(
      `/visit/reschedule/${LIVE_VISIT_ID}`,
      <VisitRescheduleX11M />,
      [`/visit/reschedule/${LIVE_VISIT_ID}`],
      {
        api: { baseUrl: 'http://api.test', fetch: fetchStub as typeof fetch },
        routePath: '/visit/reschedule/:visitId',
        subscriptionState: LIVE_SUBSCRIPTION_STATE,
      },
    );

    fireEvent.click(screen.getByLabelText(/Samedi 9 mai/u));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le report' }));

    await waitFor(() => expect(locationRef.current).toBe(`/visit/detail/${LIVE_VISIT_ID}`));
    expect(requests[0]?.url).toBe(
      `http://api.test/v1/subscriber/subscription/visits/${LIVE_VISIT_ID}/reschedule`,
    );
    await expect(requests[0]?.json()).resolves.toEqual({
      scheduledDate: '2026-05-09',
      scheduledTimeWindow: 'morning',
    });
  });
});

describe('Subscriber visit · X-12 En Route', () => {
  it('renders tracking map and ETA details', () => {
    renderAt('/visit/en-route', <VisitEnRouteX12 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-12');
    expect(screen.getByLabelText('Carte de suivi')).toBeVisible();
    expect(screen.getByText('800 m')).toBeVisible();
    expect(screen.getByText('8 min')).toBeVisible();
    expect(screen.getByText('Mise à jour toutes les 30 secondes')).toBeVisible();
  });
});

describe('Subscriber visit · X-13 In Progress', () => {
  it('renders the reassurance copy and routes close to the hub', () => {
    const { locationRef } = renderAt('/visit/in-progress', <VisitInProgressX13 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-13');
    expect(
      screen.getByRole('heading', { name: 'Le linge est entre de bonnes mains.' }),
    ).toBeVisible();
    expect(
      screen.getByText("Vous pouvez fermer l'app. On vous prévient quand c'est fini."),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: "Fermer l'app sereinement" }));
    expect(locationRef.current).toBe('/hub');
  });
});

describe('Subscriber visit · X-14 Reveal', () => {
  it('renders before/after photo panels and routes good feedback', () => {
    const { locationRef } = renderAt('/visit/reveal', <VisitRevealX14 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-14');
    expect(screen.getByLabelText('Photos avant et après')).toBeVisible();
    expect(screen.getByText('Avant — 9 h 01')).toBeVisible();
    expect(screen.getByText('Après — 10 h 04')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Tout va bien' }));
    expect(locationRef.current).toBe('/visit/feedback');
  });

  it('routes the issue branch', () => {
    const { locationRef } = renderAt('/visit/reveal', <VisitRevealX14 />);

    fireEvent.click(screen.getByRole('button', { name: 'Signaler un souci' }));
    expect(locationRef.current).toBe('/visit/issue');
  });
});

describe('Subscriber visit · X-15 Feedback', () => {
  it('renders the positive confirmation and returns to the hub', () => {
    const { locationRef } = renderAt('/visit/feedback', <VisitFeedbackX15 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15');
    expect(screen.getByRole('heading', { name: 'Merci.' })).toBeVisible();
    expect(screen.getByText('33 visites')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(locationRef.current).toBe('/hub');
  });
});

describe('Subscriber visit · X-15.S Issue', () => {
  it('selects an issue, requires a photo, then submits to the confirmation route', () => {
    const { locationRef } = renderAt('/visit/issue', <VisitIssueX15S />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15.S');
    expect(
      screen.getByText(
        'Le bureau vous rappelle dans la journée. Akouvi ne voit pas ce signalement.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Suivant · ajouter photos' })).toBeDisabled();

    const option = screen.getByLabelText('Linge mal lavé') as HTMLInputElement;
    fireEvent.click(option);
    expect(option.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Suivant · ajouter photos' }));
    expect(locationRef.current).toBe('/visit/issue');
    expect(screen.getByRole('heading', { name: 'Ajoutez des photos du souci.' })).toBeVisible();
    expect(screen.getByText('Aucune photo ajoutée')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Envoyer le signalement' })).toBeDisabled();

    const photoInput = screen.getByLabelText(/Ajouter des photos/u) as HTMLInputElement;
    const photo = new File(['photo'], 'linge-endommage.jpg', { type: 'image/jpeg' });
    fireEvent.change(photoInput, { target: { files: [photo] } });

    expect(screen.getByText('1 photo ajoutée')).toBeVisible();
    expect(screen.getByText('linge-endommage.jpg')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));
    expect(locationRef.current).toBe('/visit/issue/submitted');
  });

  it('posts issue reports against the real recent visit id', async () => {
    const requests: Request[] = [];
    const fetchStub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init);
      requests.push(request);

      return Response.json(
        {
          createdAt: '2026-05-05T10:05:00.000Z',
          description: 'Linge mal lavé. Photos : linge-endommage.jpg',
          disputeId: LIVE_DISPUTE_ID,
          issueType: 'other',
          openedByUserId: '99999999-9999-4999-8999-999999999999',
          resolvedAt: null,
          resolvedByOperatorUserId: null,
          resolutionNote: null,
          status: 'open',
          subscriberCredit: null,
          subscriberCreditId: null,
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          visitId: LIVE_VISIT_ID,
          workerId: '22222222-2222-4222-8222-222222222222',
        },
        { status: 201 },
      );
    };
    const { locationRef } = renderAt(
      `/visit/issue/${LIVE_VISIT_ID}`,
      <VisitIssueX15S />,
      [`/visit/issue/${LIVE_VISIT_ID}`],
      {
        api: { baseUrl: 'http://api.test', fetch: fetchStub as typeof fetch },
        routePath: '/visit/issue/:visitId',
        subscriptionState: LIVE_SUBSCRIPTION_STATE,
      },
    );

    fireEvent.click(screen.getByLabelText('Linge mal lavé'));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant · ajouter photos' }));
    const photoInput = screen.getByLabelText(/Ajouter des photos/u) as HTMLInputElement;
    const photo = new File(['photo'], 'linge-endommage.jpg', { type: 'image/jpeg' });
    fireEvent.change(photoInput, { target: { files: [photo] } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));

    await waitFor(() =>
      expect(locationRef.current).toBe(
        `/visit/issue/${LIVE_VISIT_ID}/submitted/${LIVE_DISPUTE_ID}`,
      ),
    );
    expect(requests[0]?.url).toBe(
      `http://api.test/v1/subscriber/subscription/visits/${LIVE_VISIT_ID}/disputes`,
    );
    await expect(requests[0]?.json()).resolves.toMatchObject({
      description: 'Linge mal lavé. Photos : linge-endommage.jpg',
      issueType: 'other',
    });
  });

  it('renders submitted confirmation and routes to the created ticket or home', () => {
    const { locationRef } = renderAt('/visit/issue/submitted', <VisitIssueSubmittedX15S />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-15.S');
    expect(screen.getByRole('heading', { name: 'Signalement reçu.' })).toBeVisible();
    expect(screen.getByText('Ticket #0421 créé. Le bureau vous répond sous 4 h.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Voir mon ticket' }));
    expect(locationRef.current).toBe('/support/tickets/0421');

    const h = renderAt('/visit/issue/submitted', <VisitIssueSubmittedX15S />);
    fireEvent.click(screen.getByRole('button', { name: "Retour à l'accueil" }));
    expect(h.locationRef.current).toBe('/hub');
  });

  it('renders live submitted confirmation without a fake support ticket link', () => {
    renderAt(
      `/visit/issue/${LIVE_VISIT_ID}/submitted/${LIVE_DISPUTE_ID}`,
      <VisitIssueSubmittedX15S />,
      [`/visit/issue/${LIVE_VISIT_ID}/submitted/${LIVE_DISPUTE_ID}`],
      { routePath: '/visit/issue/:visitId/submitted/:disputeId' },
    );

    expect(
      screen.getByText('Signalement #55555555 créé. Le bureau vous répond sous 4 h.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Voir mon ticket' })).not.toBeInTheDocument();
  });
});
