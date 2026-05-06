import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

export type SubscriberAppearancePreference = 'dark' | 'light' | 'system';
export type SubscriberEffectiveAppearance = 'dark' | 'light';

export interface SubscriberAppearanceContextValue {
  readonly effectiveMode: SubscriberEffectiveAppearance;
  readonly previewPreference: (preference: SubscriberAppearancePreference) => void;
  readonly preference: SubscriberAppearancePreference;
  readonly setPreference: (preference: SubscriberAppearancePreference) => void;
}

export const SUBSCRIBER_APPEARANCE_STORAGE_KEY = 'washed.subscriber.appearance';

const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const SUBSCRIBER_LIGHT_CHROME = '#FFFFFF';
const SUBSCRIBER_DARK_CHROME = '#111111';
const DEFAULT_APPEARANCE_PREFERENCE = 'system';
const APPEARANCE_VALUES = new Set<SubscriberAppearancePreference>(['dark', 'light', 'system']);

interface SubscriberAppearanceState {
  readonly shouldPersistPreference: boolean;
  readonly preference: SubscriberAppearancePreference;
}

const SubscriberAppearanceContext = createContext<SubscriberAppearanceContextValue>({
  effectiveMode: 'light',
  previewPreference: () => undefined,
  preference: DEFAULT_APPEARANCE_PREFERENCE,
  setPreference: () => undefined,
});

export function SubscriberAppearanceProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const [appearance, setAppearance] = useState<SubscriberAppearanceState>(readStoredAppearance);
  const previewPreference = useCallback((preference: SubscriberAppearancePreference): void => {
    setAppearance({ preference, shouldPersistPreference: false });
  }, []);
  const setPreference = useCallback((preference: SubscriberAppearancePreference): void => {
    setAppearance({ preference, shouldPersistPreference: true });
  }, []);
  const prefersDark = usePrefersDarkColorScheme();
  const { preference, shouldPersistPreference } = appearance;
  const effectiveMode = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    if (!shouldPersistPreference) return;

    window.localStorage.setItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY, preference);
  }, [preference, shouldPersistPreference]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void StatusBar.setStyle({ style: effectiveMode === 'dark' ? Style.Dark : Style.Light });
    void StatusBar.setBackgroundColor({
      color: effectiveMode === 'dark' ? SUBSCRIBER_DARK_CHROME : SUBSCRIBER_LIGHT_CHROME,
    });
  }, [effectiveMode]);

  const value = useMemo<SubscriberAppearanceContextValue>(
    () => ({ effectiveMode, previewPreference, preference, setPreference }),
    [effectiveMode, previewPreference, preference, setPreference],
  );

  return (
    <SubscriberAppearanceContext.Provider value={value}>
      {children}
    </SubscriberAppearanceContext.Provider>
  );
}

export function useSubscriberAppearance(): SubscriberAppearanceContextValue {
  return useContext(SubscriberAppearanceContext);
}

export function hasStoredSubscriberAppearancePreference(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
  return APPEARANCE_VALUES.has(stored as SubscriberAppearancePreference);
}

function readStoredAppearance(): SubscriberAppearanceState {
  const stored = window.localStorage.getItem(SUBSCRIBER_APPEARANCE_STORAGE_KEY);
  if (APPEARANCE_VALUES.has(stored as SubscriberAppearancePreference)) {
    return {
      preference: stored as SubscriberAppearancePreference,
      shouldPersistPreference: false,
    };
  }

  return {
    preference: DEFAULT_APPEARANCE_PREFERENCE,
    shouldPersistPreference: false,
  };
}

function usePrefersDarkColorScheme(): boolean {
  const [prefersDark, setPrefersDark] = useState(getPrefersDarkColorScheme);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia(DARK_COLOR_SCHEME_QUERY);
    const onChange = (event: MediaQueryListEvent): void => setPrefersDark(event.matches);

    setPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return prefersDark;
}

function getPrefersDarkColorScheme(): boolean {
  return (
    typeof window.matchMedia === 'function' && window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches
  );
}
