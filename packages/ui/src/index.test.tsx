import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getActiveLocale, setActiveLocale } from '@washed/i18n';

import {
  Alert,
  Badge,
  BottomNav,
  Button,
  Card,
  EmptyState,
  IconButton,
  Skeleton,
  Tabs,
  TextField,
  LocaleProvider,
  WashedThemeProvider,
  useLocale,
  useWashedTheme,
} from './index.js';

describe('@washed/ui', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('applies app-specific theme tokens through the provider', () => {
    render(
      <WashedThemeProvider data-testid="theme" theme="worker">
        <ThemeName />
      </WashedThemeProvider>,
    );

    expect(screen.getByTestId('theme')).toHaveAttribute('data-theme', 'worker');
    expect(screen.getByText('worker')).toBeInTheDocument();
    expect(document.body).toHaveAttribute('data-theme', 'worker');
  });

  it('uses subscriber dark tokens when the system prefers dark mode', () => {
    stubDarkMode(true);

    render(
      <WashedThemeProvider theme="subscriber">
        <ThemeColors />
      </WashedThemeProvider>,
    );

    expect(screen.getByTestId('theme-colors')).toHaveStyle({
      background: '#111111',
      color: '#48C078',
    });
    expect(document.body).toHaveAttribute('data-theme', 'subscriber');
    expect(document.body).toHaveAttribute('data-color-mode', 'dark');
  });

  it('can force subscriber dark tokens independent of the system mode', () => {
    stubDarkMode(false);

    render(
      <WashedThemeProvider colorMode="dark" theme="subscriber">
        <ThemeColors />
      </WashedThemeProvider>,
    );

    expect(screen.getByTestId('theme-colors')).toHaveStyle({
      background: '#111111',
      color: '#48C078',
    });
    expect(document.body).toHaveAttribute('data-color-mode', 'dark');
  });

  it('renders accessible controls with mobile tap targets', () => {
    render(
      <WashedThemeProvider theme="subscriber">
        <Button leftIcon={<span>+</span>} loading>
          Save
        </Button>
        <IconButton label="Open menu">M</IconButton>
      </WashedThemeProvider>,
    );

    expect(screen.getByRole('button', { name: /save/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /save/i })).toHaveStyle({ minHeight: '44px' });
    expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute(
      'title',
      'Open menu',
    );
  });

  it('links text field hints and errors for assistive technology', () => {
    render(
      <WashedThemeProvider>
        <TextField error="Code invalide" hint="Six chiffres" label="Code OTP" />
      </WashedThemeProvider>,
    );

    const input = screen.getByLabelText('Code OTP');

    expect(input).toHaveAccessibleDescription('Six chiffres Code invalide');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Code invalide');
  });

  it('renders content primitives without losing semantics', () => {
    render(
      <WashedThemeProvider theme="operator">
        <Card elevated>Card</Card>
        <Badge tone="success">Paid</Badge>
        <Alert title="Offline" tone="danger">
          Retry later.
        </Alert>
        <EmptyState action={<Button>Retry</Button>} description="No visits" title="Empty" />
        <Skeleton data-testid="skeleton" height={24} width={120} />
      </WashedThemeProvider>,
    );

    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toHaveStyle({ color: '#2A7A48' });
    expect(screen.getByRole('alert')).toHaveTextContent('Offline');
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports bottom navigation and tabs for app shells', () => {
    const onClick = vi.fn();

    render(
      <WashedThemeProvider>
        <BottomNav
          items={[
            { active: true, href: '/home', label: 'Home' },
            { label: 'Profile', onClick },
          ]}
        />
        <Tabs tabs={[{ active: true, label: 'Today' }, { label: 'Planning' }]} />
      </WashedThemeProvider>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    screen.getByRole('button', { name: 'Profile' }).click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true');
  });

  it('can lock a product shell to a supported locale', () => {
    setActiveLocale('en');
    window.localStorage.setItem('test.locale', 'en');

    render(
      <LocaleProvider defaultLocale="fr" storageKey="test.locale" supportedLocales={['fr']}>
        <LocaleProbe />
      </LocaleProvider>,
    );

    expect(screen.getByRole('button', { name: 'fr' })).toBeInTheDocument();
    expect(getActiveLocale()).toBe('fr');

    screen.getByRole('button', { name: 'fr' }).click();

    expect(screen.getByRole('button', { name: 'fr' })).toBeInTheDocument();
    expect(window.localStorage.getItem('test.locale')).toBe('fr');
  });
});

function ThemeName(): ReactElement {
  return <span>{useWashedTheme().name}</span>;
}

function ThemeColors(): ReactElement {
  const theme = useWashedTheme();

  return (
    <span
      data-testid="theme-colors"
      style={{ background: theme.colors.bg, color: theme.colors.success }}
    />
  );
}

function stubDarkMode(matches: boolean): void {
  const matchMedia = vi.fn().mockImplementation((media: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches,
    media,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }));

  vi.stubGlobal('matchMedia', matchMedia);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
    writable: true,
  });
}

function LocaleProbe(): ReactElement {
  const { locale, setLocale } = useLocale();
  return (
    <button onClick={() => setLocale('en')} type="button">
      {locale}
    </button>
  );
}
