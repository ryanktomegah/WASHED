import { useState, type ReactElement } from 'react';

import { translate, type WashedLocale } from '@washed/i18n';
import { useLocale } from '@washed/ui';

import {
  SUBSCRIBER_LANGUAGE_OPTIONS,
  languageOptionBodyKey,
  languageOptionLabelKey,
} from '../language/languageOptions.js';
import {
  useSubscriberAppearance,
  type SubscriberAppearancePreference,
} from './AppearanceContext.js';
import {
  APPEARANCE_OPTIONS,
  appearanceOptionBodyKey,
  appearanceOptionLabelKey,
} from './appearanceOptions.js';

export function AppearanceLaunchGate({
  onContinue,
}: {
  readonly onContinue: () => void;
}): ReactElement {
  const { previewPreference, setPreference } = useSubscriberAppearance();
  const { setLocale } = useLocale();
  const [launchStep, setLaunchStep] = useState<'appearance' | 'language'>('language');
  const [selectedLanguage, setSelectedLanguage] = useState<WashedLocale | null>(null);
  const [selectedPreference, setSelectedPreference] =
    useState<SubscriberAppearancePreference | null>(null);

  const selectLanguage = (locale: WashedLocale): void => {
    setSelectedLanguage(locale);
    setLocale(locale);
  };

  const selectPreference = (preference: SubscriberAppearancePreference): void => {
    setSelectedPreference(preference);
    previewPreference(preference);
  };

  const continueToAppearance = (): void => {
    if (selectedLanguage === null) return;
    setLaunchStep('appearance');
  };

  const continueToApp = (): void => {
    if (selectedPreference === null) return;
    setPreference(selectedPreference);
    onContinue();
  };

  if (launchStep === 'language') {
    return (
      <main
        aria-labelledby="language-launch-headline"
        className="appearance-gate-screen"
        data-screen-id="X-00L"
      >
        <div className="appearance-gate-body">
          <header className="appearance-gate-header">
            <span className="appearance-gate-eyebrow">
              {translate('subscriber.language.launch.header')}
            </span>
          </header>

          <h1 className="appearance-gate-title" id="language-launch-headline">
            {translate('subscriber.language.title')}
          </h1>

          <p className="appearance-gate-copy">{translate('subscriber.language.body')}</p>

          <div
            aria-label={translate('subscriber.language.title')}
            className="appearance-gate-list"
            role="radiogroup"
          >
            {SUBSCRIBER_LANGUAGE_OPTIONS.map((option) => (
              <button
                aria-checked={selectedLanguage === option}
                className={`appearance-gate-option${
                  selectedLanguage === option ? ' selected' : ''
                }`}
                key={option}
                onClick={() => selectLanguage(option)}
                role="radio"
                type="button"
              >
                <span>
                  <strong>{translate(languageOptionLabelKey(option))}</strong>
                  <small>{translate(languageOptionBodyKey(option))}</small>
                </span>
                <i aria-hidden="true">{selectedLanguage === option ? '✓' : ''}</i>
              </button>
            ))}
          </div>

          <div className="appearance-gate-grow" />

          <button
            className="appearance-gate-continue"
            disabled={selectedLanguage === null}
            onClick={continueToAppearance}
            type="button"
          >
            {translate('subscriber.language.launch.cta')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      aria-labelledby="appearance-launch-headline"
      className="appearance-gate-screen"
      data-screen-id="X-00A"
    >
      <div className="appearance-gate-body">
        <header className="appearance-gate-header">
          <span className="appearance-gate-eyebrow">
            {translate('subscriber.appearance.launch.header')}
          </span>
        </header>

        <h1 className="appearance-gate-title" id="appearance-launch-headline">
          {translate('subscriber.appearance.title')}
        </h1>

        <p className="appearance-gate-copy">{translate('subscriber.appearance.body')}</p>

        <div
          aria-label={translate('subscriber.appearance.title')}
          className="appearance-gate-list"
          role="radiogroup"
        >
          {APPEARANCE_OPTIONS.map((option) => (
            <button
              aria-checked={selectedPreference === option}
              className={`appearance-gate-option${
                selectedPreference === option ? ' selected' : ''
              }`}
              key={option}
              onClick={() => selectPreference(option)}
              role="radio"
              type="button"
            >
              <span>
                <strong>{translate(appearanceOptionLabelKey(option))}</strong>
                <small>{translate(appearanceOptionBodyKey(option))}</small>
              </span>
              <i aria-hidden="true">{selectedPreference === option ? '✓' : ''}</i>
            </button>
          ))}
        </div>

        <div className="appearance-gate-grow" />

        <button
          className="appearance-gate-continue"
          disabled={selectedPreference === null}
          onClick={continueToApp}
          type="button"
        >
          {translate('subscriber.appearance.launch.cta')}
        </button>
      </div>
    </main>
  );
}
