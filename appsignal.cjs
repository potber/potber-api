const { Appsignal } = require('@appsignal/nodejs');
const { name: defaultAppName } = require('./package.json');

new Appsignal({
  active: Boolean(process.env.APPSIGNAL_PUSH_API_KEY?.trim()),
  environment:
    process.env.APPSIGNAL_APP_ENV || process.env.NODE_ENV || 'development',
  name: process.env.APPSIGNAL_APP_NAME || defaultAppName,
  pushApiKey: process.env.APPSIGNAL_PUSH_API_KEY,
});
