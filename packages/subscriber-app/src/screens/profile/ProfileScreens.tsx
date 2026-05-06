import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from 'react';
import { Camera, ChevronLeft, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { translate, type WashedLocale } from '@washed/i18n';
import { useActiveLocale, useLocale } from '@washed/ui';

import { useSubscriberApi } from '../../api/SubscriberApiContext.js';
import { useSubscriberAppearance } from '../../appearance/AppearanceContext.js';
import {
  APPEARANCE_OPTIONS,
  appearanceOptionBodyKey,
  appearanceOptionLabelKey,
} from '../../appearance/appearanceOptions.js';
import {
  SUBSCRIBER_LANGUAGE_OPTIONS,
  languageOptionBodyKey,
  languageOptionLabelKey,
} from '../../language/languageOptions.js';
import { useSafeBack } from '../../navigation/useSafeBack.js';
import { useSubscriberSubscription } from '../../subscription/SubscriberSubscriptionContext.js';
import {
  hasSignupIdentity,
  signupFullName,
  useOptionalSignup,
  useSignup,
} from '../onboarding/SignupContext.js';
import { ProfileTabBar } from './ProfileTabBar.js';
import {
  LOME_NEIGHBORHOODS,
  SUBSCRIBER_NOTIFICATION_DEFAULTS,
  SUBSCRIBER_PROFILE_DEMO,
  type LomeNeighborhood,
  type NotificationToggleDemo,
} from './profileDemoData.js';

function dateFromIso(dateIso: string): Date {
  return new Date(`${dateIso}T12:00:00.000Z`);
}

function localeTag(locale: WashedLocale): string {
  return locale === 'fr' ? 'fr-TG' : 'en-US';
}

function capitalizeFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayMonth(dateIso: string, locale: WashedLocale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
  }).format(dateFromIso(dateIso));
}

function formatSentenceWeekday(dateIso: string, locale: WashedLocale): string {
  const weekday = capitalizeFirst(
    new Intl.DateTimeFormat(localeTag(locale), {
      weekday: 'long',
    }).format(dateFromIso(dateIso)),
  );
  return locale === 'fr' ? weekday.toLowerCase() : weekday;
}

