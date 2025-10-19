import React from 'react';
import './SyncStatusIndicator.css';

const SyncStatusIndicator = ({ status }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'disconnected':
        return {
          icon: '⚫',
          text: 'Desconectado',
          className: 'status-disconnected',
          description: 'No hay conexión con el servidor'
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: 'Conectando...',
          className: 'status-connecting',
          description: 'Estableciendo conexión'
        };
      case 'ready':
        return {
          icon: '🟢',
          text: 'Sincronizado',
          className: 'status-ready',
          description: 'Sistema listo para sincronizar'
        };
      case 'syncing':
        return {
          icon: '🔄',
          text: 'Sincronizando',
          className: 'status-syncing',
          description: 'Sincronización en progreso'
        };
      case 'paused':
        return {
          icon: '⏸️',
          text: 'Pausado',
          className: 'status-paused',
          description: 'Sincronización pausada'
        };
      case 'error':
        return {
          icon: '🔴',
          text: 'Error',
          className: 'status-error',
          description: 'Error en la sincronización'
        };
      case 'conflict':
        return {
          icon: '⚠️',
          text: 'Conflicto',
          className: 'status-conflict',
          description: 'Conflictos pendientes de resolver'
        };
      default:
        return {
          icon: '❓',
          text: 'Desconocido',
          className: 'status-unknown',
          description: 'Estado desconocido'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`sync-status-indicator ${statusInfo.className}`}>
      <span className="status-icon">{statusInfo.icon}</span>
      <span className="status-text">{statusInfo.text}</span>
      <div className="status-tooltip">
        {statusInfo.description}
      </div>
    </div>
  );
};

export default SyncStatusIndicator;