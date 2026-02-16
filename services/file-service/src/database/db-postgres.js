const { Pool } = require('pg');
const bcrypt = require('bcrypt');
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
         pgSql += ' RETURNING id';
         try {
             const res = await pool.query(pgSql, params);
             if (res.rows[0] && res.rows[0].id) {
                 return { lastID: res.rows[0].id, changes: res.rowCount };
             }
         } catch (e) {
             // Fallback if table doesn't have 'id' column or other error, try without RETURNING
             const res = await pool.query(convertSql(sql), params);
             return { lastID: null, changes: res.rowCount };
         }
      }

      const res = await pool.query(pgSql, params);
      return { lastID: null, changes: res.rowCount };
    } catch (error) {
      console.error('Postgres Query Error (RUN):', error.message, sql);
      throw error;
    }
  },
  // Expose raw pool.query for modules that need it (e.g. autoSync)
  query: async (sql, params = []) => {
    const res = await pool.query(sql, params);
    return res;
  },
  isPostgres: true
};

// Init Database
const initDatabase = async () => {
    // Wait a bit for Postgres to be ready (simple retry logic could be added here)
    let client;
    let retries = 5;
    while (retries > 0) {
        try {
            client = await pool.connect();
            break;
        } catch (err) {
            console.log('Waiting for Postgres...', err.message);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }

    if (!client) {
        console.error('Could not connect to Postgres');
        return;
    }

    try {
        // Create event_attachments table outside transaction (may already exist from init schema)
        try {
            await client.query(`CREATE TABLE IF NOT EXISTS event_attachments (
                id SERIAL PRIMARY KEY,
                event_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_owner TEXT,
                attached_by TEXT,
                file_size INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
        } catch (eAtt) {
            // Table already exists - ignore
        }

        await client.query('BEGIN');

        // Users
        await client.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            avatar_url TEXT,
            theme_preference TEXT DEFAULT 'light',
            language TEXT DEFAULT 'es',
            notifications BOOLEAN DEFAULT TRUE,
            microsoft_id TEXT,
            microsoft_email TEXT,
            microsoft_access_token TEXT,
            microsoft_refresh_token TEXT
        )`);

        // User Credentials
        await client.query(`CREATE TABLE IF NOT EXISTS user_credentials (
            user_id INTEGER PRIMARY KEY,
            password_hash TEXT NOT NULL,
            last_login TIMESTAMP,
            failed_attempts INTEGER DEFAULT 0,
            is_locked BOOLEAN DEFAULT FALSE,
            lockout_until TIMESTAMP,
            reset_token TEXT,
            reset_token_expires TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Security Settings
        await client.query(`CREATE TABLE IF NOT EXISTS security_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE,
            recovery_email_enc TEXT,
            recovery_email_iv TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Admin Inbox
        await client.query(`CREATE TABLE IF NOT EXISTS admin_inbox (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            user_id INTEGER,
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Folders
        await client.query(`CREATE TABLE IF NOT EXISTS folders (
            id SERIAL PRIMARY KEY,
            parent_id INTEGER,
            name TEXT NOT NULL,
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(owner_id) REFERENCES users(id),
            FOREIGN KEY(parent_id) REFERENCES folders(id)
        )`);

        // Files
        await client.query(`CREATE TABLE IF NOT EXISTS files (
            id SERIAL PRIMARY KEY,
            folder_id INTEGER,
            name TEXT NOT NULL,
            physical_path TEXT,
            size INTEGER,
            mime_type TEXT,
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(folder_id) REFERENCES folders(id),
            FOREIGN KEY(owner_id) REFERENCES users(id)
        )`);

        // Groups
        await client.query(`CREATE TABLE IF NOT EXISTS groups (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Group Members
        await client.query(`CREATE TABLE IF NOT EXISTS group_members (
            group_id INTEGER,
            user_id INTEGER,
            role TEXT DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(group_id, user_id),
            FOREIGN KEY(group_id) REFERENCES groups(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Calendar Events
        await client.query(`CREATE TABLE IF NOT EXISTS calendar_events (
            id SERIAL PRIMARY KEY,
            microsoft_id TEXT UNIQUE,
            user_id INTEGER,
            subject TEXT,
            body_preview TEXT,
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            is_all_day BOOLEAN,
            location TEXT,
            web_link TEXT,
            categories TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_synced TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Audit Logs
        await client.query(`CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            username TEXT,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Shared Files
        await client.query(`CREATE TABLE IF NOT EXISTS shared_files (
            id SERIAL PRIMARY KEY,
            path TEXT NOT NULL,
            owner_username TEXT NOT NULL,
            shared_with_username TEXT NOT NULL,
            pinned_to_panel BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(path, owner_username, shared_with_username)
        )`);
        
        // Migration: add pinned_to_panel column if it doesn't exist
        await client.query(`DO $$ BEGIN
          ALTER TABLE shared_files ADD COLUMN pinned_to_panel BOOLEAN DEFAULT FALSE;
        EXCEPTION WHEN duplicate_column THEN END $$;`);

        // Folder Metadata (color/icon customization)
        await client.query(`CREATE TABLE IF NOT EXISTS folder_metadata (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL,
            folder_path TEXT NOT NULL,
            color TEXT DEFAULT '#5f9ee9',
            icon TEXT DEFAULT 'default',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(username, folder_path)
        )`);

        // Default Admin
        const adminUser = 'administrador';
        const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
        
        const resAdmin = await client.query("SELECT * FROM users WHERE username = $1", [adminUser]);
        if (resAdmin.rows.length === 0) {
             const hash = await bcrypt.hash(adminPass, 10);
             const resInsert = await client.query("INSERT INTO users (username, role) VALUES ($1, $2) RETURNING id", [adminUser, 'admin']);
             const userId = resInsert.rows[0].id;
             await client.query("INSERT INTO user_credentials (user_id, password_hash) VALUES ($1, $2)", [userId, hash]);
             console.log('Admin user created in Postgres');
        }

        await client.query('COMMIT');
        console.log('Postgres Database Initialized');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error initializing Postgres DB:', e);
    } finally {
        client.release();
    }
};

// Initialize on load
initDatabase();

module.exports = { db: pool, dbAsync };
