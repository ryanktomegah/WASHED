import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import { OnboardingBackButton } from './OnboardingBackButton.js';
import { useSignup } from './SignupContext.js';

function isValidEmail(email: string): boolean {
  return email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email);
}

export function IdentityX03I(): ReactElement {
  const navigate = useNavigate();
  const subscriberApi = useSubscriberApi();
  const signup = useSignup();
  const [firstName, setFirstName] = useState(signup.identity.firstName);
  const [lastName, setLastName] = useState(signup.identity.lastName);
  const [email, setEmail] = useState(signup.identity.email);
  const [error, setError] = useState<string | null>(null);
  const [isAdult, setIsAdult] = useState(signup.identity.isAdult);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (signup.phone === '') navigate('/signup/phone', { replace: true });
  }, [signup.phone, navigate]);

  const normalizedEmail = email.trim();
  const isValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    isValidEmail(normalizedEmail) &&
    isAdult;

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!isValid || isSubmitting) return;

    const identity = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      isAdult,
    };
    setError(null);
    setIsSubmitting(true);

    try {
      if (subscriberApi.isConfigured) {
        await subscriberApi.upsertProfile({
          ...(identity.email === '' ? {} : { email: identity.email }),
          firstName: identity.firstName,
          isAdultConfirmed: identity.isAdult,
          lastName: identity.lastName,
        });
      }

      signup.setIdentity(identity);
      navigate('/signup/address');
    } catch {
      setError(translate('error.server.body'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onAdultChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setIsAdult(event.target.checked);
  };

  if (signup.phone === '') return <></>;

  return (
    <main aria-labelledby="x03i-headline" className="onboarding-screen" data-screen-id="X-03I">
      <form className="body tight" onSubmit={onSubmit}>
        <OnboardingBackButton to="/signup/otp" />
        <div className="title-stack no-progress">
          <div aria-hidden="true" className="steps">
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i />
            <i />
          </div>
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', { current: 3, total: 5 })}
          </span>
          <h1 className="h-md" id="x03i-headline">
            {translate('subscriber.signup.identity.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.identity.body')}</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x03i-first-name">
            {translate('subscriber.signup.identity.field.first_name')}
          </label>
          <div className="input-shell">
            <input
              autoComplete="given-name"
              id="x03i-first-name"
              name="firstName"
              onChange={(event) => setFirstName(event.target.value)}
              placeholder={translate('subscriber.signup.identity.first_name.placeholder')}
              type="text"
              value={firstName}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x03i-last-name">
            {translate('subscriber.signup.identity.field.last_name')}
          </label>
          <div className="input-shell">
            <input
              autoComplete="family-name"
              id="x03i-last-name"
              name="lastName"
              onChange={(event) => setLastName(event.target.value)}
              placeholder={translate('subscriber.signup.identity.last_name.placeholder')}
              type="text"
              value={lastName}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x03i-email">
            {translate('subscriber.signup.identity.field.email')}
          </label>
          <div className="input-shell">
            <input
              autoComplete="email"
              id="x03i-email"
              inputMode="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={translate('subscriber.signup.identity.email.placeholder')}
              type="email"
              value={email}
            />
          </div>
        </div>

        <label className={`consent-row${isAdult ? ' is-checked' : ''}`}>
          <input
            checked={isAdult}
            className="visually-hidden"
            onChange={onAdultChange}
            type="checkbox"
          />
          <span aria-hidden="true" className="consent-box">
            {isAdult ? <span className="consent-check">✓</span> : null}
          </span>
          <span className="consent-text">{translate('subscriber.signup.identity.adult')}</span>
        </label>

        {error === null ? null : (
          <p className="notice" role="alert">
            {error}
          </p>
        )}

        <div className="grow" />

        <button className="btn full primary" disabled={!isValid || isSubmitting} type="submit">
          {translate('subscriber.signup.continue.cta')}
        </button>
      </form>
    </main>
  );
}
