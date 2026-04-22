const msal = require('@azure/msal-node');

const config = {
  auth: {
    clientId: process.env.MS_CLIENT_ID || 'dummy-id',
    authority: "https://login.microsoftonline.com/common",
    clientSecret: process.env.MS_CLIENT_SECRET || 'dummy-secret'
  }
};

let msalClient;
try {
  msalClient = new msal.ConfidentialClientApplication(config);
  console.log('[Green] MSAL Client inicializado correctamente');
} catch (error) {
  console.error('[Red] Error inicializando MSAL Client:', error);
}

const scopes = [
  'Calendars.ReadWrite',
  'User.Read',
  'MailboxSettings.ReadWrite',
  'offline_access'
];

module.exports = {
  msalClient,
  scopes
};
