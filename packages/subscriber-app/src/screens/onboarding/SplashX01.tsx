import { useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';

import { translate } from '@washed/i18n';
import { useLocale } from '@washed/ui';

export function SplashX01(): ReactElement {
  const navigate = useNavigate();
  const { setLocale } = useLocale();

  const continueInFrench = (): void => {
    setLocale('fr');
    navigate('/signup/phone');
  };

  const continueInEnglish = (): void => {
    setLocale('en');
    navigate('/signup/phone');
  };

  return (
    <main
      aria-labelledby="x01-headline"
      className="onboarding-screen dark"
      data-screen-id="X-01"
    >
      <div className="body center">
        <div>
          <h1 className="splash-mark" id="x01-headline">
            washed<span aria-hidden="true">.</span>
          </h1>
          <div className="splash-tagline">{translate('subscriber.splash.tagline')}</div>
        </div>
      </div>
      <div className="splash-cta-stack">
        <div className="row2">
          <button
            className="btn full surface"
            onClick={continueInFrench}
            type="button"
          >
            {translate('subscriber.splash.lang.fr')}
          </button>
          <button
            className="btn full surface"
            onClick={continueInEnglish}
            type="button"
          >
            {translate('subscriber.splash.lang.en')}
          </button>
        </div>
      </div>
    </main>
  );
}
