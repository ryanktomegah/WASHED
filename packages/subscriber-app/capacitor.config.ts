import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.washed.subscriber',
  appName: 'Washed',
  webDir: 'dist',
  backgroundColor: '#0A3D1F',
  server: {
    cleartext: true,
  },
};

export default config;
