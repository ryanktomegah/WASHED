import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.washed.worker',
  appName: 'Washed Worker',
  webDir: 'dist',
  server: {
    cleartext: true,
  },
};

export default config;
