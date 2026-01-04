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
      console.error('Postgres Query Error (GET):', error.message, sql);
      throw error;
    }
  },
  all: async (sql, params = []) => {
    try {
      const res = await pool.query(convertSql(sql), params);
      return res.rows;
    } catch (error) {
      console.error('Postgres Query Error (ALL):', error.message, sql);
      throw error;
    }
  },
  run: async (sql, params = []) => {
    try {
      let pgSql = convertSql(sql);
      
      // Hack for compatibility: SQLite returns lastID for INSERTs.
      // Postgres needs RETURNING id.
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
         const sqlWithReturning = pgSql + ' RETURNING id';
         try {
             const res = await pool.query(sqlWithReturning, params);
             return { lastID: res.rows[0]?.id, changes: res.rowCount };
         } catch (err) {
             // If table doesn't have id (code 42703), fall back to original query
             if (err.code === '42703') {
                 const res = await pool.query(pgSql, params);
                 return { changes: res.rowCount };
             }
             throw err;
         }
      }

      const res = await pool.query(pgSql, params);
      return { changes: res.rowCount };
    } catch (error) {
      console.error('Postgres Query Error (RUN):', error.message, sql);
      throw error;
    }
  }
};

// Initialize DB
const initDb = async () => {
  try {
    console.log('Initializing RDP Database...');
    
    // Create rdp_connections table (Modified for VPN-like behavior)
    // We keep 'hostname' but it will now store the Virtual IP
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rdp_connections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        hostname VARCHAR(255) NOT NULL,
        port INTEGER DEFAULT 3389,
        username VARCHAR(255),
        password VARCHAR(255),
        protocol VARCHAR(50) DEFAULT 'rdp',
        virtual_ip VARCHAR(50),
        public_key VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure virtual_ip column exists (migration)
    try {
        await pool.query(`ALTER TABLE rdp_connections ADD COLUMN IF NOT EXISTS virtual_ip VARCHAR(50)`);
        await pool.query(`ALTER TABLE rdp_connections ADD COLUMN IF NOT EXISTS public_key VARCHAR(255)`);
    } catch (e) {
        // Ignore if exists
    }

    // Create rdp_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rdp_settings (
        key VARCHAR(50) PRIMARY KEY,
        value VARCHAR(255)
      )
    `);

    // Insert default settings if not exist
    await pool.query(`
      INSERT INTO rdp_settings (key, value)
      VALUES ('lan_only', 'false'), ('server_id', '')
      ON CONFLICT (key) DO NOTHING
    `);
    
    console.log('RDP Database initialized successfully');
  } catch (error) {
    console.error('Error initializing RDP database:', error);
  }
};

module.exports = { dbAsync, initDb };
