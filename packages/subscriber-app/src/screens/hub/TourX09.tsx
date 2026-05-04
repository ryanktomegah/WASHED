import { useState, type ReactElement } from 'react';

import { translate } from '@washed/i18n';

interface TourStep {
  readonly id: number;
  readonly titleKey:
    | 'subscriber.tour.step1.title'
    | 'subscriber.tour.step2.title'
    | 'subscriber.tour.step3.title';
  readonly bodyKey:
    | 'subscriber.tour.step1.body'
    | 'subscriber.tour.step2.body'
    | 'subscriber.tour.step3.body';
}

const STEPS: readonly TourStep[] = [
  { id: 1, titleKey: 'subscriber.tour.step1.title', bodyKey: 'subscriber.tour.step1.body' },
  { id: 2, titleKey: 'subscriber.tour.step2.title', bodyKey: 'subscriber.tour.step2.body' },
  { id: 3, titleKey: 'subscriber.tour.step3.title', bodyKey: 'subscriber.tour.step3.body' },
];

export interface TourX09Props {
  readonly onDismiss: () => void;
}

export function TourX09({ onDismiss }: TourX09Props): ReactElement {
  const [stepIndex, setStepIndex] = useState(0);
  const total = STEPS.length;
  const step = STEPS[stepIndex] ?? STEPS[0]!;
  const isLast = stepIndex === total - 1;

  const onPrevious = (): void => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const onNext = (): void => {
    if (isLast) {
      onDismiss();
      return;
    }
    setStepIndex((current) => Math.min(total - 1, current + 1));
  };

  return (
    <div
      aria-modal="true"
      className="tour-overlay"
      data-screen-id="X-09"
      role="dialog"
      aria-labelledby="x09-title"
    >
      <div aria-hidden="true" className="tour-scrim" />
      <section className="tour-sheet">
        <header className="tour-meta">
          <span className="tour-eyebrow">
            {translate('subscriber.tour.step_indicator', 'fr', {
              current: stepIndex + 1,
              total,
            })}{' '}
            · {translate('subscriber.tour.eyebrow').toUpperCase()}
          </span>
        </header>

        <h2 className="tour-title" id="x09-title">
          <em>{translate(step.titleKey)}</em>
        </h2>

        <p className="tour-body">{translate(step.bodyKey)}</p>

        <div className="tour-controls">
          <div className="tour-dots" aria-hidden="true">
            {STEPS.map((dotStep) => (
              <span
                className={`tour-dot${dotStep.id === step.id ? ' active' : ''}`}
                key={dotStep.id}
              />
            ))}
          </div>
          <button className="tour-skip" onClick={onDismiss} type="button">
            {translate('subscriber.tour.cta_skip')}
          </button>
        </div>

        <div className="tour-actions">
          <button
            className="tour-button secondary"
            disabled={stepIndex === 0}
            onClick={onPrevious}
            type="button"
          >
            {translate('subscriber.tour.cta_previous')}
          </button>
          <button className="tour-button primary" onClick={onNext} type="button">
            {translate(
              isLast ? 'subscriber.tour.cta_finish' : 'subscriber.tour.cta_next',
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
