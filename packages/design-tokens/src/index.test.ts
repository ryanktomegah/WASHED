import { describe, expect, it } from 'vitest';

import { getWashedTheme, sharedTokens, subscriberTheme, washedThemes } from './index.js';

describe('Washed design tokens', () => {
  it('preserves one audience theme per frontend surface', () => {
    expect(Object.keys(washedThemes).sort()).toEqual(['operator', 'subscriber', 'worker']);
  });

  it('keeps the subscriber Geist Green palette from the design files', () => {
    expect(getWashedTheme('subscriber').colors).toMatchObject({
      bg: '#FFFFFF',
      ink: '#0A0A0A',
      primary: '#0A3D1F',
      primaryOn: '#FFFFFF',
      accent: '#A66B00',
      success: '#0A3D1F',
    });
  });

  it('keeps the worker Forest palette distinct from subscriber', () => {
    expect(getWashedTheme('worker').colors.primary).toBe('#1A5C34');
    expect(getWashedTheme('worker').colors.primary).not.toBe(
      getWashedTheme('subscriber').colors.primary,
    );
  });

  it('uses the Operator Admin palette with deep purple primary', () => {
    expect(getWashedTheme('operator').colors.primary).toBe('#3B1F7A');
    expect(getWashedTheme('operator').colors.bg).toBe('#F7F7FB');
  });

  it('uses a shared minimum tap target suitable for mobile apps', () => {
    expect(sharedTokens.tap.min).toBe('44px');
  });

  it('exposes the foundations type stack: Geist / Geist Mono', () => {
    expect(sharedTokens.font.display).toContain('Geist');
    expect(sharedTokens.font.body).toContain('Geist');
    expect(sharedTokens.font.mono).toContain('Geist Mono');
  });

  it('emits the 4-based spacing scale with 12 stops (--s-0 .. --s-11)', () => {
    expect(sharedTokens.spacing).toHaveLength(12);
    expect(sharedTokens.spacing[0]).toBe('0');
    expect(sharedTokens.spacing[1]).toBe('4px');
    expect(sharedTokens.spacing[4]).toBe('16px');
    expect(sharedTokens.spacing[11]).toBe('120px');
  });

  it('locks the four motion durations at 120/200/320/480 ms', () => {
    expect(sharedTokens.motion.duration.fast).toBe('120ms');
    expect(sharedTokens.motion.duration.base).toBe('200ms');
    expect(sharedTokens.motion.duration.slow).toBe('320ms');
    expect(sharedTokens.motion.duration.emphasis).toBe('480ms');
  });

  it('refuses bounce/spring — only the three approved easings', () => {
    expect(sharedTokens.motion.easing.standard).toBe('cubic-bezier(0.2, 0.8, 0.2, 1)');
    expect(sharedTokens.motion.easing.decelerate).toBe('cubic-bezier(0, 0, 0.2, 1)');
    expect(sharedTokens.motion.easing.accelerate).toBe('cubic-bezier(0.4, 0, 1, 1)');
  });

  it('shares the spacing/font/motion grammar across every theme', () => {
    expect(subscriberTheme.shared).toBe(sharedTokens);
    expect(getWashedTheme('worker').shared).toBe(sharedTokens);
    expect(getWashedTheme('operator').shared).toBe(sharedTokens);
  });
});
