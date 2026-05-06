import { useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { OnboardingBackButton } from './OnboardingBackButton.js';
import { hasSignupIdentity, useSignup, type SignupTier } from './SignupContext.js';

interface TierOption {
  readonly tier: SignupTier;
  readonly labelKey: 'subscriber.signup.tier.t1.label' | 'subscriber.signup.tier.t2.label';
  readonly priceKey: 'subscriber.signup.tier.t1.price' | 'subscriber.signup.tier.t2.price';
}

const TIER_OPTIONS: readonly TierOption[] = [
  {
    tier: 'T1',
    labelKey: 'subscriber.signup.tier.t1.label',
    priceKey: 'subscriber.signup.tier.t1.price',
  },
  {
    tier: 'T2',
    labelKey: 'subscriber.signup.tier.t2.label',
    priceKey: 'subscriber.signup.tier.t2.price',
  },
];

const TIER_PRICE_KEY: Record<SignupTier, TierOption['priceKey']> = {
  T1: 'subscriber.signup.tier.t1.price',
  T2: 'subscriber.signup.tier.t2.price',
};

export function TierX05(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const selected: SignupTier = signup.tier ?? 'T1';

  useEffect(() => {
    if (signup.phone === '') {
      navigate('/signup/phone', { replace: true });
      return;
    }
    if (!hasSignupIdentity(signup.identity)) {
      navigate('/signup/identity', { replace: true });
      return;
    }
    if (signup.address.neighborhood === '' || signup.address.street.trim() === '') {
      navigate('/signup/address', { replace: true });
    }
  }, [signup.phone, signup.identity, signup.address.neighborhood, signup.address.street, navigate]);

  if (
    signup.phone === '' ||
    !hasSignupIdentity(signup.identity) ||
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
        <OnboardingBackButton to="/signup/address" />
        <div className="title-stack no-progress">
          <div aria-hidden="true" className="steps">
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i className="on" />
            <i className="on" />
          </div>
          <span className="h-sm">
            {translate('subscriber.signup.step_indicator', { current: 5, total: 5 })}
          </span>
          <h1 className="h-md" id="x05-headline">
            {translate('subscriber.signup.tier.title')}
          </h1>
          <p className="p">{translate('subscriber.signup.tier.body')}</p>
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
                  <strong>{translate(option.labelKey)}</strong>
                  <span className="p-sm">
                    {translate(
                      option.tier === selected
                        ? 'subscriber.signup.tier.selected_badge'
                        : 'subscriber.signup.tier.available_badge',
                    )}
                  </span>
                </div>
                <span className="tier-price-value">{translate(option.priceKey)}</span>
              </div>
            </label>
          ))}
        </fieldset>

        <p className="p-sm">{translate('subscriber.signup.tier.pricing_note')}</p>

        <div className="grow" />

        <button className="btn full primary" onClick={onSubmit} type="button">
          {translate('subscriber.signup.tier.cta_continue_amount', {
            amount: translate(TIER_PRICE_KEY[selected]),
          })}
        </button>
      </div>
    </main>
  );
}
