import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName 
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glassmorphism-modal dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">{t('common.confirmDelete')}</h3>
        
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          {t('userPanel.confirmDelete', { name: itemName })}
        </p>

        <div className="flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
