import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  SUBSCRIBER_AUTH_STORAGE_KEY,
  SubscriberApiProvider,
} from '../../api/SubscriberApiContext.js';
import {
  SUBSCRIBER_LANGUAGE_OPTIONS,
  SUBSCRIBER_LANGUAGE_STORAGE_KEY,
} from '../../language/languageOptions.js';
import {
  DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE,
  SubscriberSubscriptionProvider,
} from '../../subscription/SubscriberSubscriptionContext.js';
import { SignupProvider, type SignupInitialState } from '../onboarding/SignupContext.js';
import {
  AddressEditX25,
  AppearanceX24A,
  DeleteAccountX28,
  LanguageX24L,
  NotificationsX26,
  ProfileEditX24E,
  PrivacyX27,
  ProfileX24,
} from './ProfileScreens.js';

function renderAt(
  path: string,
  element: ReactElement,
  initialEntries: readonly string[] = [path],
  initialSignupState: SignupInitialState = {},
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
                <SubscriberApiProvider baseUrl={null}>
                  <SubscriberSubscriptionProvider
                    initialState={DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE}
                    storageKey={null}
                  >
                    <SignupProvider initialState={initialSignupState}>
                      {element}
                      <Spy />
                    </SignupProvider>
                  </SubscriberSubscriptionProvider>
                </SubscriberApiProvider>
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

function renderProfileRoutes(initialSignupState: SignupInitialState): {
  locationRef: { current: string };
} {
  const locationRef = { current: '/profile' };

  function Spy(): ReactElement {
    const location = useLocation();
    locationRef.current = `${location.pathname}${location.search}${location.hash}`;
    return null as unknown as ReactElement;
  }

  render(
    <MemoryRouter initialEntries={['/profile']}>
      <LocaleProvider
        defaultLocale="fr"
        storageKey={SUBSCRIBER_LANGUAGE_STORAGE_KEY}
        supportedLocales={SUBSCRIBER_LANGUAGE_OPTIONS}
      >
        <SubscriberAppearanceProvider>
          <SubscriberApiProvider baseUrl={null}>
            <SubscriberSubscriptionProvider
              initialState={DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE}
              storageKey={null}
            >
              <SignupProvider initialState={initialSignupState}>
                <Routes>
                  <Route
                    element={
                      <>
                        <ProfileX24 />
                        <Spy />
                      </>
                    }
                    path="/profile"
                  />
                  <Route
                    element={
                      <>
                        <ProfileEditX24E />
                        <Spy />
                      </>
                    }
                    path="/profile/edit"
                  />
                </Routes>
              </SignupProvider>
            </SubscriberSubscriptionProvider>
          </SubscriberApiProvider>
        </SubscriberAppearanceProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );

  return { locationRef };
}

function renderConfiguredProfileEdit(fetchImpl: typeof fetch): void {
  render(
    <MemoryRouter initialEntries={['/profile/edit']}>
      <LocaleProvider
        defaultLocale="fr"
        storageKey={SUBSCRIBER_LANGUAGE_STORAGE_KEY}
        supportedLocales={SUBSCRIBER_LANGUAGE_OPTIONS}
      >
        <SubscriberAppearanceProvider>
          <SubscriberApiProvider baseUrl="https://core.test" fetch={fetchImpl}>
            <SubscriberSubscriptionProvider
              initialState={DEFAULT_SUBSCRIBER_SUBSCRIPTION_STATE}
              storageKey={null}
            >
              <SignupProvider>
                <Routes>
                  <Route element={<ProfileEditX24E />} path="/profile/edit" />
                </Routes>
              </SignupProvider>
            </SubscriberSubscriptionProvider>
          </SubscriberApiProvider>
        </SubscriberAppearanceProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

function storeFreshSubscriberAuthSession(): void {
  window.localStorage.setItem(
    SUBSCRIBER_AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken: 'subscriber-access-token',
      accessTokenExpiresAt: '2027-05-05T10:00:00.000Z',
      refreshToken: 'subscriber-refresh-token',
      refreshTokenExpiresAt: '2027-06-05T10:00:00.000Z',
      role: 'subscriber',
      sessionId: '22222222-2222-4222-8222-222222222222',
      userId: '99999999-9999-4999-8999-999999999999',
    }),
  );
}

beforeEach(() => {
  setActiveLocale('fr');
  window.localStorage.removeItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
  window.localStorage.removeItem(SUBSCRIBER_AUTH_STORAGE_KEY);
  window.localStorage.removeItem(SUBSCRIBER_LANGUAGE_STORAGE_KEY);
});

const PROFILE_SIGNUP_STATE: SignupInitialState = {
  phone: '+228 90 12 34 56',
  identity: { firstName: 'Afi', lastName: 'Mensah', email: 'afi@email.com', isAdult: true },
  address: { neighborhood: 'Tokoin Casablanca', street: 'rue 254' },
};

describe('Subscriber profile · X-24', () => {
  it('renders identity, settings list, action buttons, and Profil-active nav', () => {
    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, 'dark');
    renderAt('/profile', <ProfileX24 />, ['/profile'], PROFILE_SIGNUP_STATE);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-24');
    expect(screen.getByRole('heading', { name: 'Afi Mensah' })).toBeVisible();
    expect(screen.getAllByText('+228 90 12 34 56')).toHaveLength(2);
    expect(screen.getByText('Compte actif')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Modifier la photo' })).toHaveLength(2);
    expect(screen.getByText('Informations du compte')).toBeVisible();
    expect(screen.getByText('afi@email.com')).toBeVisible();
    expect(screen.getByText('18 ans ou plus confirmé')).toBeVisible();

    // Menu rows.
    expect(screen.getByRole('button', { name: /Informations personnelles/u })).toBeVisible();
    expect(screen.getByText('Nom, email, photo')).toBeVisible();
    expect(screen.getByRole('button', { name: /Adresse/u })).toBeVisible();
    expect(screen.getAllByText('Tokoin Casablanca')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Notifications/u })).toBeVisible();
    expect(screen.getByRole('button', { name: /Langue/u })).toBeVisible();
    expect(screen.getByText('Français')).toBeVisible();
    expect(screen.getByRole('button', { name: /Apparence/u })).toBeVisible();
    expect(screen.getByText('Sombre')).toBeVisible();
    expect(screen.getByRole('button', { name: /Vie privée/u })).toBeVisible();

    // Profil tab is active in the bottom nav.
    expect(screen.getByRole('button', { name: 'Profil' })).toHaveAttribute('aria-current', 'page');
  });

  it('routes profile actions, Adresse, Notifications, Apparence, Vie privée, and Aide', () => {
    const edit = renderAt('/profile', <ProfileX24 />);
    fireEvent.click(screen.getByRole('button', { name: /Informations personnelles/u }));
    expect(edit.locationRef.current).toBe('/profile/edit');

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

  it('edits the account name and email, then reflects them on the profile page', () => {
    const { locationRef } = renderProfileRoutes(PROFILE_SIGNUP_STATE);

    fireEvent.click(screen.getByRole('button', { name: /Informations personnelles/u }));
    expect(locationRef.current).toBe('/profile/edit');
    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-24E');
    expect(screen.getByRole('heading', { name: 'Modifier vos informations' })).toBeVisible();
    expect(screen.getByText('+228 90 12 34 56')).toHaveClass('profile-static-field');
    expect(screen.queryByDisplayValue('+228 90 12 34 56')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'TÉLÉPHONE' })).not.toBeInTheDocument();
    expect(screen.getByText('Le téléphone se modifie par vérification SMS.')).toBeVisible();

    fireEvent.change(screen.getByLabelText('PRÉNOM'), { target: { value: 'Ama' } });
    fireEvent.change(screen.getByLabelText('NOM'), { target: { value: 'Koffi' } });
    fireEvent.change(screen.getByLabelText('EMAIL (FACULTATIF)'), {
      target: { value: 'ama@email.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(locationRef.current).toBe('/profile');
    expect(screen.getByRole('heading', { name: 'Ama Koffi' })).toBeVisible();
    expect(screen.getByText('ama@email.com')).toBeVisible();
  });

  it('hydrates a restored-session edit screen before showing the fixed phone value', async () => {
    storeFreshSubscriberAuthSession();
    const fetchImpl: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          avatarObjectKey: null,
          countryCode: 'TG',
          createdAt: '2026-05-01T10:00:00.000Z',
          email: 'live@email.com',
          firstName: 'Afi',
          isAdultConfirmed: true,
          lastName: 'Mensah',
          phoneNumber: '+228 91 11 22 33',
          subscriberId: 'sub_live',
          updatedAt: '2026-05-05T10:00:00.000Z',
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      );

    renderConfiguredProfileEdit(fetchImpl);

    expect(screen.getByRole('main')).toHaveAttribute('data-screen-id', 'X-24E');
    expect(screen.queryByRole('heading', { name: 'Modifier vos informations' })).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Modifier vos informations' })).toBeVisible(),
    );

    expect(screen.getByLabelText('PRÉNOM')).toHaveValue('Afi');
    expect(screen.getByLabelText('NOM')).toHaveValue('Mensah');
    expect(screen.getByLabelText('EMAIL (FACULTATIF)')).toHaveValue('live@email.com');
    expect(screen.getByText('+228 91 11 22 33')).toHaveClass('profile-static-field');
    expect(screen.queryByDisplayValue('+228 91 11 22 33')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'TÉLÉPHONE' })).not.toBeInTheDocument();
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
