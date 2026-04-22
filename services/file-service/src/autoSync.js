/**

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

class AutoSyncService {
  constructor(db, uploadDir) {
    this.db = db;
    this.uploadDir = uploadDir;
    this.syncInterval = 30 * 1000;
    this.isFirstSync = true;
  }

  /**
  start() {
    console.log('🔄 AutoSync: Servicio iniciado');
    
    this.syncAllUsers().catch(err => {
      console.error('❌ AutoSync: Error en sincronización inicial:', err);
    });

    setInterval(() => {
      this.syncAllUsers().catch(err => {
        console.error('❌ AutoSync: Error en sincronización periódica:', err);
      });
    }, this.syncInterval);
  }

  /**
  async syncAllUsers() {
    try {
      const startTime = Date.now();
      
      if (!fsSync.existsSync(this.uploadDir)) {
        console.warn('[Warning]  AutoSync: Directorio de uploads no existe:', this.uploadDir);
        return;
      }

      let users = [];
      try {
        if (this.db.query) {
             const res = await this.db.query('SELECT id, username FROM users');
             users = res.rows;
        } else {
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
  async syncUserFiles(userId, username) {
    const userDir = path.join(this.uploadDir, username);
    let syncedCount = 0;
    let updatedCount = 0;

    try {
      if (!fsSync.existsSync(userDir)) {
        return { synced: 0, updated: 0 };
      }

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
      }

      const files = await this.scanDirectory(userDir, userDir);

      for (const fileInfo of files) {
        try {
          const { added, updated } = await this.syncFile(userId, fileInfo);
          if (added) syncedCount++;
          if (updated) updatedCount++;
        } catch (error) {
        }
      }

    } catch (error) {
      console.error(`❌ AutoSync: Error sincronizando usuario ${username}:`, error.message);
    }

    return { synced: syncedCount, updated: updatedCount };
  }

  /**
  async scanDirectory(dirPath, basePath, depth = 0) {
    const MAX_DEPTH = 15;
    const files = [];

    const SKIP_DIRS = new Set(['.git', '__MACOSX', 'node_modules', '$RECYCLE.BIN', 'System Volume Information']);

    if (depth > MAX_DEPTH) {
      console.warn(`[Warning]  AutoSync: Max depth (${MAX_DEPTH}) reached at ${dirPath}, skipping deeper.`);
      return files;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
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
          if (SKIP_DIRS.has(entry.name)) continue;
          const subFiles = await this.scanDirectory(fullPath, basePath, depth + 1);
          files.push(...subFiles);
        }
      }
    } catch (error) {
    }

    return files;
  }

  /**
  async syncFile(userId, fileInfo) {
    try {
      let existing = null;
      const querySelect = 'SELECT id, physical_path, size FROM files WHERE owner_id = $1 AND name = $2';
      
      if (this.db.query) {
          const res = await this.db.query(querySelect, [userId, fileInfo.name]);
          existing = res.rows[0];
      } else {
          existing = await this.db.get('SELECT id, physical_path, size FROM files WHERE owner_id = ? AND name = ?', [userId, fileInfo.name]);
      }

      if (existing) {
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
  async forceSyncNow() {
    console.log('🔄 AutoSync: Sincronización forzada...');
    await this.syncAllUsers();
  }
}

module.exports = AutoSyncService;
