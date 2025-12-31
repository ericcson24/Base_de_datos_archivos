const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Ruta a la base de datos
const dbPath = path.join(__dirname, 'server.db');

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
    // Tabla de Usuarios
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_locked BOOLEAN DEFAULT 0,
      failed_attempts INTEGER DEFAULT 0,
      avatar_url TEXT,
      theme_preference TEXT DEFAULT 'light',
      language TEXT DEFAULT 'es',
      notifications BOOLEAN DEFAULT 1
    )`);

    // Intentar añadir columnas nuevas si no existen (migración simple)
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
        // Ignorar error si la columna ya existe
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

    // Migración para añadir columna categories si no existe
    db.run(`ALTER TABLE calendar_events ADD COLUMN categories TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        // console.error('Error adding categories column:', err.message);
      }
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

    // Tabla de Archivos Compartidos
    db.run(`CREATE TABLE IF NOT EXISTS shared_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      owner_username TEXT NOT NULL,
      shared_with_username TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(path, owner_username, shared_with_username)
    )`);

    // Crear usuario administrador por defecto si no existe
    const adminUser = 'administrador';
    const adminPass = '12341234'; // Contraseña por defecto

    db.get("SELECT * FROM users WHERE username = ?", [adminUser], async (err, row) => {
      if (err) {
        console.error('Error verificando admin:', err);
        return;
      }

      if (!row) {
        try {
          const hash = await bcrypt.hash(adminPass, 10);
          db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
            [adminUser, hash, 'admin'], 
            (err) => {
              if (err) console.error('Error creando admin:', err);
              else console.log('Usuario administrador creado por defecto');
            }
          );
        } catch (error) {
          console.error('Error hasheando password:', error);
        }
      }
    });

    // Crear usuario de prueba 'eric' si no existe
    const testUser = 'eric';
    const testPass = '12345';

    db.get("SELECT * FROM users WHERE username = ?", [testUser], async (err, row) => {
      if (!row) {
        try {
          const hash = await bcrypt.hash(testPass, 10);
          db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
            [testUser, hash, 'user'], 
            (err) => {
              if (err) console.error('Error creando usuario eric:', err);
              else console.log('Usuario eric creado por defecto');
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
