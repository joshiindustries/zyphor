import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zyphor.app',
  appName: 'Zyphor',
  webDir: 'out',
  server: {
    url: 'https://zyphorr.vercel.app/',
    cleartext: true
  }
};

export default config;
