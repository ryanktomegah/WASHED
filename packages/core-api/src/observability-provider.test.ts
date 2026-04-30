import { describe, expect, it, vi } from 'vitest';

import { createObservabilityProvider } from './observability-provider.js';

describe('createObservabilityProvider', () => {
  it('uses local structured logging without a Sentry DSN', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const provider = createObservabilityProvider({});

    const result = await provider.captureException({
      error: new Error('boom'),
      request: { method: 'GET', url: '/boom' },
      traceId: 'trace_observability',
    });

    expect(result).toEqual({
      eventId: null,
      provider: 'local_structured_log',
      status: 'sent',
    });
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('"traceId":"trace_observability"'));
    stderr.mockRestore();
  });

  it('disables Sentry sends until explicitly enabled', async () => {
    const provider = createObservabilityProvider({
      SENTRY_DSN: 'https://public@example.sentry.io/123',
    });

    await expect(
      provider.captureException({
        error: new Error('boom'),
        traceId: 'trace_observability',
      }),
    ).resolves.toEqual({
      eventId: null,
      provider: 'sentry_http',
      status: 'disabled',
    });
  });

  it('submits Sentry-compatible events when enabled', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    const provider = createObservabilityProvider(
      {
        SENTRY_DSN: 'https://public@example.sentry.io/123',
        SENTRY_REAL_SEND_ENABLED: 'true',
      },
      fetchMock,
    );

    const result = await provider.captureException({
      error: new Error('boom'),
      request: { method: 'GET', url: '/boom' },
      tags: { route: '/boom' },
      traceId: 'trace_observability',
    });

    expect(result).toMatchObject({
      provider: 'sentry_http',
      status: 'sent',
    });
    expect(result.eventId).toHaveLength(32);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.sentry.io/api/123/store/',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(String((init as RequestInit).body)).toContain('trace_observability');
  });
});
