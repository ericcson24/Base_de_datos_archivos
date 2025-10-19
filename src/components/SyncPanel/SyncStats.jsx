import React from 'react';
import './SyncStats.css';

const SyncStats = ({ stats = {} }) => {
  const formatUptime = (milliseconds) => {
    if (!milliseconds) return '0s';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatMemory = (bytes) => {
    if (!bytes) return '0 MB';
    
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const calculateSuccessRate = () => {
    const total = (stats.engine?.totalSyncs || 0);
    const successful = (stats.engine?.successfulSyncs || 0);
    
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
  };

  return (
    <div className="sync-stats">
      <h3>Estadísticas de Sincronización</h3>
      
      <div className="stats-grid">
        {/* Estadísticas del motor */}
        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <div className="stat-label">Estado del Servicio</div>
            <div className="stat-value">
              {stats.uptime ? 'Activo' : 'Inactivo'}
            </div>
            <div className="stat-subtitle">
              Tiempo activo: {formatUptime(stats.uptime)}
            </div>
          </div>
        </div>

        {/* Usuarios activos */}
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Usuarios Conectados</div>
            <div className="stat-value">
              {stats.activeUsers || 0}
            </div>
            <div className="stat-subtitle">
              Watchers: {stats.activeWatchers || 0}
            </div>
          </div>
        </div>

        {/* Sincronizaciones totales */}
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Sincronizaciones</div>
            <div className="stat-value">
              {stats.engine?.totalSyncs || 0}
            </div>
            <div className="stat-subtitle">
              Exitosas: {stats.engine?.successfulSyncs || 0} | 
              Fallidas: {stats.engine?.failedSyncs || 0}
            </div>
          </div>
        </div>

        {/* Tasa de éxito */}
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Tasa de Éxito</div>
            <div className="stat-value">
              {calculateSuccessRate()}%
            </div>
            <div className="stat-subtitle">
              De {stats.engine?.totalSyncs || 0} operaciones
            </div>
          </div>
        </div>

        {/* Conexiones WebSocket */}
        <div className="stat-card">
          <div className="stat-icon">🔌</div>
          <div className="stat-content">
            <div className="stat-label">Conexiones</div>
            <div className="stat-value">
              {stats.connections || 0}
            </div>
            <div className="stat-subtitle">
              WebSocket activas
            </div>
          </div>
        </div>

        {/* Uso de memoria */}
        <div className="stat-card">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-label">Memoria</div>
            <div className="stat-value">
              {formatMemory(stats.memory?.heapUsed)}
            </div>
            <div className="stat-subtitle">
              Total: {formatMemory(stats.memory?.heapTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de rendimiento simple */}
      <div className="performance-chart">
        <h4>Rendimiento Reciente</h4>
        <div className="chart-placeholder">
          <div className="chart-bars">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i}
                className="chart-bar"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
          <div className="chart-labels">
            <span>Última hora</span>
            <span>Ahora</span>
          </div>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="system-info">
        <h4>Información del Sistema</h4>
        <div className="info-list">
          <div className="info-item">
            <span className="info-label">Última actualización:</span>
            <span className="info-value">
              {stats.timestamp ? new Date(stats.timestamp).toLocaleString() : 'N/A'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Versión del servicio:</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-item">
            <span className="info-label">Node.js:</span>
            <span className="info-value">{process.version || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncStats;