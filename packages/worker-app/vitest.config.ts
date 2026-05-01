import { defineWashedVitestConfig } from '@washed/frontend-config';

export default defineWashedVitestConfig({
  environment: 'jsdom',
  setupFiles: ['src/test/setup.ts'],
});
