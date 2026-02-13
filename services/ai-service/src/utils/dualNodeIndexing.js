/**
 * Incremental Node Indexing System
 * 
 * Replaces DualNodeIndexing with a robust incremental update strategy.
 * Instead of swapping full indices (which can lose data for partial updates),
 * this system maintains a single primary index and updates it incrementally.
 */

const db = require('./database');
const NodeCache = require('node-cache');
const { sendNotification } = require('./notificationClient');

class DualNodeIndexing {
  constructor() {
    // Single robust cache (simulates "Primary Node")
    this.cache = new NodeCache({ stdTTL: 7200, checkperiod: 600 });
    
    // Compatibility flags
    this.indexState = {
      primaryReady: true,
      secondaryBuilding: false, // Legacy flag, kept for API compatibility
      lastUpdate: new Date(),
      lastChangeDetection: new Date(0) // Start from epoch to load everything initially
    };
    
    this.userProgress = new Map();
    this.isUpdating = false;

    // Start update loop
    this.startUpdateCycle();
  }

  startUpdateCycle() {
    // Initial load - wait a bit for DB connection
    setTimeout(() => this.performUpdate(true), 2000);

    // Regular incremental updates every 30s
    setInterval(() => {
      this.performUpdate(false);
    }, 30000);

    console.log('Incremental Indexing iniciado');
  }

  /**
   * Performs an update cycle.
   * @param {boolean} fullRebuild - If true, re-indexes everyone. If false, only changed users.
   */
  async performUpdate(fullRebuild = false) {
    if (this.isUpdating) {
        console.log('Indexing already in progress, skipping cycle.');
        return;
    }

    this.isUpdating = true;
    this.indexState.secondaryBuilding = true; // Signal UI that "work is happening"

    try {
        const now = new Date();
        let targetUsers = [];

        if (fullRebuild) {
            console.log('Running FULL re-indexing...');
            const result = await db.query('SELECT DISTINCT owner_id FROM files WHERE owner_id IS NOT NULL');
            targetUsers = result.rows.map(r => r.owner_id);
        } else {
            // Incremental: Find users with new files since last check
            // We use a small buffer (1 minute) to ensure no edge-case misses
            const lastCheck = new Date(this.indexState.lastChangeDetection.getTime() - 60000);
            
            const result = await db.query(
                `SELECT DISTINCT owner_id FROM files 
                 WHERE created_at > $1 AND owner_id IS NOT NULL`,
                [lastCheck]
            );
            targetUsers = result.rows.map(r => r.owner_id);
            
            if (targetUsers.length > 0) {
                console.log(`Detected changes for ${targetUsers.length} users.`);
            }
        }

        if (targetUsers.length > 0) {
            for (const userId of targetUsers) {
                await this.refreshUserIndex(userId);
            }
        }

        this.indexState.lastChangeDetection = now;
        this.indexState.lastUpdate = now;

    } catch (error) {
        console.error('Error en ciclo de indexación:', error);
    } finally {
        this.isUpdating = false;
        this.indexState.secondaryBuilding = false;
    }
  }

