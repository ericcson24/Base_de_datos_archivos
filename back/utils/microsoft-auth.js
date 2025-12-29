const msal = require('@azure/msal-node');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET
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