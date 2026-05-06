import { defineWashedVitestConfig } from '@washed/frontend-config';

export default defineWashedVitestConfig({
  environment: 'jsdom',
  setupFiles: ['src/test/setup.ts'],
  testTimeout: 15_000,
});
