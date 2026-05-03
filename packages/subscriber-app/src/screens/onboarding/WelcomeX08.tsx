import { type ReactElement } from 'react';

import { translate } from '@washed/i18n';

export function WelcomeX08(): ReactElement {
  // Terminal screen — the hub doesn't exist yet, so the CTA is intentionally
  // disabled with a helper line. Once X-10 ships, navigate('/hub') replaces
  // the placeholder.
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

        <button className="btn full" disabled type="button">
          Voir mon accueil
        </button>
        <p className="p-sm welcome-helper">L'accueil sera disponible après l'appel du bureau.</p>
      </div>
    </main>
  );
}
