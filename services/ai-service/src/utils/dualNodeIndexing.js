/**
 * Dual Node Indexing System
 * 
 * Mantiene dos índices de archivos:
 * - Nodo 1 (Principal): Disponible para búsquedas rápidas
 * - Nodo 2 (Secundario): Se actualiza en paralelo cuando hay cambios
 * 
 * Cuando Nodo 2 termina → se convierte en Principal
 * Nodo 1 anterior → comienza a indexar en segundo plano
 */

const db = require('./database');
const NodeCache = require('node-cache');
const { sendNotification } = require('./notificationClient');

class DualNodeIndexing {
  constructor() {
    // Nodo 1: Principal (búsquedas rápidas)
    this.primaryIndex = new NodeCache({ stdTTL: 3600 });
    
    // Nodo 2: Secundario (actualización en paralelo)
    this.secondaryIndex = new NodeCache({ stdTTL: 3600 });
    
    // Estado de indexación
    this.indexState = {
      primaryReady: true, // ✅ Nodo 1 siempre listo, aunque esté vacío
      secondaryBuilding: false,
      lastUpdate: new Date(),
      lastChangeDetection: null
    };
    
    // Cambios pendientes por usuario
    this.pendingChanges = new Map();
    
    // Iniciar ciclo de actualización
    this.startUpdateCycle();
  }

  /**
   * Inicia el ciclo de actualización de índices
   * Detecta cambios cada 30 segundos y actualiza el nodo secundario
   */
  startUpdateCycle() {
    // Ejecutar inmediatamente al inicio
    setTimeout(() => this.detectAndUpdateChanges(), 1000);

    setInterval(() => {
      this.detectAndUpdateChanges();
    }, 30000); // Cada 30 segundos

    console.log('✅ Dual Node Indexing iniciado');
  }

  /**
   * Detecta cambios en archivos y actualiza el nodo secundario
   */
  async detectAndUpdateChanges() {
    try {
      const now = new Date();
      
      // Obtener últimas actualizaciones de archivos
      const changedFiles = await db.query(
        `SELECT DISTINCT owner_id FROM files 
         WHERE created_at > NOW() - INTERVAL '30 seconds'
         OR (SELECT COUNT(*) FROM files f WHERE f.owner_id = files.owner_id) > 0`
      );

      if (changedFiles.rows.length > 0) {
        console.log(`📝 Detectados cambios en ${changedFiles.rows.length} usuario(s)`);
        
        // Marcar cambios pendientes
        for (const row of changedFiles.rows) {
          this.pendingChanges.set(row.owner_id, now);
        }

        // Iniciar actualización del nodo secundario
        if (!this.indexState.secondaryBuilding) {
          this.updateSecondaryNode();
        }
      }

      this.indexState.lastChangeDetection = now;
    } catch (error) {
      console.error('❌ Error detectando cambios:', error.message);
    }
  }

  /**
   * Actualiza el nodo secundario con cambios detectados
   */
  async updateSecondaryNode() {
    this.indexState.secondaryBuilding = true;
    const startTime = Date.now();

    try {
      // Limpiar índice secundario
      this.secondaryIndex.flushAll();

      // Obtener usuarios con cambios pendientes
      const userIds = Array.from(this.pendingChanges.keys());

      if (userIds.length === 0) {
        this.indexState.secondaryBuilding = false;
        return;
      }

      console.log(`🔄 Nodo 2: Indexando cambios para ${userIds.length} usuario(s)...`);

      // Indexar archivos de usuarios con cambios
      for (const userId of userIds) {
        const filesResult = await db.query(
          `SELECT id, name, physical_path, size, mime_type, created_at 
           FROM files 
           WHERE owner_id = $1
           ORDER BY created_at DESC`,
          [userId]
        );

        if (filesResult.rows.length > 0) {
          this.secondaryIndex.set(`user_${userId}_files`, filesResult.rows);
          
          // Crear índices de búsqueda de texto
          for (const file of filesResult.rows) {
            const searchKey = `user_${userId}_search_${file.id}`;
            this.secondaryIndex.set(searchKey, {
              id: file.id,
              name: file.name,
              nameWords: file.name.toLowerCase().split(/[\s\-_.]+/),
              size: file.size,
              mime_type: file.mime_type,
              created_at: file.created_at
            });
          }
        }

        this.pendingChanges.delete(userId);
      }

      // Nodo 2 está listo → Promocionar a Nodo 1
      this.promoteSecondaryToPrimary();

      const duration = Date.now() - startTime;
      console.log(`✅ Nodo 2: Actualización completada en ${duration}ms`);

      // Notificar a usuarios de actualización completada
      for (const userId of userIds) {
        sendNotification(
            userId, 
            'IA Index Actualizado', 
            'Sus archivos han sido re-indexados y están listos para búsqueda inteligente.',
            'success'
        ).catch(err => console.error(`Error notificando usuario ${userId}`, err));
      }

    } catch (error) {
      console.error('❌ Error en nodo secundario:', error.message);
      this.indexState.secondaryBuilding = false;
    }
  }

