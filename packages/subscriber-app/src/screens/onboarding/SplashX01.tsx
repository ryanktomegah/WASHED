import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';

import { translate } from '@washed/i18n';

import { useSignup } from './SignupContext.js';

export function SplashX01(): ReactElement {
  const navigate = useNavigate();
  const signup = useSignup();

  const continueSignup = (): void => {
    signup.setMode('signup');
    navigate('/signup/phone');
  };

  const continueExistingAccount = (): void => {
    signup.setMode('existing');
    navigate('/signup/phone');
  };

  return (
    <main aria-labelledby="x01-headline" className="onboarding-screen splash" data-screen-id="X-01">
      <div className="body center">
        <div>
          <h1 className="splash-mark" id="x01-headline">
            Washed<span aria-hidden="true">.</span>
          </h1>
          <div className="splash-tagline">{translate('subscriber.splash.tagline')}</div>
        </div>
      </div>
      <div className="splash-cta-stack">
        <button className="btn full primary" onClick={continueSignup} type="button">
          {translate('subscriber.splash.cta_continue')}
        </button>
        <button className="btn full ghost" onClick={continueExistingAccount} type="button">
          {translate('subscriber.splash.cta_existing')}
        </button>
      </div>
    </main>
  );
}
