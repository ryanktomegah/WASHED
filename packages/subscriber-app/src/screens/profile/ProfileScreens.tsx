import { useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

import { useSafeBack } from '../../navigation/useSafeBack.js';
import { ProfileTabBar } from './ProfileTabBar.js';
import {
  LOME_NEIGHBORHOODS,
  SUBSCRIBER_NOTIFICATION_DEFAULTS,
  SUBSCRIBER_PROFILE_DEMO,
  type LomeNeighborhood,
  type NotificationToggleDemo,
} from './profileDemoData.js';

// ──────────────────────────────────────────────────────────────────────────
// X-24 · Profile + settings list
// ──────────────────────────────────────────────────────────────────────────
export function ProfileX24(): ReactElement {
  const navigate = useNavigate();
  const profile = SUBSCRIBER_PROFILE_DEMO;

  return (
    <main aria-labelledby="x24-headline" className="profile-screen" data-screen-id="X-24">
      <div className="profile-body">
        <header className="profile-header">
          <span className="profile-eyebrow">{translate('subscriber.profile.eyebrow')}</span>
        </header>

        <section className="profile-identity">
          <span aria-hidden="true" className="profile-avatar">
            {profile.initials}
          </span>
          <div className="profile-identity-meta">
            <h1 className="profile-name" id="x24-headline">
              {profile.fullName}
            </h1>
            <span>{profile.phoneDisplay}</span>
            <span>
              {translate('subscriber.profile.member_since', 'fr', {
                date: profile.memberSinceLabel,
              })}
            </span>
          </div>
        </section>

        <ul className="profile-menu" aria-label="Paramètres">
          <ProfileMenuItem
            label={translate('subscriber.profile.menu.address')}
            value={profile.addressNeighborhood}
            onClick={() => navigate('/profile/address')}
          />
          <ProfileMenuItem
            label={translate('subscriber.profile.menu.notifications')}
            onClick={() => navigate('/profile/notifications')}
          />
          <ProfileMenuItem
            label={translate('subscriber.profile.menu.language')}
            badge={profile.languageCode}
          />
          <ProfileMenuItem
            label={translate('subscriber.profile.menu.privacy')}
            onClick={() => navigate('/profile/privacy')}
          />
        </ul>

        <div className="profile-grow" />

        <button className="profile-button ghost full" type="button">
          {translate('subscriber.profile.cta_support')}
        </button>
        <button className="profile-button danger-outline full" type="button">
          {translate('subscriber.profile.cta_signout')}
        </button>

        <ProfileTabBar />
      </div>
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
  readonly value?: string;
  readonly badge?: string;
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

// ──────────────────────────────────────────────────────────────────────────
// X-25 · Modify address
// ──────────────────────────────────────────────────────────────────────────
export function AddressEditX25(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/profile');
  const profile = SUBSCRIBER_PROFILE_DEMO;
  const [neighborhood, setNeighborhood] = useState<LomeNeighborhood>(
    profile.addressNeighborhood as LomeNeighborhood,
  );
  const [street, setStreet] = useState(profile.addressStreet);
  const [landmark, setLandmark] = useState(profile.addressLandmark);

  const isValid = street.trim().length >= 3;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!isValid) return;
    // Demo: route back to profile. Real validation goes through the bureau.
    navigate('/profile');
  };

  return (
    <main aria-labelledby="x25-headline" className="profile-screen" data-screen-id="X-25">
      <form className="profile-body profile-body-flow" onSubmit={onSubmit}>
        <BackHeader label={translate('subscriber.address_edit.header')} onBack={goBack} />

        <h1 className="profile-title" id="x25-headline">
          {translate('subscriber.address_edit.title')}
        </h1>

        <p className="profile-copy">
          {translate('subscriber.address_edit.body', 'fr', {
            name: profile.workerFirstName,
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
            placeholder="rue 18, immeuble jaune"
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
            placeholder="en face de la pharmacie"
            type="text"
            value={landmark}
          />
        </div>

        <div aria-hidden="true" className="profile-mini-map">
          <span className="profile-mini-map-pin" />
        </div>

        <div className="profile-grow" />

        <button className="profile-button primary full lg" disabled={!isValid} type="submit">
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
  const [enabled, setEnabled] = useState<Record<NotificationToggleDemo['id'], boolean>>(() =>
    SUBSCRIBER_NOTIFICATION_DEFAULTS.reduce(
      (acc, toggle) => {
        acc[toggle.id] = toggle.defaultEnabled;
        return acc;
      },
      {} as Record<NotificationToggleDemo['id'], boolean>,
    ),
  );
  const profile = SUBSCRIBER_PROFILE_DEMO;

  const subFor = (id: NotificationToggleDemo['id']): string => {
    if (id === 'sms_reminder')
      return translate('subscriber.notifications.sms_reminder.sub', 'fr', {
        weekday: profile.nextVisit.weekday,
        time: '9 h',
        hours: 21,
      });
    if (id === 'push_route')
      return translate('subscriber.notifications.push_route.sub', 'fr', {
        name: profile.workerFirstName,
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
                onClick={() =>
                  setEnabled((current) => ({ ...current, [toggle.id]: !current[toggle.id] }))
                }
                role="switch"
                type="button"
              >
                <span aria-hidden="true" className="profile-switch-thumb" />
              </button>
            </li>
          ))}
        </ul>

        <div className="profile-grow" />

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

        <button className="profile-button ghost full" type="button">
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

// ──────────────────────────────────────────────────────────────────────────
// X-28 · Delete account (typed-confirmation)
// ──────────────────────────────────────────────────────────────────────────
export function DeleteAccountX28(): ReactElement {
  const navigate = useNavigate();
  const goBack = useSafeBack('/profile/privacy');
  const profile = SUBSCRIBER_PROFILE_DEMO;
  const requiredToken = translate('subscriber.delete.confirm.token');
  const [typed, setTyped] = useState('');
  const isConfirmed = typed.trim() === requiredToken;

  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setTyped(event.target.value);
  };

  return (
    <main aria-labelledby="x28-headline" className="profile-screen" data-screen-id="X-28">
      <div className="profile-body profile-body-flow">
        <BackHeader label={translate('subscriber.delete.header')} onBack={goBack} />

        <h1 className="profile-title" id="x28-headline">
          {translate('subscriber.delete.title')}
        </h1>

        <p className="profile-copy">
          {translate('subscriber.delete.body', 'fr', {
            count: profile.visitsWithWorker,
            name: profile.workerFirstName,
          })}
        </p>

        <section className="profile-warn-card" aria-labelledby="x28-warn-eyebrow">
          <span className="profile-eyebrow accent-warn" id="x28-warn-eyebrow">
            {translate('subscriber.delete.warn_eyebrow')}
          </span>
          <ul className="profile-list">
            <li>
              {translate('subscriber.delete.warn.cancel_visit', 'fr', {
                weekday: profile.nextVisit.weekday,
                date: profile.nextVisit.date,
              })}
            </li>
            <li>{translate('subscriber.delete.warn.photos')}</li>
            <li>
              {translate('subscriber.delete.warn.reassign', 'fr', {
                name: profile.workerFirstName,
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
          disabled={!isConfirmed}
          type="button"
        >
          {translate('subscriber.delete.confirm.cta')}
        </button>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Shared back header
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
      <button aria-label="Retour" className="profile-back" onClick={onBack} type="button">
        ‹
      </button>
      <span className="profile-eyebrow">{label.toUpperCase()}</span>
    </header>
  );
}