  /**
   * Promociona el nodo secundario a primario
   * El nodo primario anterior comienza a indexar en segundo plano
   */
  promoteSecondaryToPrimary() {
    console.log('🔄 Promocionando Nodo 2 → Nodo 1');
    
    // Intercambiar referencias
    const temp = this.primaryIndex;
    this.primaryIndex = this.secondaryIndex;
    this.secondaryIndex = temp;
    this.secondaryIndex.flushAll();

    this.indexState.primaryReady = true;
    this.indexState.secondaryBuilding = false;
    this.indexState.lastUpdate = new Date();

    console.log('✅ Nodo 1: Ahora es el nodo principal');
  }

  /**
   * Busca archivos en el índice primario (búsqueda rápida)
   * Soporta búsqueda fuzzy/flexible
   */
  searchFiles(userId, query) {
    if (!this.indexState.primaryReady) {
      return null; // Índice no está listo
    }

    const userFiles = this.primaryIndex.get(`user_${userId}_files`);
    if (!userFiles) {
      return [];
    }

    // Palabras clave de búsqueda (ignorar palabras muy cortas)
    const queryWords = query.toLowerCase()
      .split(/[\s\-_.]+/)
      .filter(w => w.length > 2);

    if (queryWords.length === 0) {
      return [];
    }

    const results = [];

    for (const file of userFiles) {
      const searchKey = `user_${userId}_search_${file.id}`;
      const indexedFile = this.primaryIndex.get(searchKey);

      if (!indexedFile) continue;

      // Contar coincidencias usando búsqueda flexible (fuzzy)
      let totalScore = 0;
      
      for (const queryWord of queryWords) {
        for (const fileWord of indexedFile.nameWords) {
          // Coincidencia exacta
          if (fileWord === queryWord) {
            totalScore += 100;
          }
          // Coincidencia parcial (substring)
          else if (fileWord.includes(queryWord) || queryWord.includes(fileWord)) {
            totalScore += 50;
          }
          // Coincidencia fuzzy (primeras 3 letras coinciden)
          else if (fileWord.substring(0, 3) === queryWord.substring(0, 3)) {
            totalScore += 25;
          }
        }
      }

      if (totalScore > 0) {
        results.push({
          ...file,
          relevance: totalScore
        });
      }
    }

    // Ordenar por relevancia (mayor score primero)
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Obtiene estadísticas del sistema de indexación
   */
  getStats() {
    return {
      primaryIndexReady: this.indexState.primaryReady,
      secondaryBuilding: this.indexState.secondaryBuilding,
      primarySize: this.primaryIndex.getKeys().length,
      secondarySize: this.secondaryIndex.getKeys().length,
      pendingChanges: this.pendingChanges.size,
      lastUpdate: this.indexState.lastUpdate,
      lastChangeDetection: this.indexState.lastChangeDetection
    };
  }

  /**
   * Fuerza una actualización inmediata
   */
  async forceUpdate() {
    console.log('⚡ Forzando actualización inmediata...');
    
    // Marcar todos los usuarios con cambios
    const allUsers = await db.query(
      'SELECT DISTINCT owner_id FROM files'
    );

    for (const row of allUsers.rows) {
      this.pendingChanges.set(row.owner_id, new Date());
    }

    await this.updateSecondaryNode();
  }
}

module.exports = new DualNodeIndexing();