function formatClockHour(time24h: string, locale: WashedLocale): string {
  const [hour = '0'] = time24h.split(':');
  const hour24 = Number(hour);
  if (locale === 'fr') return `${hour24} h`;

  const hour12 = ((hour24 + 11) % 12) + 1;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12} ${period}`;
}

function initialsForName(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}

export function ProfileX24(): ReactElement {
  const navigate = useNavigate();
  const locale = useActiveLocale();
  const { preference } = useSubscriberAppearance();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const signup = useOptionalSignup();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [liveProfileLoaded, setLiveProfileLoaded] = useState(!subscriberApi.isConfigured);
  const hasIdentity = signup !== null && hasSignupIdentity(signup.identity);
  const displayName = hasIdentity
    ? signupFullName(signup.identity)
    : translate('subscriber.profile.identity.pending_name');
  const displayInitials = hasIdentity
    ? initialsForName(signup.identity.firstName, signup.identity.lastName)
    : 'W';
  const phoneDisplay = signup?.phone.trim() === '' ? null : (signup?.phone ?? null);
  const addressNeighborhood =
    subscription.state.addressNeighborhood ??
    (signup?.address.neighborhood.trim() === '' ? undefined : signup?.address.neighborhood);
  const missing = translate('subscriber.profile.detail.missing');
  const emailDisplay =
    hasIdentity && signup.identity.email.trim() !== ''
      ? signup.identity.email.trim()
      : translate('subscriber.profile.detail.email_missing');
  const detailRows = [
    {
      label: translate('subscriber.profile.detail.first_name'),
      value: hasIdentity ? signup.identity.firstName : missing,
    },
    {
      label: translate('subscriber.profile.detail.last_name'),
      value: hasIdentity ? signup.identity.lastName : missing,
    },
    { label: translate('subscriber.profile.detail.email'), value: emailDisplay },
    { label: translate('subscriber.profile.detail.phone'), value: phoneDisplay ?? missing },
    {
      label: translate('subscriber.profile.detail.address'),
      value: addressNeighborhood ?? translate('subscriber.profile.detail.address_missing'),
    },
    {
      label: translate('subscriber.profile.detail.adult'),
      value:
        hasIdentity && signup.identity.isAdult
          ? translate('subscriber.profile.detail.adult_confirmed')
          : missing,
    },
  ] as const;

  useEffect(() => {
    if (!subscriberApi.isConfigured || signup === null) return;

    let cancelled = false;
    setLiveProfileLoaded(false);
    void subscriberApi
      .getProfile()
      .then((profile) => {
        if (cancelled) return;
        signup.setPhone(profile.phoneNumber);
        signup.setIdentity({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          email: profile.email ?? '',
          isAdult: profile.isAdultConfirmed,
        });
        setLiveProfileLoaded(true);
      })
      .catch(() => setLiveProfileLoaded(true));

    return () => {
      cancelled = true;
    };
  }, [subscriberApi]);

  if (subscriberApi.isConfigured && !liveProfileLoaded) {
    return <main className="profile-screen subscriber-tab-screen" data-screen-id="X-24" />;
  }

  const onPhotoChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined || signup === null) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') signup.setAvatarDataUrl(reader.result);
    });
    reader.readAsDataURL(file);
  };

  return (
    <main
      aria-labelledby="x24-headline"
      className="profile-screen subscriber-tab-screen"
      data-screen-id="X-24"
    >
      <div className="profile-body">
        <header className="profile-header">
          <span className="profile-eyebrow">{translate('subscriber.profile.eyebrow')}</span>
        </header>

        <section className="profile-identity">
          <div className="profile-avatar-stack">
            <button
              aria-label={translate('subscriber.profile.photo.change')}
              className="profile-avatar-button"
              onClick={() => avatarInputRef.current?.click()}
              type="button"
            >
              {signup?.avatarDataUrl === undefined || signup.avatarDataUrl === '' ? (
                <span aria-hidden="true" className="profile-avatar">
                  {displayInitials}
                </span>
              ) : (
                <img alt="" className="profile-avatar-image" src={signup.avatarDataUrl} />
              )}
              <span aria-hidden="true" className="profile-avatar-camera">
                <Camera />
              </span>
            </button>
            <input
              accept="image/*"
              aria-label={translate('subscriber.profile.photo.input_label')}
              className="profile-visually-hidden"
              onChange={onPhotoChange}
              ref={avatarInputRef}
              type="file"
            />
          </div>
          <div className="profile-identity-meta">
            <h1 className="profile-name" id="x24-headline">
              {displayName}
            </h1>
            {phoneDisplay !== null ? <span>{phoneDisplay}</span> : null}
            <span>{translate('subscriber.profile.account_ready')}</span>
            <button
              className="profile-photo-action"
              onClick={() => avatarInputRef.current?.click()}
              type="button"
            >
              {translate('subscriber.profile.photo.change')}
            </button>
          </div>
        </section>

        <section className="profile-detail-card" aria-labelledby="x24-detail-title">
          <div className="profile-section-head">
            <h2 id="x24-detail-title">{translate('subscriber.profile.details.title')}</h2>
            <button
              aria-label={translate('subscriber.profile.edit.cta')}
              className="profile-icon-button"
              onClick={() => navigate('/profile/edit')}
              type="button"
            >
              <Pencil aria-hidden="true" />
            </button>
          </div>
          <dl className="profile-detail-list">
            {detailRows.map((row) => (
              <div className="profile-detail-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="profile-menu-section" aria-labelledby="x24-settings-title">
          <h2 className="profile-menu-title" id="x24-settings-title">
            {translate('subscriber.profile.menu.personal_info')}
          </h2>
          <ul className="profile-menu" aria-label={translate('subscriber.profile.menu.label')}>
            <ProfileMenuItem
              label={translate('subscriber.profile.menu.address')}
              value={addressNeighborhood}
              onClick={() => navigate('/profile/address')}
            />
            <ProfileMenuItem
              label={translate('subscriber.profile.menu.notifications')}
              onClick={() => navigate('/profile/notifications')}
            />
            <ProfileMenuItem
              label={translate('subscriber.profile.menu.language')}
              badge={translate(languageOptionLabelKey(locale))}
              onClick={() => navigate('/profile/language')}
            />
            <ProfileMenuItem
              label={translate('subscriber.profile.menu.appearance')}
              badge={translate(appearanceOptionLabelKey(preference))}
              onClick={() => navigate('/profile/appearance')}
            />
            <ProfileMenuItem
              label={translate('subscriber.profile.menu.privacy')}
              onClick={() => navigate('/profile/privacy')}
            />
          </ul>
        </section>

        <div className="profile-grow" />

        <button
          className="profile-button ghost full"
          onClick={() => navigate('/support')}
          type="button"
        >
          {translate('subscriber.profile.cta_support')}
        </button>
        <button className="profile-button danger-outline full" type="button">
          {translate('subscriber.profile.cta_signout')}
        </button>
      </div>
      <ProfileTabBar />
    </main>
  );
}

function ProfileMenuItem({
  label,
  value,
  badge,
  onClick,
}: {
  readonly label: string;
  readonly value?: string | undefined;
  readonly badge?: string | undefined;
  readonly onClick?: () => void;
}): ReactElement {
  const isInteractive = onClick !== undefined;
  const Tag = isInteractive ? 'button' : 'div';

  return (
    <li className="profile-menu-row">
      <Tag
        {...(isInteractive
          ? { type: 'button' as const, onClick }
          : { 'aria-disabled': 'true' as const })}
        className="profile-menu-row-inner"
      >
        <div className="profile-menu-row-meta">
          <strong>{label}</strong>
          {value !== undefined ? <span>{value}</span> : null}
        </div>
        {badge !== undefined ? <span className="profile-menu-row-badge">{badge}</span> : null}
        {isInteractive ? (
          <span aria-hidden="true" className="profile-menu-row-chevron">
            ›
          </span>
        ) : null}
      </Tag>
    </li>
  );
}

export function ProfileEditX24E(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/profile');
  const subscriberApi = useSubscriberApi();
  const signup = useSignup();
  const hasLocalProfile = signup.phone.trim() !== '' && hasSignupIdentity(signup.identity);
  const [firstName, setFirstName] = useState(signup.identity.firstName);
  const [lastName, setLastName] = useState(signup.identity.lastName);
  const [email, setEmail] = useState(signup.identity.email);
  const [isAdult, setIsAdult] = useState(signup.identity.isAdult);
  const [liveProfileLoaded, setLiveProfileLoaded] = useState(
    !subscriberApi.isConfigured || hasLocalProfile,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const phoneValue = signup.phone.trim();
  const isPhoneMissing = phoneValue === '';
  const phoneDisplay =
    isPhoneMissing ? translate('subscriber.profile.detail.missing') : signup.phone;

  const normalizedEmail = email.trim();
  const isEmailValid =
    normalizedEmail === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalizedEmail);
  const isValid =
    firstName.trim().length >= 2 && lastName.trim().length >= 2 && isEmailValid && isAdult;

  useEffect(() => {
    if (!subscriberApi.isConfigured || hasLocalProfile) return;

    let cancelled = false;
    setLiveProfileLoaded(false);

    void subscriberApi
      .getProfile()
      .then((profile) => {
        if (cancelled) return;

        const nextIdentity = {
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          email: profile.email ?? '',
          isAdult: profile.isAdultConfirmed,
        };

        signup.setPhone(profile.phoneNumber);
        signup.setIdentity(nextIdentity);
        setFirstName(nextIdentity.firstName);
        setLastName(nextIdentity.lastName);
        setEmail(nextIdentity.email);
        setIsAdult(nextIdentity.isAdult);
        setLiveProfileLoaded(true);
      })
      .catch(() => setLiveProfileLoaded(true));

    return () => {
      cancelled = true;
    };
  }, [hasLocalProfile, signup, subscriberApi]);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void saveProfile();
  };

  async function saveProfile(): Promise<void> {
    if (!isValid || isSubmitting) return;

    const identity = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      isAdult,
    };
    setHasSubmissionError(false);

    if (subscriberApi.isConfigured) {
      setIsSubmitting(true);
      try {
        const profileInput = {
          firstName: identity.firstName,
          isAdultConfirmed: identity.isAdult,
          lastName: identity.lastName,
          ...(normalizedEmail === '' ? {} : { email: normalizedEmail }),
        };
        await subscriberApi.upsertProfile(profileInput);
      } catch {
        setHasSubmissionError(true);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }

    signup.setIdentity(identity);
    navigate('/profile');
  }

  if (!liveProfileLoaded) {
    return <main className="profile-screen" data-screen-id="X-24E" />;
  }

  return (
    <main aria-labelledby="x24e-headline" className="profile-screen" data-screen-id="X-24E">
      <form className="profile-body profile-body-flow" onSubmit={onSubmit}>
        <BackHeader label={translate('subscriber.profile.edit.header')} onBack={goBack} />

        <h1 className="profile-title" id="x24e-headline">
          {translate('subscriber.profile.edit.title')}
        </h1>

        <p className="profile-copy">{translate('subscriber.profile.edit.body')}</p>

        <div className="profile-field">
          <label className="profile-field-label" htmlFor="x24e-first-name">
            {translate('subscriber.signup.identity.field.first_name').toUpperCase()}
          </label>
          <input
            autoComplete="given-name"
            className="profile-input"
            id="x24e-first-name"
            name="firstName"
            onChange={(event) => setFirstName(event.target.value)}
            placeholder={translate('subscriber.signup.identity.first_name.placeholder')}
            type="text"
            value={firstName}
          />
        </div>

        <div className="profile-field">
          <label className="profile-field-label" htmlFor="x24e-last-name">
            {translate('subscriber.signup.identity.field.last_name').toUpperCase()}
          </label>
          <input
            autoComplete="family-name"
            className="profile-input"
            id="x24e-last-name"
            name="lastName"
            onChange={(event) => setLastName(event.target.value)}
            placeholder={translate('subscriber.signup.identity.last_name.placeholder')}
            type="text"
            value={lastName}
          />
        </div>

        <div className="profile-field">
          <label className="profile-field-label" htmlFor="x24e-email">
            {translate('subscriber.signup.identity.field.email').toUpperCase()}
          </label>
          <input
            autoComplete="email"
            className="profile-input"
            id="x24e-email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={translate('subscriber.signup.identity.email.placeholder')}
            type="email"
            value={email}
          />
        </div>

        <div className="profile-field">
          <span className="profile-field-label" id="x24e-phone-label">
            {translate('subscriber.profile.detail.phone').toUpperCase()}
          </span>
          {isPhoneMissing ? (
            <button
              aria-describedby="x24e-phone-note"
              aria-labelledby="x24e-phone-label x24e-phone"
              className="profile-static-field is-missing is-action"
              id="x24e-phone"
              onClick={() => {
                signup.setMode('existing');
                navigate('/signup/phone');
              }}
              type="button"
            >
              <span>{phoneDisplay}</span>
              <span aria-hidden="true" className="profile-static-chevron">
                ›
              </span>
            </button>
          ) : (
            <div
              aria-describedby="x24e-phone-note"
              aria-labelledby="x24e-phone-label"
              className="profile-static-field"
              id="x24e-phone"
            >
              {phoneDisplay}
            </div>
          )}
          <p className="profile-field-note" id="x24e-phone-note">
            {translate('subscriber.profile.edit.phone_note')}
          </p>
        </div>

        <label className={`profile-check-row${isAdult ? ' is-checked' : ''}`}>
          <input
            checked={isAdult}
            className="profile-visually-hidden"
            onChange={(event) => setIsAdult(event.target.checked)}
            type="checkbox"
          />
          <span aria-hidden="true" className="profile-check-box">
            {isAdult ? '✓' : ''}
          </span>
          <span>{translate('subscriber.signup.identity.adult')}</span>
        </label>

        {hasSubmissionError ? (
          <p className="profile-copy" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}

        <div className="profile-grow" />

        <button
          className="profile-button primary full lg"
          disabled={!isValid || isSubmitting}
          type="submit"
        >
          {translate('subscriber.profile.edit.save_cta')}
        </button>
      </form>
    </main>
  );
}

export function AppearanceX24A(): ReactElement {
  const goBack = useSafeBack('/profile');
  const { preference, setPreference } = useSubscriberAppearance();

  return (
    <main aria-labelledby="x24a-headline" className="profile-screen" data-screen-id="X-24A">
      <div className="profile-body profile-body-flow">
        <BackHeader label={translate('subscriber.appearance.header')} onBack={goBack} />

        <h1 className="profile-title" id="x24a-headline">
          {translate('subscriber.appearance.title')}
        </h1>

        <p className="profile-copy">{translate('subscriber.appearance.body')}</p>

        <div
          aria-label={translate('subscriber.appearance.title')}
          className="profile-appearance-list"
          role="radiogroup"
        >
          {APPEARANCE_OPTIONS.map((option) => (
            <button
              aria-checked={preference === option}
              className={`profile-appearance-option${preference === option ? ' selected' : ''}`}
              key={option}
              onClick={() => setPreference(option)}
              role="radio"
              type="button"
            >
              <span>
                <strong>{translate(appearanceOptionLabelKey(option))}</strong>
                <small>{translate(appearanceOptionBodyKey(option))}</small>
              </span>
              <i aria-hidden="true">{preference === option ? '✓' : ''}</i>
            </button>
          ))}
        </div>

        <div className="profile-grow" />
      </div>
    </main>
  );
}

export function LanguageX24L(): ReactElement {
  const goBack = useSafeBack('/profile');
  const { locale, setLocale } = useLocale();

  return (
    <main aria-labelledby="x24l-headline" className="profile-screen" data-screen-id="X-24L">
      <div className="profile-body profile-body-flow">
        <BackHeader label={translate('subscriber.language.header')} onBack={goBack} />

        <h1 className="profile-title" id="x24l-headline">
          {translate('subscriber.language.title')}
        </h1>

        <p className="profile-copy">{translate('subscriber.language.body')}</p>

        <div
          aria-label={translate('subscriber.language.title')}
          className="profile-appearance-list"
          role="radiogroup"
        >
          {SUBSCRIBER_LANGUAGE_OPTIONS.map((option) => (
            <button
              aria-checked={locale === option}
              className={`profile-appearance-option${locale === option ? ' selected' : ''}`}
              key={option}
              onClick={() => setLocale(option)}
              role="radio"
              type="button"
            >
              <span>
                <strong>{translate(languageOptionLabelKey(option))}</strong>
                <small>{translate(languageOptionBodyKey(option))}</small>
              </span>
              <i aria-hidden="true">{locale === option ? '✓' : ''}</i>
            </button>
          ))}
        </div>

        <div className="profile-grow" />
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// X-25 · Modify address
// ──────────────────────────────────────────────────────────────────────────
export function AddressEditX25(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/profile');
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const signup = useOptionalSignup();
  const workerFirstName = subscription.state.assignedWorker?.displayName.split(/\s+/u)[0] ?? '';
  const [neighborhood, setNeighborhood] = useState<LomeNeighborhood>(
    (subscription.state.addressNeighborhood ??
      (subscriberApi.isConfigured
        ? null
        : signup?.address.neighborhood.trim() === ''
          ? SUBSCRIBER_PROFILE_DEMO.addressNeighborhood
          : (signup?.address.neighborhood ?? SUBSCRIBER_PROFILE_DEMO.addressNeighborhood)) ??
      LOME_NEIGHBORHOODS[0]) as LomeNeighborhood,
  );
  const [street, setStreet] = useState(
    subscriberApi.isConfigured
      ? ''
      : signup?.address.street.trim() === ''
        ? SUBSCRIBER_PROFILE_DEMO.addressStreet
        : (signup?.address.street ?? SUBSCRIBER_PROFILE_DEMO.addressStreet),
  );
  const [landmark, setLandmark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isValid =
    street.trim().length >= 3 &&
    (!subscriberApi.isConfigured || subscription.state.address !== null);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void submitAddressRequest();
  };

  async function submitAddressRequest(): Promise<void> {
    if (!isValid || isSubmitting) return;

    setHasSubmissionError(false);
    if (!subscriberApi.isConfigured) {
      navigate('/profile');
      return;
    }

    const currentAddress = subscription.state.address;
    if (currentAddress === null) return;

    setIsSubmitting(true);
    try {
      await subscriberApi.createAddressChangeRequest({
        address: {
          gpsLatitude: currentAddress.gpsLatitude,
          gpsLongitude: currentAddress.gpsLongitude,
          landmark: [street.trim(), landmark.trim()].filter(Boolean).join(' · '),
          neighborhood,
        },
        requestedAt: new Date().toISOString(),
      });
      setIsSubmitted(true);
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <main aria-labelledby="x25-submitted" className="profile-screen" data-screen-id="X-25">
        <div className="profile-body profile-body-flow">
          <BackHeader label={translate('subscriber.address_edit.header')} onBack={goBack} />
          <div className="profile-grow" />
          <h1 className="profile-title" id="x25-submitted">
            {translate('subscriber.address_edit.submitted.title')}
          </h1>
          <p className="profile-copy">{translate('subscriber.address_edit.submitted.body')}</p>
          <div className="profile-grow" />
          <button
            className="profile-button primary full lg"
            onClick={() => navigate('/profile')}
            type="button"
          >
            {translate('subscriber.address_edit.submitted.cta')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main aria-labelledby="x25-headline" className="profile-screen" data-screen-id="X-25">
      <form className="profile-body profile-body-flow" onSubmit={onSubmit}>
        <BackHeader label={translate('subscriber.address_edit.header')} onBack={goBack} />

        <h1 className="profile-title" id="x25-headline">
          {translate('subscriber.address_edit.title')}
        </h1>

        <p className="profile-copy">
          {translate('subscriber.address_edit.body', {
            name: workerFirstName,
          })}
        </p>

        <section className="profile-warn-card" aria-labelledby="x25-warn-eyebrow">
          <span className="profile-eyebrow accent-warn" id="x25-warn-eyebrow">
            {translate('subscriber.address_edit.warn_eyebrow')}
          </span>
          <p className="profile-warn-body">{translate('subscriber.address_edit.warn_body')}</p>
        </section>

        <div className="profile-field">
          <label className="profile-field-label" htmlFor="x25-neighborhood">
            {translate('subscriber.address_edit.field.neighborhood').toUpperCase()}
          </label>
          <div className="profile-select-shell">
            <select
              id="x25-neighborhood"
              name="neighborhood"
              onChange={(event) => setNeighborhood(event.target.value as LomeNeighborhood)}
              required
              value={neighborhood}
            >
              {LOME_NEIGHBORHOODS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
            <span aria-hidden="true" className="profile-select-chevron">
              ▾
            </span>
          </div>
        </div>

        <div className="profile-field">
          <label className="profile-field-label" htmlFor="x25-street">
            {translate('subscriber.address_edit.field.street').toUpperCase()}
          </label>
          <input
            autoComplete="address-line1"
            className="profile-input"
            id="x25-street"
            name="street"
            onChange={(event) => setStreet(event.target.value)}
            placeholder={translate('subscriber.address_edit.field.street.placeholder')}
            type="text"
            value={street}
          />
        </div>

        <div className="profile-field">
          <label className="profile-field-label" htmlFor="x25-landmark">
            {translate('subscriber.address_edit.field.landmark').toUpperCase()}
          </label>
          <input
            autoComplete="off"
            className="profile-input"
            id="x25-landmark"
            name="landmark"
            onChange={(event) => setLandmark(event.target.value)}
            placeholder={translate('subscriber.address_edit.field.landmark.placeholder')}
            type="text"
            value={landmark}
          />
        </div>

        <div aria-hidden="true" className="profile-mini-map">
          <span className="profile-mini-map-pin" />
        </div>

        <div className="profile-grow" />

        {hasSubmissionError ? (
          <p className="profile-copy" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}

        <button
          className="profile-button primary full lg"
          disabled={!isValid || isSubmitting}
          type="submit"
        >
          {translate('subscriber.address_edit.submit.cta')}
        </button>
      </form>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// X-26 · Notifications
// ──────────────────────────────────────────────────────────────────────────
export function NotificationsX26(): ReactElement {
  const goBack = useSafeBack('/profile');
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const [enabled, setEnabled] = useState<Record<NotificationToggleDemo['id'], boolean>>(() =>
    SUBSCRIBER_NOTIFICATION_DEFAULTS.reduce(
      (acc, toggle) => {
        acc[toggle.id] = toggle.defaultEnabled;
        return acc;
      },
      {} as Record<NotificationToggleDemo['id'], boolean>,
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const nextVisit = subscription.state.upcomingVisits[0] ?? null;
  const workerFirstName = subscription.state.assignedWorker?.displayName.split(/\s+/u)[0] ?? '';

  useEffect(() => {
    if (!subscriberApi.isConfigured) return;

    let cancelled = false;
    void subscriberApi
      .getNotificationPreferences()
      .then((preferences) => {
        if (cancelled) return;
        setEnabled({
          email_recap: preferences.emailRecap,
          push_reveal: preferences.pushReveal,
          push_route: preferences.pushRoute,
          sms_reminder: preferences.smsReminder,
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [subscriberApi]);

  async function persistToggle(id: NotificationToggleDemo['id'], value: boolean): Promise<void> {
    const next = { ...enabled, [id]: value };
    setEnabled(next);
    setHasSubmissionError(false);

    if (!subscriberApi.isConfigured) return;

    setIsSaving(true);
    try {
      await subscriberApi.updateNotificationPreferences({
        emailRecap: next.email_recap,
        pushReveal: next.push_reveal,
        pushRoute: next.push_route,
        smsReminder: next.sms_reminder,
        updatedAt: new Date().toISOString(),
      });
      if ((id === 'push_route' || id === 'push_reveal') && value) {
        await registerSubscriberPushDevice(subscriberApi);
      }
    } catch {
      setEnabled(enabled);
      setHasSubmissionError(true);
    } finally {
      setIsSaving(false);
    }
  }

  const subFor = (id: NotificationToggleDemo['id']): string => {
    if (id === 'sms_reminder')
      return translate('subscriber.notifications.sms_reminder.sub', {
        weekday:
          nextVisit === null
            ? translate('subscriber.notifications.no_visit')
            : formatSentenceWeekday(nextVisit.scheduledDate, locale),
        time:
          nextVisit === null
            ? translate('subscriber.notifications.no_visit')
            : formatClockHour(
                nextVisit.scheduledTimeWindow === 'morning' ? '09:00' : '15:00',
                locale,
              ),
        hours: 21,
      });
    if (id === 'push_route')
      return translate('subscriber.notifications.push_route.sub', {
        name: workerFirstName,
      });
    if (id === 'push_reveal') return translate('subscriber.notifications.push_reveal.sub');
    return translate('subscriber.notifications.email_recap.sub');
  };

  const titleFor = (id: NotificationToggleDemo['id']): string => {
    if (id === 'sms_reminder') return translate('subscriber.notifications.sms_reminder.title');
    if (id === 'push_route') return translate('subscriber.notifications.push_route.title');
    if (id === 'push_reveal') return translate('subscriber.notifications.push_reveal.title');
    return translate('subscriber.notifications.email_recap.title');
  };

  return (
    <main aria-labelledby="x26-headline" className="profile-screen" data-screen-id="X-26">
      <div className="profile-body profile-body-flow">
        <BackHeader label={translate('subscriber.notifications.header')} onBack={goBack} />

        <h1 className="profile-title" id="x26-headline">
          {translate('subscriber.notifications.title')}
        </h1>

        <p className="profile-copy">{translate('subscriber.notifications.body')}</p>

        <ul className="profile-toggle-list">
          {SUBSCRIBER_NOTIFICATION_DEFAULTS.map((toggle) => (
            <li className="profile-toggle-row" key={toggle.id}>
              <div className="profile-toggle-meta">
                <strong>{titleFor(toggle.id)}</strong>
                <span>{subFor(toggle.id)}</span>
              </div>
              <button
                aria-checked={enabled[toggle.id]}
                aria-label={titleFor(toggle.id)}
                className={`profile-switch${enabled[toggle.id] ? ' on' : ''}`}
                disabled={isSaving}
                onClick={() => void persistToggle(toggle.id, !enabled[toggle.id])}
                role="switch"
                type="button"
              >
                <span aria-hidden="true" className="profile-switch-thumb" />
              </button>
            </li>
          ))}
        </ul>

        <div className="profile-grow" />

        {hasSubmissionError ? (
          <p className="profile-footnote" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}

        <p className="profile-footnote">{translate('subscriber.notifications.no_marketing')}</p>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// X-27 · Privacy & data
// ──────────────────────────────────────────────────────────────────────────
export function PrivacyX27(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/profile');
  const subscriberApi = useSubscriberApi();
  const [isSubmittingExport, setIsSubmittingExport] = useState(false);
  const [exportRequestId, setExportRequestId] = useState<string | null>(null);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);

  async function requestExport(): Promise<void> {
    if (isSubmittingExport) return;

    if (!subscriberApi.isConfigured) {
      setExportRequestId('DEMO');
      return;
    }

    setHasSubmissionError(false);
    setIsSubmittingExport(true);
    try {
      const request = await subscriberApi.createPrivacyRequest({
        reason: translate('subscriber.privacy.export.reason'),
        requestedAt: new Date().toISOString(),
        requestType: 'export',
      });
      setExportRequestId(request.requestId);
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmittingExport(false);
    }
  }

  return (
    <main aria-labelledby="x27-headline" className="profile-screen" data-screen-id="X-27">
      <div className="profile-body profile-body-flow">
        <BackHeader label={translate('subscriber.privacy.header')} onBack={goBack} />

        <h1 className="profile-title" id="x27-headline">
          {translate('subscriber.privacy.title')}
        </h1>

        <PrivacyCard
          eyebrowKey="subscriber.privacy.account.title"
          bodyKey="subscriber.privacy.account.body"
        />
        <PrivacyCard
          eyebrowKey="subscriber.privacy.photos.title"
          bodyKey="subscriber.privacy.photos.body"
        />
        <PrivacyCard
          eyebrowKey="subscriber.privacy.location.title"
          bodyKey="subscriber.privacy.location.body"
        />
        <PrivacyCard
          eyebrowKey="subscriber.privacy.rights.title"
          bodyKey="subscriber.privacy.rights.body"
        />

        <div className="profile-grow" />

        {exportRequestId === null ? null : (
          <p className="profile-footnote" role="status">
            {translate('subscriber.privacy.export.submitted', { requestId: exportRequestId })}
          </p>
        )}
        {hasSubmissionError ? (
          <p className="profile-footnote" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}

        <button
          className="profile-button ghost full"
          disabled={isSubmittingExport}
          onClick={() => void requestExport()}
          type="button"
        >
          {translate('subscriber.privacy.export.cta')}
        </button>
        <button
          className="profile-button danger-outline full"
          onClick={() => navigate('/profile/delete')}
          type="button"
        >
          {translate('subscriber.privacy.delete.cta')}
        </button>
      </div>
    </main>
  );
}

function PrivacyCard({
  eyebrowKey,
  bodyKey,
}: {
  readonly eyebrowKey:
    | 'subscriber.privacy.account.title'
    | 'subscriber.privacy.photos.title'
    | 'subscriber.privacy.location.title'
    | 'subscriber.privacy.rights.title';
  readonly bodyKey:
    | 'subscriber.privacy.account.body'
    | 'subscriber.privacy.photos.body'
    | 'subscriber.privacy.location.body'
    | 'subscriber.privacy.rights.body';
}): ReactElement {
  return (
    <section className="profile-info-card">
      <span className="profile-eyebrow">{translate(eyebrowKey).toUpperCase()}</span>
      <p className="profile-info-body">{translate(bodyKey)}</p>
    </section>
  );
}

async function registerSubscriberPushDevice(subscriberApi: ReturnType<typeof useSubscriberApi>) {
  const [{ Capacitor }, { PushNotifications }] = await Promise.all([
    import('@capacitor/core'),
    import('@capacitor/push-notifications'),
  ]);

  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();
  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 3000);
    void PushNotifications.addListener('registration', (token) => {
      window.clearTimeout(timeout);
      const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      void subscriberApi
        .registerPushDevice({
          environment: import.meta.env.DEV ? 'development' : 'production',
          platform,
          token: token.value,
        })
        .finally(resolve);
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────
// X-28 · Delete account (typed-confirmation)
// ──────────────────────────────────────────────────────────────────────────
export function DeleteAccountX28(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/profile/privacy');
  const locale = useActiveLocale();
  const subscriberApi = useSubscriberApi();
  const subscription = useSubscriberSubscription();
  const workerFirstName = subscriberApi.isConfigured
    ? (subscription.state.assignedWorker?.displayName.split(/\s+/u)[0] ?? '')
    : SUBSCRIBER_PROFILE_DEMO.workerFirstName;
  const visitsWithWorker = subscriberApi.isConfigured
    ? (subscription.state.assignedWorker?.completedVisitCount ?? 0)
    : SUBSCRIBER_PROFILE_DEMO.visitsWithWorker;
  const nextVisit = subscriberApi.isConfigured
    ? (subscription.state.upcomingVisits[0] ?? null)
    : {
        scheduledDate: SUBSCRIBER_PROFILE_DEMO.nextVisit.dateIso,
      };
  const requiredToken = translate('subscriber.delete.confirm.token');
  const [typed, setTyped] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [hasSubmissionError, setHasSubmissionError] = useState(false);
  const isConfirmed = typed.trim() === requiredToken;

  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setTyped(event.target.value);
  };

  async function requestDeletion(): Promise<void> {
    if (!isConfirmed || isSubmitting) return;

    if (!subscriberApi.isConfigured) {
      setSubmittedRequestId('DEMO');
      return;
    }

    setHasSubmissionError(false);
    setIsSubmitting(true);
    try {
      const request = await subscriberApi.createPrivacyRequest({
        reason: translate('subscriber.delete.reason'),
        requestedAt: new Date().toISOString(),
        requestType: 'erasure',
      });
      setSubmittedRequestId(request.requestId);
    } catch {
      setHasSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedRequestId !== null) {
    return (
      <main aria-labelledby="x28-submitted" className="profile-screen" data-screen-id="X-28">
        <div className="profile-body profile-body-flow">
          <BackHeader label={translate('subscriber.delete.header')} onBack={goBack} />
          <div className="profile-grow" />
          <h1 className="profile-title" id="x28-submitted">
            {translate('subscriber.delete.submitted.title')}
          </h1>
          <p className="profile-copy">
            {translate('subscriber.delete.submitted.body', { requestId: submittedRequestId })}
          </p>
          <div className="profile-grow" />
          <button
            className="profile-button primary full lg"
            onClick={() => navigate('/profile/privacy')}
            type="button"
          >
            {translate('subscriber.delete.submitted.cta')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main aria-labelledby="x28-headline" className="profile-screen" data-screen-id="X-28">
      <div className="profile-body profile-body-flow">
        <BackHeader label={translate('subscriber.delete.header')} onBack={goBack} />

        <h1 className="profile-title" id="x28-headline">
          {translate('subscriber.delete.title')}
        </h1>

        <p className="profile-copy">
          {translate('subscriber.delete.body', {
            count: visitsWithWorker,
            name: workerFirstName,
          })}
        </p>

        <section className="profile-warn-card" aria-labelledby="x28-warn-eyebrow">
          <span className="profile-eyebrow accent-warn" id="x28-warn-eyebrow">
            {translate('subscriber.delete.warn_eyebrow')}
          </span>
          <ul className="profile-list">
            <li>
              {translate('subscriber.delete.warn.cancel_visit', {
                weekday:
                  nextVisit === null
                    ? translate('subscriber.notifications.no_visit')
                    : formatSentenceWeekday(nextVisit.scheduledDate, locale),
                date:
                  nextVisit === null
                    ? translate('subscriber.notifications.no_visit')
                    : formatDayMonth(nextVisit.scheduledDate, locale),
              })}
            </li>
            <li>{translate('subscriber.delete.warn.photos')}</li>
            <li>
              {translate('subscriber.delete.warn.reassign', {
                name: workerFirstName,
              })}
            </li>
            <li>{translate('subscriber.delete.warn.legal')}</li>
          </ul>
        </section>

        <div className="profile-field">
          <label className="profile-field-label" htmlFor="x28-confirm">
            {translate('subscriber.delete.confirm.label').toUpperCase()}
          </label>
          <input
            autoComplete="off"
            autoCapitalize="characters"
            className="profile-input profile-input-mono"
            id="x28-confirm"
            name="confirm"
            onChange={onChange}
            placeholder={requiredToken}
            spellCheck={false}
            type="text"
            value={typed}
          />
        </div>

        <div className="profile-grow" />

        <button
          className="profile-button ghost full"
          onClick={() => navigate('/profile/privacy')}
          type="button"
        >
          {translate('subscriber.delete.cancel.cta')}
        </button>
        <button
          aria-disabled={!isConfirmed}
          className="profile-button danger full"
          disabled={!isConfirmed || isSubmitting}
          onClick={() => void requestDeletion()}
          type="button"
        >
          {translate('subscriber.delete.confirm.cta')}
        </button>
        {hasSubmissionError ? (
          <p className="profile-footnote" role="alert">
            {translate('error.server.body')}
          </p>
        ) : null}
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
function BackHeader({
  label,
  onBack,
}: {
  readonly label: string;
  readonly onBack: () => void;
}): ReactElement {
  return (
    <header className="profile-back-header">
      <button
        aria-label={translate('common.action.back')}
        className="profile-back"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <span className="profile-eyebrow">{label.toUpperCase()}</span>
    </header>
  );
}
