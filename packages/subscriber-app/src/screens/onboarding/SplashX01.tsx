import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';

import { translate } from '@washed/i18n';
import { useLocale } from '@washed/ui';

export function SplashX01(): ReactElement {
  const navigate = useNavigate();
  const { setLocale } = useLocale();

  const continueSignup = (): void => {
    setLocale('fr');
    navigate('/signup/phone');
  };

  const continueExistingAccount = (): void => {
    setLocale('fr');
    navigate('/hub');
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
