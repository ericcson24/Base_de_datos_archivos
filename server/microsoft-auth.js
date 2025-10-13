const msal = require('@azure/msal-node');
const { beforeCacheAccess, afterCacheAccess } = require('./tokenCache');

const config = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || "TU_CLIENT_ID",
    authority: "https://login.microsoftonline.com/common",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "TU_CLIENT_SECRET"
  },
  cache: {
    cachePlugin: {
      beforeCacheAccess,
      afterCacheAccess
    }
  }
};

const msalClient = new msal.ConfidentialClientApplication(config);

const scopes = [
  'Calendars.ReadWrite',
  'User.Read',
  'offline_access'
];

module.exports = {
  msalClient,
  scopes
};