export type PaymentReadinessProviderKind = 'mobile_money_http' | 'mock';

export interface PaymentProviderCapabilityStatus {
  readonly canRun: boolean;
  readonly configured: boolean;
  readonly enabled: boolean;
  readonly missingKeys: readonly string[];
  readonly requiredKeys: readonly string[];
}

export interface PaymentProviderStatus {
  readonly charge: PaymentProviderCapabilityStatus;
  readonly payout: PaymentProviderCapabilityStatus;
  readonly provider: PaymentReadinessProviderKind;
  readonly refund: PaymentProviderCapabilityStatus;
}

export interface PaymentProviderReadiness {
  readonly providers: readonly PaymentProviderStatus[];
  readonly selectedProvider: PaymentReadinessProviderKind;
  readonly selectedProviderCanCharge: boolean;
  readonly selectedProviderCanPayout: boolean;
  readonly selectedProviderCanRefund: boolean;
}

const PROVIDER_VALUES = new Set<PaymentReadinessProviderKind>(['mobile_money_http', 'mock']);
const MOBILE_MONEY_CHARGE_REQUIRED_KEYS = [
  'MOBILE_MONEY_API_KEY',
  'MOBILE_MONEY_ENDPOINT',
  'MOBILE_MONEY_MERCHANT_ID',
] as const;
const MOBILE_MONEY_REFUND_REQUIRED_KEYS = [
  'MOBILE_MONEY_API_KEY',
  'MOBILE_MONEY_MERCHANT_ID',
  'MOBILE_MONEY_REFUND_ENDPOINT',
] as const;
const MOBILE_MONEY_PAYOUT_REQUIRED_KEYS = [
  'MOBILE_MONEY_API_KEY',
  'MOBILE_MONEY_MERCHANT_ID',
  'MOBILE_MONEY_PAYOUT_ENDPOINT',
] as const;

export function getPaymentProviderReadiness(
  env: NodeJS.ProcessEnv = process.env,
): PaymentProviderReadiness {
  const selectedProvider = readOptionalLiteral(env['PAYMENT_PROVIDER'], PROVIDER_VALUES, 'mock');
  const providers: readonly PaymentProviderStatus[] = [
    {
      charge: {
        canRun: true,
        configured: true,
        enabled: true,
        missingKeys: [],
        requiredKeys: [],
      },
      payout: {
        canRun: true,
        configured: true,
        enabled: true,
        missingKeys: [],
        requiredKeys: [],
      },
      provider: 'mock',
      refund: {
        canRun: true,
        configured: true,
        enabled: true,
        missingKeys: [],
        requiredKeys: [],
      },
    },
    {
      charge: providerCapabilityStatus(
        MOBILE_MONEY_CHARGE_REQUIRED_KEYS,
        env['PAYMENT_REAL_CHARGE_ENABLED'] === 'true',
        env,
      ),
      payout: providerCapabilityStatus(
        MOBILE_MONEY_PAYOUT_REQUIRED_KEYS,
        env['PAYMENT_REAL_PAYOUT_ENABLED'] === 'true',
        env,
      ),
      provider: 'mobile_money_http',
      refund: providerCapabilityStatus(
        MOBILE_MONEY_REFUND_REQUIRED_KEYS,
        env['PAYMENT_REAL_REFUND_ENABLED'] === 'true',
        env,
      ),
    },
  ];
  const selected = providers.find((provider) => provider.provider === selectedProvider);

  if (selected === undefined) {
    throw new Error('Selected payment provider is not registered.');
  }

  return {
    providers,
    selectedProvider,
    selectedProviderCanCharge: selected.charge.canRun,
    selectedProviderCanPayout: selected.payout.canRun,
    selectedProviderCanRefund: selected.refund.canRun,
  };
}

function providerCapabilityStatus(
  requiredKeys: readonly string[],
  enabled: boolean,
  env: NodeJS.ProcessEnv,
): PaymentProviderCapabilityStatus {
  const missingKeys = requiredKeys.filter((key) => !hasValue(env[key]));
  const configured = missingKeys.length === 0;

  return {
    canRun: configured && enabled,
    configured,
    enabled,
    missingKeys,
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
    throw new Error(`Unsupported payment provider setting: ${value}.`);
  }

  return value as TValue;
}
