'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './DeleteConfirmationModal.css';

type FileDeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
};

const FileDeleteModal = ({ isOpen, onClose, onConfirm, itemName, itemType }: FileDeleteModalProps) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const isFolder = itemType === 'folder';
  const typeLabel = isFolder
    ? (t('userPanel.folder') || 'carpeta')
    : (t('userPanel.file') || 'archivo');

  return (
    <div className="delete-confirmation-overlay" onClick={onClose}>
      <div className="delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-confirmation-header">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h2>{t('userPanel.deleteItem') || `Eliminar ${typeLabel}`}</h2>
        </div>

        <div className="delete-confirmation-content">
          <p>
            {t('userPanel.confirmDelete', { name: itemName }) ||
             `¿Estás seguro de que quieres eliminar "${itemName}"?`}
          </p>

          {isFolder && (
            <div className="delete-warning-box">
              <strong>{t('common.warning') || 'Advertencia'}:</strong>
              <p>
                {t('userPanel.deleteFolderWarning') ||
                 'Se eliminarán todos los archivos y subcarpetas dentro de esta carpeta.'}
              </p>
            </div>
          )}
        </div>

        <div className="delete-confirmation-actions">
          <button className="btn-cancel" onClick={onClose}>
            {t('common.cancel') || 'Cancelar'}
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('common.delete') || 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileDeleteModal;
