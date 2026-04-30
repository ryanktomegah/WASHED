import { describe, expect, it } from 'vitest';

import { localizeNotificationText } from './notification-localization.js';

describe('localizeNotificationText', () => {
  it('defaults launch notification copy to French', () => {
    expect(
      localizeNotificationText('notifications.subscriber.assignment_confirmed.title', undefined),
    ).toBe('Agent assigne');
  });

  it('supports English app locales', () => {
    expect(
      localizeNotificationText('notifications.subscriber.assignment_confirmed.body', 'en-US'),
    ).toBe('Your Washed subscription is active. Your first visits have been scheduled.');
  });

  it('falls back to the key for unknown messages', () => {
    expect(localizeNotificationText('notifications.unknown', 'fr')).toBe('notifications.unknown');
  });
});