  /**
   * Refreshes the index for a single user
   */
  async refreshUserIndex(userId) {
    try {
        this.userProgress.set(userId, { state: 'indexing', percent: 0, file: 'Cargando...', total: 0, current: 0 });

        const filesResult = await db.query(
            `SELECT id, name, physical_path, size, mime_type, created_at 
             FROM files 
             WHERE owner_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        const files = filesResult.rows;
        
        // Extract folder path from physical_path for each file
        files.forEach(file => {
          file.folder_path = this.extractFolderPath(file.physical_path, file.name);
        });
        
        // Update user file list
        this.cache.set(`user_${userId}_files`, files);

        // Index each file for search
        files.forEach((file, index) => {
            const searchKey = `user_${userId}_search_${file.id}`;
            
            // Include folder path words in search index for folder-aware search
            const folderWords = file.folder_path 
              ? file.folder_path.toLowerCase().split(/[\s\-_./\\]+/).filter(w => w.length > 1)
              : [];
            
            this.cache.set(searchKey, {
              id: file.id,
              name: file.name,
              nameWords: file.name.toLowerCase().split(/[\s\-_.]+/),
              folderWords: folderWords,
              folder_path: file.folder_path || '',
              size: file.size,
              mime_type: file.mime_type,
              created_at: file.created_at
            });

            // Update progress occasionally
            if (index % 10 === 0 || index === files.length - 1) {
                this.userProgress.set(userId, { 
                    state: 'indexing', 
                    percent: Math.floor(((index + 1) / files.length) * 100), 
                    file: file.name,
                    total: files.length,
                    current: index + 1
                });
            }
        });

        this.userProgress.set(userId, { state: 'idle', percent: 100, file: 'Completado' });

        // Optional: Notify user
        // sendNotification(userId, 'Index Actualizado', ...); 

    } catch (error) {
        console.error(`Error indexando usuario ${userId}:`, error);
        this.userProgress.set(userId, { state: 'error', percent: 0 });
    }
  }

  /**
   * Extracts the user-relative folder path from a physical_path
   * e.g. "/app/uploads/eric/Proyecto/docs/file.pdf" -> "Proyecto/docs"
   * e.g. "/app/uploads/eric/file.pdf" -> "" (root)
   */
  extractFolderPath(physicalPath, fileName) {
    if (!physicalPath) return '';
    
    let normalized = physicalPath.replace(/\\/g, '/');
    
    // Handle shared: prefix
    if (normalized.startsWith('shared:')) return '';
    
    // Try to extract path after /uploads/username/
    const uploadsMatch = normalized.match(/\/uploads\/[^/]+\/(.+)/);
    if (uploadsMatch) {
      const relativePath = uploadsMatch[1];
      // Remove the filename from the end to get just the folder path
      const lastSlash = relativePath.lastIndexOf('/');
      if (lastSlash > 0) {
        return relativePath.substring(0, lastSlash);
      }
      return ''; // File is at root level
    }
    
    // Try Datos path pattern
    const datosMatch = normalized.match(/\/Datos\/[^/]+\/(.+)/);
    if (datosMatch) {
      const relativePath = datosMatch[1];
      const lastSlash = relativePath.lastIndexOf('/');
      if (lastSlash > 0) {
        return relativePath.substring(0, lastSlash);
      }
      return '';
    }
    
    return '';
  }

  /**
   * API COMPATIBILITY METHODS
   */

  searchFiles(userId, query) {
    const userFiles = this.cache.get(`user_${userId}_files`);
    if (!userFiles) return [];

    const queryWords = query.toLowerCase()
      .split(/[\s\-_.]+/)
      .filter(w => w.length > 2);

    if (queryWords.length === 0) return [];

    const results = [];

    for (const file of userFiles) {
      const searchKey = `user_${userId}_search_${file.id}`;
      const indexedFile = this.cache.get(searchKey);

      if (!indexedFile) continue;

      let totalScore = 0;
      for (const queryWord of queryWords) {
        // Score by filename match
        for (const fileWord of indexedFile.nameWords) {
          if (fileWord === queryWord) totalScore += 100;
          else if (fileWord.includes(queryWord) || queryWord.includes(fileWord)) totalScore += 50;
          else if (fileWord.substring(0, 3) === queryWord.substring(0, 3)) totalScore += 25;
        }
        // Score by folder path match (slightly lower weight than filename)
        if (indexedFile.folderWords) {
          for (const folderWord of indexedFile.folderWords) {
            if (folderWord === queryWord) totalScore += 80;
            else if (folderWord.includes(queryWord) || queryWord.includes(folderWord)) totalScore += 40;
            else if (folderWord.substring(0, 3) === queryWord.substring(0, 3)) totalScore += 15;
          }
        }
      }

      if (totalScore > 0) {
        results.push({ ...file, folder_path: indexedFile.folder_path || file.folder_path || '', relevance: totalScore });
      }
    }

    // Ordenar por relevancia, y luego por fecha (lo más nuevo tiene preferencia)
    return results.sort((a, b) => {
        if (b.relevance !== a.relevance) {
            return b.relevance - a.relevance;
        }
        return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  getUserStatus(userId) {
    const isIndexed = this.cache.has(`user_${userId}_files`);
    const progress = this.userProgress.get(userId) || {};
    
    return {
      isIndexed,
      isBuilding: this.isUpdating,
      fileCount: isIndexed ? (this.cache.get(`user_${userId}_files`) || []).length : 0,
      progress: {
          state: progress.state || 'idle',
          percent: progress.percent || 0,
          currentFile: progress.file || '',
          processed: progress.current || 0,
          total: progress.total || 0,
          timeRemaining: 0
      }
    };
  }

  getStats() {
    return {
      primaryIndexReady: true,
      secondaryBuilding: this.isUpdating,
      primarySize: this.cache.keys().length,
      secondarySize: 0,
      pendingChanges: 0,
      lastUpdate: this.indexState.lastUpdate,
      lastChangeDetection: this.indexState.lastChangeDetection
    };
  }

  async forceUpdate() {
    console.log('⚡ Forzando actualización manual...');
    await this.performUpdate(true);
  }
}

module.exports = new DualNodeIndexing();
