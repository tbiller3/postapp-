/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.tbiller.postapp',
  appName: 'POSTAPP',
  webDir: 'www',
  server: {
    url: 'https://postapp.replit.app',
    cleartext: false,
    allowNavigation: [],
  },
  ios: {
    backgroundColor: '#000000',
    statusBarStyle: 'lightContent',
    minimumOsVersion: '15.0',
    contentInset: 'automatic',
  },
};

module.exports = config;
