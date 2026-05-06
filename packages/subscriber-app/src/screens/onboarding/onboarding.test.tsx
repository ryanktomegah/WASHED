import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BookingX10B } from '../hub/BookingScreens.js';
import {
  SUBSCRIBER_AUTH_STORAGE_KEY,
  SUBSCRIBER_DEVICE_ID_STORAGE_KEY,
  SubscriberApiProvider,
} from '../../api/SubscriberApiContext.js';
import {
  DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  SubscriberSubscriptionProvider,
} from '../../subscription/SubscriberSubscriptionContext.js';
import { AddressX04 } from './AddressX04.js';
import { IdentityX03I } from './IdentityX03I.js';
import { OtpX03 } from './OtpX03.js';
import { PaymentX06 } from './PaymentX06.js';
import { PhoneX02 } from './PhoneX02.js';
import { ReviewX07 } from './ReviewX07.js';
import { SignupProvider, type SignupIdentity, type SignupInitialState } from './SignupContext.js';
import { SplashX01 } from './SplashX01.js';
import { TierX05 } from './TierX05.js';
import { WelcomeX08 } from './WelcomeX08.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialSignupState: SignupInitialState = {},
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
        <SubscriberSubscriptionProvider
          initialState={DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE}
          storageKey={null}
        >
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

