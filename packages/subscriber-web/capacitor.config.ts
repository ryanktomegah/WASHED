import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.washed.subscriber',
  appName: 'Washed Subscriber',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
};

export default config;
