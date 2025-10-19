import React, { useState, useEffect } from 'react';
import SyncPanel from './SyncPanel/SyncPanel';
import './SyncButton.css';

const SyncButton = ({ userId, isVisible = true }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [syncStatus, setSyncStatus] = useState('disconnected');
  const [stats, setStats] = useState({});
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (userId && isVisible) {
      checkSyncServiceStatus();
      loadUserSyncConfig();
      
      // Verificar estado cada 30 segundos
      const interval = setInterval(checkSyncServiceStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, isVisible]);

  const checkSyncServiceStatus = async () => {
    try {
      const response = await fetch('/api/sync/service-status');
      const data = await response.json();
      
      if (data.isRunning) {
        setSyncStatus('ready');
        if (data.metrics) {
          setStats(data.metrics);
        }
      } else {
        setSyncStatus('disconnected');
      }
    } catch (error) {
      console.error('Error checking sync service status:', error);
      setSyncStatus('error');
    }
  };

  const loadUserSyncConfig = async () => {
    try {
      const response = await fetch(`/api/sync/user-config/${userId}`);
      const config = await response.json();
      setIsEnabled(config.isActive);
    } catch (error) {
      console.error('Error loading user sync config:', error);
    }
  };

  const toggleSync = async () => {
    try {
      const response = await fetch(`/api/sync/toggle/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isEnabled })
      });
      
      const result = await response.json();
      if (result.success) {
        setIsEnabled(result.isActive);
        setSyncStatus(result.isActive ? 'ready' : 'paused');
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
    }
  };

  const openSyncPanel = () => {
    setShowPanel(true);
  };

  const closeSyncPanel = () => {
    setShowPanel(false);
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'ready':
        return isEnabled ? '🟢' : '⏸️';
      case 'syncing':
        return '🔄';
      case 'error':
        return '🔴';
      case 'conflict':
        return '⚠️';
      case 'disconnected':
      default:
        return '⚫';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'ready':
        return isEnabled ? 'Sincronización Activa' : 'Sincronización Pausada';
      case 'syncing':
        return 'Sincronizando...';
      case 'error':
        return 'Error de Sincronización';
      case 'conflict':
        return 'Conflictos Pendientes';
      case 'disconnected':
      default:
        return 'Servicio Desconectado';
    }
  };

  if (!isVisible || !userId) {
    return null;
  }

  return (
    <>
      <div className="sync-button-container">
        <button 
          className={`sync-button ${syncStatus}`}
          onClick={openSyncPanel}
          title={getStatusText()}
        >
          <span className="sync-icon">{getStatusIcon()}</span>
          <span className="sync-label">Sync</span>
          
          {stats.queue?.pending > 0 && (
            <span className="sync-badge">{stats.queue.pending}</span>
          )}
        </button>
        
        <div className="sync-controls">
          <button 
            className={`sync-toggle ${isEnabled ? 'enabled' : 'disabled'}`}
            onClick={toggleSync}
            title={isEnabled ? 'Pausar sincronización' : 'Activar sincronización'}
          >
            {isEnabled ? '⏸️' : '▶️'}
          </button>
        </div>
      </div>

      <SyncPanel 
        userId={userId}
        isVisible={showPanel}
        onClose={closeSyncPanel}
      />
    </>
  );
};

export default SyncButton;