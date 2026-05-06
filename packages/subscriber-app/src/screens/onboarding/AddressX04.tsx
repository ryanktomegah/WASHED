import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { OnboardingBackButton } from './OnboardingBackButton.js';
import { hasSignupIdentity, useSignup } from './SignupContext.js';

const LOME_NEIGHBORHOODS = [
  'Adidogomé',
  'Agoè',
  'Bè',
  'Cacavéli',
  'Hédzranawoé',
  'Kégué',
  'Lomé II',
  'Nyékonakpoè',
  'Tokoin Casablanca',
  'Tokoin Forever',
  'Tokoin Solidarité',
] as const;

export function AddressX04(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const [neighborhood, setNeighborhood] = useState(signup.address.neighborhood);
  const [street, setStreet] = useState(signup.address.street);

  useEffect(() => {
    if (signup.phone === '') {
      navigate('/signup/phone', { replace: true });
      return;
    }
    if (!hasSignupIdentity(signup.identity)) {
      navigate('/signup/identity', { replace: true });
    }
  }, [signup.phone, signup.identity, navigate]);

  const isValid = neighborhood !== '' && street.trim().length >= 3;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isValid) return;
    signup.setAddress({
      gpsLatitude: signup.address.gpsLatitude,
      gpsLongitude: signup.address.gpsLongitude,
      landmark: '',
      neighborhood,
      street: street.trim(),
    });
    navigate('/signup/tier');
  };

  if (signup.phone === '' || !hasSignupIdentity(signup.identity)) return <></>;

  return (
    <main aria-labelledby="x04-headline" className="onboarding-screen" data-screen-id="X-04">
      <form className="body tight" onSubmit={onSubmit}>
        <OnboardingBackButton to="/signup/identity" />
        <div className="title-stack no-progress">
          <div aria-hidden="true" className="steps">
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i />
          </div>
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', { current: 4, total: 5 })}
          </span>
          <h1 className="h-md" id="x04-headline">
            {translate('subscriber.signup.address.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.address.body')}</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x04-neighborhood">
            {translate('subscriber.signup.address.field.neighborhood')}
          </label>
          <div className="select-shell">
            <span aria-hidden="true" className="select-value">
              {neighborhood === ''
                ? translate('subscriber.signup.address.neighborhood.placeholder')
                : neighborhood}
            </span>
            <select
              id="x04-neighborhood"
              name="neighborhood"
              onChange={(event) => setNeighborhood(event.target.value)}
              required
              value={neighborhood}
            >
              <option disabled value="">
                {translate('subscriber.signup.address.neighborhood.placeholder')}
              </option>
              {LOME_NEIGHBORHOODS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="select-chevron">
              ▾
            </span>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x04-street">
            {translate('subscriber.signup.address.field.street')}
          </label>
          <div className="input-shell">
            <input
              autoComplete="address-line1"
              id="x04-street"
              name="street"
              onChange={(event) => setStreet(event.target.value)}
              placeholder={translate('subscriber.signup.address.street.placeholder')}
              type="text"
              value={street}
            />
          </div>
        </div>

        <div className="address-map" aria-hidden="true">
          <span className="address-map-pin" />
        </div>

        <div className="grow" />

        <button className="btn full" disabled={!isValid} type="submit">
          {translate('subscriber.signup.continue.cta')}
        </button>
      </form>
    </main>
  );
}
