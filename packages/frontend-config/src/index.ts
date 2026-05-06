import react from '@vitejs/plugin-react';
import { defineConfig as defineViteConfig, type UserConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import type { TestUserConfig } from 'vitest/config';

export type WashedTestEnvironment = 'happy-dom' | 'jsdom' | 'node';

export interface WashedAlias {
  readonly find: string;
  readonly replacement: string;
}

export interface WashedReactAppConfigOptions {
  readonly aliases?: readonly WashedAlias[];
  readonly envPrefix?: readonly string[];
  readonly host?: string;
  readonly outDir?: string;
  readonly port?: number;
  readonly strictPort?: boolean;
}

export interface WashedVitestConfigOptions {
  readonly aliases?: readonly WashedAlias[];
  readonly environment?: WashedTestEnvironment;
  readonly include?: readonly string[];
  readonly setupFiles?: readonly string[];
  readonly testTimeout?: number;
}

const DEFAULT_ENV_PREFIX = ['VITE_', 'WASHED_'] as const;
const DEFAULT_TEST_INCLUDE = ['src/**/*.test.ts', 'src/**/*.test.tsx'] as const;

export function defineWashedReactAppConfig(options: WashedReactAppConfigOptions = {}): UserConfig {
  const serverConfig = {
    host: options.host ?? '127.0.0.1',
    ...(options.port === undefined ? {} : { port: options.port }),
    strictPort: options.strictPort ?? false,
  };

  return defineViteConfig({
    build: {
      outDir: options.outDir ?? 'dist',
      sourcemap: true,
      target: 'es2022',
    },
    envPrefix: [...(options.envPrefix ?? DEFAULT_ENV_PREFIX)],
    plugins: [react()],
    preview: serverConfig,
    resolve: {
      alias: toAliasRecord(options.aliases ?? []),
    },
    server: serverConfig,
  });
}

export function defineWashedVitestConfig(options: WashedVitestConfigOptions = {}): UserConfig {
  return defineVitestConfig({
    resolve: {
      alias: toAliasRecord(options.aliases ?? []),
    },
    test: {
      coverage: {
        reporter: ['text', 'lcov'],
      },
      environment: options.environment ?? 'node',
      include: [...(options.include ?? DEFAULT_TEST_INCLUDE)],
      ...(options.setupFiles === undefined ? {} : { setupFiles: [...options.setupFiles] }),
      ...(options.testTimeout === undefined ? {} : { testTimeout: options.testTimeout }),
    } satisfies TestUserConfig,
  });
}

export function toAliasRecord(aliases: readonly WashedAlias[]): Record<string, string> {
  return Object.fromEntries(aliases.map((alias) => [alias.find, alias.replacement]));
}
