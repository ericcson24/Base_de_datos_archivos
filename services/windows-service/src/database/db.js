require('dotenv').config();
const dbType = process.env.DB_TYPE || 'postgres';
console.log(`[windows-service] DB type: ${dbType}`);
module.exports = require('./db-postgres');
