const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'server_db',
  port: process.env.DB_PORT || 5432,
});

const convertSql = (sql) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

const dbAsync = {
  get: async (sql, params = []) => {
    const res = await pool.query(convertSql(sql), params);
    return res.rows[0];
  },
  all: async (sql, params = []) => {
    const res = await pool.query(convertSql(sql), params);
    return res.rows;
  },
  run: async (sql, params = []) => {
    let pgSql = convertSql(sql);
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
      try {
        const res = await pool.query(pgSql, params);
        return { lastID: res.rows[0]?.id, changes: res.rowCount };
      } catch (e) {
        const res = await pool.query(convertSql(sql), params);
        return { lastID: null, changes: res.rowCount };
      }
    }
    const res = await pool.query(pgSql, params);
    return { lastID: null, changes: res.rowCount };
  }
};

const initDatabase = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('[windows-service] Connected to PostgreSQL');

      await client.query(`
        CREATE TABLE IF NOT EXISTS windows_user_links (
          id SERIAL PRIMARY KEY,
          cloud_username TEXT NOT NULL,
          windows_username TEXT NOT NULL,
          sync_enabled BOOLEAN DEFAULT TRUE,
          sync_desktop BOOLEAN DEFAULT TRUE,
          sync_documents BOOLEAN DEFAULT TRUE,
          sync_downloads BOOLEAN DEFAULT TRUE,
          linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_sync TIMESTAMP,
          UNIQUE(cloud_username),
          UNIQUE(windows_username)
        )
      `);

      client.release();
      return;
    } catch (err) {
      console.log(`[windows-service] Waiting for Postgres... (${retries})`, err.message);
      retries--;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.error('[windows-service] Could not connect to PostgreSQL');
  process.exit(1);
};

module.exports = { dbAsync, initDatabase, pool };
