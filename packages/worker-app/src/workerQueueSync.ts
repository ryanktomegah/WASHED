import { createCoreApiClient, type CoreApiClientOptions } from '@washed/api-client';

import type { WorkerOfflineQueueItem } from './workerState.js';

export interface WorkerQueueSyncOptions {
  readonly authToken?: string;
  readonly baseUrl?: string;
  readonly fetch?: typeof fetch;
}

export interface WorkerQueueSyncResult {
  readonly mode: 'api' | 'demo';
  readonly syncedCount: number;
}

export async function syncWorkerOfflineQueue(
  queue: readonly WorkerOfflineQueueItem[],
  options: WorkerQueueSyncOptions = {},
): Promise<WorkerQueueSyncResult> {
  if (queue.length === 0) {
    return { mode: readConfiguredBaseUrl(options) === undefined ? 'demo' : 'api', syncedCount: 0 };
  }

  const baseUrl = readConfiguredBaseUrl(options);

  if (baseUrl === undefined) {
    return { mode: 'demo', syncedCount: queue.length };
  }

  const api = createCoreApiClient(toCoreApiClientOptions(baseUrl, options));

  for (const item of queue) {
    await api.request(item.operationId, {
      ...(item.request.body === undefined ? {} : { body: item.request.body }),
      headers: { 'x-trace-id': item.id },
      idempotencyKey: item.idempotencyKey,
      pathParams: item.request.pathParams,
    });
  }

  return { mode: 'api', syncedCount: queue.length };
}

function toCoreApiClientOptions(
  baseUrl: string,
  options: WorkerQueueSyncOptions,
): CoreApiClientOptions {
  return {
    baseUrl,
    ...(options.authToken === undefined ? {} : { getAccessToken: () => options.authToken }),
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  };
}

function readConfiguredBaseUrl(options: WorkerQueueSyncOptions): string | undefined {
  if (options.baseUrl !== undefined && options.baseUrl.length > 0) {
    return options.baseUrl;
  }

  const env = import.meta.env;
  const viteBaseUrl = env.VITE_CORE_API_BASE_URL;
  const washedBaseUrl = env.WASHED_CORE_API_BASE_URL;

  if (typeof viteBaseUrl === 'string' && viteBaseUrl.length > 0) {
    return viteBaseUrl;
  }

  return typeof washedBaseUrl === 'string' && washedBaseUrl.length > 0 ? washedBaseUrl : undefined;
}
