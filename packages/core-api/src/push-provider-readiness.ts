export type PushProviderKind = 'apns' | 'fcm' | 'local_push_simulator';
export type PushProviderEnvironment = 'development' | 'production' | 'simulator';

export interface PushProviderStatus {
  readonly configured: boolean;
  readonly missingKeys: readonly string[];
  readonly provider: PushProviderKind;
  readonly requiredKeys: readonly string[];
}

export interface PushProviderReadiness {
  readonly environment: PushProviderEnvironment;
  readonly providers: readonly PushProviderStatus[];
  readonly realSendEnabled: boolean;
  readonly selectedProviderCanSend: boolean;
  readonly selectedProvider: PushProviderKind;
  readonly selectedProviderConfigured: boolean;
}

const PROVIDER_VALUES = new Set<PushProviderKind>(['apns', 'fcm', 'local_push_simulator']);
const ENVIRONMENT_VALUES = new Set<PushProviderEnvironment>([
  'development',
  'production',
  'simulator',
]);
const APNS_REQUIRED_KEYS = [
  'APNS_BUNDLE_ID',
  'APNS_KEY_ID',
  'APNS_PRIVATE_KEY',
  'APNS_TEAM_ID',
] as const;
const FCM_REQUIRED_KEYS = ['FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY', 'FCM_PROJECT_ID'] as const;

export function getPushProviderReadiness(
  env: NodeJS.ProcessEnv = process.env,
): PushProviderReadiness {
  const selectedProvider = readOptionalLiteral(
    env['PUSH_PROVIDER'],
    PROVIDER_VALUES,
    'local_push_simulator',
  );
  const environment = readOptionalLiteral(
    env['PUSH_ENVIRONMENT'],
    ENVIRONMENT_VALUES,
    selectedProvider === 'local_push_simulator' ? 'simulator' : 'development',
  );
  const providers: readonly PushProviderStatus[] = [
    {
      configured: true,
      missingKeys: [],
      provider: 'local_push_simulator',
      requiredKeys: [],
    },
    providerStatus('apns', APNS_REQUIRED_KEYS, env),
    providerStatus('fcm', FCM_REQUIRED_KEYS, env),
  ];
  const selected = providers.find((provider) => provider.provider === selectedProvider);

  if (selected === undefined) {
    throw new Error('Selected push provider is not registered.');
  }

  const realSendEnabled = env['PUSH_REAL_SEND_ENABLED'] === 'true';

  return {
    environment,
    providers,
    realSendEnabled,
    selectedProviderCanSend:
      selectedProvider === 'local_push_simulator' || (selected.configured && realSendEnabled),
    selectedProvider,
    selectedProviderConfigured: selected.configured,
  };
}

function providerStatus(
  provider: Exclude<PushProviderKind, 'local_push_simulator'>,
  requiredKeys: readonly string[],
  env: NodeJS.ProcessEnv,
): PushProviderStatus {
  const missingKeys = requiredKeys.filter((key) => !hasValue(env[key]));

  return {
    configured: missingKeys.length === 0,
    missingKeys,
    provider,
    requiredKeys,
  };
}

function hasValue(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function readOptionalLiteral<TValue extends string>(
  value: string | undefined,
  allowed: ReadonlySet<TValue>,
  fallback: TValue,
): TValue {
  if (value === undefined || value.trim().length === 0) {
    return fallback;
  }

  if (!allowed.has(value as TValue)) {
    throw new Error(`Unsupported push provider setting: ${value}.`);
  }

  return value as TValue;
}
