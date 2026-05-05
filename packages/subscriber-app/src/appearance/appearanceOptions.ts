import type { MessageKey } from '@washed/i18n';

import type { SubscriberAppearancePreference } from './AppearanceContext.js';

export const APPEARANCE_OPTIONS = [
  'system',
  'light',
  'dark',
] as const satisfies readonly SubscriberAppearancePreference[];

export function appearanceOptionLabelKey(option: SubscriberAppearancePreference): MessageKey {
  if (option === 'dark') return 'subscriber.appearance.option.dark';
  if (option === 'light') return 'subscriber.appearance.option.light';
  return 'subscriber.appearance.option.system';
}

export function appearanceOptionBodyKey(option: SubscriberAppearancePreference): MessageKey {
  if (option === 'dark') return 'subscriber.appearance.option.dark.body';
  if (option === 'light') return 'subscriber.appearance.option.light.body';
  return 'subscriber.appearance.option.system.body';
}