function renderWelcomeBookingFlow(): { locationRef: { current: string } } {
  const locationRef = { current: '/signup/welcome' };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <SubscriberApiProvider baseUrl={null}>
      <SignupProvider initialState={{}}>
        <SubscriberSubscriptionProvider
          initialState={DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE}
          storageKey={null}
        >
          <MemoryRouter initialEntries={['/signup/welcome']}>
            <Routes>
              <Route
                element={
                  <>
                    <WelcomeX08 />
                    <Spy />
                  </>
                }
                path="/signup/welcome"
              />
              <Route
                element={
                  <>
                    <BookingX10B />
                    <Spy />
                  </>
                }
                path="/booking"
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

const TEST_IDENTITY: SignupIdentity = {
  firstName: 'Afi',
  lastName: 'Mensah',
  email: 'afi@email.com',
  isAdult: true,
};

afterEach(() => {
  window.localStorage.removeItem(SUBSCRIBER_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(SUBSCRIBER_DEVICE_ID_STORAGE_KEY);
});

describe('Onboarding · X-01 Splash', () => {
  it('renders the headline, tagline, and account CTAs enabled', () => {
    renderAt('/welcome', <SplashX01 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-01');
    expect(screen.getByText("L'app abonné · Lomé")).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled();
    expect(screen.getByRole('button', { name: "J'ai déjà un compte" })).toBeEnabled();
  });

  it('routes to /signup/phone when the user continues signup', () => {
    const { locationRef } = renderAt('/welcome', <SplashX01 />);

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(locationRef.current).toBe('/signup/phone');
  });

  it('routes existing accounts to phone verification before the hub', () => {
    const { locationRef } = renderAt('/welcome', <SplashX01 />);

    fireEvent.click(screen.getByRole('button', { name: "J'ai déjà un compte" }));
    expect(locationRef.current).toBe('/signup/phone');
  });
});

describe('Onboarding · X-02 Phone', () => {
  it('renders ÉTAPE 1 / 5 indicator, deck-sourced copy, and a disabled CTA until valid', () => {
    renderAt('/signup/phone', <PhoneX02 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-02');
    expect(screen.getByText('Étape 1 / 5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Votre numéro de téléphone' })).toBeInTheDocument();
    expect(
      screen.getByText('On vous envoie un code à 6 chiffres pour confirmer.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Confidentiel — non transmis à la laveuse.')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Recevoir le code' })).toBeDisabled();
  });

  it('auto-formats the Togo number into pairs and enables the CTA at 8 digits', () => {
    renderAt('/signup/phone', <PhoneX02 />);

    const input = screen.getByLabelText('Numéro') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '90123456' } });

    expect(input.value).toBe('90 12 34 56');
    expect(screen.getByRole('button', { name: 'Recevoir le code' })).toBeEnabled();
  });

  it('navigates to /signup/otp on submit and forwards the +228 phone in router state', () => {
    const { locationRef } = renderAt('/signup/phone', <PhoneX02 />);

    fireEvent.change(screen.getByLabelText('Numéro'), { target: { value: '90123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));

    expect(locationRef.current).toBe('/signup/otp');
  });

  it('starts the backend OTP challenge when the API is configured', async () => {
    const requests: Request[] = [];
    const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json(
        {
          challengeId: '11111111-1111-4111-8111-111111111111',
          expiresAt: '2026-05-05T09:10:00.000Z',
          phoneNumber: '+22890123456',
          provider: 'test',
          testCode: '123456',
        },
        { status: 201 },
      );
    });
    const { locationRef } = renderAt(
      '/signup/phone',
      <PhoneX02 />,
      {},
      { baseUrl: 'http://api.test', fetch: fetchStub as typeof fetch },
    );

    fireEvent.change(screen.getByLabelText('Numéro'), { target: { value: '90123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir le code' }));

    await waitFor(() => expect(locationRef.current).toBe('/signup/otp'));
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('http://api.test/v1/auth/otp/start');
    await expect(requests[0]?.json()).resolves.toEqual({
      countryCode: 'TG',
      phoneNumber: '+22890123456',
    });
  });

  it('returns to the splash screen from phone entry', () => {
    const { locationRef } = renderAt('/signup/phone', <PhoneX02 />);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/welcome');
  });
});

describe('Onboarding · X-03 OTP', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders ÉTAPE 2 / 5, the masked phone, and 6 OTP cells', () => {
    renderAt('/signup/otp', <OtpX03 />, { phone: '+228 90 12 34 56' });

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-03');
    expect(screen.getByText('Étape 2 / 5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Le code reçu par SMS' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByText(/Renvoyer dans 0:24 s/u)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Appeler le bureau' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  });

  it('counts the resend timer down once per second', () => {
    renderAt('/signup/otp', <OtpX03 />, { phone: '+228 90 12 34 56' });

    expect(screen.getByText(/Renvoyer dans 0:24 s/u)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/Renvoyer dans 0:22 s/u)).toBeInTheDocument();
  });

  it('auto-advances cell focus on input and supports paste-fan-out', () => {
    renderAt('/signup/otp', <OtpX03 />, { phone: '+228 90 12 34 56' });

    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.change(cells[0]!, { target: { value: '482' } });

    expect(cells[0]!.value).toBe('4');
    expect(cells[1]!.value).toBe('8');
    expect(cells[2]!.value).toBe('2');
    expect(document.activeElement).toBe(cells[3]);
  });

  it('redirects to /signup/phone without flashing a placeholder phone', () => {
    const { locationRef } = renderAt('/signup/otp', <OtpX03 />);

    expect(locationRef.current).toBe('/signup/phone');
    expect(screen.queryByText(/\+228 90/u)).not.toBeInTheDocument();
  });

  it('returns to phone entry from OTP', () => {
    const { locationRef } = renderAt('/signup/otp', <OtpX03 />, {
      phone: '+228 90 12 34 56',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/signup/phone');
  });

  it('sends existing accounts to the hub after phone verification', () => {
    const { locationRef } = renderAt('/signup/otp', <OtpX03 />, {
      mode: 'existing',
      phone: '+228 90 12 34 56',
    });

    fireEvent.change(screen.getByLabelText('Chiffre 1'), { target: { value: '123456' } });
    act(() => {
      vi.advanceTimersByTime(320);
    });

    expect(locationRef.current).toBe('/hub');
  });

  it('verifies the OTP through the backend before continuing signup', async () => {
    vi.useRealTimers();
    const requests: Request[] = [];
    const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);
      return Response.json({
        accessToken: 'access-token',
        accessTokenExpiresAt: '2027-05-05T10:00:00.000Z',
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: '2027-06-05T10:00:00.000Z',
        role: 'subscriber',
        sessionId: '22222222-2222-4222-8222-222222222222',
        userId: '99999999-9999-4999-8999-999999999999',
      });
    });
    const { locationRef } = renderAt(
      '/signup/otp',
      <OtpX03 />,
      {
        otpChallengeId: '11111111-1111-4111-8111-111111111111',
        phone: '+228 90 12 34 56',
      },
      { baseUrl: 'http://api.test', fetch: fetchStub as typeof fetch },
    );

    fireEvent.change(screen.getByLabelText('Chiffre 1'), { target: { value: '123456' } });

    await waitFor(() => expect(locationRef.current).toBe('/signup/identity'));
    expect(requests[0]?.url).toBe('http://api.test/v1/auth/otp/verify');
    await expect(requests[0]?.json()).resolves.toMatchObject({
      challengeId: '11111111-1111-4111-8111-111111111111',
      code: '123456',
      role: 'subscriber',
    });
  });
});

describe('Onboarding · X-03I Identity', () => {
  it('collects account identity and routes to address once valid', () => {
    const { locationRef } = renderAt('/signup/identity', <IdentityX03I />, {
      phone: '+228 90 12 34 56',
    });

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-03I');
    expect(screen.getByText('Étape 3 / 5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vos informations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Afi' } });
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Email (facultatif)'), {
      target: { value: 'afi@email.com' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(locationRef.current).toBe('/signup/address');
  });

  it('keeps invalid email from advancing', () => {
    renderAt('/signup/identity', <IdentityX03I />, {
      phone: '+228 90 12 34 56',
    });

    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Afi' } });
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Mensah' } });
    fireEvent.change(screen.getByLabelText('Email (facultatif)'), {
      target: { value: 'afi' },
    });
    fireEvent.click(screen.getByRole('checkbox'));

    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();
  });

  it('redirects to /signup/phone when the deep-link arrives without a confirmed phone', () => {
    const { locationRef } = renderAt('/signup/identity', <IdentityX03I />);

    expect(locationRef.current).toBe('/signup/phone');
  });

  it('returns to OTP from identity entry', () => {
    const { locationRef } = renderAt('/signup/identity', <IdentityX03I />, {
      phone: '+228 90 12 34 56',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/signup/otp');
  });
});

describe('Onboarding · X-04 Address', () => {
  it('collects the Lomé address and routes to tier once valid', () => {
    const { locationRef } = renderAt('/signup/address', <AddressX04 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
    });

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-04');
    expect(screen.getByText('Étape 4 / 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Quartier'), {
      target: { value: 'Tokoin Casablanca' },
    });
    fireEvent.change(screen.getByLabelText('Rue / détail'), {
      target: { value: 'rue 254, maison bleue' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(locationRef.current).toBe('/signup/tier');
  });

  it('redirects to /signup/phone when the deep-link arrives without a confirmed phone', () => {
    const { locationRef } = renderAt('/signup/address', <AddressX04 />);

    expect(locationRef.current).toBe('/signup/phone');
  });

  it('redirects to /signup/identity when the deep-link arrives without identity', () => {
    const { locationRef } = renderAt('/signup/address', <AddressX04 />, {
      phone: '+228 90 12 34 56',
    });

    expect(locationRef.current).toBe('/signup/identity');
  });

  it('returns to identity from address entry', () => {
    const { locationRef } = renderAt('/signup/address', <AddressX04 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/signup/identity');
  });
});

describe('Onboarding · X-05 Tier', () => {
  it('defaults to T1, lets the user choose T2, and routes to payment', () => {
    const { locationRef } = renderAt('/signup/tier', <TierX05 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
      address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
    });

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-05');
    expect(screen.getByText('Étape 5 / 5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choisissez votre rythme' })).toBeInTheDocument();
    expect(screen.getByText('1 visite / mois')).toBeInTheDocument();
    expect(screen.getByText('2 visites / mois')).toBeInTheDocument();
    expect(
      screen.getByText('Prix validé avant chaque prélèvement Mobile Money.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/2 visites \/ mois/u));
    fireEvent.click(screen.getByRole('button', { name: /Continuer · 4/ }));

    expect(locationRef.current).toBe('/signup/payment');
  });

  it('redirects to /signup/phone when the deep-link arrives without a confirmed phone', () => {
    const { locationRef } = renderAt('/signup/tier', <TierX05 />);

    expect(locationRef.current).toBe('/signup/phone');
  });

  it('redirects to /signup/address when the deep-link arrives without an address', () => {
    const { locationRef } = renderAt('/signup/tier', <TierX05 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
    });

    expect(locationRef.current).toBe('/signup/address');
  });

  it('redirects to /signup/identity when the deep-link arrives without identity', () => {
    const { locationRef } = renderAt('/signup/tier', <TierX05 />, {
      phone: '+228 90 12 34 56',
    });

    expect(locationRef.current).toBe('/signup/identity');
  });

  it('returns to address entry from tier choice', () => {
    const { locationRef } = renderAt('/signup/tier', <TierX05 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
      address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/signup/address');
  });
});

describe('Onboarding · X-06 Payment', () => {
  it('shows the Mobile Money details and routes to review', () => {
    const { locationRef } = renderAt('/signup/payment', <PaymentX06 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
      address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
      tier: 'T1',
    });

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-06');
    expect(screen.getByText('Paiement')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Ajoutez votre moyen de paiement' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Mixx by Yas')).toBeInTheDocument();
    expect(screen.getByLabelText('Numéro Mobile Money')).toHaveValue('90 12 34 56');
    expect(
      screen.getByText('Vous validez le prélèvement depuis votre téléphone.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(locationRef.current).toBe('/signup/review');
  });

  it('redirects to /signup/phone when the deep-link arrives without a confirmed phone', () => {
    const { locationRef } = renderAt('/signup/payment', <PaymentX06 />, { tier: 'T1' });

    expect(locationRef.current).toBe('/signup/phone');
  });

  it('redirects to /welcome when the deep-link arrives without a chosen tier', () => {
    const { locationRef } = renderAt('/signup/payment', <PaymentX06 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
    });

    expect(locationRef.current).toBe('/welcome');
  });

  it('redirects to /signup/address when the deep-link arrives without an address', () => {
    const { locationRef } = renderAt('/signup/payment', <PaymentX06 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
      tier: 'T1',
    });

    expect(locationRef.current).toBe('/signup/address');
  });

  it('redirects to /signup/identity when the deep-link arrives without identity', () => {
    const { locationRef } = renderAt('/signup/payment', <PaymentX06 />, {
      phone: '+228 90 12 34 56',
      tier: 'T1',
    });

    expect(locationRef.current).toBe('/signup/identity');
  });

  it('returns to tier choice from payment', () => {
    const { locationRef } = renderAt('/signup/payment', <PaymentX06 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
      address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
      tier: 'T1',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/signup/tier');
  });
});

describe('Onboarding · X-07 Review', () => {
  const completeSignup: SignupInitialState = {
    phone: '+228 90 12 34 56',
    identity: TEST_IDENTITY,
    address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
    tier: 'T1',
    paymentProvider: 'mixx',
  };

  it('shows the locked recap and confirms the subscription', () => {
    const { locationRef } = renderAt('/signup/review', <ReviewX07 />, completeSignup);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-07');
    expect(screen.getByText('Récap')).toBeInTheDocument();
    expect(screen.getByText('Afi Mensah')).toBeInTheDocument();
    expect(screen.getByText('Tokoin Casablanca')).toBeInTheDocument();
    expect(screen.getByText('1 visite / mois')).toBeInTheDocument();
    expect(screen.getByText('Mixx by Yas · 90 12…')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Le bureau vous appelle dans la journée pour confirmer l'adresse et planifier la première visite.",
      ),
    ).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: "Confirmer l'abonnement" });
    expect(cta).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(cta).toBeEnabled();
    fireEvent.click(cta);

    expect(locationRef.current).toBe('/signup/welcome');
  });

  it('creates the backend subscription before showing the post-signup welcome', async () => {
    const requests: Request[] = [];
    const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push(request);

      if (request.url === 'http://api.test/v1/subscriber/profile') {
        return Response.json({
          avatarObjectKey: null,
          countryCode: 'TG',
          createdAt: '2026-05-05T09:00:00.000Z',
          email: 'afi@email.com',
          firstName: 'Afi',
          isAdultConfirmed: true,
          lastName: 'Mensah',
          phoneNumber: '+22890123456',
          subscriberId: '99999999-9999-4999-8999-999999999999',
          updatedAt: '2026-05-05T09:00:00.000Z',
        });
      }

      return Response.json(
        {
          assignmentSlaHours: null,
          countryCode: 'TG',
          currencyCode: 'XOF',
          monthlyPriceMinor: '2500',
          paymentMethod: {
            phoneNumber: '+22890123456',
            provider: 'mixx',
          },
          status: 'ready_no_visit',
          subscriberId: '99999999-9999-4999-8999-999999999999',
          subscriptionId: '33333333-3333-4333-8333-333333333333',
          tierCode: 'T1',
          visitsPerCycle: 1,
        },
        { status: 201 },
      );
    });
    const { locationRef } = renderAt(
      '/signup/review',
      <ReviewX07 />,
      {
        ...completeSignup,
        address: {
          gpsLatitude: 6.1319,
          gpsLongitude: 1.2228,
          landmark: '',
          neighborhood: 'Tokoin Casablanca',
          street: 'rue 254',
        },
      },
      { baseUrl: 'http://api.test', fetch: fetchStub as typeof fetch },
    );

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'abonnement" }));

    await waitFor(() => expect(locationRef.current).toBe('/signup/welcome'));
    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
      'PUT http://api.test/v1/subscriber/profile',
      'POST http://api.test/v1/subscriber/subscription',
    ]);
    await expect(requests[1]?.json()).resolves.toEqual({
      address: {
        gpsLatitude: 6.1319,
        gpsLongitude: 1.2228,
        landmark: 'rue 254',
        neighborhood: 'Tokoin Casablanca',
      },
      paymentMethod: {
        phoneNumber: '+22890123456',
        provider: 'mixx',
      },
      tierCode: 'T1',
    });
  });

  it('redirects an empty deep-link back to the splash, not the post-signup welcome', () => {
    const { locationRef } = renderAt('/signup/review', <ReviewX07 />);

    expect(locationRef.current).toBe('/welcome');
  });

  it('redirects to /signup/payment when only the payment provider is missing', () => {
    const { locationRef } = renderAt('/signup/review', <ReviewX07 />, {
      phone: '+228 90 12 34 56',
      identity: TEST_IDENTITY,
      address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
      tier: 'T1',
    });

    expect(locationRef.current).toBe('/signup/payment');
  });

  it('redirects to /welcome when identity is missing from the recap state', () => {
    const { locationRef } = renderAt('/signup/review', <ReviewX07 />, {
      phone: '+228 90 12 34 56',
      address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
      tier: 'T1',
      paymentProvider: 'mixx',
    });

    expect(locationRef.current).toBe('/welcome');
  });

  it('returns to payment from review', () => {
    const { locationRef } = renderAt('/signup/review', <ReviewX07 />, completeSignup);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/signup/payment');
  });
});

