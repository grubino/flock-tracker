import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flocktracker.app',
  appName: 'Flock Tracker',
  webDir: '../backend/static',
  server: {
    androidScheme: 'https',
    // Allow clear text traffic for local development
    // Change this to your production API URL in production
    cleartext: true
  }
};

export default config;
