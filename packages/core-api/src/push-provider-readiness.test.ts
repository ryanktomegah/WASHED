import { describe, expect, it } from 'vitest';

import { getPushProviderReadiness } from './push-provider-readiness.js';

describe('getPushProviderReadiness', () => {
  it('defaults to the local push simulator without requiring external credentials', () => {
    expect(getPushProviderReadiness({})).toEqual({
      environment: 'simulator',
      providers: [
        {
          configured: true,
          missingKeys: [],
          provider: 'local_push_simulator',
          requiredKeys: [],
        },
        {
          configured: false,
          missingKeys: ['APNS_BUNDLE_ID', 'APNS_KEY_ID', 'APNS_PRIVATE_KEY', 'APNS_TEAM_ID'],
          provider: 'apns',
          requiredKeys: ['APNS_BUNDLE_ID', 'APNS_KEY_ID', 'APNS_PRIVATE_KEY', 'APNS_TEAM_ID'],
        },
        {
          configured: false,
          missingKeys: ['FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY', 'FCM_PROJECT_ID'],
          provider: 'fcm',
          requiredKeys: ['FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY', 'FCM_PROJECT_ID'],
        },
      ],
      realSendEnabled: false,
      selectedProviderCanSend: true,
      selectedProvider: 'local_push_simulator',
      selectedProviderConfigured: true,
    });
  });

  it('reports APNs readiness without exposing credential values', () => {
    const readiness = getPushProviderReadiness({
      APNS_BUNDLE_ID: 'app.washed.dev',
      APNS_KEY_ID: 'KEY123',
      APNS_PRIVATE_KEY: 'secret-private-key',
      APNS_TEAM_ID: 'TEAM123',
      PUSH_ENVIRONMENT: 'development',
      PUSH_PROVIDER: 'apns',
    });

    expect(readiness.selectedProvider).toBe('apns');
    expect(readiness.selectedProviderConfigured).toBe(true);
    expect(readiness.realSendEnabled).toBe(false);
    expect(readiness.selectedProviderCanSend).toBe(false);
    expect(readiness.providers.find((provider) => provider.provider === 'apns')).toEqual({
      configured: true,
      missingKeys: [],
      provider: 'apns',
      requiredKeys: ['APNS_BUNDLE_ID', 'APNS_KEY_ID', 'APNS_PRIVATE_KEY', 'APNS_TEAM_ID'],
    });
    expect(JSON.stringify(readiness)).not.toContain('secret-private-key');
  });

  it('reports missing FCM credential keys', () => {
    const readiness = getPushProviderReadiness({
      FCM_PROJECT_ID: 'washed-dev',
      PUSH_PROVIDER: 'fcm',
    });

    expect(readiness.selectedProvider).toBe('fcm');
    expect(readiness.selectedProviderConfigured).toBe(false);
    expect(readiness.selectedProviderCanSend).toBe(false);
    expect(readiness.providers.find((provider) => provider.provider === 'fcm')).toMatchObject({
      configured: false,
      missingKeys: ['FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY'],
    });
  });

  it('marks a configured real provider send-capable only after explicit enablement', () => {
    const readiness = getPushProviderReadiness({
      FCM_CLIENT_EMAIL: 'firebase-adminsdk@washed-dev.iam.gserviceaccount.com',
      FCM_PRIVATE_KEY: 'secret-private-key',
      FCM_PROJECT_ID: 'washed-dev',
      PUSH_PROVIDER: 'fcm',
      PUSH_REAL_SEND_ENABLED: 'true',
    });

    expect(readiness.selectedProvider).toBe('fcm');
    expect(readiness.selectedProviderConfigured).toBe(true);
    expect(readiness.realSendEnabled).toBe(true);
    expect(readiness.selectedProviderCanSend).toBe(true);
    expect(JSON.stringify(readiness)).not.toContain('secret-private-key');
  });
});
