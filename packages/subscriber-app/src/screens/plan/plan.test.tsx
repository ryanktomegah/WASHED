import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import {
  PlanOverdueX23,
  PlanPauseConfirmX22,
  PlanPausedSuccessX22A,
  PlanPausedX19R,
  PlanPaymentHistoryX20,
  PlanPaymentMethodX21,
  PlanUpgradeX19U,
  PlanX19,
} from './PlanScreens.js';
import { SignupProvider, type SignupInitialState } from '../onboarding/SignupContext.js';
import {
  DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  SubscriberSubscriptionProvider,
  type SubscriberSubscriptionState,
} from '../../subscription/SubscriberSubscriptionContext.js';
import { SubscriberApiProvider } from '../../api/SubscriberApiContext.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialEntries: readonly string[] = [path],
  initialSubscriptionState: SubscriberSubscriptionState = DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  initialSignupState: SignupInitialState = {},
  api: { readonly baseUrl: string; readonly fetch: typeof fetch } | null = null,
): { locationRef: { current: string } } {
  const locationRef = { current: initialEntries.at(-1) ?? path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <SubscriberApiProvider
      baseUrl={api?.baseUrl ?? null}
      {...(api === null ? {} : { fetch: api.fetch })}
    >
      <SignupProvider initialState={initialSignupState}>
        <SubscriberSubscriptionProvider initialState={initialSubscriptionState} storageKey={null}>
          <MemoryRouter
            initialEntries={[...initialEntries]}
            initialIndex={initialEntries.length - 1}
          >
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

const ACTIVE_SUBSCRIPTION_STATE: SubscriberSubscriptionState = {
  ...DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  status: 'active',
  subscriptionId: '33333333-3333-4333-8333-333333333333',
};

function subscriptionDetail(
  input: Partial<{
    readonly paymentMethod: {
      readonly phoneNumber: string;
      readonly provider: 'flooz' | 'mixx';
    } | null;
    readonly status: string;
    readonly tierCode: string;
  }> = {},
): Record<string, unknown> {
  return {
    address: {
      gpsLatitude: 6.1319,
      gpsLongitude: 1.2228,
      landmark: 'Pres de la pharmacie du quartier',
      neighborhood: 'Tokoin',
    },
    assignedWorker: null,
    countryCode: 'TG',
    monthlyPriceMinor: input.tierCode === 'T2' ? '4500' : '2500',
    paymentMethod:
      input.paymentMethod === undefined
        ? { phoneNumber: '+22890123456', provider: 'mixx' }
        : input.paymentMethod,
    phoneNumber: '+22890123456',
    recentVisits: [],
    schedulePreference: { dayOfWeek: 'tuesday', timeWindow: 'morning' },
    status: input.status ?? 'active',
    subscriberId: '99999999-9999-4999-8999-999999999999',
    subscriptionId: '33333333-3333-4333-8333-333333333333',
    supportCredits: [],
    tierCode: input.tierCode ?? 'T1',
    upcomingVisits: [],
    visitsPerCycle: input.tierCode === 'T2' ? 2 : 1,
  };
}

describe('Subscriber plan · X-19', () => {
  it('renders the first-time subscription state without fake visits or payments', () => {
    renderAt('/plan', <PlanX19 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-19');
    expect(screen.getByText('Votre forfait')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Votre forfait est prêt.' })).toBeVisible();
    expect(screen.getByText(/Une visite · 2\s500\s+XOF \/ mois/u)).toBeVisible();
    expect(screen.getByText('Visite à planifier')).toBeVisible();
    expect(screen.queryByText('Mardi 5 mai · 9 h 00')).not.toBeInTheDocument();
    expect(screen.queryByText('avec Akouvi K.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Planifier ma première visite/u })).toBeVisible();
  });

  it('renders active subscription details when the subscription is active', () => {
    renderAt('/plan', <PlanX19 />, ['/plan'], ACTIVE_SUBSCRIPTION_STATE);

    expect(screen.getByRole('heading', { name: /Compte bon jusqu'au 31 mai/u })).toBeVisible();
    expect(screen.getByText(/Une visite · 2\s500\s+XOF \/ mois/u)).toBeVisible();
    expect(screen.getByText('1 juin · auto')).toBeVisible();
    expect(screen.getByText('Mardi 5 mai · 9 h 00')).toBeVisible();
    expect(screen.getByText('avec Akouvi K.')).toBeVisible();
  });

  it('routes first-visit planning to booking while pending activation', () => {
    const { locationRef } = renderAt('/plan', <PlanX19 />);
    fireEvent.click(screen.getByRole('button', { name: /Planifier ma première visite/u }));
    expect(locationRef.current).toBe('/booking');
  });

  it('routes active plan actions to upgrade and pause', () => {
    const { locationRef } = renderAt('/plan', <PlanX19 />, ['/plan'], ACTIVE_SUBSCRIPTION_STATE);
    fireEvent.click(screen.getByRole('button', { name: 'Passer à 2 visites' }));
    expect(locationRef.current).toBe('/plan/upgrade');

    const pause = renderAt('/plan', <PlanX19 />, ['/plan'], ACTIVE_SUBSCRIPTION_STATE);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre en pause' }));
    expect(pause.locationRef.current).toBe('/plan/pause');
  });

  it('routes payment detail actions to X-20 and X-21', () => {
    const { locationRef } = renderAt('/plan', <PlanX19 />, ['/plan'], ACTIVE_SUBSCRIPTION_STATE);
    fireEvent.click(screen.getByRole('button', { name: 'Voir les paiements' }));
    expect(locationRef.current).toBe('/plan/payments');

    const method = renderAt('/plan', <PlanX19 />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier le moyen' }));
    expect(method.locationRef.current).toBe('/plan/payment-method');
  });

  it('marks Forfait active in the bottom nav', () => {
    renderAt('/plan', <PlanX19 />);
    const forfait = screen.getByRole('button', { name: 'Forfait' });
    expect(forfait).toHaveAttribute('aria-current', 'page');
  });
});

describe('Subscriber plan · X-20 Payment history', () => {
  it('renders an empty payment history before the first visit is scheduled', () => {
    renderAt('/plan/payments', <PlanPaymentHistoryX20 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-20');
    expect(screen.getByRole('heading', { name: /0 mois de prélèvements/u })).toBeVisible();
    expect(screen.getByText('Aucun paiement encore.')).toBeVisible();
    expect(screen.queryByText('Mixx by Yas · MM-78423190')).not.toBeInTheDocument();
  });

  it('renders payment totals and receipt rows from the deck for active subscriptions', () => {
    renderAt(
      '/plan/payments',
      <PlanPaymentHistoryX20 />,
      ['/plan/payments'],
      ACTIVE_SUBSCRIPTION_STATE,
    );

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-20');
    expect(screen.getByRole('heading', { name: /8 mois de prélèvements/u })).toBeVisible();
    expect(screen.getByText('Total payé')).toBeVisible();
    expect(screen.getByText(/20\s000\s+XOF/u)).toBeVisible();
    expect(screen.getByText('8 prélèvements')).toBeVisible();
    expect(screen.getByText('1 mai 2026')).toBeVisible();
    expect(screen.getByText('Mixx by Yas · MM-78423190')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Télécharger les reçus' })).toBeVisible();
  });

  it('uses backend billing history when the subscriber API is configured', async () => {
    const requests: Request[] = [];
    const apiFetch: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({
        items: [
          {
            amount: { amountMinor: '2500', currencyCode: 'XOF' },
            itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            itemType: 'charge',
            occurredAt: '2026-05-01T08:00:00.000Z',
            paymentAttemptId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            provider: 'mobile_money_http',
            providerReference: 'MM-REAL-001',
            reason: null,
            refundId: null,
            status: 'succeeded',
            subscriptionId: '33333333-3333-4333-8333-333333333333',
          },
        ],
        limit: 25,
        subscriptionId: '33333333-3333-4333-8333-333333333333',
      });
    };

    renderAt(
      '/plan/payments',
      <PlanPaymentHistoryX20 />,
      ['/plan/payments'],
      ACTIVE_SUBSCRIPTION_STATE,
      {},
      { baseUrl: 'http://api.test', fetch: apiFetch },
    );

    await waitFor(() => expect(screen.getByText('Mobile Money · MM-REAL-001')).toBeVisible());
    expect(requests[0]?.url).toBe(
      'http://api.test/v1/subscriber/subscription/billing-history?limit=25',
    );
    expect(screen.queryByText('Mixx by Yas · MM-78423190')).not.toBeInTheDocument();
  });

  it('back button returns to /plan', () => {
    const { locationRef } = renderAt('/plan/payments', <PlanPaymentHistoryX20 />);
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/plan');
  });
});

describe('Subscriber plan · X-21 Payment method', () => {
  it('renders Mobile Money providers with the current account marked active', () => {
    renderAt('/plan/payment-method', <PlanPaymentMethodX21 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-21');
    expect(screen.getByRole('heading', { name: 'Mobile Money' })).toBeVisible();
    expect(
      screen.getByText("L'argent quitte votre Mobile Money le 1er de chaque mois."),
    ).toBeVisible();
    expect(screen.getByText('Mixx by Yas')).toBeVisible();
    expect(screen.getByText('À compléter · actuel')).toBeVisible();
    expect(screen.getByText('ACTIF')).toBeVisible();
    expect(screen.getByText('Flooz')).toBeVisible();
    expect(screen.getByText('+ Ajouter un Flooz')).toBeVisible();
  });

  it('save returns to /plan', () => {
    const { locationRef } = renderAt('/plan/payment-method', <PlanPaymentMethodX21 />);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(locationRef.current).toBe('/plan');
  });

  it('sends payment method updates to the backend when configured', async () => {
    const requests: Request[] = [];
    const apiFetch: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json(
        subscriptionDetail({
          paymentMethod: { phoneNumber: '+22890123456', provider: 'flooz' },
        }),
      );
    };
    const { locationRef } = renderAt(
      '/plan/payment-method',
      <PlanPaymentMethodX21 />,
      ['/plan/payment-method'],
      {
        ...ACTIVE_SUBSCRIPTION_STATE,
        paymentPhoneNumber: '+22890123456',
      },
      {},
      { baseUrl: 'http://api.test', fetch: apiFetch },
    );
    const floozButton = screen
      .getAllByRole('button')
      .find(
        (button) =>
          button.textContent?.includes('Flooz') === true && !button.hasAttribute('disabled'),
      );

    expect(floozButton).not.toBeUndefined();
    fireEvent.click(floozButton as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(locationRef.current).toBe('/plan'));
    expect(requests[0]?.method).toBe('PUT');
    expect(requests[0]?.url).toBe('http://api.test/v1/subscriber/subscription/payment-method');
    await expect(requests[0]?.json()).resolves.toEqual({
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'flooz',
      },
      updatedAt: expect.any(String),
    });
  });

  it('header back returns to the actual previous in-app page before falling back', () => {
    const { locationRef } = renderAt('/plan/payment-method', <PlanPaymentMethodX21 />, [
      '/history',
      '/plan/payment-method',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/history');
  });
});

describe('Subscriber plan · X-23 Overdue banner', () => {
  it('renders the failed-payment banner and grays the next visit state', () => {
    renderAt('/plan/overdue', <PlanOverdueX23 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-23');
    expect(screen.getByText("Le paiement n'a pas abouti.")).toBeVisible();
    expect(
      screen.getByText('Solde Mobile Money insuffisant. Rechargez puis nous réessayons demain.'),
    ).toBeVisible();
    expect(
      screen.getByText("3 tentatives échouées. Visite en pause jusqu'au paiement."),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Réessayer maintenant' })).toBeVisible();
    expect(screen.getByText('en attente de paiement')).toBeVisible();
  });

  it('routes retry to payment method', () => {
    const { locationRef } = renderAt('/plan/overdue', <PlanOverdueX23 />);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer maintenant' }));
    expect(locationRef.current).toBe('/plan');
  });
});

describe('Subscriber plan · X-19.U Upgrade', () => {
  it('renders the compare card with savings highlight', () => {
    renderAt('/plan/upgrade', <PlanUpgradeX19U />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-19.U');
    expect(screen.getByRole('heading', { name: 'Deux visites par mois.' })).toBeVisible();
    // Current line: spans within a flex row — getByText doesn't match
    // the line as a whole. Each amount appears in its own <span>.
    expect(screen.getByText(/^2\s500\s+XOF$/u)).toBeVisible(); // current
    expect(screen.getByText(/^4\s500\s+XOF$/u)).toBeVisible(); // new (compare row)
    expect(screen.getByText(/—\s500\s+XOF/u)).toBeVisible(); // savings line
    expect(screen.getByRole('button', { name: /Confirmer · 4\s500\s+XOF \/ mois/u })).toBeVisible();
  });

  it('routes confirm and cancel back to /plan', () => {
    const confirm = renderAt('/plan/upgrade', <PlanUpgradeX19U />);
    fireEvent.click(screen.getByRole('button', { name: /Confirmer · 4\s500\s+XOF \/ mois/u }));
    expect(confirm.locationRef.current).toBe('/plan');

    const cancel = renderAt('/plan/upgrade', <PlanUpgradeX19U />);
    fireEvent.click(screen.getByRole('button', { name: 'Garder mon forfait' }));
    expect(cancel.locationRef.current).toBe('/plan');
  });

  it('sends tier changes to the backend when configured', async () => {
    const requests: Request[] = [];
    const apiFetch: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json(subscriptionDetail({ tierCode: 'T2' }));
    };
    const { locationRef } = renderAt(
      '/plan/upgrade',
      <PlanUpgradeX19U />,
      ['/plan/upgrade'],
      ACTIVE_SUBSCRIPTION_STATE,
      {},
      { baseUrl: 'http://api.test', fetch: apiFetch },
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmer · 4\s500\s+XOF \/ mois/u }));

    await waitFor(() => expect(locationRef.current).toBe('/plan'));
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://api.test/v1/subscriber/subscription/tier');
    await expect(requests[0]?.json()).resolves.toMatchObject({ tierCode: 'T2' });
  });
});

describe('Subscriber plan · X-22 Pause confirmation', () => {
  it('explains relational impact and surfaces the cheaper alternative', () => {
    renderAt('/plan/pause', <PlanPauseConfirmX22 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-22');
    expect(screen.getByRole('heading', { name: 'Vous êtes sûre ?' })).toBeVisible();
    expect(screen.getByText(/Akouvi ne reviendra plus/u)).toBeVisible();
    expect(screen.getByText('Ce qui va arriver')).toBeVisible();
    expect(screen.getByText("Si c'est une question de prix")).toBeVisible();
  });

  it('Garder mon forfait returns to /plan', () => {
    const { locationRef } = renderAt('/plan/pause', <PlanPauseConfirmX22 />);
    fireEvent.click(screen.getByRole('button', { name: 'Garder mon forfait' }));
    expect(locationRef.current).toBe('/plan');
  });

  it('Mettre en pause confirms and routes to /plan/pause/submitted', () => {
    // The header eyebrow renders the same label uppercased — query the
    // confirmation button by its danger class to disambiguate.
    const { locationRef } = renderAt('/plan/pause', <PlanPauseConfirmX22 />);
    const danger = document.querySelector('button.plan-button.danger');
    expect(danger).not.toBeNull();
    fireEvent.click(danger as Element);
    expect(locationRef.current).toBe('/plan/pause/submitted');
  });

  it('sends pause requests to the backend when configured', async () => {
    const requests: Request[] = [];
    const apiFetch: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json(subscriptionDetail({ status: 'paused' }));
    };
    const { locationRef } = renderAt(
      '/plan/pause',
      <PlanPauseConfirmX22 />,
      ['/plan/pause'],
      ACTIVE_SUBSCRIPTION_STATE,
      {},
      { baseUrl: 'http://api.test', fetch: apiFetch },
    );
    const danger = document.querySelector('button.plan-button.danger');

    fireEvent.click(danger as Element);

    await waitFor(() => expect(locationRef.current).toBe('/plan/pause/submitted'));
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://api.test/v1/subscriber/subscription/pause');
    await expect(requests[0]?.json()).resolves.toEqual({
      pausedAt: expect.any(String),
    });
  });
});

describe('Subscriber plan · X-22.A Pause submitted', () => {
  it('shows the pause icon, italic accent, and reminder card', () => {
    renderAt('/plan/pause/submitted', <PlanPausedSuccessX22A />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-22.A');
    expect(screen.getByRole('heading', { name: /Pause/u })).toBeVisible();
    expect(screen.getByText('Ce qui change maintenant')).toBeVisible();
    expect(screen.getByText('Rappel · délai max')).toBeVisible();
    expect(screen.getByText(/14 août/u)).toBeVisible();
  });

  it('Compris routes to /plan/paused', () => {
    const { locationRef } = renderAt('/plan/pause/submitted', <PlanPausedSuccessX22A />);
    fireEvent.click(screen.getByRole('button', { name: 'Compris' }));
    expect(locationRef.current).toBe('/plan/paused');
  });
});

describe('Subscriber plan · X-19.R Paused', () => {
  it('renders the warn header, reservation card, and 3-month deadline', () => {
    renderAt('/plan/paused', <PlanPausedX19R />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-19.R');
    expect(screen.getByText('FORFAIT EN PAUSE')).toBeVisible();
    expect(screen.getByText("Aucune visite jusqu'à reprise.")).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Tout est prêt à reprendre.' })).toBeVisible();
    expect(screen.getByText('Akouvi K. vous attend.')).toBeVisible();
    expect(screen.getByText(/14 août/u)).toBeVisible();
  });

  it('Reprendre maintenant routes back to /plan (active)', () => {
    const { locationRef } = renderAt('/plan/paused', <PlanPausedX19R />);
    fireEvent.click(screen.getByRole('button', { name: 'Reprendre maintenant' }));
    expect(locationRef.current).toBe('/plan');
  });

  it('sends resume requests to the backend when configured', async () => {
    const requests: Request[] = [];
    const apiFetch: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json(subscriptionDetail({ status: 'active' }));
    };
    const { locationRef } = renderAt(
      '/plan/paused',
      <PlanPausedX19R />,
      ['/plan/paused'],
      { ...ACTIVE_SUBSCRIPTION_STATE, status: 'paused' },
      {},
      { baseUrl: 'http://api.test', fetch: apiFetch },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reprendre maintenant' }));

    await waitFor(() => expect(locationRef.current).toBe('/plan'));
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://api.test/v1/subscriber/subscription/resume');
    await expect(requests[0]?.json()).resolves.toEqual({
      resumedAt: expect.any(String),
    });
  });
});
