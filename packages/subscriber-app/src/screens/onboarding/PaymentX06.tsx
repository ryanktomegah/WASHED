import { useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { PAYMENT_PROVIDER_LABEL, useSignup, type SignupPaymentProvider } from './SignupContext.js';

interface ProviderOption {
  readonly provider: SignupPaymentProvider;
  readonly tagline: string;
}

const PROVIDER_OPTIONS: readonly ProviderOption[] = [
  { provider: 'tmoney', tagline: 'Togocom' },
  { provider: 'mixx', tagline: 'Yas' },
  { provider: 'flooz', tagline: 'Moov Africa' },
];

export function PaymentX06(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const selected: SignupPaymentProvider = signup.paymentProvider ?? 'tmoney';

  // Guard: a deep-link to /signup/payment without a confirmed phone or tier
  // means earlier steps were skipped — bounce to the right resume point.
  useEffect(() => {
    if (signup.phone === '') {
      navigate('/signup/phone', { replace: true });
      return;
    }
    if (signup.tier === null) {
      navigate('/welcome', { replace: true });
      return;
    }
    if (signup.address.neighborhood === '' || signup.address.street.trim() === '') {
      navigate('/signup/address', { replace: true });
    }
  }, [signup.phone, signup.tier, signup.address.neighborhood, signup.address.street, navigate]);

  if (
    signup.phone === '' ||
    signup.tier === null ||
    signup.address.neighborhood === '' ||
    signup.address.street.trim() === ''
  ) {
    return <></>;
  }

  const onSelect = (provider: SignupPaymentProvider): void => {
    signup.setPaymentProvider(provider);
  };

  const onSubmit = (): void => {
    if (signup.paymentProvider === null) signup.setPaymentProvider(selected);
    navigate('/signup/review');
  };

  // Show the user's confirmed phone next to the default-selected wallet so
  // they can spot a mismatch immediately. Other providers prompt to add a
  // dedicated number — captured in a follow-up screen, not this one.
  const phoneLine = signup.phone;

  return (
    <main aria-labelledby="x06-headline" className="onboarding-screen" data-screen-id="X-06">
      <div className="body tight">
        <div className="title-stack">
          <span className="h-sm">{translate('subscriber.signup.payment.eyebrow')}</span>
          <h1 className="h-md" id="x06-headline">
            {translate('subscriber.signup.payment.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.payment.body')}</p>
        </div>

        <fieldset className="provider-list" aria-labelledby="x06-headline">
          <legend className="visually-hidden">
            {translate('subscriber.signup.payment.title')}
          </legend>
          {PROVIDER_OPTIONS.map((option) => {
            const isSelected = option.provider === selected;
            const isDefault = option.provider === 'tmoney';
            return (
              <label
                className={`provider-card${isSelected ? ' is-selected' : ''}`}
                key={option.provider}
              >
                <input
                  checked={isSelected}
                  className="visually-hidden"
                  name="paymentProvider"
                  onChange={() => onSelect(option.provider)}
                  type="radio"
                  value={option.provider}
                />
                <span aria-hidden="true" className="provider-radio" />
                <span className="provider-body">
                  <strong>{PAYMENT_PROVIDER_LABEL[option.provider]}</strong>
                  <span className="p-sm">
                    {isDefault ? phoneLine : translate('subscriber.signup.payment.add_number')}
                  </span>
                </span>
                <span aria-hidden="true" className="provider-network p-sm">
                  {option.tagline}
                </span>
              </label>
            );
          })}
        </fieldset>

        <p className="p-sm">{translate('subscriber.signup.payment.note')}</p>

        <div className="grow" />

        <button className="btn full primary" onClick={onSubmit} type="button">
          {translate('subscriber.signup.continue.cta')}
        </button>
      </div>
    </main>
  );
}
