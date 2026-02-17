require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';

console.log(`[ROADMAP DB] Initializing Database with type: ${dbType}`);

if (dbType === 'postgres') {
  module.exports = require('./db-postgres');
} else {
  console.error('[ROADMAP DB] Only postgres is supported for roadmap-service');
  process.exit(1);
}
