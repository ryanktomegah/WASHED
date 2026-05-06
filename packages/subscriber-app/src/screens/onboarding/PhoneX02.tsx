import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import { OnboardingBackButton } from './OnboardingBackButton.js';
import { useSignup } from './SignupContext.js';
import { TOGO_PHONE_LENGTH, digitsOfTogoPhone, formatTogoPhone } from './phoneNumber.js';

export function PhoneX02(): ReactElement {
  const navigate = useNavigate();
  const subscriberApi = useSubscriberApi();
  const signup = useSignup();
  const initialDigits = digitsOfTogoPhone(signup.phone);
  const [phone, setPhone] = useState(formatTogoPhone(initialDigits));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const digits = digitsOfTogoPhone(phone);
  const isValid = digits.length === TOGO_PHONE_LENGTH;

  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPhone(formatTogoPhone(event.target.value));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!isValid || isSubmitting) return;
    const fullPhone = `+228 ${formatTogoPhone(digits)}`;
    setError(null);
    setIsSubmitting(true);

    try {
      if (subscriberApi.isConfigured) {
        const challenge = await subscriberApi.startOtp(`+228${digits}`);
        signup.setOtpChallengeId(challenge.challengeId);
      }

      signup.setPhone(fullPhone);
      navigate('/signup/otp');
    } catch {
      setError(translate('error.server.body'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main aria-labelledby="x02-headline" className="onboarding-screen" data-screen-id="X-02">
      <form className="body" onSubmit={onSubmit}>
        <OnboardingBackButton to="/welcome" />
        <div className="title-stack no-progress">
          <div aria-hidden="true" className="steps">
            <i className="on" />
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', { current: 1, total: 5 })}
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
          {error === null ? null : (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="grow" />

        <button className="btn full primary" disabled={!isValid || isSubmitting} type="submit">
          {translate('subscriber.signup.phone.cta')}
        </button>
      </form>
    </main>
  );
}
