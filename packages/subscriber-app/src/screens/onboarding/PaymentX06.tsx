import { useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSignup } from './SignupContext.js';

export function PaymentX06(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();

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

  const onSubmit = (): void => {
    signup.setPaymentProvider('tmoney');
    navigate('/signup/review');
  };

  const phoneLine = signup.phone.replace(/^\+228\s*/u, '');

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

        <div className="field">
          <span className="field-label">
            {translate('subscriber.signup.payment.provider_label')}
          </span>
          <div className="input-shell">TMoney</div>
        </div>

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
