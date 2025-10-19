const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class SyncUtils {
  /**
   * Genera hash SHA-256 del contenido de un archivo
   */
  static async generateFileHash(filePath) {
    try {
      const data = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      throw new Error(`Error generating hash for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Genera hash SHA-256 de un buffer o string
   */
  static generateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Comprime datos usando gzip
   */
  static async compressData(data) {
    try {
      if (typeof data === 'string') {
        data = Buffer.from(data, 'utf8');
      }
      const compressed = await gzip(data);
      return compressed;
    } catch (error) {
      throw new Error(`Compression error: ${error.message}`);
    }
  }

  /**
   * Descomprime datos gzip
   */
  static async decompressData(compressedData) {
    try {
      const decompressed = await gunzip(compressedData);
      return decompressed;
    } catch (error) {
      throw new Error(`Decompression error: ${error.message}`);
    }
  }

  /**
   * Cifra contenido usando AES-256-GCM
   */
  static encryptContent(content, key) {
    try {
      const algorithm = 'aes-256-gcm';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(content, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm
      };
    } catch (error) {
      throw new Error(`Encryption error: ${error.message}`);
    }
  }

  /**
   * Descifra contenido
   */
  static decryptContent(encryptedData, key) {
    try {
      const { encrypted, iv, authTag, algorithm } = encryptedData;
      const decipher = crypto.createDecipher(algorithm, key);
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption error: ${error.message}`);
    }
  }

  /**
   * Genera un ID único para operaciones
   */
  static generateOperationId() {
    return crypto.randomUUID();
  }

  /**
   * Valida si un archivo debe sincronizarse según patrones
   */
  static shouldSyncFile(filePath, includePatterns = [], excludePatterns = []) {
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath);
    
    // Verificar patrones de exclusión
    for (const pattern of excludePatterns) {
      if (this.matchPattern(fileName, pattern) || this.matchPattern(filePath, pattern)) {
        return false;
      }
    }
    
    // Si hay patrones de inclusión, verificar que coincida con al menos uno
    if (includePatterns.length > 0) {
      return includePatterns.some(pattern => 
        this.matchPattern(fileName, pattern) || this.matchPattern(filePath, pattern)
      );
    }
    
    // Excluir archivos temporales y de sistema por defecto
    const defaultExcludes = [
      '*.tmp', '*.temp', '*.log', '*.lock', '*.swp', '*.bak',
      '.DS_Store', 'Thumbs.db', '*.lnk', '~$*'
    ];
    
    return !defaultExcludes.some(pattern => this.matchPattern(fileName, pattern));
  }

  /**
   * Coincidencia de patrones simple (soporta * como wildcard)
   */
  static matchPattern(text, pattern) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(text);
  }

  /**
   * Obtiene información del archivo
   */
  static async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const hash = await this.generateFileHash(filePath);
      
      return {
        size: stats.size,
        lastModified: stats.mtime,
        created: stats.birthtime,
        isDirectory: stats.isDirectory(),
        hash,
        extension: path.extname(filePath),
        name: path.basename(filePath)
      };
    } catch (error) {
      throw new Error(`Error getting file info for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Crea un diff simple entre dos contenidos de archivo
   */
  static createTextDiff(oldContent, newContent) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    const changes = [];
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';
      
      if (oldLine !== newLine) {
        changes.push({
          line: i + 1,
          type: oldLine === '' ? 'added' : newLine === '' ? 'removed' : 'modified',
          oldContent: oldLine,
          newContent: newLine
        });
      }
    }
    
    return {
      totalChanges: changes.length,
      changes,
      summary: {
        linesAdded: changes.filter(c => c.type === 'added').length,
        linesRemoved: changes.filter(c => c.type === 'removed').length,
        linesModified: changes.filter(c => c.type === 'modified').length
      }
    };
  }

  /**
   * Calcula la prioridad de sincronización basada en varios factores
   */
  static calculateSyncPriority(fileInfo, userConfig, aiMetrics = {}) {
    let priority = 1;
    
    // Factor de tamaño (archivos más pequeños tienen mayor prioridad)
    if (fileInfo.size < 1024 * 1024) { // < 1MB
      priority += 2;
    } else if (fileInfo.size < 10 * 1024 * 1024) { // < 10MB
      priority += 1;
    }
    
    // Factor de frecuencia de acceso (IA)
    if (aiMetrics.accessFrequency) {
      priority += Math.min(aiMetrics.accessFrequency / 10, 3);
    }
    
    // Factor de modificación reciente
    const timeSinceModification = Date.now() - fileInfo.lastModified.getTime();
    if (timeSinceModification < 5 * 60 * 1000) { // < 5 minutos
      priority += 3;
    } else if (timeSinceModification < 30 * 60 * 1000) { // < 30 minutos
      priority += 2;
    }
    
    // Factor de tipo de archivo
    const importantExtensions = ['.doc', '.docx', '.pdf', '.xls', '.xlsx', '.ppt', '.pptx'];
    if (importantExtensions.includes(fileInfo.extension.toLowerCase())) {
      priority += 1;
    }
    
    return Math.min(Math.max(priority, 1), 10);
  }

  /**
   * Formatea el tamaño de archivo para mostrar
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Valida la integridad de un archivo
   */
  static async validateFileIntegrity(filePath, expectedHash) {
    try {
      const actualHash = await this.generateFileHash(filePath);
      return actualHash === expectedHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Crea un backup temporal de un archivo
   */
  static async createBackup(filePath) {
    try {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Error creating backup: ${error.message}`);
    }
  }

  /**
   * Limpia archivos de backup antiguos
   */
  static async cleanupOldBackups(directory, maxAge = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(directory);
      const backupFiles = files.filter(file => file.includes('.backup.'));
      
      for (const file of backupFiles) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
  }
}

module.exports = SyncUtils;