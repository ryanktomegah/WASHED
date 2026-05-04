import { describe, expect, it } from 'vitest';

import {
  defaultLocale,
  formatVisitDate,
  formatXof,
  getActiveLocale,
  hasMessageKey,
  normalizeLocale,
  setActiveLocale,
  translate,
} from './index.js';

describe('Washed i18n', () => {
  it('defaults unsupported locales to French', () => {
    expect(defaultLocale).toBe('fr');
    expect(normalizeLocale(undefined)).toBe('fr');
    expect(normalizeLocale('mina-TG')).toBe('fr');
    expect(normalizeLocale('en-US')).toBe('en');
  });

  it('translates onboarding copy from the deck', () => {
    expect(translate('subscriber.signup.phone.title')).toBe('Votre numéro de téléphone.');
    expect(translate('subscriber.signup.phone.cta')).toBe('Recevoir le code');
    expect(translate('subscriber.signup.otp.title')).toBe('Le code reçu par SMS.');
  });

  it('returns the EN translation when present and falls back to FR otherwise', () => {
    expect(translate('subscriber.splash.tagline', 'en')).toBe('The washerwoman app for Lomé.');
    expect(translate('worker.login.greeting', 'en')).toBe('Bonjour.');
  });

  it('reads the active locale by default and updates when setActiveLocale is called', () => {
    expect(getActiveLocale()).toBe('fr');
    expect(translate('subscriber.signup.phone.cta')).toBe('Recevoir le code');

    setActiveLocale('en');
    expect(translate('subscriber.signup.phone.cta')).toBe('Send the code');

    setActiveLocale('fr');
  });

  it('interpolates ICU-style {variables}', () => {
    expect(
      translate('subscriber.signup.step_indicator', 'fr', { current: 1, total: 8 }),
    ).toBe('Étape 1 sur 8');
    expect(
      translate('subscriber.signup.otp.body', 'fr', { phone: '+228 90 ●● ●● 56' }),
    ).toBe('Six chiffres envoyés au +228 90 ●● ●● 56.');
    expect(translate('subscriber.signup.otp.resend', 'fr', { seconds: 30 })).toBe(
      'Renvoyer dans 30 s',
    );
  });

  it('exposes a type guard for runtime key validation', () => {
    expect(hasMessageKey('subscriber.signup.phone.title')).toBe(true);
    expect(hasMessageKey('totally.invented.key')).toBe(false);
  });

  it('formats XOF with thousands grouping and the XOF suffix', () => {
    expect(formatXof(2500)).toMatch(/2.500.*XOF/);
    expect(formatXof(4500)).toMatch(/4.500.*XOF/);
  });

  it('formats visit dates with weekday context in FR', () => {
    expect(formatVisitDate('2026-05-05T09:00:00.000Z', 'fr').toLowerCase()).toContain('mardi');
  });
});
