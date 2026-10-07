import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.game.yansan',
  appName: '烟三',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#050b14',
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
