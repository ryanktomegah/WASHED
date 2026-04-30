export type ObservabilityProviderKind = 'local_structured_log' | 'sentry_http';

export interface CaptureExceptionInput {
  readonly error: unknown;
  readonly level?: 'error' | 'fatal' | 'warning';
  readonly request?: {
    readonly method: string;
    readonly url: string;
  };
  readonly tags?: Readonly<Record<string, string>>;
  readonly traceId: string;
}

export interface CaptureExceptionResult {
  readonly eventId: string | null;
  readonly provider: ObservabilityProviderKind;
  readonly status: 'disabled' | 'sent';
}

export interface ObservabilityProvider {
  captureException(input: CaptureExceptionInput): Promise<CaptureExceptionResult>;
}

type FetchLike = typeof fetch;

export function createObservabilityProvider(
  env: NodeJS.ProcessEnv = process.env,
  fetchFn: FetchLike = fetch,
): ObservabilityProvider {
  if (env['SENTRY_DSN'] !== undefined && env['SENTRY_DSN'].trim().length > 0) {
    if (env['SENTRY_REAL_SEND_ENABLED'] !== 'true') {
      return new DisabledSentryObservabilityProvider('real_send_disabled');
    }

    return new SentryHttpObservabilityProvider(env, fetchFn);
  }

  return new LocalStructuredLogObservabilityProvider();
}

class LocalStructuredLogObservabilityProvider implements ObservabilityProvider {
  public async captureException(input: CaptureExceptionInput): Promise<CaptureExceptionResult> {
    process.stderr.write(`${JSON.stringify(toStructuredErrorLog(input))}\n`);

    return {
      eventId: null,
      provider: 'local_structured_log',
      status: 'sent',
    };
  }
}

class DisabledSentryObservabilityProvider implements ObservabilityProvider {
  public constructor(private readonly reason: string) {}

  public async captureException(): Promise<CaptureExceptionResult> {
    return {
      eventId: null,
      provider: 'sentry_http',
      status: 'disabled',
    };
  }
}

class SentryHttpObservabilityProvider implements ObservabilityProvider {
  public constructor(
    private readonly env: NodeJS.ProcessEnv,
    private readonly fetchFn: FetchLike,
  ) {}

  public async captureException(input: CaptureExceptionInput): Promise<CaptureExceptionResult> {
    const dsn = parseSentryDsn(requireEnv(this.env, 'SENTRY_DSN'));
    const eventId = crypto.randomUUID().replaceAll('-', '');
    const response = await this.fetchFn(dsn.storeUrl, {
      body: JSON.stringify({
        event_id: eventId,
        exception: {
          values: [
            {
              type: input.error instanceof Error ? input.error.name : 'NonErrorException',
              value: errorMessage(input.error),
            },
          ],
        },
        level: input.level ?? 'error',
        platform: 'node',
        request: input.request,
        tags: {
          service: 'core-api',
          traceId: input.traceId,
          ...input.tags,
        },
      }),
      headers: {
        'content-type': 'application/json',
        'x-sentry-auth': [
          'Sentry sentry_version=7',
          `sentry_client=washed-core-api/0.0.0`,
          `sentry_key=${dsn.publicKey}`,
        ].join(', '),
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Sentry event submission failed with status ${response.status}.`);
    }

    return {
      eventId,
      provider: 'sentry_http',
      status: 'sent',
    };
  }
}

function toStructuredErrorLog(input: CaptureExceptionInput): Record<string, unknown> {
  return {
    errorName: input.error instanceof Error ? input.error.name : 'NonErrorException',
    level: input.level ?? 'error',
    message: errorMessage(input.error),
    request: input.request,
    service: 'core-api',
    tags: input.tags,
    traceId: input.traceId,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : 'Unknown error';
}

function parseSentryDsn(value: string): { readonly publicKey: string; readonly storeUrl: string } {
  const url = new URL(value);
  const projectId = url.pathname.split('/').filter(Boolean).at(-1);

  if (!url.username || projectId === undefined) {
    throw new Error('SENTRY_DSN must include a public key and project id.');
  }

  return {
    publicKey: url.username,
    storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
  };
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}
