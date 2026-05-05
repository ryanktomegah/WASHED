import { useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatXof, translate } from '@washed/i18n';

import { PAYMENT_PROVIDER_LABEL, TIER_PRICE_XOF, useSignup } from './SignupContext.js';

function shortPhone(phone: string): string {
  // "+228 90 12 34 56" → "90 12…" — show enough to recognise without exposing.
  const groups = phone.split(' ');
  if (groups.length < 5) return phone;
  return `${groups[1]} ${groups[2]}…`;
}

export function ReviewX07(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  // Guard: a deep-link to /signup/review without prior steps must restart from
  // the splash, not jump to the post-signup welcome (which would fake success).
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
    if (!signup.consentAccepted) return;
    navigate('/signup/welcome');
  };

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
            <dd>
              {translate(
                tier === 'T1'
                  ? 'subscriber.signup.tier.t1.label'
                  : 'subscriber.signup.tier.t2.label',
              )}{' '}
              <span className="p-sm">{translate('subscriber.signup.review.month_suffix')}</span>
            </dd>
          </div>
          <div className="review-row">
            <dt>{translate('subscriber.signup.review.field.address')}</dt>
            <dd>
              {signup.address.neighborhood}
              {signup.address.street === '' ? null : (
                <span className="p-sm"> · {signup.address.street}</span>
              )}
            </dd>
          </div>
          <div className="review-row">
            <dt>{translate('subscriber.signup.review.field.payment')}</dt>
            <dd>
              {PAYMENT_PROVIDER_LABEL[provider]}{' '}
              <span className="p-sm">· {shortPhone(signup.phone)}</span>
            </dd>
          </div>
          <div className="review-divider" aria-hidden="true" />
          <div className="review-row review-total">
            <dt>{translate('subscriber.signup.review.field.total')}</dt>
            <dd className="review-total-amount">{formatXof(totalXof)}</dd>
          </div>
        </dl>

        <aside
          className="review-warn"
          aria-label={translate('subscriber.signup.review.next_step.label')}
        >
          <span className="h-sm review-warn-eyebrow">
            {translate('subscriber.signup.review.next_step.label')}
          </span>
          <p className="p-sm">{translate('subscriber.signup.review.next_step.body')}</p>
        </aside>

        <label className="consent-row">
          <input
            checked={signup.consentAccepted}
            onChange={(event) => signup.setConsentAccepted(event.target.checked)}
            type="checkbox"
          />
          <span className="p-sm">
            {translate('subscriber.signup.review.consent.prefix')}{' '}
            <a href="#/legal/terms" className="link">
              {translate('subscriber.signup.review.consent.terms')}
            </a>{' '}
            {translate('subscriber.signup.review.consent.connector')}{' '}
            <a href="#/legal/privacy" className="link">
              {translate('subscriber.signup.review.consent.privacy')}
            </a>
            .
          </span>
        </label>

        <div className="grow" />

        <button
          className="btn full primary"
          disabled={!signup.consentAccepted}
          onClick={onSubmit}
          type="button"
        >
          {translate('subscriber.signup.review.cta')}
        </button>
      </div>
    </main>
  );
}
