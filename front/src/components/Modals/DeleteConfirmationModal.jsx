import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, userName }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="delete-confirmation-overlay" onClick={onClose}>
      <div className="delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-confirmation-header">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2>{t('admin.deleteUser') || 'Eliminar Usuario'}</h2>
        </div>
        
        <div className="delete-confirmation-content">
          <p>
            {t('admin.deleteConfirmationMessage', { name: userName }) || 
             `¿Estás seguro de que deseas eliminar al usuario "${userName}"?`}
          </p>
          
          <div className="delete-warning-box">
            <strong>{t('admin.warning') || 'Advertencia'}:</strong>
            <p>
              {t('admin.deleteWarningDetail') || 
               'Esta acción programará la eliminación de todos los datos del usuario (archivos, eventos, correos). Tienes 5 minutos para cancelar esta operación.'}
            </p>
          </div>
        </div>

        <div className="delete-confirmation-actions">
          <button className="btn-cancel" onClick={onClose}>
            {t('common.cancel') || 'Cancelar'}
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('admin.confirmDelete') || 'Programar Eliminación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
