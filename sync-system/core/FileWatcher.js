const chokidar = require('chokidar');
const path = require('path');
const EventEmitter = require('events');
const SyncUtils = require('../utils/SyncUtils');

class FileWatcher extends EventEmitter {
  constructor(syncPaths = [], options = {}) {
    super();
    
    this.syncPaths = syncPaths;
    this.watchers = new Map();
    this.isWatching = false;
    this.debounceTimers = new Map();
    
    this.options = {
      debounceDelay: options.debounceDelay || 1000, // 1 segundo
      ignoreInitial: options.ignoreInitial !== false,
      persistent: options.persistent !== false,
      followSymlinks: options.followSymlinks || false,
      ignorePermissionErrors: options.ignorePermissionErrors !== false,
      ...options
    };
    
    this.stats = {
      totalEvents: 0,
      eventsPerPath: new Map(),
      lastActivity: null
    };
  }

  /**
   * Inicia el monitoreo de archivos
   */
  async startWatching() {
    if (this.isWatching) {
      console.log('File watcher is already running');
      return;
    }

    console.log(`Starting file watcher for ${this.syncPaths.length} paths`);
    
    for (const syncPath of this.syncPaths) {
      await this.addWatchPath(syncPath);
    }
    
    this.isWatching = true;
    this.emit('watcherStarted', { paths: this.syncPaths });
  }

  /**
   * Detiene el monitoreo de archivos
   */
  async stopWatching() {
    if (!this.isWatching) {
      return;
    }

    console.log('Stopping file watcher');
    
    for (const [path, watcher] of this.watchers) {
      await watcher.close();
    }
    
    this.watchers.clear();
    this.clearAllDebounceTimers();
    this.isWatching = false;
    
    this.emit('watcherStopped');
  }

  /**
   * Añade una nueva ruta para monitorear
   */
  async addWatchPath(syncPath) {
    if (this.watchers.has(syncPath.path)) {
      console.log(`Path ${syncPath.path} is already being watched`);
      return;
    }

    const watchOptions = {
      ignored: this.createIgnoreFunction(syncPath),
      persistent: this.options.persistent,
      ignoreInitial: this.options.ignoreInitial,
      followSymlinks: this.options.followSymlinks,
      ignorePermissionErrors: this.options.ignorePermissionErrors,
      depth: syncPath.maxDepth || undefined,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    };

    const watcher = chokidar.watch(syncPath.path, watchOptions);
    
    // Configurar event listeners
    this.setupWatcherEvents(watcher, syncPath);
    
    this.watchers.set(syncPath.path, watcher);
    this.stats.eventsPerPath.set(syncPath.path, 0);
    
    console.log(`Added watcher for path: ${syncPath.path}`);
  }

