import { CORE_API_OPERATIONS, type CoreApiOperationId } from './operations.js';

export {
  CORE_API_OPERATIONS,
  type CoreApiMethod,
  type CoreApiOperation,
  type CoreApiOperationId,
} from './operations.js';

export interface CoreApiClientOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof fetch;
  readonly getAccessToken?: () => Promise<string | undefined> | string | undefined;
}

export interface CoreApiRequestOptions {
  readonly authToken?: string;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
  readonly idempotencyKey?: string;
  readonly pathParams?: Record<string, string | number>;
  readonly query?: Record<string, boolean | number | string | null | undefined>;
}

export interface CoreApiClient {
  readonly request: <TResponse = unknown>(
    operationId: CoreApiOperationId,
    options?: CoreApiRequestOptions,
  ) => Promise<TResponse>;
}

export class CoreApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly traceId?: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'CoreApiError';
  }
}

const operationsById = new Map(
  CORE_API_OPERATIONS.map((operation) => [operation.operationId, operation]),
);

export function createCoreApiClient(options: CoreApiClientOptions): CoreApiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/u, '');
  const fetchImpl = options.fetch ?? fetch;

  return {
    async request<TResponse = unknown>(
      operationId: CoreApiOperationId,
      requestOptions: CoreApiRequestOptions = {},
    ): Promise<TResponse> {
      const operation = operationsById.get(operationId);

      if (operation === undefined) {
        throw new Error(`Unknown core API operation: ${operationId}`);
      }

      const url = new URL(
        `${baseUrl}${buildPath(operation.path, requestOptions.pathParams ?? {})}`,
      );

      for (const [key, value] of Object.entries(requestOptions.query ?? {})) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }

      const authToken = requestOptions.authToken ?? (await options.getAccessToken?.());
      const headers: Record<string, string> = {
        ...(requestOptions.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(authToken === undefined ? {} : { authorization: `Bearer ${authToken}` }),
        ...(requestOptions.idempotencyKey === undefined
          ? {}
          : { 'idempotency-key': requestOptions.idempotencyKey }),
        ...requestOptions.headers,
      };

      const requestInit: RequestInit = {
        headers,
        method: operation.method,
      };

      if (requestOptions.body !== undefined) {
        requestInit.body = JSON.stringify(requestOptions.body);
      }

      const response = await fetchImpl(url, requestInit);

      const payload = await readPayload(response);

      if (!response.ok) {
        throw toCoreApiError(response, payload);
      }

      return payload as TResponse;
    },
  };
}

function buildPath(path: string, pathParams: Record<string, string | number>): string {
  return path.replace(/\{([^}]+)\}/gu, (_match, key: string) => {
    const value = pathParams[key];

    if (value === undefined) {
      throw new Error(`Missing path parameter: ${key}`);
    }

    return encodeURIComponent(String(value));
  });
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (text.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function toCoreApiError(response: Response, payload: unknown): CoreApiError {
  if (typeof payload !== 'object' || payload === null) {
    return new CoreApiError(response.statusText, response.status, undefined, undefined, payload);
  }

  const record = payload as Record<string, unknown>;
  const message = typeof record['message'] === 'string' ? record['message'] : response.statusText;
  const code = typeof record['code'] === 'string' ? record['code'] : undefined;
  const traceId = typeof record['traceId'] === 'string' ? record['traceId'] : undefined;

  return new CoreApiError(message, response.status, code, traceId, payload);
}
