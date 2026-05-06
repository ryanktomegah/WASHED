import { useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AddressDto } from '@washed/api-client';
import { formatXof, translate } from '@washed/i18n';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import { useSubscriberSubscription } from '../../subscription/SubscriberSubscriptionContext.js';
import { OnboardingBackButton } from './OnboardingBackButton.js';
import {
  PAYMENT_PROVIDER_LABEL,
  TIER_PRICE_XOF,
  hasSignupIdentity,
  signupFullName,
  type SignupAddress,
  useSignup,
} from './SignupContext.js';
import { toTogoE164Phone } from './phoneNumber.js';

function shortPhone(phone: string): string {
  const groups = phone.split(' ');
  if (groups.length < 5) return phone;
  return `${groups[1]} ${groups[2]}…`;
}

export function ReviewX07(): ReactElement {
  const navigate = useNavigate();
  const subscriberApi = useSubscriberApi();
  const signup = useSignup();
  const subscription = useSubscriberSubscription();
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (
      signup.phone === '' ||
      !hasSignupIdentity(signup.identity) ||
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
    signup.identity,
    signup.address.neighborhood,
    signup.address.street,
    signup.tier,
    signup.paymentProvider,
    navigate,
  ]);

  if (
    signup.phone === '' ||
    !hasSignupIdentity(signup.identity) ||
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
  const identityLabel = signupFullName(signup.identity);

  const onSubmit = async (): Promise<void> => {
    if (!consented || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const paymentPhoneNumber = toTogoE164Phone(signup.phone);
      let subscriptionId: string | undefined;

      if (subscriberApi.isConfigured) {
        await subscriberApi.upsertProfile({
          ...(signup.identity.email === '' ? {} : { email: signup.identity.email }),
          firstName: signup.identity.firstName,
          isAdultConfirmed: signup.identity.isAdult,
          lastName: signup.identity.lastName,
        });
        const address = await toApiAddress(signup.address, (coordinates) =>
          signup.setAddress({
            ...signup.address,
            gpsLatitude: coordinates.gpsLatitude,
            gpsLongitude: coordinates.gpsLongitude,
          }),
        );
        const created = await subscriberApi.createSubscription({
          address,
          paymentMethod: {
            phoneNumber: paymentPhoneNumber,
            provider,
          },
          tierCode: tier,
        });
        subscriptionId = created.subscriptionId;
      }

      subscription.confirmSubscription({
        paymentPhoneNumber,
        paymentProvider: provider,
        ...(subscriptionId === undefined ? {} : { subscriptionId }),
        tier,
      });
      navigate('/signup/welcome');
    } catch (caught) {
      setError(
        caught instanceof SubscriberSignupLocationError
          ? translate('error.gps.body')
          : translate('error.server.body'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const tierLabel = translate(
    tier === 'T1' ? 'subscriber.signup.tier.t1.label' : 'subscriber.signup.tier.t2.label',
  );
  const paymentLabel = `${PAYMENT_PROVIDER_LABEL[provider]} · ${shortPhone(signup.phone)}`;

  return (
    <main aria-labelledby="x07-headline" className="onboarding-screen" data-screen-id="X-07">
      <div className="body">
        <OnboardingBackButton to="/signup/payment" />
        <div className="title-stack">
          <span className="h-sm">{translate('subscriber.signup.review.eyebrow')}</span>
          <h1 className="h-md" id="x07-headline">
            {translate('subscriber.signup.review.title')}
          </h1>
        </div>

        <dl className="review-card">
          <div className="review-row">
            <dt>{translate('subscriber.signup.review.field.identity')}</dt>
            <dd>{identityLabel}</dd>
          </div>
          <div className="review-divider" aria-hidden="true" />
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

        {error === null ? null : (
          <p className="notice" role="alert">
            {error}
          </p>
        )}

        <div className="grow" />

        <button
          className="btn full primary"
          disabled={!consented || isSubmitting}
          onClick={onSubmit}
          type="button"
        >
          {translate('subscriber.signup.review.cta')}
        </button>
      </div>
    </main>
  );
}

async function toApiAddress(
  address: SignupAddress,
  onCoordinates: (coordinates: {
    readonly gpsLatitude: number;
    readonly gpsLongitude: number;
  }) => void,
): Promise<AddressDto> {
  if (address.gpsLatitude !== null && address.gpsLongitude !== null) {
    return {
      gpsLatitude: address.gpsLatitude,
      gpsLongitude: address.gpsLongitude,
      landmark: address.street,
      neighborhood: address.neighborhood,
    };
  }

  const coordinates = await readCurrentPosition();
  onCoordinates(coordinates);

  return {
    ...coordinates,
    landmark: address.street,
    neighborhood: address.neighborhood,
  };
}

async function readCurrentPosition(): Promise<{
  readonly gpsLatitude: number;
  readonly gpsLongitude: number;
}> {
  if (navigator.geolocation === undefined) {
    throw new SubscriberSignupLocationError();
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          gpsLatitude: position.coords.latitude,
          gpsLongitude: position.coords.longitude,
        }),
      () => reject(new SubscriberSignupLocationError()),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  });
}

class SubscriberSignupLocationError extends Error {}