  /**
   * Elimina una ruta del monitoreo
   */
  async removeWatchPath(pathToRemove) {
    const watcher = this.watchers.get(pathToRemove);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(pathToRemove);
      this.stats.eventsPerPath.delete(pathToRemove);
      
      console.log(`Removed watcher for path: ${pathToRemove}`);
      this.emit('pathRemoved', { path: pathToRemove });
    }
  }

  /**
   * Configura los eventos del watcher
   */
  setupWatcherEvents(watcher, syncPath) {
    watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath, syncPath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath, syncPath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath, syncPath))
      .on('addDir', (dirPath) => this.handleFileEvent('addDir', dirPath, syncPath))
      .on('unlinkDir', (dirPath) => this.handleFileEvent('unlinkDir', dirPath, syncPath))
      .on('ready', () => {
        console.log(`Watcher ready for: ${syncPath.path}`);
        this.emit('watcherReady', { path: syncPath.path });
      })
      .on('error', (error) => {
        console.error(`Watcher error for ${syncPath.path}:`, error);
        this.emit('watcherError', { path: syncPath.path, error });
      });
  }

  /**
   * Maneja los eventos de archivos con debounce
   */
  handleFileEvent(eventType, filePath, syncPath) {
    // Verificar si el archivo debe sincronizarse
    if (!SyncUtils.shouldSyncFile(filePath, syncPath.includePatterns, syncPath.excludePatterns)) {
      return;
    }

    // Verificar tamaño máximo
    if (syncPath.maxFileSize) {
      this.checkFileSize(filePath, syncPath.maxFileSize).then(isValid => {
        if (!isValid) return;
        this.processFileEvent(eventType, filePath, syncPath);
      }).catch(error => {
        console.error(`Error checking file size for ${filePath}:`, error);
      });
    } else {
      this.processFileEvent(eventType, filePath, syncPath);
    }
  }

  /**
   * Procesa el evento de archivo con debounce
   */
  processFileEvent(eventType, filePath, syncPath) {
    const debounceKey = filePath;
    
    // Limpiar timer anterior si existe
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    // Crear nuevo timer de debounce
    const timer = setTimeout(() => {
      this.executeFileEvent(eventType, filePath, syncPath);
      this.debounceTimers.delete(debounceKey);
    }, this.options.debounceDelay);

    this.debounceTimers.set(debounceKey, timer);
  }

  /**
   * Ejecuta el evento de archivo
   */
  async executeFileEvent(eventType, filePath, syncPath) {
    try {
      this.updateStats(syncPath.path);
      
      const eventData = {
        type: eventType,
        path: filePath,
        syncPath: syncPath.path,
        timestamp: new Date(),
        relativePath: path.relative(syncPath.path, filePath)
      };

      // Obtener información adicional del archivo si existe
      if (eventType !== 'unlink' && eventType !== 'unlinkDir') {
        try {
          eventData.fileInfo = await SyncUtils.getFileInfo(filePath);
        } catch (error) {
          console.error(`Error getting file info for ${filePath}:`, error);
        }
      }

      console.log(`File event: ${eventType} - ${filePath}`);
      this.emit('fileChange', eventData);
      
    } catch (error) {
      console.error(`Error processing file event for ${filePath}:`, error);
      this.emit('fileError', { path: filePath, error });
    }
  }

  /**
   * Verifica el tamaño del archivo
   */
  async checkFileSize(filePath, maxSize) {
    try {
      const stats = await require('fs').promises.stat(filePath);
      return stats.size <= maxSize;
    } catch (error) {
      return false;
    }
  }

  /**
   * Crea función de ignorar archivos
   */
  createIgnoreFunction(syncPath) {
    return (filePath, stats) => {
      // Ignorar directorios del sistema y temporales
      const systemDirs = [
        'node_modules', '.git', '.svn', '.hg',
        '$RECYCLE.BIN', 'System Volume Information',
        '.Trash', '.trash', 'Trash'
      ];
      
      const fileName = path.basename(filePath);
      
      // Verificar directorios del sistema
      if (stats && stats.isDirectory() && systemDirs.includes(fileName)) {
        return true;
      }

      // Verificar patrones de exclusión
      if (syncPath.excludePatterns && syncPath.excludePatterns.length > 0) {
        const shouldExclude = syncPath.excludePatterns.some(pattern =>
          SyncUtils.matchPattern(fileName, pattern) ||
          SyncUtils.matchPattern(filePath, pattern)
        );
        if (shouldExclude) return true;
      }

      // Verificar patrones de inclusión
      if (syncPath.includePatterns && syncPath.includePatterns.length > 0) {
        const shouldInclude = syncPath.includePatterns.some(pattern =>
          SyncUtils.matchPattern(fileName, pattern) ||
          SyncUtils.matchPattern(filePath, pattern)
        );
        return !shouldInclude;
      }

      return false;
    };
  }

  /**
   * Actualiza estadísticas
   */
  updateStats(path) {
    this.stats.totalEvents++;
    this.stats.lastActivity = new Date();
    
    const currentCount = this.stats.eventsPerPath.get(path) || 0;
    this.stats.eventsPerPath.set(path, currentCount + 1);
  }

  /**
   * Limpia todos los timers de debounce
   */
  clearAllDebounceTimers() {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Obtiene estadísticas del watcher
   */
  getStats() {
    return {
      ...this.stats,
      isWatching: this.isWatching,
      watchedPaths: Array.from(this.watchers.keys()),
      pendingEvents: this.debounceTimers.size
    };
  }

  /**
   * Pausa temporalmente el monitoreo
   */
  pause() {
    if (this.isWatching) {
      this.clearAllDebounceTimers();
      this.emit('watcherPaused');
    }
  }

  /**
   * Reanuda el monitoreo
   */
  resume() {
    if (this.isWatching) {
      this.emit('watcherResumed');
    }
  }
}

module.exports = FileWatcher;