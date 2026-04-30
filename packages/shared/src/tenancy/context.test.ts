import { describe, expect, it } from 'vitest';

import { createRequestContext } from './context.js';

describe('createRequestContext', () => {
  it('defaults Togo to XOF and French', () => {
    expect(createRequestContext({ countryCode: 'TG', traceId: 'trace_1' })).toEqual({
      countryCode: 'TG',
      currencyCode: 'XOF',
      locale: 'fr',
      traceId: 'trace_1',
    });
  });

  it('supports Ghana defaults for future expansion', () => {
    expect(createRequestContext({ countryCode: 'GH', traceId: 'trace_1' })).toEqual({
      countryCode: 'GH',
      currencyCode: 'GHS',
      locale: 'en',
      traceId: 'trace_1',
    });
  });
});
