import { describe, expect, it } from 'vitest';

import { defineWashedReactAppConfig, defineWashedVitestConfig, toAliasRecord } from './index.js';

describe('@washed/frontend-config', () => {
  it('defines consistent React app config defaults', () => {
    const config = defineWashedReactAppConfig({
      aliases: [{ find: '@app', replacement: '/tmp/app/src' }],
      port: 4173,
    });

    expect(config.build).toMatchObject({
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
    });
    expect(config.envPrefix).toEqual(['VITE_', 'WASHED_']);
    expect(config.plugins).toHaveLength(1);
    expect(config.resolve).toMatchObject({
      alias: { '@app': '/tmp/app/src' },
    });
    expect(config.server).toMatchObject({
      host: '127.0.0.1',
      port: 4173,
      strictPort: false,
    });
  });

  it('defines consistent Vitest defaults', () => {
    const config = defineWashedVitestConfig({
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
    });

    expect(config.test).toMatchObject({
      coverage: { reporter: ['text', 'lcov'] },
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      setupFiles: ['src/test/setup.ts'],
    });
  });

  it('normalizes aliases for Vite-compatible config fields', () => {
    expect(
      toAliasRecord([
        { find: '@washed/ui', replacement: '/repo/packages/ui/src' },
        { find: '@washed/auth', replacement: '/repo/packages/auth/src' },
      ]),
    ).toEqual({
      '@washed/auth': '/repo/packages/auth/src',
      '@washed/ui': '/repo/packages/ui/src',
    });
  });
});
