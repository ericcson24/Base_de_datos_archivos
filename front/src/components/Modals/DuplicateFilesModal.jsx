import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './DuplicateFilesModal.css';

/**
 * Modal shown when uploading files that already exist in the current directory.
 * Offers three choices: Replace, Keep Both (rename), or Skip duplicates.
 *
 * Props:
 *   isOpen        - boolean
 *   duplicateNames - string[] of file names that already exist
 *   onReplace     - callback: overwrite existing files
 *   onKeepBoth    - callback: rename new files with (1), (2), etc.
 *   onSkip        - callback: skip duplicate files
 *   onClose       - callback: cancel upload entirely
 */
const DuplicateFilesModal = ({ isOpen, duplicateNames = [], onReplace, onKeepBoth, onSkip, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen || duplicateNames.length === 0) return null;

  const count = duplicateNames.length;
  const showList = count <= 8;

  return (
    <div className="dup-modal-overlay" onClick={onClose}>
      <div className="dup-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dup-modal-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" />
          </svg>
          <h2>
            {count === 1
              ? t('duplicateModal.titleSingle')
              : t('duplicateModal.titleMultiple', { count })}
          </h2>
        </div>

        {/* Content */}
        <div className="dup-modal-content">
          <p className="dup-modal-description">
            {count === 1
              ? t('duplicateModal.descriptionSingle', { name: duplicateNames[0] })
              : t('duplicateModal.descriptionMultiple', { count })}
          </p>

          {showList && (
            <div className="dup-modal-file-list">
              {duplicateNames.map((name, i) => (
                <div key={i} className="dup-modal-file-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="dup-modal-actions">
          <button className="dup-btn dup-btn-skip" onClick={onSkip}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            {t('duplicateModal.skip')}
          </button>
          <button className="dup-btn dup-btn-keep" onClick={onKeepBoth}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
            {t('duplicateModal.keepBoth')}
          </button>
          <button className="dup-btn dup-btn-replace" onClick={onReplace}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
            {t('duplicateModal.replace')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateFilesModal;
