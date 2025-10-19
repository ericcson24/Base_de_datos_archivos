import React, { useState } from 'react';
import './ConflictResolutionPanel.css';

const ConflictResolutionPanel = ({ conflicts, onResolve }) => {
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConflictTypeIcon = (type) => {
    switch (type) {
      case 'modification': return '📝';
      case 'deletion': return '🗑️';
      case 'creation': return '➕';
      case 'rename': return '📝';
      default: return '⚠️';
    }
  };

  const handleResolveConflict = (conflictId, resolution) => {
    if (onResolve) {
      onResolve(conflictId, resolution);
    }
    setSelectedConflict(null);
  };

  const openConflictDetails = (conflict) => {
    setSelectedConflict(conflict);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelectedConflict(null);
  };

  return (
    <div className="conflict-resolution-panel">
      <div className="conflicts-header">
        <h3>Resolución de Conflictos</h3>
        <div className="conflicts-summary">
          <span className="conflicts-count">
            {conflicts.length} conflicto{conflicts.length !== 1 ? 's' : ''} pendiente{conflicts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="conflicts-list">
        {conflicts.length === 0 ? (
          <div className="no-conflicts">
            <div className="no-conflicts-icon">✅</div>
            <div className="no-conflicts-message">
              No hay conflictos pendientes de resolver
            </div>
            <div className="no-conflicts-description">
              Todos los archivos están sincronizados correctamente
            </div>
          </div>
        ) : (
          conflicts.map((conflict) => (
            <div key={conflict.conflictId} className="conflict-item">
              <div className="conflict-header">
                <div className="conflict-file-info">
                  <span className="conflict-type-icon">
                    {getConflictTypeIcon(conflict.type)}
                  </span>
                  <div className="conflict-file-details">
                    <div className="conflict-file-name">
                      {conflict.filePath.split('/').pop() || conflict.filePath.split('\\').pop()}
                    </div>
                    <div className="conflict-file-path">
                      {conflict.filePath}
                    </div>
                  </div>
                </div>
                
                <div className="conflict-timestamp">
                  {formatTimestamp(conflict.timestamp)}
                </div>
              </div>

              <div className="conflict-details">
                <div className="conflict-versions">
                  <div className="version-info local-version">
                    <div className="version-title">📱 Versión Local</div>
                    <div className="version-details">
                      <div className="version-user">
                        Usuario: {conflict.localVersion.userId}
                      </div>
                      <div className="version-time">
                        {formatTimestamp(conflict.localVersion.timestamp)}
                      </div>
                      <div className="version-hash">
                        Hash: {conflict.localVersion.contentHash.substring(0, 8)}...
                      </div>
                    </div>
                  </div>

                  <div className="conflict-vs">VS</div>

                  <div className="version-info remote-version">
                    <div className="version-title">☁️ Versión Remota</div>
                    <div className="version-details">
                      <div className="version-user">
                        Usuario: {conflict.remoteVersion.userId}
                      </div>
                      <div className="version-time">
                        {formatTimestamp(conflict.remoteVersion.timestamp)}
                      </div>
                      <div className="version-hash">
                        Hash: {conflict.remoteVersion.contentHash.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </div>

                {conflict.aiSuggestion && (
                  <div className="ai-suggestion">
                    <div className="ai-suggestion-header">
                      <span className="ai-icon">🤖</span>
                      <span className="ai-title">Sugerencia de IA</span>
                    </div>
                    <div className="ai-suggestion-content">
                      {conflict.aiSuggestion}
                    </div>
                  </div>
                )}
              </div>

              <div className="conflict-actions">
                <button 
                  className="btn-preview"
                  onClick={() => openConflictDetails(conflict)}
                  title="Ver detalles del conflicto"
                >
                  👁️ Ver Detalles
                </button>
                
                <button 
                  className="btn-resolve btn-local"
                  onClick={() => handleResolveConflict(conflict.conflictId, 'auto_local')}
                  title="Mantener versión local"
                >
                  📱 Usar Local
                </button>
                
                <button 
                  className="btn-resolve btn-remote"
                  onClick={() => handleResolveConflict(conflict.conflictId, 'auto_remote')}
                  title="Usar versión remota"
                >
                  ☁️ Usar Remota
                </button>
                
                <button 
                  className="btn-resolve btn-merge"
                  onClick={() => handleResolveConflict(conflict.conflictId, 'merge')}
                  title="Intentar fusión automática"
                >
                  🔀 Fusionar
                </button>
                
                <button 
                  className="btn-resolve btn-manual"
                  onClick={() => handleResolveConflict(conflict.conflictId, 'manual')}
                  title="Resolución manual"
                >
                  ✏️ Manual
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showPreview && selectedConflict && (
        <div className="conflict-preview-overlay">
          <div className="conflict-preview-modal">
            <div className="preview-header">
              <h3>Detalles del Conflicto</h3>
              <button 
                className="btn-close-preview"
                onClick={closePreview}
              >
                ✕
              </button>
            </div>

            <div className="preview-content">
              <div className="preview-file-info">
                <div className="preview-file-name">
                  {selectedConflict.filePath.split('/').pop() || selectedConflict.filePath.split('\\').pop()}
                </div>
                <div className="preview-file-path">
                  {selectedConflict.filePath}
                </div>
              </div>

              <div className="preview-comparison">
                <div className="comparison-side">
                  <div className="comparison-title">📱 Versión Local</div>
                  <div className="comparison-content">
                    <div className="version-metadata">
                      <div>Modificado: {formatTimestamp(selectedConflict.localVersion.timestamp)}</div>
                      <div>Usuario: {selectedConflict.localVersion.userId}</div>
                      <div>Hash: {selectedConflict.localVersion.contentHash}</div>
                    </div>
                    <div className="file-preview">
                      {/* Aquí iría el contenido del archivo local */}
                      <div className="preview-placeholder">
                        Vista previa del contenido local
                      </div>
                    </div>
                  </div>
                </div>

                <div className="comparison-divider"></div>

                <div className="comparison-side">
                  <div className="comparison-title">☁️ Versión Remota</div>
                  <div className="comparison-content">
                    <div className="version-metadata">
                      <div>Modificado: {formatTimestamp(selectedConflict.remoteVersion.timestamp)}</div>
                      <div>Usuario: {selectedConflict.remoteVersion.userId}</div>
                      <div>Hash: {selectedConflict.remoteVersion.contentHash}</div>
                    </div>
                    <div className="file-preview">
                      {/* Aquí iría el contenido del archivo remoto */}
                      <div className="preview-placeholder">
                        Vista previa del contenido remoto
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedConflict.aiSuggestion && (
                <div className="preview-ai-suggestion">
                  <div className="ai-suggestion-header">
                    <span className="ai-icon">🤖</span>
                    <span className="ai-title">Análisis de IA</span>
                  </div>
                  <div className="ai-suggestion-content">
                    {selectedConflict.aiSuggestion}
                  </div>
                </div>
              )}
            </div>

            <div className="preview-actions">
              <button 
                className="btn-resolve btn-local"
                onClick={() => handleResolveConflict(selectedConflict.conflictId, 'auto_local')}
              >
                📱 Usar Versión Local
              </button>
              
              <button 
                className="btn-resolve btn-remote"
                onClick={() => handleResolveConflict(selectedConflict.conflictId, 'auto_remote')}
              >
                ☁️ Usar Versión Remota
              </button>
              
              <button 
                className="btn-resolve btn-merge"
                onClick={() => handleResolveConflict(selectedConflict.conflictId, 'merge')}
              >
                🔀 Fusionar Automáticamente
              </button>
              
              <button 
                className="btn-cancel"
                onClick={closePreview}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConflictResolutionPanel;