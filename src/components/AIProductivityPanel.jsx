import React, { useState, useEffect } from 'react';
import './AIProductivityPanel.css';

/**
 * Panel de IA Asistente de Productividad
 * Muestra eventos próximos con sugerencias de archivos
 */
const AIProductivityPanel = ({ 
  user, 
  isVisible, 
  onClose, 
  microsoftToken 
}) => {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'stats' | 'settings'

  useEffect(() => {
    if (isVisible && user && microsoftToken) {
      initializeAI();
      loadUpcomingEvents();
      loadStats();
    }
  }, [isVisible, user, microsoftToken]);

  /**
   * Inicializa la IA para el usuario
   */
  const initializeAI = async () => {
    try {
      const response = await fetch('/api/ai/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          accessToken: microsoftToken
        })
      });

      if (!response.ok) {
        throw new Error('Error inicializando IA');
      }

      const data = await response.json();
      console.log('IA inicializada:', data);
    } catch (error) {
      console.error('Error inicializando IA:', error);
    }
  };

  /**
   * Carga eventos próximos con sugerencias
   */
  const loadUpcomingEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/upcoming-events?accessToken=${encodeURIComponent(microsoftToken)}&days=7`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error cargando eventos');
      }

      const data = await response.json();
      setUpcomingEvents(data.events || []);
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carga estadísticas de IA
   */
  const loadStats = async () => {
    try {
      const response = await fetch('/api/ai/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  /**
   * Adjunta archivo a evento de Outlook
   */
  const attachFileToEvent = async (eventId, fileId, attachmentType = 'link') => {
    try {
      const response = await fetch('/api/ai/attach-file-to-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventId,
          fileId,
          accessToken: microsoftToken,
          attachmentType
        })
      });

      if (!response.ok) {
        throw new Error('Error adjuntando archivo');
      }

      const data = await response.json();
      
      // Mostrar notificación de éxito
      showNotification('Archivo adjuntado exitosamente', 'success');
      
      // Registrar feedback positivo
      await recordFeedback(eventId, fileId, 'accepted');
      
      // Recargar eventos para reflejar cambios
      loadUpcomingEvents();
      
      return data;
    } catch (error) {
      console.error('Error adjuntando archivo:', error);
      showNotification(error.message, 'error');
      throw error;
    }
  };

  /**
   * Registra feedback del usuario
   */
  const recordFeedback = async (eventId, fileId, action) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventId,
          fileId,
          action,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error registrando feedback:', error);
    }
  };

  /**
   * Muestra notificación al usuario
   */
  const showNotification = (message, type) => {
    // Implementar sistema de notificaciones
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  /**
   * Formatea fecha para mostrar
   */
  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays < 7) return `En ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Obtiene color de confianza
   */
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981'; // Verde
    if (confidence >= 0.6) return '#f59e0b'; // Amarillo
    return '#6b7280'; // Gris
  };

  if (!isVisible) return null;

  return (
    <div className="ai-productivity-overlay">
      <div className="ai-productivity-panel">
        {/* Header */}
        <div className="ai-panel-header">
          <div className="panel-title">
            <span className="ai-icon">🤖</span>
            <h2>Asistente de Productividad</h2>
          </div>
          
          <div className="panel-controls">
            <div className="tab-selector">
              <button 
                className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
                onClick={() => setActiveTab('events')}
              >
                📅 Eventos
              </button>
              <button 
                className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('stats')}
              >
                📊 Estadísticas
              </button>
            </div>
            
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="ai-panel-content">
          {activeTab === 'events' && (
            <div className="events-tab">
              {isLoading && (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Analizando eventos y generando sugerencias...</p>
                </div>
              )}

              {error && (
                <div className="error-state">
                  <div className="error-icon">⚠️</div>
                  <p>{error}</p>
                  <button onClick={loadUpcomingEvents} className="retry-btn">
                    🔄 Reintentar
                  </button>
                </div>
              )}

              {!isLoading && !error && upcomingEvents.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No hay eventos próximos</h3>
                  <p>No se encontraron eventos en los próximos 7 días.</p>
                </div>
              )}

              {!isLoading && !error && upcomingEvents.length > 0 && (
                <div className="events-list">
                  {upcomingEvents.map((eventData, index) => (
                    <EventCard
                      key={eventData.event.id}
                      eventData={eventData}
                      onAttachFile={attachFileToEvent}
                      onRecordFeedback={recordFeedback}
                      onSelectEvent={setSelectedEvent}
                      isSelected={selectedEvent?.id === eventData.event.id}
                      formatDate={formatEventDate}
                      getConfidenceColor={getConfidenceColor}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="stats-tab">
              {stats ? (
                <StatsDisplay stats={stats} />
              ) : (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Cargando estadísticas...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-panel-footer">
          <div className="footer-info">
            <span className="status-indicator">
              {isLoading ? '🔄 Analizando...' : 
               error ? '❌ Error' : 
               `✅ ${upcomingEvents.length} eventos analizados`}
            </span>
          </div>
          
          <div className="footer-actions">
            <button 
              className="refresh-btn"
              onClick={loadUpcomingEvents}
              disabled={isLoading}
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente para mostrar un evento individual con sugerencias
 */
const EventCard = ({ 
  eventData, 
  onAttachFile, 
  onRecordFeedback, 
  onSelectEvent,
  isSelected,
  formatDate,
  getConfidenceColor
}) => {
  const { event, suggestions, hasHighConfidenceSuggestions } = eventData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);

  const handleAttachFile = async (fileId, attachmentType) => {
    setProcessingFile(fileId);
    try {
      await onAttachFile(event.id, fileId, attachmentType);
    } catch (error) {
      // Error ya manejado en el padre
    } finally {
      setProcessingFile(null);
    }
  };

  const handleRejectSuggestion = async (fileId) => {
    await onRecordFeedback(event.id, fileId, 'rejected');
  };

  return (
    <div className={`event-card ${isSelected ? 'selected' : ''} ${hasHighConfidenceSuggestions ? 'high-confidence' : ''}`}>
      <div className="event-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="event-info">
          <h3 className="event-title">{event.subject}</h3>
          <div className="event-meta">
            <span className="event-date">{formatDate(event.start?.dateTime)}</span>
            {event.location && (
              <span className="event-location">📍 {event.location}</span>
            )}
            {event.importance === 'high' && (
              <span className="event-importance">❗ Importante</span>
            )}
          </div>
        </div>
        
        <div className="event-badges">
          {suggestions.length > 0 && (
            <span className="suggestions-badge">
              {suggestions.length} sugerencia{suggestions.length > 1 ? 's' : ''}
            </span>
          )}
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && suggestions.length > 0 && (
        <div className="suggestions-list">
          <h4>📄 Archivos sugeridos:</h4>
          {suggestions.map((suggestion) => (
            <div key={suggestion.fileId} className="suggestion-item">
              <div className="suggestion-info">
                <div className="file-icon">
                  {suggestion.fileType === 'docx' ? '📄' :
                   suggestion.fileType === 'xlsx' ? '📊' :
                   suggestion.fileType === 'pptx' ? '📽️' :
                   suggestion.fileType === 'pdf' ? '📕' : '📎'}
                </div>
                
                <div className="file-details">
                  <span className="file-name">{suggestion.fileName}</span>
                  <div className="file-meta">
                    <span className="confidence-score" 
                          style={{ color: getConfidenceColor(suggestion.confidence) }}>
                      {Math.round(suggestion.confidence * 100)}% confianza
                    </span>
                    <span className="file-size">
                      {(suggestion.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {suggestion.reasons && (
                    <div className="suggestion-reasons">
                      {suggestion.reasons.slice(0, 2).map((reason, idx) => (
                        <span key={idx} className="reason-tag">{reason}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="suggestion-actions">
                {suggestion.editUrl && (
                  <button 
                    className="action-btn edit-btn"
                    onClick={() => window.open(suggestion.editUrl, '_blank')}
                    title="Editar en línea"
                  >
                    ✏️
                  </button>
                )}
                
                <button 
                  className="action-btn preview-btn"
                  onClick={() => window.open(suggestion.downloadUrl, '_blank')}
                  title="Descargar/Ver"
                >
                  👁️
                </button>
                
                <button 
                  className="action-btn attach-btn"
                  onClick={() => handleAttachFile(suggestion.fileId, 'link')}
                  disabled={processingFile === suggestion.fileId}
                  title="Adjuntar a evento"
                >
                  {processingFile === suggestion.fileId ? '⏳' : '📎'}
                </button>
                
                <button 
                  className="action-btn reject-btn"
                  onClick={() => handleRejectSuggestion(suggestion.fileId)}
                  title="No es relevante"
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && suggestions.length === 0 && (
        <div className="no-suggestions">
          <p>🤖 No se encontraron archivos relevantes para este evento.</p>
        </div>
      )}
    </div>
  );
};

/**
 * Componente para mostrar estadísticas de IA
 */
const StatsDisplay = ({ stats }) => {
  const getPerformanceEmoji = () => {
    if (stats.performance.excellent) return '🌟';
    if (stats.performance.good) return '👍';
    if (stats.performance.fair) return '👌';
    return '📈';
  };

  const getPerformanceText = () => {
    if (stats.performance.excellent) return 'Excelente';
    if (stats.performance.good) return 'Bueno';
    if (stats.performance.fair) return 'Regular';
    return 'Mejorando';
  };

  return (
    <div className="stats-display">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalAnalyses}</div>
          <div className="stat-label">Análisis realizados</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.acceptanceRate}%</div>
          <div className="stat-label">Tasa de aceptación</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.trackedFiles}</div>
          <div className="stat-label">Archivos monitoreados</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{stats.learnedPatterns}</div>
          <div className="stat-label">Patrones aprendidos</div>
        </div>
      </div>
      
      <div className="performance-summary">
        <div className="performance-indicator">
          <span className="performance-emoji">{getPerformanceEmoji()}</span>
          <div className="performance-text">
            <h3>Rendimiento: {getPerformanceText()}</h3>
            <p>La IA está {stats.performance.excellent ? 'funcionando excelente' : 
                           stats.performance.good ? 'aprendiendo bien' : 
                           'mejorando gradualmente'} con tus patrones.</p>
          </div>
        </div>
        
        {stats.lastActivity && (
          <div className="last-activity">
            <span>Última actividad: {new Date(stats.lastActivity).toLocaleDateString('es-ES')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIProductivityPanel;