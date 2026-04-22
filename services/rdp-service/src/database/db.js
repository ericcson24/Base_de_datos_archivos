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
      
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
         const sqlWithReturning = pgSql + ' RETURNING id';
         try {
             const res = await pool.query(sqlWithReturning, params);
             return { lastID: res.rows[0]?.id, changes: res.rowCount };
         } catch (err) {
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

const waitForDb = async (maxRetries = 15, delay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established');
      return true;
    } catch (err) {
      console.log(`Waiting for database... attempt ${i + 1}/${maxRetries}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Could not connect to database after retries');
};

const initDb = async () => {
  try {
    await waitForDb();
    console.log('Initializing RDP Database...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rdp_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL DEFAULT 1,
        server_id TEXT NOT NULL DEFAULT '',
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

    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rdp_connections';
        `);
        const columns = res.rows.map(r => r.column_name);
        console.log('RDP columns:', columns);

        const migrations = [
          { col: 'virtual_ip', sql: 'ALTER TABLE rdp_connections ADD COLUMN virtual_ip VARCHAR(50)' },
          { col: 'public_key', sql: 'ALTER TABLE rdp_connections ADD COLUMN public_key VARCHAR(255)' },
          { col: 'password', sql: 'ALTER TABLE rdp_connections ADD COLUMN password VARCHAR(255)' },
          { col: 'protocol', sql: "ALTER TABLE rdp_connections ADD COLUMN protocol VARCHAR(50) DEFAULT 'rdp'" },
          { col: 'user_id', sql: 'ALTER TABLE rdp_connections ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1' },
          { col: 'server_id', sql: "ALTER TABLE rdp_connections ADD COLUMN server_id TEXT NOT NULL DEFAULT ''" },
          { col: 'security', sql: "ALTER TABLE rdp_connections ADD COLUMN security VARCHAR(20) DEFAULT 'any'" },
          { col: 'domain', sql: 'ALTER TABLE rdp_connections ADD COLUMN domain VARCHAR(255)' },
          { col: 'ignore_cert', sql: "ALTER TABLE rdp_connections ADD COLUMN ignore_cert BOOLEAN DEFAULT TRUE" },
          { col: 'enable_drive', sql: "ALTER TABLE rdp_connections ADD COLUMN enable_drive BOOLEAN DEFAULT FALSE" },
          { col: 'drive_path', sql: 'ALTER TABLE rdp_connections ADD COLUMN drive_path VARCHAR(255)' },
          { col: 'enable_audio', sql: "ALTER TABLE rdp_connections ADD COLUMN enable_audio BOOLEAN DEFAULT FALSE" },
          { col: 'password_encrypted', sql: 'ALTER TABLE rdp_connections ADD COLUMN password_encrypted TEXT' },
          { col: 'last_used', sql: 'ALTER TABLE rdp_connections ADD COLUMN last_used TIMESTAMP' },
          { col: 'is_active', sql: 'ALTER TABLE rdp_connections ADD COLUMN is_active BOOLEAN DEFAULT TRUE' },
        ];

        for (const m of migrations) {
          if (!columns.includes(m.col)) {
            console.log(`Adding column: ${m.col}`);
            await pool.query(m.sql);
          }
        }
    } catch (e) {
        console.error('Error verifying/migrating columns:', e);
    }

    try {
      const settingsCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'rdp_settings'
      `);
      const settingsCols = settingsCheck.rows.map(r => r.column_name);
      
      if (settingsCols.length > 0 && !settingsCols.includes('setting_key')) {
        console.log('Migrating rdp_settings from old schema to key-value store...');
        await pool.query('DROP TABLE IF EXISTS rdp_settings CASCADE');
      }
    } catch (e) {
      console.log('rdp_settings check:', e.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rdp_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value VARCHAR(255)
      )
    `);

    await pool.query(`
      INSERT INTO rdp_settings (setting_key, setting_value)
      VALUES ('lan_only', 'false'), ('server_id', ''), ('maintenance_mode', 'false')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    await pool.query(`
      UPDATE rdp_connections
      SET security = 'nla'
      WHERE security IS NULL OR security = '' OR security = 'any'
    `);
    
    console.log('RDP Database initialized successfully');
  } catch (error) {
    console.error('Error initializing RDP database:', error);
    throw error;
  }
};

module.exports = { dbAsync, initDb };
