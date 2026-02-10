import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { downloadFile } from '../../../utils/fileUtils';
import './PowerPointEditor.css';

const PowerPointEditor = ({ file }) => {
  const { t } = useLanguage();

  return (
    <div className="powerpoint-editor">
      <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md">
          <div className="text-6xl mb-4">
            📽️
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
            {t('fileEditor.presentation')}
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            {t('fileEditor.presentationDesc')}
          </p>
          <button
            onClick={() => downloadFile(file.id, file.name, t)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center mx-auto space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{t('fileEditor.downloadToEdit')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PowerPointEditor;
