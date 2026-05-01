import { describe, expect, it } from 'vitest';

import { formatVisitDate, formatXof, messages, normalizeLocale, translate } from './index.js';

describe('Washed i18n', () => {
  it('defaults unsupported locales to French', () => {
    expect(normalizeLocale(undefined)).toBe('fr');
    expect(normalizeLocale('mina-TG')).toBe('fr');
    expect(normalizeLocale('en-US')).toBe('en');
  });

  it('keeps message keys present in both launch locales', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.fr).sort());
  });

  it('translates launch copy', () => {
    expect(translate('subscriber.onboarding.start', 'fr')).toBe('Commencer');
    expect(translate('subscriber.onboarding.start', 'en')).toBe('Start');
  });

  it('formats XOF without fractional currency units', () => {
    expect(formatXof(4500, 'fr')).toContain('4');
    expect(formatXof(4500, 'fr')).toContain('500');
    expect(formatXof(4500, 'fr')).toContain('F');
  });

  it('formats visit dates with weekday context', () => {
    expect(formatVisitDate('2026-05-05T09:00:00.000Z', 'fr').toLowerCase()).toContain('mardi');
  });
});
