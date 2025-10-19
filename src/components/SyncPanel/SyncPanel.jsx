import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import SyncStatusIndicator from './SyncStatusIndicator';
import SyncQueueList from './SyncQueueList';
import ConflictResolutionPanel from './ConflictResolutionPanel';
import SyncSettings from './SyncSettings';
import SyncStats from './SyncStats';
import './SyncPanel.css';

const SyncPanel = ({ userId, isVisible, onClose }) => {
  const [socket, setSocket] = useState(null);
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [queueItems, setQueueItems] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('status');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isVisible && userId) {
      initializeSocket();
    }
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isVisible, userId]);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket'],
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Connected to sync service');
      setSyncStatus('connecting');
      
      // Autenticar usuario
      newSocket.emit('user_authenticated', {
        userId,
        deviceId: getDeviceId()
      });
    });

    newSocket.on('sync_initialized', (data) => {
      console.log('Sync initialized', data);
      setSyncStatus('ready');
      setSettings(data.config);
    });

    newSocket.on('file_detected', (data) => {
      addNotification(`Archivo detectado: ${data.file.fileName}`, 'info');
    });

    newSocket.on('sync_progress', (data) => {
      updateQueueItem(data.queueId, { status: data.status });
    });

    newSocket.on('sync_completed', (data) => {
      updateQueueItem(data.queueId, { 
        status: 'completed',
        duration: data.duration,
        result: data.result
      });
      addNotification(`Sincronización completada: ${data.queueId}`, 'success');
    });

    newSocket.on('sync_failed', (data) => {
      updateQueueItem(data.queueId, { 
        status: 'failed',
        error: data.error
      });
      addNotification(`Error en sincronización: ${data.error}`, 'error');
    });

    newSocket.on('conflict_detected', (data) => {
      setConflicts(prev => [...prev, data.conflict]);
      addNotification(`Conflicto detectado: ${data.conflict.filePath}`, 'warning');
    });

    newSocket.on('sync_paused', () => {
      setSyncStatus('paused');
      addNotification('Sincronización pausada', 'info');
    });

    newSocket.on('sync_resumed', () => {
      setSyncStatus('ready');
      addNotification('Sincronización reanudada', 'info');
    });

    newSocket.on('sync_error', (data) => {
      addNotification(`Error: ${data.message}`, 'error');
    });

    newSocket.on('disconnect', () => {
      setSyncStatus('disconnected');
      addNotification('Desconectado del servicio de sincronización', 'warning');
    });

    setSocket(newSocket);
  };

  const getDeviceId = () => {
    let deviceId = localStorage.getItem('sync_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('sync_device_id', deviceId);
    }
    return deviceId;
  };

  const updateQueueItem = (queueId, updates) => {
    setQueueItems(prev => 
      prev.map(item => 
        item.queueId === queueId 
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const addNotification = (message, type) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const handlePauseSync = () => {
    if (socket) {
      socket.emit('pause_sync', { userId });
    }
  };

  const handleResumeSync = () => {
    if (socket) {
      socket.emit('resume_sync', { userId });
    }
  };

  const handleConflictResolve = (conflictId, resolution) => {
    if (socket) {
      socket.emit('resolve_conflict', { conflictId, resolution });
      setConflicts(prev => prev.filter(c => c.conflictId !== conflictId));
    }
  };

  const handleManualSync = (filePath) => {
    if (socket) {
      socket.emit('sync_request', {
        filePath,
        operation: 'update'
      });
    }
  };

  const handleSettingsUpdate = (newSettings) => {
    // Actualizar configuración
    setSettings(newSettings);
    
    if (socket) {
      socket.emit('update_config', newSettings);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="sync-panel-overlay">
      <div className="sync-panel">
        <div className="sync-panel-header">
          <div className="sync-panel-title">
            <div className="sync-icon">⚡</div>
            <h2>Sincronización Inteligente</h2>
            <SyncStatusIndicator status={syncStatus} />
          </div>
          <div className="sync-panel-controls">
            {syncStatus === 'ready' && (
              <button 
                className="btn-pause"
                onClick={handlePauseSync}
                title="Pausar sincronización"
              >
                ⏸️
              </button>
            )}
            {syncStatus === 'paused' && (
              <button 
                className="btn-resume"
                onClick={handleResumeSync}
                title="Reanudar sincronización"
              >
                ▶️
              </button>
            )}
            <button 
              className="btn-close"
              onClick={onClose}
              title="Cerrar panel"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="sync-panel-tabs">
          <button 
            className={`tab-button ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            Estado
          </button>
          <button 
            className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            Cola ({queueItems.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'conflicts' ? 'active' : ''}`}
            onClick={() => setActiveTab('conflicts')}
          >
            Conflictos ({conflicts.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Configuración
          </button>
        </div>

        <div className="sync-panel-content">
          {activeTab === 'status' && (
            <div className="tab-content">
              <SyncStats stats={stats} />
              
              <div className="notifications-section">
                <h3>Notificaciones Recientes</h3>
                <div className="notifications-list">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`notification notification-${notification.type}`}
                    >
                      <span className="notification-message">
                        {notification.message}
                      </span>
                      <span className="notification-time">
                        {notification.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="no-notifications">
                      No hay notificaciones recientes
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <SyncQueueList 
              items={queueItems}
              onManualSync={handleManualSync}
            />
          )}

          {activeTab === 'conflicts' && (
            <ConflictResolutionPanel 
              conflicts={conflicts}
              onResolve={handleConflictResolve}
            />
          )}

          {activeTab === 'settings' && (
            <SyncSettings 
              settings={settings}
              onUpdate={handleSettingsUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncPanel;