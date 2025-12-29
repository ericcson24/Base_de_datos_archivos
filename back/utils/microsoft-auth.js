const msal = require('@azure/msal-node');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('🔵 Configurando MSAL...');
console.log('   - Client ID:', process.env.MICROSOFT_CLIENT_ID ? 'Definido' : 'NO DEFINIDO');
console.log('   - Client Secret:', process.env.MICROSOFT_CLIENT_SECRET ? 'Definido' : 'NO DEFINIDO');

if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
  console.error('🔴 ERROR: Faltan variables de entorno para Microsoft Graph');
}

const config = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID || 'dummy-id', // Evitar crash inmediato si falta
    authority: "https://login.microsoftonline.com/common",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'dummy-secret'
  }
};

let msalClient;
try {
  msalClient = new msal.ConfidentialClientApplication(config);
  console.log('🟢 MSAL Client inicializado correctamente');
} catch (error) {
  console.error('🔴 Error inicializando MSAL Client:', error);
}

const scopes = [
  'Calendars.ReadWrite',
  'User.Read',
  'offline_access'
];

module.exports = {
  msalClient,
  scopes
};