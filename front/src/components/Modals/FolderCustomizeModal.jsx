import React, { useState, useEffect } from 'react';
import FolderIcon, { FOLDER_COLORS, FOLDER_ICON_OPTIONS } from '../Common/FolderIcon';
import { useLanguage } from '../../context/LanguageContext';
import './FolderCustomizeModal.css';

const FolderCustomizeModal = ({ isOpen, onClose, folder, onSave }) => {
  const { t } = useLanguage();
  const [selectedColor, setSelectedColor] = useState('#5f9ee9');
  const [selectedIcon, setSelectedIcon] = useState('default');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (folder) {
      setSelectedColor(folder.folder_color || '#5f9ee9');
      setSelectedIcon(folder.folder_icon || 'default');
    }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const folderPath = folder.path || folder.name;
      await onSave(folderPath, selectedColor, selectedIcon);
      onClose();
    } catch (e) {
      console.error('Error saving folder customization:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 folder-customize-backdrop" onClick={onClose}>
      <div className="folder-customize-modal" onClick={(e) => e.stopPropagation()}>
        
        
        <div className="fc-header">
          <h3>{t('contextMenu.customizeFolder') || 'Personalizar carpeta'}</h3>
          <button className="fc-close" onClick={onClose}>&times;</button>
        </div>

        
        <div className="fc-preview">
          <FolderIcon color={selectedColor} icon={selectedIcon} size={72} />
          <span className="fc-preview-name">{folder.name}</span>
        </div>

        
        <div className="fc-section">
          <label className="fc-label">{t('contextMenu.folderColor') || 'Color'}</label>
          <div className="fc-color-grid">
            {FOLDER_COLORS.map(c => (
              <button
                key={c.value}
                className={`fc-color-swatch ${selectedColor === c.value ? 'active' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => setSelectedColor(c.value)}
                title={c.name}
              >
                {selectedColor === c.value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        
        <div className="fc-section">
          <label className="fc-label">{t('contextMenu.folderIcon') || 'Icono'}</label>
          <div className="fc-icon-grid">
            {FOLDER_ICON_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`fc-icon-option ${selectedIcon === opt.value ? 'active' : ''}`}
                onClick={() => setSelectedIcon(opt.value)}
                title={opt.name}
              >
                <FolderIcon color={selectedColor} icon={opt.value} size={32} />
                <span className="fc-icon-label">{opt.name}</span>
              </button>
            ))}
          </div>
        </div>

        
        <div className="fc-footer">
          <button className="fc-btn fc-btn-cancel" onClick={onClose} disabled={isSaving}>
            {t('common.cancel') || 'Cancelar'}
          </button>
          <button className="fc-btn fc-btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '...' : (t('common.save') || 'Guardar')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderCustomizeModal;
