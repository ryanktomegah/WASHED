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

export type SignupTier = 'T1' | 'T2';
export type SignupPaymentProvider = 'mixx' | 'flooz';
export type SignupFlowMode = 'signup' | 'existing';

export interface SignupAddress {
  readonly neighborhood: string;
  readonly street: string;
  readonly landmark: string;
  readonly gpsLatitude: number | null;
  readonly gpsLongitude: number | null;
}

export interface SignupIdentity {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly isAdult: boolean;
}

export interface SignupState {
  readonly mode: SignupFlowMode;
  readonly otpChallengeId: string;
  readonly phone: string;
  readonly identity: SignupIdentity;
  readonly avatarDataUrl: string;
  readonly address: SignupAddress;
  readonly tier: SignupTier | null;
  readonly paymentProvider: SignupPaymentProvider | null;
}

export interface SignupContextValue extends SignupState {
  readonly setMode: (mode: SignupFlowMode) => void;
  readonly setOtpChallengeId: (challengeId: string) => void;
  readonly setPhone: (phone: string) => void;
  readonly setIdentity: (identity: SignupIdentity) => void;
  readonly setAvatarDataUrl: (avatarDataUrl: string) => void;
  readonly setAddress: (address: SignupAddress) => void;
  readonly setTier: (tier: SignupTier) => void;
  readonly setPaymentProvider: (provider: SignupPaymentProvider) => void;
  readonly reset: () => void;
}

export type SignupInitialState = Partial<
  Omit<SignupState, 'address'> & { readonly address: Partial<SignupAddress> }
>;

const defaultSignupState: SignupState = {
  mode: 'signup',
  otpChallengeId: '',
  phone: '',
  identity: { firstName: '', lastName: '', email: '', isAdult: false },
  avatarDataUrl: '',
  address: { gpsLatitude: null, gpsLongitude: null, landmark: '', neighborhood: '', street: '' },
  tier: null,
  paymentProvider: null,
};

export const SUBSCRIBER_SIGNUP_STORAGE_KEY = 'washed.subscriber.signup-state';

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({
  children,
  initialState,
  storageKey = null,
}: {
  readonly children: ReactNode;
  readonly initialState?: SignupInitialState;
  readonly storageKey?: string | null;
}): ReactElement {
  const [state, setState] = useState<SignupState>(() =>
    mergeSignupState(
      initialState === undefined && storageKey !== null ? readStoredSignupState(storageKey) : null,
      initialState,
    ),
  );

  useEffect(() => {
    if (storageKey === null) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const setPhone = useCallback((phone: string) => {
    setState((current) => ({ ...current, phone }));
  }, []);

  const setMode = useCallback((mode: SignupFlowMode) => {
    setState((current) => ({ ...current, mode }));
  }, []);

  const setOtpChallengeId = useCallback((otpChallengeId: string) => {
    setState((current) => ({ ...current, otpChallengeId }));
  }, []);

  const setIdentity = useCallback((identity: SignupIdentity) => {
    setState((current) => ({ ...current, identity }));
  }, []);

  const setAvatarDataUrl = useCallback((avatarDataUrl: string) => {
    setState((current) => ({ ...current, avatarDataUrl }));
  }, []);

  const setAddress = useCallback((address: SignupAddress) => {
    setState((current) => ({ ...current, address }));
  }, []);

  const setTier = useCallback((tier: SignupTier) => {
    setState((current) => ({ ...current, tier }));
  }, []);

  const setPaymentProvider = useCallback((paymentProvider: SignupPaymentProvider) => {
    setState((current) => ({ ...current, paymentProvider }));
  }, []);

  const reset = useCallback(() => {
    if (storageKey !== null) window.localStorage.removeItem(storageKey);
    setState(defaultSignupState);
  }, [storageKey]);

  const value = useMemo<SignupContextValue>(
    () => ({
      ...state,
      setMode,
      setOtpChallengeId,
      setPhone,
      setIdentity,
      setAvatarDataUrl,
      setAddress,
      setTier,
      setPaymentProvider,
      reset,
    }),
    [
      state,
      setMode,
      setOtpChallengeId,
      setPhone,
      setIdentity,
      setAvatarDataUrl,
      setAddress,
      setTier,
      setPaymentProvider,
      reset,
    ],
  );

  return <SignupContext.Provider value={value}>{children}</SignupContext.Provider>;
}

export function useSignup(): SignupContextValue {
  const value = useContext(SignupContext);
  if (value === null) {
    throw new Error('useSignup must be used inside a <SignupProvider>');
  }
  return value;
}

export function useOptionalSignup(): SignupContextValue | null {
  return useContext(SignupContext);
}

export const TIER_PRICE_XOF: Record<SignupTier, number> = {
  T1: 2500,
  T2: 4500,
};

export const PAYMENT_PROVIDER_LABEL: Record<SignupPaymentProvider, string> = {
  mixx: 'Mixx by Yas',
  flooz: 'Flooz',
};

export function hasSignupIdentity(identity: SignupIdentity): boolean {
  return (
    identity.firstName.trim() !== '' && identity.lastName.trim() !== '' && identity.isAdult === true
  );
}

export function signupFullName(identity: SignupIdentity): string {
  return `${identity.firstName.trim()} ${identity.lastName.trim()}`.trim();
}

function mergeSignupState(
  storedState: SignupInitialState | null,
  initialState: SignupInitialState | undefined,
): SignupState {
  return {
    ...defaultSignupState,
    ...storedState,
    ...initialState,
    identity: {
      ...defaultSignupState.identity,
      ...storedState?.identity,
      ...initialState?.identity,
    },
    address: {
      ...defaultSignupState.address,
      ...storedState?.address,
      ...initialState?.address,
    },
  };
}

function readStoredSignupState(storageKey: string): SignupInitialState | null {
  const raw = window.localStorage.getItem(storageKey);
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as SignupInitialState;
  } catch {
    return null;
  }
}
