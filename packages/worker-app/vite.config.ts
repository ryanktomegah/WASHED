import { defineWashedReactAppConfig } from '@washed/frontend-config';
import type { UserConfig } from 'vite';

const config: UserConfig = defineWashedReactAppConfig({
  port: 5174,
});

config.base = './';

export default config;
