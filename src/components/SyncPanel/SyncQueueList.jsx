import React from 'react';
import './SyncQueueList.css';

const SyncQueueList = ({ items, onManualSync }) => {
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getOperationIcon = (operation) => {
    switch (operation) {
      case 'create': return '➕';
      case 'update': return '📝';
      case 'delete': return '🗑️';
      case 'move': return '📁';
      case 'copy': return '📋';
      default: return '📄';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '⛔';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority) => {
    if (priority >= 8) return '#ff4757';  // Alto - Rojo
    if (priority >= 5) return '#ffa502';  // Medio - Naranja
    return '#26de81';                     // Bajo - Verde
  };

  const handleRetry = (item) => {
    if (onManualSync) {
      onManualSync(item.filePath);
    }
  };

  return (
    <div className="sync-queue-list">
      <div className="queue-header">
        <h3>Cola de Sincronización</h3>
        <div className="queue-summary">
          <span className="queue-count">
            {items.length} elemento{items.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="queue-items">
        {items.length === 0 ? (
          <div className="empty-queue">
            <div className="empty-icon">📋</div>
            <div className="empty-message">
              No hay elementos en la cola de sincronización
            </div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.queueId} className={`queue-item status-${item.status}`}>
              <div className="queue-item-header">
                <div className="file-info">
                  <span className="operation-icon">
                    {getOperationIcon(item.operation)}
                  </span>
                  <div className="file-details">
                    <div className="file-name">
                      {item.filePath.split('/').pop() || item.filePath.split('\\').pop()}
                    </div>
                    <div className="file-path">
                      {item.filePath}
                    </div>
                  </div>
                </div>
                
                <div className="queue-item-status">
                  <span className="status-icon">
                    {getStatusIcon(item.status)}
                  </span>
                  <span className="status-text">
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="queue-item-details">
                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Operación:</span>
                    <span className="detail-value">{item.operation}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-label">Prioridad:</span>
                    <span 
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(item.priority) }}
                    >
                      {item.priority}
                    </span>
                  </div>
                  
                  {item.metadata?.fileSize && (
                    <div className="detail-item">
                      <span className="detail-label">Tamaño:</span>
                      <span className="detail-value">
                        {formatFileSize(item.metadata.fileSize)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="detail-row">
                  <div className="detail-item">
                    <span className="detail-label">Programado:</span>
                    <span className="detail-value">
                      {new Date(item.scheduledFor).toLocaleString()}
                    </span>
                  </div>
                  
                  {item.completedAt && (
                    <div className="detail-item">
                      <span className="detail-label">Completado:</span>
                      <span className="detail-value">
                        {new Date(item.completedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {item.duration && (
                    <div className="detail-item">
                      <span className="detail-label">Duración:</span>
                      <span className="detail-value">
                        {formatDuration(item.duration)}
                      </span>
                    </div>
                  )}
                </div>

                {item.attempts > 0 && (
                  <div className="detail-row">
                    <div className="detail-item">
                      <span className="detail-label">Intentos:</span>
                      <span className="detail-value">
                        {item.attempts}/{item.maxAttempts}
                      </span>
                    </div>
                  </div>
                )}

                {item.error && (
                  <div className="error-details">
                    <div className="error-title">Error:</div>
                    <div className="error-message">{item.error.message}</div>
                    {item.error.timestamp && (
                      <div className="error-timestamp">
                        {new Date(item.error.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {item.result && (
                  <div className="result-details">
                    <div className="result-title">Resultado:</div>
                    <pre className="result-content">
                      {JSON.stringify(item.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="queue-item-actions">
                {item.status === 'failed' && item.attempts < item.maxAttempts && (
                  <button 
                    className="btn-retry"
                    onClick={() => handleRetry(item)}
                    title="Reintentar sincronización"
                  >
                    🔄 Reintentar
                  </button>
                )}
                
                {(item.status === 'pending' || item.status === 'failed') && (
                  <button 
                    className="btn-cancel"
                    onClick={() => {/* Implementar cancelación */}}
                    title="Cancelar operación"
                  >
                    ⛔ Cancelar
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SyncQueueList;