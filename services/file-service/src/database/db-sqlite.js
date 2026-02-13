const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config(); // Cargar variables de entorno

// Ruta a la base de datos
const dbPath = process.env.DB_PATH || path.join(__dirname, 'server.db');

// Crear conexión
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite');
    initDatabase();
  }
});

// Inicializar tablas
function initDatabase() {
  db.serialize(() => {
    // 1. Tabla de Usuarios (Perfil)
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      avatar_url TEXT,
      theme_preference TEXT DEFAULT 'light',
      language TEXT DEFAULT 'es',
      notifications BOOLEAN DEFAULT 1,
      microsoft_id TEXT,
      microsoft_email TEXT,
      microsoft_access_token TEXT,
      microsoft_refresh_token TEXT
    )`);

    // 2. Tabla de Credenciales (Separada para seguridad)
    db.run(`CREATE TABLE IF NOT EXISTS user_credentials (
      user_id INTEGER PRIMARY KEY,
      password_hash TEXT NOT NULL,
      last_login DATETIME,
      failed_attempts INTEGER DEFAULT 0,
      is_locked BOOLEAN DEFAULT 0,
      lockout_until DATETIME,
      reset_token TEXT,
      reset_token_expires DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Migración para añadir columnas de bloqueo temporal y reset
    const credCols = [
      { name: 'lockout_until', type: 'DATETIME' },
      { name: 'reset_token', type: 'TEXT' },
      { name: 'reset_token_expires', type: 'DATETIME' }
    ];
    credCols.forEach(col => {
      db.run(`ALTER TABLE user_credentials ADD COLUMN ${col.name} ${col.type}`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {}
      });
    });

    // 2.1 Tabla de Configuración de Seguridad (Email de recuperación encriptado)
    db.run(`CREATE TABLE IF NOT EXISTS security_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      recovery_email_enc TEXT,
      recovery_email_iv TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 2.2 Tabla de Buzón de Admin (Notificaciones)
    db.run(`CREATE TABLE IF NOT EXISTS admin_inbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'LOCKOUT', 'RESET_REQUEST', 'SYSTEM'
      user_id INTEGER,
      message TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 3. Tabla de Carpetas (Estructura de archivos)
    db.run(`CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      name TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id),
      FOREIGN KEY(parent_id) REFERENCES folders(id)
    )`);

    // 4. Tabla de Archivos (Metadatos)
    db.run(`CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER,
      name TEXT NOT NULL,
      physical_path TEXT,
      size INTEGER,
      mime_type TEXT,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(folder_id) REFERENCES folders(id),
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )`);

    // 5. Tabla de Grupos (Para compartir)
    db.run(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Tabla de Miembros de Grupo
    db.run(`CREATE TABLE IF NOT EXISTS group_members (
      group_id INTEGER,
      user_id INTEGER,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Migración de columnas antiguas en 'users' si existen (para compatibilidad)
    const columnsToAdd = [
      { name: 'avatar_url', type: 'TEXT' },
      { name: 'theme_preference', type: 'TEXT DEFAULT "light"' },
      { name: 'language', type: 'TEXT DEFAULT "es"' },
      { name: 'notifications', type: 'BOOLEAN DEFAULT 1' },
      { name: 'microsoft_id', type: 'TEXT' },
      { name: 'microsoft_email', type: 'TEXT' },
      { name: 'microsoft_access_token', type: 'TEXT' },
      { name: 'microsoft_refresh_token', type: 'TEXT' }
    ];

    columnsToAdd.forEach(col => {
      db.run(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          // console.error(`Error añadiendo columna ${col.name}:`, err.message);
        }
      });
    });

    // Tabla de Eventos de Calendario
    db.run(`CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      microsoft_id TEXT UNIQUE,
      user_id INTEGER,
      subject TEXT,
      body_preview TEXT,
      start_time DATETIME,
      end_time DATETIME,
      is_all_day BOOLEAN,
      location TEXT,
      web_link TEXT,
      categories TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_synced DATETIME,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`ALTER TABLE calendar_events ADD COLUMN categories TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {}
    });

    // Tabla de Logs de Auditoría
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de Archivos Compartidos (Legacy + New)
    db.run(`CREATE TABLE IF NOT EXISTS shared_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      owner_username TEXT NOT NULL,
      shared_with_username TEXT NOT NULL,
      pinned_to_panel INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(path, owner_username, shared_with_username)
    )`);

    // Migration: add pinned_to_panel column if it doesn't exist
    db.run(`ALTER TABLE shared_files ADD COLUMN pinned_to_panel INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        // Column already exists or other non-critical error
      }
    });

    // Tabla de Adjuntos de Eventos (Event Attachments)
    db.run(`CREATE TABLE IF NOT EXISTS event_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_owner TEXT NOT NULL,
      attached_by TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- MIGRACIÓN DE CONTRASEÑAS ---
    // Si existen usuarios con contraseña en la tabla 'users' pero no en 'user_credentials', migrarlos.
    db.all("SELECT id, password FROM users", (err, rows) => {
      if (!err && rows) {
        rows.forEach(row => {
          if (row.password) { // Si tiene contraseña en la tabla antigua
             db.get("SELECT user_id FROM user_credentials WHERE user_id = ?", [row.id], (err, cred) => {
               if (!cred) {
                 console.log(`Migrando credenciales para usuario ID ${row.id}...`);
                 db.run("INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)", [row.id, row.password]);
               }
             });
          }
        });
      }
    });

    // Crear usuario administrador por defecto si no existe
    const adminUser = 'administrador';
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'admin123'; // Fallback seguro

    db.get("SELECT * FROM users WHERE username = ?", [adminUser], async (err, row) => {
      if (err) {
        console.error('Error verificando admin:', err);
        return;
      }

      if (!row) {
        try {
          const hash = await bcrypt.hash(adminPass, 10);
          db.run("INSERT INTO users (username, role) VALUES (?, ?)", 
            [adminUser, 'admin'], 
            function(err) {
              if (err) console.error('Error creando admin:', err);
              else {
                const userId = this.lastID;
                db.run("INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)", [userId, hash]);
                console.log('Usuario administrador creado por defecto (Credenciales en tabla separada)');
              }
            }
          );
        } catch (error) {
          console.error('Error hasheando password:', error);
        }
      }
    });

    // Crear usuario de prueba 'eric' si no existe
    const testUser = 'eric';
    const testPass = process.env.USER_INITIAL_PASSWORD || 'user123';

    db.get("SELECT * FROM users WHERE username = ?", [testUser], async (err, row) => {
      if (!row) {
        try {
          const hash = await bcrypt.hash(testPass, 10);
          db.run("INSERT INTO users (username, role) VALUES (?, ?)", 
            [testUser, 'user'], 
            function(err) {
              if (err) console.error('Error creando usuario eric:', err);
              else {
                const userId = this.lastID;
                db.run("INSERT INTO user_credentials (user_id, password_hash) VALUES (?, ?)", [userId, hash]);
                console.log('Usuario eric creado por defecto (Credenciales en tabla separada)');
              }
            }
          );
        } catch (error) {
          console.error('Error hasheando password:', error);
        }
      }
    });
  });
}

// Promisify db methods for easier async/await usage
const dbAsync = {
  get: (sql, params) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  all: (sql, params) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),
  run: (sql, params) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  })
};

module.exports = { db, dbAsync };
