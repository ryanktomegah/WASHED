import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import { translate } from '@washed/i18n';

export function WelcomeX08(): ReactElement {
  const navigate = useNavigate();
  return (
    <main aria-labelledby="x08-headline" className="onboarding-screen" data-screen-id="X-08">
      <div className="body center">
        <div className="grow" />

        <div aria-hidden="true" className="welcome-glyph">
          w
        </div>

        <h1 aria-label="Bienvenue chez Washed." className="h-md welcome-title" id="x08-headline">
          <em>Bienvenue</em>
          <br />
          chez Washed.
        </h1>

        <p className="p welcome-body">{translate('subscriber.signup.welcome.body')}</p>

        <div className="grow" />

        <button
          className="btn full primary"
          onClick={() => navigate('/hub')}
          type="button"
        >
          Voir mon accueil
        </button>
      </div>
    </main>
  );
}
