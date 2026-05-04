import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';
import { CoreApiError } from '@washed/api-client';

import { useBackend } from '../../backend/BackendContext.js';
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
  const backend = useBackend();
  const initialDigits = digitsOf(signup.phone.replace(/^\+228\s*/u, ''));
  const [phone, setPhone] = useState(formatTogoPhone(initialDigits));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = digitsOf(phone);
  const isValid = digits.length === TOGO_PHONE_LENGTH;

  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPhone(formatTogoPhone(event.target.value));
    if (error !== null) setError(null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!isValid || submitting) return;
    const fullPhone = `+228 ${formatTogoPhone(digits)}`;
    signup.setPhone(fullPhone);

    if (backend.liveBackendEnabled) {
      setSubmitting(true);
      try {
        const challenge = await backend.auth.startOtp(fullPhone);
        signup.setOtpChallenge(challenge);
      } catch (caught) {
        setSubmitting(false);
        const message =
          caught instanceof CoreApiError
            ? translate('error.server.body')
            : translate('error.network.body');
        setError(message);
        return;
      }
      setSubmitting(false);
    }

    navigate('/signup/otp');
  };

  return (
    <main
      aria-labelledby="x02-headline"
      className="onboarding-screen"
      data-screen-id="X-02"
    >
      <form className="body" onSubmit={onSubmit}>
        <div className="title-stack">
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', 'fr', { current: 1, total: 4 })}
          </span>
          <h1 className="h-md" id="x02-headline">
            {translate('subscriber.signup.phone.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.phone.body')}</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x02-phone">
            {translate('subscriber.signup.phone.input_label')}
          </label>
          <div className="input-shell">
            <span aria-hidden="true" className="input-prefix">
              +228
            </span>
            <input
              autoComplete="tel-national"
              autoFocus
              id="x02-phone"
              inputMode="tel"
              name="phone"
              onChange={onChange}
              placeholder="90 12 34 56"
              type="tel"
              value={phone}
            />
          </div>
          <p className="p-sm">
            Le numéro reste privé. Jamais transmis à votre laveuse.
          </p>
          {error === null ? null : (
            <p className="p-sm" role="alert" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
        </div>

        <div className="grow" />

        <button className="btn full primary" disabled={!isValid || submitting} type="submit">
          {translate('subscriber.signup.phone.cta')}
        </button>
      </form>
    </main>
  );
}
