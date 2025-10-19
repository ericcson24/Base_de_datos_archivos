import React, { useState } from 'react';
import './SyncSettings.css';

const SyncSettings = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState(settings || {});
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (path, value) => {
    const newSettings = { ...localSettings };
    const keys = path.split('.');
    let current = newSettings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(localSettings);
    }
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings || {});
    setHasChanges(false);
  };

  const addSyncPath = () => {
    const newPath = {
      path: '',
      isEnabled: true,
      priority: 1,
      excludePatterns: [],
      includePatterns: [],
      maxFileSize: 100 * 1024 * 1024, // 100MB
      autoSync: true
    };
    
    const newSettings = { ...localSettings };
    if (!newSettings.syncPaths) newSettings.syncPaths = [];
    newSettings.syncPaths.push(newPath);
    
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const removeSyncPath = (index) => {
    const newSettings = { ...localSettings };
    newSettings.syncPaths = newSettings.syncPaths.filter((_, i) => i !== index);
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const updateSyncPath = (index, field, value) => {
    const newSettings = { ...localSettings };
    if (!newSettings.syncPaths) newSettings.syncPaths = [];
    if (!newSettings.syncPaths[index]) return;
    
    newSettings.syncPaths[index][field] = value;
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const parseFileSize = (sizeStr) => {
    const regex = /^(\d+(?:\.\d+)?)\s*(bytes?|kb|mb|gb)$/i;
    const match = sizeStr.match(regex);
    
    if (!match) return 100 * 1024 * 1024; // Default 100MB
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'kb': return value * 1024;
      case 'mb': return value * 1024 * 1024;
      case 'gb': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  };

  return (
    <div className="sync-settings">
      <div className="settings-header">
        <h3>Configuración de Sincronización</h3>
        {hasChanges && (
          <div className="settings-actions">
            <button className="btn-reset" onClick={handleReset}>
              Cancelar
            </button>
            <button className="btn-save" onClick={handleSave}>
              Guardar Cambios
            </button>
          </div>
        )}
      </div>

      <div className="settings-content">
        {/* Configuración general */}
        <div className="settings-section">
          <h4>🔧 Configuración General</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.isActive || false}
                onChange={(e) => handleSettingChange('isActive', e.target.checked)}
              />
              Activar sincronización automática
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">Intervalo de sincronización (segundos)</label>
            <input
              type="number"
              min="10"
              max="3600"
              value={Math.round((localSettings.preferences?.syncInterval || 30000) / 1000)}
              onChange={(e) => handleSettingChange('preferences.syncInterval', parseInt(e.target.value) * 1000)}
              className="setting-input"
            />
          </div>

          <div className="setting-item">
            <label className="setting-label">Máximo de subidas concurrentes</label>
            <input
              type="number"
              min="1"
              max="10"
              value={localSettings.preferences?.maxConcurrentUploads || 3}
              onChange={(e) => handleSettingChange('preferences.maxConcurrentUploads', parseInt(e.target.value))}
              className="setting-input"
            />
          </div>
        </div>

        {/* Resolución de conflictos */}
        <div className="settings-section">
          <h4>⚠️ Resolución de Conflictos</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.preferences?.autoResolveConflicts || false}
                onChange={(e) => handleSettingChange('preferences.autoResolveConflicts', e.target.checked)}
              />
              Resolver conflictos automáticamente
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">Estrategia de resolución por defecto</label>
            <select
              value={localSettings.preferences?.conflictResolution || 'ask'}
              onChange={(e) => handleSettingChange('preferences.conflictResolution', e.target.value)}
              className="setting-select"
            >
              <option value="ask">Preguntar siempre</option>
              <option value="local_wins">Priorizar versión local</option>
              <option value="remote_wins">Priorizar versión remota</option>
              <option value="newest_wins">Priorizar más reciente</option>
              <option value="ai_suggest">Sugerencia de IA</option>
            </select>
          </div>
        </div>

        {/* Configuración de red */}
        <div className="settings-section">
          <h4>🌐 Configuración de Red</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.preferences?.syncOnlyOnWifi || false}
                onChange={(e) => handleSettingChange('preferences.syncOnlyOnWifi', e.target.checked)}
              />
              Sincronizar solo en WiFi
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.preferences?.pauseDuringCalls || true}
                onChange={(e) => handleSettingChange('preferences.pauseDuringCalls', e.target.checked)}
              />
              Pausar durante llamadas
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">Límite de ancho de banda (KB/s, 0 = sin límite)</label>
            <input
              type="number"
              min="0"
              max="10000"
              value={Math.round((localSettings.preferences?.bandwidthLimit || 0) / 1024)}
              onChange={(e) => handleSettingChange('preferences.bandwidthLimit', parseInt(e.target.value) * 1024)}
              className="setting-input"
            />
          </div>
        </div>

        {/* Seguridad */}
        <div className="settings-section">
          <h4>🔒 Seguridad</h4>
          
          <div className="setting-item">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={localSettings.preferences?.encryptionEnabled || true}
                onChange={(e) => handleSettingChange('preferences.encryptionEnabled', e.target.checked)}
              />
              Activar cifrado de archivos
            </label>
          </div>

          <div className="setting-item">
            <label className="setting-label">Nivel de compresión (0-9)</label>
            <input
              type="range"
              min="0"
              max="9"
              value={localSettings.preferences?.compressionLevel || 6}
              onChange={(e) => handleSettingChange('preferences.compressionLevel', parseInt(e.target.value))}
              className="setting-range"
            />
            <span className="range-value">{localSettings.preferences?.compressionLevel || 6}</span>
          </div>
        </div>

        {/* Rutas de sincronización */}
        <div className="settings-section">
          <h4>📁 Rutas de Sincronización</h4>
          
          <div className="sync-paths-list">
            {(localSettings.syncPaths || []).map((syncPath, index) => (
              <div key={index} className="sync-path-item">
                <div className="sync-path-header">
                  <input
                    type="text"
                    placeholder="Ruta del directorio"
                    value={syncPath.path || ''}
                    onChange={(e) => updateSyncPath(index, 'path', e.target.value)}
                    className="path-input"
                  />
                  <button
                    className="btn-remove-path"
                    onClick={() => removeSyncPath(index)}
                    title="Eliminar ruta"
                  >
                    🗑️
                  </button>
                </div>
                
                <div className="sync-path-options">
                  <label className="option-item">
                    <input
                      type="checkbox"
                      checked={syncPath.isEnabled !== false}
                      onChange={(e) => updateSyncPath(index, 'isEnabled', e.target.checked)}
                    />
                    Habilitado
                  </label>
                  
                  <label className="option-item">
                    <input
                      type="checkbox"
                      checked={syncPath.autoSync !== false}
                      onChange={(e) => updateSyncPath(index, 'autoSync', e.target.checked)}
                    />
                    Sincronización automática
                  </label>
                  
                  <div className="option-item">
                    <label>Prioridad:</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={syncPath.priority || 1}
                      onChange={(e) => updateSyncPath(index, 'priority', parseInt(e.target.value))}
                      className="priority-input"
                    />
                  </div>
                  
                  <div className="option-item">
                    <label>Tamaño máximo:</label>
                    <input
                      type="text"
                      placeholder="100MB"
                      value={formatFileSize(syncPath.maxFileSize || 100 * 1024 * 1024)}
                      onChange={(e) => updateSyncPath(index, 'maxFileSize', parseFileSize(e.target.value))}
                      className="size-input"
                    />
                  </div>
                </div>
                
                <div className="sync-path-patterns">
                  <div className="pattern-group">
                    <label>Patrones de exclusión (separados por comas):</label>
                    <input
                      type="text"
                      placeholder="*.tmp, *.log, node_modules"
                      value={(syncPath.excludePatterns || []).join(', ')}
                      onChange={(e) => updateSyncPath(index, 'excludePatterns', 
                        e.target.value.split(',').map(p => p.trim()).filter(p => p))}
                      className="pattern-input"
                    />
                  </div>
                  
                  <div className="pattern-group">
                    <label>Patrones de inclusión (separados por comas):</label>
                    <input
                      type="text"
                      placeholder="*.doc, *.pdf, *.xlsx"
                      value={(syncPath.includePatterns || []).join(', ')}
                      onChange={(e) => updateSyncPath(index, 'includePatterns', 
                        e.target.value.split(',').map(p => p.trim()).filter(p => p))}
                      className="pattern-input"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button className="btn-add-path" onClick={addSyncPath}>
              ➕ Agregar Ruta de Sincronización
            </button>
          </div>
        </div>

        {/* IA y aprendizaje */}
        <div className="settings-section">
          <h4>🤖 Inteligencia Artificial</h4>
          
          <div className="setting-item">
            <div className="ai-info">
              <p>La IA aprende de tus patrones de uso para optimizar la sincronización:</p>
              <ul>
                <li>Detecta tus horas de trabajo más productivas</li>
                <li>Prioriza archivos que usas frecuentemente</li>
                <li>Sugiere resoluciones de conflictos basadas en tu historial</li>
                <li>Optimiza el rendimiento según las condiciones de red</li>
              </ul>
            </div>
          </div>
          
          <div className="setting-item">
            <button className="btn-retrain-ai">
              🔄 Reentrenar IA con datos actuales
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncSettings;