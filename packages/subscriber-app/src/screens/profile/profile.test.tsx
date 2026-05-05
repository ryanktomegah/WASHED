import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { setActiveLocale } from '@washed/i18n';
import { LocaleProvider } from '@washed/ui';

import {
  SUBSCRIBER_APPEARANCE_STORAGE_KEY,
  SubscriberAppearanceProvider,
} from '../../appearance/AppearanceContext.js';
import {
  SUBSCRIBER_LANGUAGE_OPTIONS,
  SUBSCRIBER_LANGUAGE_STORAGE_KEY,
} from '../../language/languageOptions.js';
import {
  AddressEditX25,
  AppearanceX24A,
  DeleteAccountX28,
  LanguageX24L,
  NotificationsX26,
  PrivacyX27,
  ProfileX24,
} from './ProfileScreens.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialEntries: readonly string[] = [path],
): { locationRef: { current: string } } {
  const locationRef = { current: initialEntries.at(-1) ?? path };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <MemoryRouter initialEntries={[...initialEntries]} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route
          element={
            <LocaleProvider
              defaultLocale="fr"
              storageKey={SUBSCRIBER_LANGUAGE_STORAGE_KEY}
              supportedLocales={SUBSCRIBER_LANGUAGE_OPTIONS}
            >
              <SubscriberAppearanceProvider>
                {element}
                <Spy />
              </SubscriberAppearanceProvider>
            </LocaleProvider>
          }
          path={path}
        />
        <Route element={<Spy />} path="*" />
      </Routes>
    </MemoryRouter>,
  );

  return { locationRef };
}

beforeEach(() => {
  setActiveLocale('fr');
  window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
  window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
});

