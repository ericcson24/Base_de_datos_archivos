const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

pool.on('connect', () => {
  console.log('✅ AI Service conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en conexión PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
