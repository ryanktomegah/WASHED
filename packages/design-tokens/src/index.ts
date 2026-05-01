export type WashedThemeName = 'operator' | 'subscriber' | 'worker';

export interface WashedColorTokens {
  readonly accent: string;
  readonly accentMuted: string;
  readonly background: string;
  readonly border: string;
  readonly danger: string;
  readonly dangerMuted: string;
  readonly foreground: string;
  readonly muted: string;
  readonly primary: string;
  readonly primaryMuted: string;
  readonly primarySoft: string;
  readonly success: string;
  readonly successMuted: string;
  readonly surface: string;
}

export interface WashedSharedTokens {
  readonly fontFamily: {
    readonly brand: string;
    readonly body: string;
  };
  readonly radius: {
    readonly control: string;
    readonly modal: string;
    readonly panel: string;
    readonly pill: string;
  };
  readonly shadow: {
    readonly card: string;
    readonly elevated: string;
  };
  readonly spacing: readonly string[];
  readonly tapTarget: {
    readonly minimum: string;
  };
}

export interface WashedTheme {
  readonly colors: WashedColorTokens;
  readonly name: WashedThemeName;
  readonly shared: WashedSharedTokens;
}

export const sharedTokens = {
  fontFamily: {
    body: "'Space Grotesk', system-ui, sans-serif",
    brand: "'Space Grotesk', system-ui, sans-serif",
  },
  radius: {
    control: '12px',
    modal: '16px',
    panel: '16px',
    pill: '999px',
  },
  shadow: {
    card: '0 1px 4px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.05)',
    elevated: '0 16px 48px rgba(0,0,0,0.16)',
  },
  spacing: ['0', '4px', '8px', '12px', '16px', '20px', '24px', '32px', '40px'],
  tapTarget: {
    minimum: '44px',
  },
} as const satisfies WashedSharedTokens;

export const subscriberTheme = {
  colors: {
    accent: '#B8870A',
    accentMuted: '#FEF0C0',
    background: '#FAF6F0',
    border: '#EAE0D5',
    danger: '#C03020',
    dangerMuted: '#FDECEA',
    foreground: '#1C1208',
    muted: '#8C7258',
    primary: '#C4622D',
    primaryMuted: '#F5DDD0',
    primarySoft: '#FFF3EE',
    success: '#4A7C3F',
    successMuted: '#DFF0DA',
    surface: '#FFFDF8',
  },
  name: 'subscriber',
  shared: sharedTokens,
} as const satisfies WashedTheme;

export const workerTheme = {
  colors: {
    accent: '#d4900e',
    accentMuted: '#fef3d7',
    background: '#f5f8f6',
    border: '#dde8e2',
    danger: '#be3030',
    dangerMuted: '#fdecea',
    foreground: '#0e1a12',
    muted: '#718c7a',
    primary: '#1a5c34',
    primaryMuted: '#c8ecd5',
    primarySoft: '#eaf6ee',
    success: '#2a7a48',
    successMuted: '#c8ecd5',
    surface: '#ffffff',
  },
  name: 'worker',
  shared: sharedTokens,
} as const satisfies WashedTheme;

export const operatorTheme = {
  colors: {
    accent: '#3b1f7a',
    accentMuted: '#f0ebff',
    background: '#f7f7fb',
    border: '#e2e1ea',
    danger: '#be3030',
    dangerMuted: '#fdecea',
    foreground: '#15131d',
    muted: '#686275',
    primary: '#3b1f7a',
    primaryMuted: '#d9d0ff',
    primarySoft: '#f0ebff',
    success: '#2a7a48',
    successMuted: '#dff0da',
    surface: '#ffffff',
  },
  name: 'operator',
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
