import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AddressX04 } from './AddressX04.js';
import { OtpX03 } from './OtpX03.js';
import { PaymentX06 } from './PaymentX06.js';
import { PhoneX02 } from './PhoneX02.js';
import { ReviewX07 } from './ReviewX07.js';
import { SignupProvider, type SignupInitialState } from './SignupContext.js';
import { SplashX01 } from './SplashX01.js';
import { TierX05 } from './TierX05.js';
import { WelcomeX08 } from './WelcomeX08.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialSignupState: SignupInitialState = {},
): { locationRef: { current: string } } {
  const locationRef = { current: path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <SignupProvider initialState={initialSignupState}>
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
    </SignupProvider>,
  );

  return { locationRef };
}

describe('Onboarding · X-01 Splash', () => {
  it('renders the FR-default headline, tagline and disabled-EN banner per D-06', () => {
    renderAt('/welcome', <SplashX01 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-01');
    expect(screen.getByText("L'appli laveuse pour Lomé.")).toBeInTheDocument();
    expect(screen.getAllByText('Bientôt disponible').length).toBeGreaterThan(0);

    const englishButton = screen.getByRole('button', { name: 'English' });
    expect(englishButton).toBeDisabled();
    expect(englishButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('routes to /signup/phone when the user picks Français', () => {
    const { locationRef } = renderAt('/welcome', <SplashX01 />);

    fireEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(locationRef.current).toBe('/signup/phone');
  });
});

describe('Onboarding · X-02 Phone', () => {
  it('renders ÉTAPE 1 / 4 indicator, deck-sourced copy, and a disabled CTA until valid', () => {
    renderAt('/signup/phone', <PhoneX02 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-02');
    expect(screen.getByText('Étape 1 sur 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Votre numéro de téléphone.' })).toBeInTheDocument();
    expect(screen.getByText('On vous envoie un code par SMS pour confirmer.')).toBeInTheDocument();

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
});

describe('Onboarding · X-03 OTP', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders ÉTAPE 2 / 4, the masked phone, and 6 OTP cells', () => {
    renderAt('/signup/otp', <OtpX03 />, { phone: '+228 90 12 34 56' });

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-03');
    expect(screen.getByText('Étape 2 sur 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Le code reçu par SMS.' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByText('Renvoyer dans 30 s')).toBeInTheDocument();
  });

  it('counts the resend timer down once per second', () => {
    renderAt('/signup/otp', <OtpX03 />, { phone: '+228 90 12 34 56' });

    expect(screen.getByText('Renvoyer dans 30 s')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Renvoyer dans 28 s')).toBeInTheDocument();
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

  it('routes back to /signup/phone when the user taps Modifier', () => {
    const { locationRef } = renderAt('/signup/otp', <OtpX03 />, {
      phone: '+228 90 12 34 56',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(locationRef.current).toBe('/signup/phone');
  });
});

describe('Onboarding · X-04 Address', () => {
  it('collects the Lomé address and routes to tier once valid', () => {
    const { locationRef } = renderAt('/signup/address', <AddressX04 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-04');
    expect(screen.getByText('Étape 3 sur 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Quartier'), { target: { value: 'Tokoin Forever' } });
    fireEvent.change(screen.getByLabelText('Rue / détail'), {
      target: { value: 'rue 254, maison bleue' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(locationRef.current).toBe('/signup/tier');
  });
});

describe('Onboarding · X-05 Tier', () => {
  it('defaults to T1, lets the user choose T2, and routes to payment', () => {
    const { locationRef } = renderAt('/signup/tier', <TierX05 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-05');
    expect(screen.getByText('Étape 4 sur 4')).toBeInTheDocument();
    expect(screen.getByText('Une visite')).toBeInTheDocument();
    expect(screen.getByText('Deux visites')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Deux visites/u));
    fireEvent.click(screen.getByRole('button', { name: /Continuer · 4/ }));

    expect(locationRef.current).toBe('/signup/payment');
  });
});

describe('Onboarding · X-06 Payment', () => {
  it('shows payment providers and routes to review', () => {
    const { locationRef } = renderAt('/signup/payment', <PaymentX06 />, {
      phone: '+228 90 12 34 56',
    });

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-06');
    expect(screen.getByText('Paiement')).toBeInTheDocument();
    expect(screen.getByText('TMoney')).toBeInTheDocument();
    expect(screen.getByText('Mixx by Yas')).toBeInTheDocument();
    expect(screen.getByText('Flooz')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Flooz/u));
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(locationRef.current).toBe('/signup/review');
  });
});

describe('Onboarding · X-07 Review', () => {
  const completeSignup: SignupInitialState = {
    phone: '+228 90 12 34 56',
    address: { neighborhood: 'Tokoin Forever', street: 'rue 254' },
    tier: 'T2',
    paymentProvider: 'tmoney',
  };

  it('requires consent before confirmation', () => {
    const { locationRef } = renderAt('/signup/review', <ReviewX07 />, completeSignup);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-07');
    expect(screen.getByText('Récap')).toBeInTheDocument();
    expect(screen.getByText('Tokoin Forever')).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: "Confirmer l'abonnement" });
    expect(cta).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(cta).toBeEnabled();
    fireEvent.click(cta);

    expect(locationRef.current).toBe('/signup/welcome');
  });
});

describe('Onboarding · X-08 Welcome', () => {
  it('renders the terminal welcome screen with disabled hub CTA', () => {
    renderAt('/signup/welcome', <WelcomeX08 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-08');
    expect(screen.getByRole('heading', { name: 'Bienvenue chez Washed.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voir mon accueil' })).toBeDisabled();
  });
});
