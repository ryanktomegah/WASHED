export type WashedThemeName = 'operator' | 'subscriber' | 'worker';

export interface WashedColorTokens {
  readonly bg: string;
  readonly bgDeep: string;
  readonly surface: string;
  readonly surface2: string;
  readonly ink: string;
  readonly ink2: string;
  readonly ink3: string;
  readonly ink4: string;
  readonly line: string;
  readonly line2: string;
  readonly primary: string;
  readonly primaryDeep: string;
  readonly primaryOn: string;
  readonly primarySoft: string;
  readonly primaryTint: string;
  readonly accent: string;
  readonly accentSoft: string;
  readonly success: string;
  readonly successSoft: string;
  readonly danger: string;
  readonly dangerSoft: string;
  readonly warn: string;
  readonly warnSoft: string;
  readonly focusRing: string;
}

export interface WashedFontTokens {
  readonly display: string;
  readonly body: string;
  readonly mono: string;
}

export interface WashedTextScale {
  readonly xs: string;
  readonly sm: string;
  readonly base: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly '2xl': string;
  readonly '3xl': string;
  readonly '4xl': string;
  readonly '5xl': string;
  readonly '6xl': string;
}

export interface WashedRadiusTokens {
  readonly xs: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly pill: string;
}

export interface WashedShadowTokens {
  readonly card: string;
  readonly elevated: string;
  readonly overlay: string;
}

export interface WashedMotionTokens {
  readonly duration: {
    readonly fast: string;
    readonly base: string;
    readonly slow: string;
    readonly emphasis: string;
  };
  readonly easing: {
    readonly standard: string;
    readonly decelerate: string;
    readonly accelerate: string;
  };
}

export interface WashedSharedTokens {
  readonly font: WashedFontTokens;
  readonly text: WashedTextScale;
  readonly spacing: readonly string[];
  readonly radius: WashedRadiusTokens;
  readonly shadow: WashedShadowTokens;
  readonly motion: WashedMotionTokens;
  readonly tap: { readonly min: string };
}

export interface WashedTheme {
  readonly name: WashedThemeName;
  readonly colors: WashedColorTokens;
  readonly shared: WashedSharedTokens;
}

export const sharedTokens = {
  font: {
    display: "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "'Geist', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Geist Mono', ui-monospace, 'SF Mono', monospace",
  },
  text: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    md: '17px',
    lg: '20px',
    xl: '24px',
    '2xl': '30px',
    '3xl': '38px',
    '4xl': '48px',
    '5xl': '64px',
    '6xl': '84px',
  },
  spacing: [
    '0',
    '4px',
    '8px',
    '12px',
    '16px',
    '20px',
    '24px',
    '32px',
    '40px',
    '56px',
    '80px',
    '120px',
  ],
  radius: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    pill: '999px',
  },
  shadow: {
    card: '0 1px 2px rgba(28, 18, 8, 0.04), 0 4px 16px rgba(28, 18, 8, 0.05)',
    elevated: '0 8px 24px rgba(28, 18, 8, 0.08), 0 24px 48px rgba(28, 18, 8, 0.10)',
    overlay: '0 24px 80px rgba(28, 18, 8, 0.18)',
  },
  motion: {
    duration: { fast: '120ms', base: '200ms', slow: '320ms', emphasis: '480ms' },
    easing: {
      standard: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
  tap: { min: '44px' },
} as const satisfies WashedSharedTokens;

export const subscriberTheme = {
  name: 'subscriber',
  colors: {
    bg: '#FFFFFF',
    bgDeep: '#FAFAFA',
    surface: '#FFFFFF',
    surface2: '#FAFAFA',
    ink: '#0A0A0A',
    ink2: '#525252',
    ink3: '#737373',
    ink4: '#A3A3A3',
    line: '#E5E5E5',
    line2: '#D4D4D4',
    primary: '#0A3D1F',
    primaryDeep: '#062B16',
    primaryOn: '#FFFFFF',
    primarySoft: '#F5F9F6',
    primaryTint: '#E8F2EC',
    accent: '#A66B00',
    accentSoft: '#FFF6E0',
    success: '#0A3D1F',
    successSoft: '#E8F2EC',
    danger: '#B81F1F',
    dangerSoft: '#FDEAEA',
    warn: '#A66B00',
    warnSoft: '#FFF6E0',
    focusRing: '0 0 0 3px rgba(10, 61, 31, 0.30)',
  },
  shared: sharedTokens,
} as const satisfies WashedTheme;

export const workerTheme = {
  name: 'worker',
  colors: {
    bg: '#F5F8F6',
    bgDeep: '#EAF1EC',
    surface: '#FFFFFF',
    surface2: '#F8FBF8',
    ink: '#0E1A12',
    ink2: '#2C3A30',
    ink3: '#58685D',
    ink4: '#91A097',
    line: '#DDE8E2',
    line2: '#C5D4CB',
    primary: '#1A5C34',
    primaryDeep: '#0F3D22',
    primaryOn: '#FFFFFF',
    primarySoft: '#EAF6EE',
    primaryTint: '#C8ECD5',
    accent: '#D4900E',
    accentSoft: '#FEF3D7',
    success: '#2A7A48',
    successSoft: '#C8ECD5',
    danger: '#BE3030',
    dangerSoft: '#FDECEA',
    warn: '#B5651D',
    warnSoft: '#FCEAD3',
    focusRing: '0 0 0 3px rgba(26, 92, 52, 0.32)',
  },
  shared: sharedTokens,
} as const satisfies WashedTheme;

export const operatorTheme = {
  name: 'operator',
  colors: {
    bg: '#F7F7FB',
    bgDeep: '#ECEBF2',
    surface: '#FFFFFF',
    surface2: '#FAFAFD',
    ink: '#15131D',
    ink2: '#2E2B3B',
    ink3: '#686275',
    ink4: '#9590A3',
    line: '#E2E1EA',
    line2: '#CFCDDA',
    primary: '#3B1F7A',
    primaryDeep: '#28135A',
    primaryOn: '#FFFFFF',
    primarySoft: '#F0EBFF',
    primaryTint: '#D9D0FF',
    accent: '#3B1F7A',
    accentSoft: '#F0EBFF',
    success: '#2A7A48',
    successSoft: '#DFF0DA',
    danger: '#BE3030',
    dangerSoft: '#FDECEA',
    warn: '#B5651D',
    warnSoft: '#FCEAD3',
    focusRing: '0 0 0 3px rgba(59, 31, 122, 0.32)',
  },
  shared: sharedTokens,
} as const satisfies WashedTheme;

export const washedThemes = {
  operator: operatorTheme,
  subscriber: subscriberTheme,
  worker: workerTheme,
} as const satisfies Record<WashedThemeName, WashedTheme>;

export function getWashedTheme(name: WashedThemeName): WashedTheme {
  return washedThemes[name];
}
