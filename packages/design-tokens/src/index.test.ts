import { describe, expect, it } from 'vitest';

import { getWashedTheme, washedThemes } from './index.js';

describe('Washed design tokens', () => {
  it('preserves one audience theme per frontend surface', () => {
    expect(Object.keys(washedThemes).sort()).toEqual(['operator', 'subscriber', 'worker']);
  });

  it('keeps the subscriber Savannah palette from the design files', () => {
    expect(getWashedTheme('subscriber').colors).toMatchObject({
      background: '#FAF6F0',
      foreground: '#1C1208',
      primary: '#C4622D',
    });
  });

  it('keeps the worker Forest palette distinct from subscriber', () => {
    expect(getWashedTheme('worker').colors.primary).toBe('#1a5c34');
    expect(getWashedTheme('worker').colors.primary).not.toBe(
      getWashedTheme('subscriber').colors.primary,
    );
  });

  it('uses a shared minimum tap target suitable for mobile apps', () => {
    expect(getWashedTheme('subscriber').shared.tapTarget.minimum).toBe('44px');
    expect(getWashedTheme('worker').shared.tapTarget.minimum).toBe('44px');
  });
});
