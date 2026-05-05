import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatXof, translate } from '@washed/i18n';

import { PAYMENT_PROVIDER_LABEL, TIER_PRICE_XOF, useSignup } from './SignupContext.js';

function shortPhone(phone: string): string {
  const groups = phone.split(' ');
  if (groups.length < 5) return phone;
  return `${groups[1]} ${groups[2]}…`;
}

export function ReviewX07(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (
      signup.phone === '' ||
      signup.address.neighborhood === '' ||
      signup.address.street.trim() === '' ||
      signup.tier === null
    ) {
      navigate('/welcome', { replace: true });
      return;
    }
    if (signup.paymentProvider === null) {
      navigate('/signup/payment', { replace: true });
    }
  }, [
    signup.phone,
    signup.address.neighborhood,
    signup.address.street,
    signup.tier,
    signup.paymentProvider,
    navigate,
  ]);

  if (
    signup.phone === '' ||
    signup.address.neighborhood === '' ||
    signup.address.street.trim() === '' ||
    signup.tier === null ||
    signup.paymentProvider === null
  ) {
    return <></>;
  }

  const tier = signup.tier;
  const provider = signup.paymentProvider;
  const totalXof = TIER_PRICE_XOF[tier];

  const onSubmit = (): void => {
    if (!consented) return;
    navigate('/signup/welcome');
  };

  const tierLabel = translate(
    tier === 'T1' ? 'subscriber.signup.tier.t1.label' : 'subscriber.signup.tier.t2.label',
  );
  const paymentLabel = `${PAYMENT_PROVIDER_LABEL[provider]} · ${shortPhone(signup.phone)}`;

  return (
    <main aria-labelledby="x07-headline" className="onboarding-screen" data-screen-id="X-07">
      <div className="body">
        <div className="title-stack">
          <span className="h-sm">{translate('subscriber.signup.review.eyebrow')}</span>
          <h1 className="h-md" id="x07-headline">
            {translate('subscriber.signup.review.title')}
          </h1>
        </div>

        <dl className="review-card">
          <div className="review-row">
            <dt>{translate('subscriber.signup.review.field.tier')}</dt>
            <dd>{tierLabel}</dd>
          </div>
          <div className="review-divider" aria-hidden="true" />
          <div className="review-row">
            <dt>{translate('subscriber.signup.review.field.address')}</dt>
            <dd>{signup.address.neighborhood}</dd>
          </div>
          <div className="review-divider" aria-hidden="true" />
          <div className="review-row">
            <dt>{translate('subscriber.signup.review.field.payment')}</dt>
            <dd>{paymentLabel}</dd>
          </div>
          <div className="review-divider" aria-hidden="true" />
          <div className="review-row">
            <dt>{translate('subscriber.signup.review.field.total')}</dt>
            <dd>{formatXof(totalXof)}</dd>
          </div>
        </dl>

        <p className="notice">{translate('subscriber.signup.review.next_step.body')}</p>

        <label className={`consent-row${consented ? ' is-checked' : ''}`}>
          <input
            checked={consented}
            className="visually-hidden"
            onChange={(event) => setConsented(event.target.checked)}
            type="checkbox"
          />
          <span aria-hidden="true" className="consent-box">
            {consented ? <span className="consent-check">✓</span> : null}
          </span>
          <span className="consent-text">
            {translate('subscriber.signup.review.consent.prefix')}{' '}
            <strong>{translate('subscriber.signup.review.consent.terms')}</strong>{' '}
            {translate('subscriber.signup.review.consent.connector')}{' '}
            <strong>{translate('subscriber.signup.review.consent.privacy')}</strong>
          </span>
        </label>

        <div className="grow" />

        <button className="btn full primary" disabled={!consented} onClick={onSubmit} type="button">
          {translate('subscriber.signup.review.cta')}
        </button>
      </div>
    </main>
  );
}
