import { useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatXof, translate } from '@washed/i18n';

import { TIER_PRICE_XOF, useSignup, type SignupTier } from './SignupContext.js';

interface TierOption {
  readonly tier: SignupTier;
  readonly cadence: string;
  readonly subline: string;
}

const TIER_OPTIONS: readonly TierOption[] = [
  { tier: 'T1', cadence: 'Une visite', subline: 'par mois · ~1 h 30' },
  { tier: 'T2', cadence: 'Deux visites', subline: 'par mois · économie 500 XOF' },
];

export function TierX05(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const selected: SignupTier = signup.tier ?? 'T1';

  useEffect(() => {
    if (signup.phone === '') {
      navigate('/signup/phone', { replace: true });
      return;
    }
    if (signup.address.neighborhood === '' || signup.address.street.trim() === '') {
      navigate('/signup/address', { replace: true });
    }
  }, [signup.phone, signup.address.neighborhood, signup.address.street, navigate]);

  if (
    signup.phone === '' ||
    signup.address.neighborhood === '' ||
    signup.address.street.trim() === ''
  ) {
    return <></>;
  }

  const onSelect = (tier: SignupTier): void => {
    signup.setTier(tier);
  };

  const onSubmit = (): void => {
    if (signup.tier === null) signup.setTier(selected);
    navigate('/signup/payment');
  };

  return (
    <main aria-labelledby="x05-headline" className="onboarding-screen" data-screen-id="X-05">
      <div className="body tight">
        <div className="title-stack">
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', 'fr', { current: 4, total: 4 })}
          </span>
          <h1 className="h-md" id="x05-headline">
            {translate('subscriber.signup.tier.title')}
          </h1>
          <p className="p-sm">Vous pouvez changer plus tard, sans frais.</p>
        </div>

        <fieldset className="tier-grid" aria-labelledby="x05-headline">
          <legend className="visually-hidden">{translate('subscriber.signup.tier.title')}</legend>
          {TIER_OPTIONS.map((option) => (
            <label
              className={`tier-card${option.tier === selected ? ' is-selected' : ''}`}
              key={option.tier}
            >
              <input
                checked={option.tier === selected}
                className="visually-hidden"
                name="tier"
                onChange={() => onSelect(option.tier)}
                type="radio"
                value={option.tier}
              />
              <div className="tier-card-head">
                <div>
                  <strong>{option.cadence}</strong>
                  <span className="p-sm">{option.subline}</span>
                </div>
                {option.tier === selected ? <span className="tier-chip">choisi</span> : null}
              </div>
              <div className="tier-price">
                <strong>
                  {TIER_PRICE_XOF[option.tier].toLocaleString('fr-FR').replace(/ | /g, ' ')}
                </strong>
                <span>XOF / mois</span>
              </div>
            </label>
          ))}
        </fieldset>

        <div className="grow" />

        <button className="btn full primary" onClick={onSubmit} type="button">
          Continuer · {formatXof(TIER_PRICE_XOF[selected])}
        </button>
      </div>
    </main>
  );
}