describe('Subscriber profile · X-24', () => {
  it('renders identity, settings list, action buttons, and Profil-active nav', () => {
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');
    renderAt('/profile', <ProfileX24 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-24');
    expect(screen.getByRole('heading', { name: 'Yawa Mensah' })).toBeVisible();
    expect(screen.getByText('+228 90 12 34 56')).toBeVisible();
    expect(screen.getByText('Abonnée depuis sept. 2025')).toBeVisible();

    // Menu rows.
    expect(screen.getByRole('button', { name: /Adresse/u })).toBeVisible();
    expect(screen.getByRole('button', { name: /Notifications/u })).toBeVisible();
    expect(screen.getByRole('button', { name: /Langue/u })).toBeVisible();
    expect(screen.getByText('Français')).toBeVisible();
    expect(screen.getByRole('button', { name: /Apparence/u })).toBeVisible();
    expect(screen.getByText('Sombre')).toBeVisible();
    expect(screen.getByRole('button', { name: /Vie privée/u })).toBeVisible();

    // Profil tab is active in the bottom nav.
    expect(screen.getByRole('button', { name: 'Profil' })).toHaveAttribute('aria-current', 'page');
  });

  it('routes Adresse, Notifications, Apparence, Vie privée, and Aide to their screens', () => {
    const a = renderAt('/profile', <ProfileX24 />);
    fireEvent.click(screen.getByRole('button', { name: /Adresse/u }));
    expect(a.locationRef.current).toBe('/profile/address');

    const n = renderAt('/profile', <ProfileX24 />);
    fireEvent.click(screen.getByRole('button', { name: /Notifications/u }));
    expect(n.locationRef.current).toBe('/profile/notifications');

    const language = renderAt('/profile', <ProfileX24 />);
    fireEvent.click(screen.getByRole('button', { name: /Langue/u }));
    expect(language.locationRef.current).toBe('/profile/language');

    const appearance = renderAt('/profile', <ProfileX24 />);
    fireEvent.click(screen.getByRole('button', { name: /Apparence/u }));
    expect(appearance.locationRef.current).toBe('/profile/appearance');

    const p = renderAt('/profile', <ProfileX24 />);
    fireEvent.click(screen.getByRole('button', { name: /Vie privée/u }));
    expect(p.locationRef.current).toBe('/profile/privacy');

    const s = renderAt('/profile', <ProfileX24 />);
    fireEvent.click(screen.getByRole('button', { name: 'Aide & support' }));
    expect(s.locationRef.current).toBe('/support');
  });
});

describe('Subscriber profile · X-24L Language', () => {
  it('renders both language options and persists an English choice', () => {
    renderAt('/profile/language', <LanguageX24L />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-24L');
    expect(screen.getByRole('heading', { name: 'Choisir la langue' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Français/u })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    fireEvent.click(screen.getByRole('radio', { name: /English/u }));

    expect(screen.getByRole('heading', { name: 'Choose language' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /English/u })).toHaveAttribute('aria-checked', 'true');
    expect(window.localStorage.getItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});

describe('Subscriber profile · X-24A Appearance', () => {
  it('renders the saved appearance choice and persists a manual light choice', () => {
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');
    renderAt('/profile/appearance', <AppearanceX24A />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-24A');
    expect(screen.getByRole('heading', { name: "Choisir l'apparence" })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Sombre/u })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: /Clair/u }));

    expect(screen.getByRole('radio', { name: /Clair/u })).toHaveAttribute('aria-checked', 'true');
    expect(window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY)).toBe('light');
  });
});

describe('Subscriber profile · X-25 Address edit', () => {
  it('renders form pre-filled, warns about validation pause, and submits when street valid', () => {
    const { locationRef } = renderAt('/profile/address', <AddressEditX25 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-25');
    expect(screen.getByRole('heading', { name: 'Vous déménagez ?' })).toBeVisible();
    expect(screen.getByText('À noter')).toBeVisible();
    expect(screen.getByText(/24-48 h/u)).toBeVisible();

    const street = screen.getByLabelText(/RUE \/ DÉTAIL/u) as HTMLInputElement;
    expect(street.value).toBe('rue 254, maison bleue');

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer pour validation' }));
    expect(locationRef.current).toBe('/profile');
  });

  it('disables submit when street is below 3 chars', () => {
    renderAt('/profile/address', <AddressEditX25 />);

    const street = screen.getByLabelText(/RUE \/ DÉTAIL/u) as HTMLInputElement;
    fireEvent.change(street, { target: { value: 'ab' } });

    expect(screen.getByRole('button', { name: 'Envoyer pour validation' })).toBeDisabled();
  });
});

describe('Subscriber profile · X-26 Notifications', () => {
  it('renders 4 toggles with default states', () => {
    renderAt('/profile/notifications', <NotificationsX26 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-26');
    expect(screen.getByRole('heading', { name: 'Que voulez-vous recevoir ?' })).toBeVisible();
    expect(screen.getByText('SMS · rappel J-1 et J')).toBeVisible();
    expect(screen.getByText('Push · en route')).toBeVisible();
    expect(screen.getByText('Push · reveal photos')).toBeVisible();
    expect(screen.getByText('Email mensuel · récap')).toBeVisible();

    const sms = screen.getByRole('switch', { name: 'SMS · rappel J-1 et J' });
    const email = screen.getByRole('switch', { name: 'Email mensuel · récap' });
    expect(sms).toHaveAttribute('aria-checked', 'true');
    expect(email).toHaveAttribute('aria-checked', 'false');

    expect(screen.getByText(/Aucune notification marketing/u)).toBeVisible();
  });

  it('toggles a switch on click', () => {
    renderAt('/profile/notifications', <NotificationsX26 />);

    const email = screen.getByRole('switch', { name: 'Email mensuel · récap' });
    expect(email).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(email);
    expect(email).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Subscriber profile · X-27 Privacy', () => {
  it('renders 4 data sections and routes Supprimer mon compte to X-28', () => {
    const { locationRef } = renderAt('/profile/privacy', <PrivacyX27 />);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-27');
    expect(screen.getByText('DONNÉES DE COMPTE')).toBeVisible();
    expect(screen.getByText('PHOTOS DE VISITE')).toBeVisible();
    expect(screen.getByText('LOCALISATION')).toBeVisible();
    expect(screen.getByText('VOS DROITS')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
    expect(locationRef.current).toBe('/profile/delete');
  });

  it('header back returns to the actual previous in-app page before falling back', () => {
    const { locationRef } = renderAt('/profile/privacy', <PrivacyX27 />, [
      '/hub',
      '/profile/privacy',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(locationRef.current).toBe('/hub');
  });
});

describe('Subscriber profile · X-28 Delete (typed-confirmation)', () => {
  it('keeps the danger CTA disabled until SUPPRIMER is typed exactly', () => {
    renderAt('/profile/delete', <DeleteAccountX28 />);

    const cta = screen.getByRole('button', { name: 'Supprimer définitivement' });
    expect(cta).toBeDisabled();

    const input = screen.getByLabelText(/TAPEZ « SUPPRIMER »/u) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'sup' } });
    expect(cta).toBeDisabled();

    fireEvent.change(input, { target: { value: 'SUPPRIMER' } });
    expect(cta).toBeEnabled();

    // Trailing whitespace is forgiven.
    fireEvent.change(input, { target: { value: '  SUPPRIMER  ' } });
    expect(cta).toBeEnabled();

    // Wrong casing is rejected.
    fireEvent.change(input, { target: { value: 'supprimer' } });
    expect(cta).toBeDisabled();
  });

  it('Annuler routes back to /profile/privacy', () => {
    const { locationRef } = renderAt('/profile/delete', <DeleteAccountX28 />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(locationRef.current).toBe('/profile/privacy');
  });

  it('shows the visit count in the body and the next visit in the warn list', () => {
    renderAt('/profile/delete', <DeleteAccountX28 />);

    expect(screen.getByRole('heading', { name: "C'est définitif." })).toBeVisible();
    expect(screen.getByText(/historique de 32 visites avec Akouvi/u)).toBeVisible();
    expect(screen.getByText(/Visite de mardi 5 mai annulée/u)).toBeVisible();
  });
});
