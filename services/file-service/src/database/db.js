require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';

console.log(`Initializing Database with type: ${dbType}`);

if (dbType === 'postgres') {
  module.exports = require('./db-postgres');
} else {
  module.exports = require('./db-sqlite');
}
