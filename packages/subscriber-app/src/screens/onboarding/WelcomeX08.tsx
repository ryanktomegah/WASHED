import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

export function WelcomeX08(): ReactElement {
  const navigate = useNavigate();
  return (
    <main aria-labelledby="x08-headline" className="onboarding-screen" data-screen-id="X-08">
      <div aria-hidden="true" className="welcome-ambient">
        <span className="welcome-orb welcome-orb-a" />
        <span className="welcome-orb welcome-orb-b" />
        <span className="welcome-orb welcome-orb-c" />
      </div>
      <div className="body center">
        <div aria-hidden="true" className="welcome-avatar" />

        <h1 className="h-md welcome-title" id="x08-headline">
          {translate('subscriber.signup.welcome.title')}
        </h1>

        <p className="p welcome-body">{translate('subscriber.signup.welcome.body')}</p>
      </div>
      <div className="welcome-actions">
        <button
          className="btn full primary"
          onClick={() => navigate('/booking', { state: { returnTo: '/signup/welcome' } })}
          type="button"
        >
          {translate('subscriber.signup.welcome.cta')}
        </button>
        <button className="btn full ghost" onClick={() => navigate('/hub')} type="button">
          {translate('subscriber.signup.welcome.skip_cta')}
        </button>
      </div>
    </main>
  );
}
