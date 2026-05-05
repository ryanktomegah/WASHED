import { type ReactElement } from 'react';

import { translate } from '@washed/i18n';

export interface TourX09Props {
  readonly onDismiss: () => void;
}

export function TourX09({ onDismiss }: TourX09Props): ReactElement {
  return (
    <main
      aria-labelledby="x09-title"
      aria-modal="true"
      className="onboarding-screen tour-screen"
      data-screen-id="X-09"
      role="dialog"
    >
      <div className="body">
        <div className="title-stack">
          <span className="h-sm">{translate('subscriber.tour.eyebrow')}</span>
          <h1 className="h-md" id="x09-title">
            {translate('subscriber.tour.step1.title')}
          </h1>
        </div>

        <p className="p">{translate('subscriber.tour.step1.body')}</p>

        <section
          className="tour-card"
          aria-label={translate('subscriber.tour.step_indicator', { current: 1, total: 3 })}
        >
          <div className="tour-card-head">
            <span className="h-sm">
              {translate('subscriber.tour.step_indicator', { current: 1, total: 3 })}
            </span>
            <span className="tour-chip">
              <span aria-hidden="true" className="tour-chip-dot" />
              {translate('subscriber.tour.new_chip')}
            </span>
          </div>
          <p className="p">{translate('subscriber.tour.step1.card_body')}</p>
        </section>

        <div className="grow" />

        <button className="btn full primary" onClick={onDismiss} type="button">
          {translate('subscriber.tour.cta_next')}
        </button>
      </div>
    </main>
  );
}
