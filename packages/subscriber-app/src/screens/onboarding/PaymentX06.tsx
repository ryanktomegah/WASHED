import { useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { OnboardingBackButton } from './OnboardingBackButton.js';
import {
  PAYMENT_PROVIDER_LABEL,
  hasSignupIdentity,
  useSignup,
  type SignupPaymentProvider,
} from './SignupContext.js';

const PROVIDERS: readonly SignupPaymentProvider[] = ['mixx', 'flooz'];

export function PaymentX06(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const selected: SignupPaymentProvider = signup.paymentProvider ?? 'mixx';

  useEffect(() => {
    if (signup.phone === '') {
      navigate('/signup/phone', { replace: true });
      return;
    }
    if (!hasSignupIdentity(signup.identity)) {
      navigate('/signup/identity', { replace: true });
      return;
    }
    if (signup.tier === null) {
      navigate('/welcome', { replace: true });
      return;
    }
    if (signup.address.neighborhood === '' || signup.address.street.trim() === '') {
      navigate('/signup/address', { replace: true });
    }
  }, [
    signup.phone,
    signup.identity,
    signup.tier,
    signup.address.neighborhood,
    signup.address.street,
    navigate,
  ]);

  if (
    signup.phone === '' ||
    !hasSignupIdentity(signup.identity) ||
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

  const phoneLine = signup.phone.replace(/^\+228\s*/u, '');

  return (
    <main aria-labelledby="x06-headline" className="onboarding-screen" data-screen-id="X-06">
      <div className="body tight">
        <OnboardingBackButton to="/signup/tier" />
        <div className="title-stack">
          <span className="h-sm">{translate('subscriber.signup.payment.eyebrow')}</span>
          <h1 className="h-md" id="x06-headline">
            {translate('subscriber.signup.payment.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.payment.body')}</p>
        </div>

        <fieldset className="provider-grid" aria-labelledby="x06-headline">
          <legend className="visually-hidden">
            {translate('subscriber.signup.payment.provider_label')}
          </legend>
          {PROVIDERS.map((provider) => (
            <label
              className={`provider-card${provider === selected ? ' is-selected' : ''}`}
              key={provider}
            >
              <input
                checked={provider === selected}
                className="visually-hidden"
                name="provider"
                onChange={() => onSelect(provider)}
                type="radio"
                value={provider}
              />
              <span className="provider-card-name">{PAYMENT_PROVIDER_LABEL[provider]}</span>
              <span aria-hidden="true" className="provider-card-radio" />
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label className="visually-hidden" htmlFor="x06-phone">
            {translate('subscriber.signup.payment.phone_label')}
          </label>
          <div className="input-shell">
            <span aria-hidden="true" className="input-prefix">
              +228
            </span>
            <input id="x06-phone" readOnly type="tel" value={phoneLine} />
          </div>
        </div>

        <p className="notice">{translate('subscriber.signup.payment.note')}</p>

        <div className="grow" />

        <button className="btn full primary" onClick={onSubmit} type="button">
          {translate('subscriber.signup.continue.cta')}
        </button>
      </div>
    </main>
  );
}