describe('Onboarding · X-08 Welcome', () => {
  it('renders the welcome screen and routes to first visit scheduling', () => {
    const { locationRef } = renderAt('/signup/welcome', <WelcomeX08 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-08');
    expect(screen.getByRole('heading', { name: 'Bienvenue chez Washed.' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Votre abonnement est prêt. Choisissez maintenant le jour et le moment de votre première visite.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Planifier ma première visite' }));
    expect(locationRef.current).toBe('/booking');
  });

  it('returns to the welcome choice when first-time scheduling is abandoned', () => {
    const { locationRef } = renderWelcomeBookingFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Planifier ma première visite' }));
    expect(locationRef.current).toBe('/booking');
    expect(screen.getByRole('heading', { name: 'Quel jour vous convient ?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(locationRef.current).toBe('/signup/welcome');
    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-08');
  });

  it('returns from time choice to days, then back to the welcome choice', () => {
    const { locationRef } = renderWelcomeBookingFlow();

    fireEvent.click(screen.getByRole('button', { name: 'Planifier ma première visite' }));
    fireEvent.click(screen.getByText('Samedi'));
    expect(screen.getByRole('heading', { name: 'Quel moment ce samedi ?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/booking');
    expect(screen.getByRole('heading', { name: 'Quel jour vous convient ?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/signup/welcome');
  });

  it('lets the user skip first visit scheduling and enter the hub', () => {
    const { locationRef } = renderAt('/signup/welcome', <WelcomeX08 />);

    fireEvent.click(screen.getByRole('button', { name: 'Passer pour le moment' }));

    expect(locationRef.current).toBe('/hub');
  });
});
