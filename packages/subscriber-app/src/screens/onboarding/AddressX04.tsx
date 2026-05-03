import { useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSignup } from './SignupContext.js';

// Locked Lomé neighborhood list — covers the operator-validated zones for v1.
// Source: design/03-information-architecture/sitemap.html section 04 (matching).
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
  const [landmark, setLandmark] = useState(signup.address.landmark);

  const isValid = neighborhood !== '' && street.trim().length >= 3;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isValid) return;
    signup.setAddress({
      neighborhood,
      street: street.trim(),
      landmark: landmark.trim(),
    });
    navigate('/signup/tier');
  };

  return (
    <main
      aria-labelledby="x04-headline"
      className="onboarding-screen"
      data-screen-id="X-04"
    >
      <form className="body tight" onSubmit={onSubmit}>
        <div className="title-stack">
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', 'fr', { current: 3, total: 4 })}
          </span>
          <h1 className="h-md" id="x04-headline">
            {translate('subscriber.signup.address.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.address.body')}</p>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x04-neighborhood">
            Quartier
          </label>
          <div className="select-shell">
            <select
              autoFocus={signup.address.neighborhood === ''}
              id="x04-neighborhood"
              name="neighborhood"
              onChange={(event) => setNeighborhood(event.target.value)}
              required
              value={neighborhood}
            >
              <option disabled value="">
                Choisissez un quartier
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
            Rue / détail
          </label>
          <div className="input-shell">
            <input
              autoComplete="address-line1"
              id="x04-street"
              name="street"
              onChange={(event) => setStreet(event.target.value)}
              placeholder="rue 254, maison bleue"
              type="text"
              value={street}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="x04-landmark">
            Repère (facultatif)
          </label>
          <div className="input-shell">
            <input
              autoComplete="off"
              id="x04-landmark"
              name="landmark"
              onChange={(event) => setLandmark(event.target.value)}
              placeholder="portail vert · sonnette à droite"
              type="text"
              value={landmark}
            />
          </div>
        </div>

        <div className="address-map" aria-hidden="true">
          <span className="address-map-pin" />
        </div>

        <div className="grow" />

        <button className="btn full" disabled={!isValid} type="submit">
          Continuer
        </button>
      </form>
    </main>
  );
}
