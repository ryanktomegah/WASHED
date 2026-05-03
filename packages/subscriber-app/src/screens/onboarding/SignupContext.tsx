import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

export type SignupTier = 'T1' | 'T2';
export type SignupPaymentProvider = 'tmoney' | 'mixx' | 'flooz';

export interface SignupAddress {
  readonly neighborhood: string;
  readonly street: string;
  readonly landmark: string;
}

export interface SignupState {
  readonly phone: string;
  readonly address: SignupAddress;
  readonly tier: SignupTier | null;
  readonly paymentProvider: SignupPaymentProvider | null;
  readonly consentAccepted: boolean;
}

export interface SignupContextValue extends SignupState {
  readonly setPhone: (phone: string) => void;
  readonly setAddress: (address: SignupAddress) => void;
  readonly setTier: (tier: SignupTier) => void;
  readonly setPaymentProvider: (provider: SignupPaymentProvider) => void;
  readonly setConsentAccepted: (accepted: boolean) => void;
  readonly reset: () => void;
}

const initialState: SignupState = {
  phone: '',
  address: { neighborhood: '', street: '', landmark: '' },
  tier: null,
  paymentProvider: null,
  consentAccepted: false,
};

const SignupContext = createContext<SignupContextValue | null>(null);

export function SignupProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [state, setState] = useState<SignupState>(initialState);

  const setPhone = useCallback((phone: string) => {
    setState((current) => ({ ...current, phone }));
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

  const setConsentAccepted = useCallback((consentAccepted: boolean) => {
    setState((current) => ({ ...current, consentAccepted }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const value = useMemo<SignupContextValue>(
    () => ({
      ...state,
      setPhone,
      setAddress,
      setTier,
      setPaymentProvider,
      setConsentAccepted,
      reset,
    }),
    [state, setPhone, setAddress, setTier, setPaymentProvider, setConsentAccepted, reset],
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

export const TIER_PRICE_XOF: Record<SignupTier, number> = {
  T1: 2500,
  T2: 4500,
};

export const TIER_LABEL: Record<SignupTier, string> = {
  T1: 'Une visite',
  T2: 'Deux visites',
};

export const PAYMENT_PROVIDER_LABEL: Record<SignupPaymentProvider, string> = {
  tmoney: 'TMoney',
  mixx: 'Mixx by Yas',
  flooz: 'Flooz',
};
