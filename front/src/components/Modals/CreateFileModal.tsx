'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const FILE_TYPE_ICONS: Record<string, string> = {
  text: '📄',
  word: '📝',
  excel: '📊',
  powerpoint: '📽️'
};

type CreateFileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreateFile: (fileName: string, fileType: string) => void;
  defaultName?: string;
  fileType: string;
};

const CreateFileModal = ({ isOpen, onClose, onCreateFile, defaultName, fileType }: CreateFileModalProps) => {
  const { t } = useLanguage();
  const [fileName, setFileName] = useState(defaultName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFileName(defaultName || '');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const dotIndex = (defaultName || '').lastIndexOf('.');
          if (dotIndex > 0) {
            inputRef.current.setSelectionRange(0, dotIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!fileName.trim()) return;
    onCreateFile(fileName.trim(), fileType);
    onClose();
  };

  const icon = FILE_TYPE_ICONS[fileType] || '📄';

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="glassmorphism-modal dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {t('createFileModal.title')}
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {t('createFileModal.description')}
        </p>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('createFileModal.placeholder')}
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
          className="w-full px-3 py-2 glassmorphism-input dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 mb-4 rounded-lg border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!fileName.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
          >
            {t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFileModal;
