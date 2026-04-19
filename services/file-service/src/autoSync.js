/**
 * Auto-sync service - Sincroniza archivos físicos con la BD
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class AutoSyncService {
  constructor(db, uploadDir) {
    this.db = db;
    this.uploadDir = uploadDir;
    this.syncInterval = 30 * 1000; // 30 segundos
    this.isFirstSync = true;
  }

  /**
   * Inicia el servicio de sincronización automática
   */
  start() {
    console.log('🔄 AutoSync: Servicio iniciado');
    
    // Sincronización inicial
    this.syncAllUsers().catch(err => {
      console.error('❌ AutoSync: Error en sincronización inicial:', err);
    });

    // Sincronización periódica
    setInterval(() => {
      this.syncAllUsers().catch(err => {
        console.error('❌ AutoSync: Error en sincronización periódica:', err);
      });
    }, this.syncInterval);
  }

  /**
   * Sincroniza archivos de todos los usuarios
   */
  async syncAllUsers() {
    try {
      const startTime = Date.now();
      
      if (!fsSync.existsSync(this.uploadDir)) {
        console.warn('⚠️  AutoSync: Directorio de uploads no existe:', this.uploadDir);
        return;
      }

      // Obtener todos los usuarios (Compatible Postgres: db.query en lugar de db.all)
      let users = [];
      try {
        if (this.db.query) {
             const res = await this.db.query('SELECT id, username FROM users');
             users = res.rows;
        } else {
             // Fallback sqlite
             users = await this.db.all('SELECT id, username FROM users');
        }
      } catch (err) {
         console.error('Error fetching users:', err);
         return;
      }
      
      let totalSynced = 0;
      let totalUpdated = 0;

      for (const user of users) {
        const { synced, updated } = await this.syncUserFiles(user.id, user.username);
        totalSynced += synced;
        totalUpdated += updated;
      }

      const duration = Date.now() - startTime;
      
      if (this.isFirstSync) {
        console.log(`✅ AutoSync: Sincronización inicial completada (${duration}ms)`);
        console.log(`   - ${totalSynced} archivos añadidos`);
        console.log(`   - ${totalUpdated} archivos actualizados`);
        this.isFirstSync = false;
      } else if (totalSynced > 0 || totalUpdated > 0) {
        console.log(`🔄 AutoSync: ${totalSynced} nuevos, ${totalUpdated} actualizados (${duration}ms)`);
      }

    } catch (error) {
      console.error('❌ AutoSync: Error en sincronización:', error.message);
    }
  }

  /**
   * Sincroniza archivos de un usuario específico
   */
  async syncUserFiles(userId, username) {
    const userDir = path.join(this.uploadDir, username);
    let syncedCount = 0;
    let updatedCount = 0;

    try {
      // Verificar si el directorio del usuario existe
      if (!fsSync.existsSync(userDir)) {
        return { synced: 0, updated: 0 };
      }

      // Remove stale DB entries: hidden and ignored system-ish files that were
      // indexed before the filter was added.
      try {
        if (this.db.query) {
          await this.db.query(
            `DELETE FROM files
             WHERE owner_id = $1
               AND (name LIKE '.%' OR LOWER(name) LIKE '%.ini' OR LOWER(name) LIKE '%.lnk')`,
            [userId]
          );
        } else {
          await this.db.run(
            `DELETE FROM files
             WHERE owner_id = ?
               AND (name LIKE '.%' OR LOWER(name) LIKE '%.ini' OR LOWER(name) LIKE '%.lnk')`,
            [userId]
          );
        }
      } catch (e) {
        // Non-fatal
      }

      // Escanear archivos del usuario
      const files = await this.scanDirectory(userDir, userDir);

      for (const fileInfo of files) {
        try {
          const { added, updated } = await this.syncFile(userId, fileInfo);
          if (added) syncedCount++;
          if (updated) updatedCount++;
        } catch (error) {
          // Continuar con el siguiente archivo
        }
      }

    } catch (error) {
      console.error(`❌ AutoSync: Error sincronizando usuario ${username}:`, error.message);
    }

    return { synced: syncedCount, updated: updatedCount };
  }

  /**
   * Escanea un directorio recursivamente
   */
  async scanDirectory(dirPath, basePath, depth = 0) {
    const MAX_DEPTH = 15;
    const files = [];

    // Skip hidden directories (start with '.') and known system/metadata folders
    const SKIP_DIRS = new Set(['.git', '__MACOSX', 'node_modules', '$RECYCLE.BIN', 'System Volume Information']);

    if (depth > MAX_DEPTH) {
      console.warn(`⚠️  AutoSync: Max depth (${MAX_DEPTH}) reached at ${dirPath}, skipping deeper.`);
      return files;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files/dirs and ignored system-ish file types
        if (entry.name.startsWith('.')) continue;
        if (!entry.isDirectory()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ext === '.ini' || ext === '.lnk') continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            physicalPath: fullPath,
            size: stats.size,
            mimeType: this.getMimeType(entry.name),
            relativePath: path.relative(basePath, fullPath)
          });
        } else if (entry.isDirectory()) {
          // Skip known system directories
          if (SKIP_DIRS.has(entry.name)) continue;
          // Recursivo
          const subFiles = await this.scanDirectory(fullPath, basePath, depth + 1);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // Ignorar errores de lectura
    }

    return files;
  }

  /**
   * Sincroniza un archivo individual con la BD
   */
  async syncFile(userId, fileInfo) {
    try {
      // Verificar si el archivo ya existe
      let existing = null;
      const querySelect = 'SELECT id, physical_path, size FROM files WHERE owner_id = $1 AND name = $2';
      
      if (this.db.query) { // Postgres
          const res = await this.db.query(querySelect, [userId, fileInfo.name]);
          existing = res.rows[0];
      } else { // SQLite
          existing = await this.db.get('SELECT id, physical_path, size FROM files WHERE owner_id = ? AND name = ?', [userId, fileInfo.name]);
      }

      if (existing) {
        // Actualizar si cambió el tamaño o la ruta
        if (existing.physical_path !== fileInfo.physicalPath || existing.size !== fileInfo.size) {
          if (this.db.query) {
             await this.db.query('UPDATE files SET physical_path = $1, size = $2, mime_type = $3 WHERE id = $4',
                [fileInfo.physicalPath, fileInfo.size, fileInfo.mimeType, existing.id]
             );
          } else {
             await this.db.run('UPDATE files SET physical_path = ?, size = ?, mime_type = ? WHERE id = ?',
                [fileInfo.physicalPath, fileInfo.size, fileInfo.mimeType, existing.id]
             );
          }
          return { added: false, updated: true };
        }
        return { added: false, updated: false };
      }

      // Insertar nuevo archivo
      if (this.db.query) {
          await this.db.query(
            `INSERT INTO files (name, physical_path, size, mime_type, owner_id, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [fileInfo.name, fileInfo.physicalPath, fileInfo.size, fileInfo.mimeType, userId]
          );
      } else {
          await this.db.run(
            `INSERT INTO files (name, physical_path, size, mime_type, owner_id, created_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            [fileInfo.name, fileInfo.physicalPath, fileInfo.size, fileInfo.mimeType, userId]
          );
      }

      return { added: true, updated: false };

    } catch (error) {
      console.error('❌ AutoSync: Error sincronizando archivo:', error.message);
      return { added: false, updated: false };
    }
  }

  /**
   * Obtiene el tipo MIME de un archivo
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.bat': 'application/x-bat',
      '.py': 'text/x-python',
      '.js': 'text/javascript',
      '.ini': 'text/plain'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Fuerza una sincronización inmediata
   */
  async forceSyncNow() {
    console.log('🔄 AutoSync: Sincronización forzada...');
    await this.syncAllUsers();
  }
}

module.exports = AutoSyncService;
