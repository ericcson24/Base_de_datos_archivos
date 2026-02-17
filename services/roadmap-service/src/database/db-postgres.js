const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  database: process.env.DB_NAME || 'server_db',
  port: process.env.DB_PORT || 5432,
});

// Helper to convert ? to $n
const convertSql = (sql) => {
  let i = 0;
  return sql.replace(/\?/g, () => {
    i++;
    return `$${i}`;
  });
};

const dbAsync = {
  get: async (sql, params = []) => {
    try {
      const res = await pool.query(convertSql(sql), params);
      return res.rows[0];
    } catch (error) {
      console.error('[ROADMAP DB] Query Error (GET):', error.message, sql);
      throw error;
    }
  },
  all: async (sql, params = []) => {
    try {
      const res = await pool.query(convertSql(sql), params);
      return res.rows;
    } catch (error) {
      console.error('[ROADMAP DB] Query Error (ALL):', error.message, sql);
      throw error;
    }
  },
  run: async (sql, params = []) => {
    try {
      let pgSql = convertSql(sql);
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
        try {
          const res = await pool.query(pgSql, params);
          return { lastID: res.rows[0]?.id, changes: res.rowCount };
        } catch (insertErr) {
          // Fallback without RETURNING
          pgSql = pgSql.replace(/ RETURNING id$/, '');
          const res = await pool.query(pgSql, params);
          return { lastID: null, changes: res.rowCount };
        }
      }
      const res = await pool.query(pgSql, params);
      return { lastID: null, changes: res.rowCount };
    } catch (error) {
      console.error('[ROADMAP DB] Query Error (RUN):', error.message, sql);
      throw error;
    }
  }
};

module.exports = { dbAsync, pool };
