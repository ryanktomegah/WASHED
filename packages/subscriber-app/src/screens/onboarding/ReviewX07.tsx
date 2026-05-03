import { useEffect, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatXof, translate } from '@washed/i18n';

import {
  PAYMENT_PROVIDER_LABEL,
  TIER_LABEL,
  TIER_PRICE_XOF,
  useSignup,
} from './SignupContext.js';

function shortPhone(phone: string): string {
  // "+228 90 12 34 56" → "90 12…" — show enough to recognise without exposing.
  const groups = phone.split(' ');
  if (groups.length < 5) return phone;
  return `${groups[1]} ${groups[2]}…`;
}

export function ReviewX07(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();
  // Guard: a deep-link to /signup/review without prior steps should bounce.
  useEffect(() => {
    if (signup.tier === null || signup.paymentProvider === null) {
      navigate('/signup/welcome', { replace: true });
    }
  }, [signup.tier, signup.paymentProvider, navigate]);

  if (signup.tier === null || signup.paymentProvider === null) return <></>;

  const tier = signup.tier;
  const provider = signup.paymentProvider;
  const totalXof = TIER_PRICE_XOF[tier];

  const onSubmit = (): void => {
    if (!signup.consentAccepted) return;
    navigate('/signup/welcome');
  };

  return (
    <main
      aria-labelledby="x07-headline"
      className="onboarding-screen"
      data-screen-id="X-07"
    >
      <div className="body">
        <div className="title-stack">
          <span className="h-sm">Récap</span>
          <h1 className="h-md" id="x07-headline">
            {translate('subscriber.signup.review.title')}
          </h1>
        </div>

        <dl className="review-card">
          <div className="review-row">
            <dt>Forfait</dt>
            <dd>
              {TIER_LABEL[tier]} <span className="p-sm"> / mois</span>
            </dd>
          </div>
          <div className="review-row">
            <dt>Adresse</dt>
            <dd>
              {signup.address.neighborhood}
              {signup.address.street === '' ? null : (
                <span className="p-sm"> · {signup.address.street}</span>
              )}
            </dd>
          </div>
          <div className="review-row">
            <dt>Paiement</dt>
            <dd>
              {PAYMENT_PROVIDER_LABEL[provider]}{' '}
              <span className="p-sm">· {shortPhone(signup.phone)}</span>
            </dd>
          </div>
          <div className="review-divider" aria-hidden="true" />
          <div className="review-row review-total">
            <dt>Total mensuel</dt>
            <dd className="review-total-amount">{formatXof(totalXof)}</dd>
          </div>
        </dl>

        <aside className="review-warn" aria-label="Prochaine étape">
          <span className="h-sm review-warn-eyebrow">Prochaine étape</span>
          <p className="p-sm">
            Le bureau vous appelle dans la journée pour confirmer l'adresse et planifier la
            première visite.
          </p>
        </aside>

        <label className="consent-row">
          <input
            checked={signup.consentAccepted}
            onChange={(event) => signup.setConsentAccepted(event.target.checked)}
            type="checkbox"
          />
          <span className="p-sm">
            J'accepte les <a href="#/legal/terms" className="link">conditions</a> et la{' '}
            <a href="#/legal/privacy" className="link">politique de confidentialité</a>.
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
