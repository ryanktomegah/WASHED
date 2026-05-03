import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OtpX03 } from './OtpX03.js';
import { PhoneX02 } from './PhoneX02.js';
import { SplashX01 } from './SplashX01.js';

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
        <Route element={<>{element}<Spy /></>} path={path} />
        <Route element={<Spy />} path="*" />
      </Routes>
    </MemoryRouter>,
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
    expect(
      screen.getByRole('heading', { name: 'Votre numéro de téléphone.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('On vous envoie un code par SMS pour confirmer.'),
    ).toBeInTheDocument();

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
    renderAt('/signup/otp', <OtpX03 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-03');
    expect(screen.getByText('Étape 2 sur 4')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Le code reçu par SMS.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByText('Renvoyer dans 30 s')).toBeInTheDocument();
  });

  it('counts the resend timer down once per second', () => {
    renderAt('/signup/otp', <OtpX03 />);

    expect(screen.getByText('Renvoyer dans 30 s')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Renvoyer dans 28 s')).toBeInTheDocument();
  });

  it('auto-advances cell focus on input and supports paste-fan-out', () => {
    renderAt('/signup/otp', <OtpX03 />);

    const cells = screen.getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.change(cells[0]!, { target: { value: '482' } });

    expect(cells[0]!.value).toBe('4');
    expect(cells[1]!.value).toBe('8');
    expect(cells[2]!.value).toBe('2');
    expect(document.activeElement).toBe(cells[3]);
  });

  it('routes back to /signup/phone when the user taps Modifier', () => {
    const { locationRef } = renderAt('/signup/otp', <OtpX03 />);

    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(locationRef.current).toBe('/signup/phone');
  });
});
