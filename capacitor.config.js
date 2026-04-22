/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.tbiller.postapp',
  appName: 'POSTAPP',
  webDir: 'www',
  server: {
    url: 'https://app-export-tool.replit.app/',
    cleartext: false,
    allowNavigation: [],
  },
  ios: {
    backgroundColor: '#0d1117',
    statusBarStyle: 'lightContent',
    minimumOsVersion: '15.0',
    contentInset: 'automatic',
  },
};

module.exports = config;
