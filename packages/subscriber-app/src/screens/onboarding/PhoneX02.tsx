import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSignup } from './SignupContext.js';

const TOGO_PHONE_LENGTH = 8;

function formatTogoPhone(digits: string): string {
  const cleaned = digits.replace(/\D/g, '').slice(0, TOGO_PHONE_LENGTH);
  return cleaned.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '').slice(0, TOGO_PHONE_LENGTH);
}

export function PhoneX02(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const initialDigits = digitsOf(signup.phone.replace(/^\+228\s*/u, ''));
  const [phone, setPhone] = useState(formatTogoPhone(initialDigits));
  const digits = digitsOf(phone);
  const isValid = digits.length === TOGO_PHONE_LENGTH;

  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPhone(formatTogoPhone(event.target.value));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isValid) return;
    const fullPhone = `+228 ${formatTogoPhone(digits)}`;
    signup.setPhone(fullPhone);
    navigate('/signup/otp');
  };

  return (
    <main aria-labelledby="x02-headline" className="onboarding-screen" data-screen-id="X-02">
      <form className="body" onSubmit={onSubmit}>
        <div className="title-stack no-progress">
          <div aria-hidden="true" className="steps">
            <i className="on" />
            <i />
            <i />
            <i />
          </div>
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', { current: 1, total: 4 })}
          </span>
          <h1 className="h-md" id="x02-headline">
            {translate('subscriber.signup.phone.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.phone.body')}</p>
        </div>

        <div className="field">
          <label className="visually-hidden" htmlFor="x02-phone">
            {translate('subscriber.signup.phone.input_label')}
          </label>
          <div className="input-shell">
            <span aria-hidden="true" className="input-prefix">
              +228
            </span>
            <input
              autoComplete="tel-national"
              id="x02-phone"
              inputMode="tel"
              name="phone"
              onChange={onChange}
              aria-describedby="x02-privacy"
              placeholder={translate('subscriber.signup.phone.placeholder')}
              type="tel"
              value={phone}
            />
          </div>
          <p className="p-sm" id="x02-privacy">
            {translate('subscriber.signup.phone.privacy_note')}
          </p>
        </div>

        <div className="grow" />

        <button className="btn full primary" disabled={!isValid} type="submit">
          {translate('subscriber.signup.phone.cta')}
        </button>
      </form>
    </main>
  );
}
