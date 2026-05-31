'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { FiBarChart2, FiLayers } from 'react-icons/fi';
import mammoth from 'mammoth';
import { getFileType, getFileIcon, canPreview, canEdit, getAuthenticatedPreviewUrl, formatFileSize, downloadFile, getAuthToken } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import WordEditor from '../fileeditor/editors/WordEditor';
import ExcelEditor from '../fileeditor/editors/ExcelEditor';
import PowerPointEditor from '../fileeditor/editors/PowerPointEditor';
import './FileViewerModal.css';

interface ViewerFile {
  id: string;
  name: string;
  size?: number;
}

interface OfficeWrapperProps {
  file: any;
  onFileSaved?: () => void;
}

const ExcelViewerWrapper: React.FC<OfficeWrapperProps> = ({ file, onFileSaved }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useLanguage();

  if (!isEditing) {
    return (
      <div className="viewer-content office-viewer flex flex-col items-center justify-center h-full p-8">
        <div className="text-6xl mb-4"><FiBarChart2 /></div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-slate-100">{file.name}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          {t('fileViewer.clickToEditExcel')}
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {t('fileViewer.enableEditing')}
        </button>
      </div>
    );
  }

  return (
    <ExcelEditor
      file={file}
      fileUrl={`/api/files/preview/${file.id}?token=${encodeURIComponent(getAuthToken() || '')}`}
      onClose={() => {}}
      onFileSaved={onFileSaved}
    />
  );
};

const PowerPointViewerWrapper: React.FC<OfficeWrapperProps> = ({ file, onFileSaved }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useLanguage();

  if (!isEditing) {
    return (
      <div className="viewer-content office-viewer flex flex-col items-center justify-center h-full p-8">
        <div className="text-6xl mb-4"><FiLayers /></div>
        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-slate-100">{file.name}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          {t('fileViewer.clickToEditPowerPoint')}
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {t('fileViewer.enableEditing')}
        </button>
      </div>
    );
  }

  return (
    <PowerPointEditor
      file={file}
      fileUrl={`/api/files/preview/${file.id}?token=${encodeURIComponent(getAuthToken() || '')}`}
      onClose={() => {}}
      onFileSaved={onFileSaved}
    />
  );
};

interface FileSubViewerProps {
  fileId: string;
  fileName: string;
  onLoad: () => void;
  onError: (err: string) => void;
}

const WordFileViewer: React.FC<FileSubViewerProps> = ({ fileId, onLoad, onError }) => {
  const [content, setContent] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const loadWordFile = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token || '')}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error(t('fileViewer.errorLoading'));

        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setContent(result.value);
        onLoad();
      } catch (error) {
        console.error('Error loading Word file:', error);
        onError(t('fileViewer.errorWord'));
      }
    };

    loadWordFile();
  }, [fileId, onLoad, onError, t]);

  return (
    <div className="glassmorphism-textarea dark:bg-slate-700 rounded-lg p-8 max-h-[70vh] overflow-y-auto bg-white text-black">
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

const TextFileViewer: React.FC<FileSubViewerProps> = ({ fileId, onLoad, onError }) => {
  const [content, setContent] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const loadTextFile = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token || '')}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error(t('fileViewer.errorLoading'));

        const text = await response.text();
        setContent(text);
        onLoad();
      } catch (error) {
        onError(t('fileViewer.errorText'));
      }
    };

    loadTextFile();
  }, [fileId, onLoad, onError, t]);

  return (
    <div className="glassmorphism-textarea dark:bg-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
      <pre className="text-sm text-gray-900 dark:text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
    </div>
  );
};

interface FileViewerModalProps {
  file: ViewerFile;
  onClose: () => void;
  user?: any;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  const fileType = getFileType(file.name);
  const [loading, setLoading] = useState(fileType !== 'word' && fileType !== 'text' && fileType !== 'powerpoint' && fileType !== 'excel');
  const [error, setError] = useState<string | null>(null);
  const [authenticatedUrl, setAuthenticatedUrl] = useState<string | null>(null);
  const { t } = useLanguage();
  useToast();

  const loadAuthenticatedPreview = useCallback(async () => {
    if (!canPreview(file.name) && !canEdit(file.name)) {
      setLoading(false);
      return;
    }

    try {
      const url = await getAuthenticatedPreviewUrl(file.id, file.name);
      setAuthenticatedUrl(url);
      if (fileType !== 'word') {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error cargando preview autenticada:', error);
      setError(t('fileViewer.errorLoading'));
      setLoading(false);
    }
  }, [file.id, file.name, fileType, t]);

  useEffect(() => {
    if (fileType !== 'word' && fileType !== 'text' && fileType !== 'powerpoint' && fileType !== 'excel') {
      setLoading(true);
    }
    setError(null);
    loadAuthenticatedPreview();
  }, [file, loadAuthenticatedPreview, fileType]);

  const handleDownload = () => {
    downloadFile(file.id, file.name, t);
  };

  const renderFileContent = () => {
    if (!authenticatedUrl && (canPreview(file.name) || canEdit(file.name)) && fileType !== 'word' && fileType !== 'powerpoint' && fileType !== 'excel') {
      return (
        <div className="viewer-content loading">
          <div className="loading-spinner"></div>
          <p>{t('fileViewer.loading')}</p>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="viewer-content image-viewer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={authenticatedUrl || ''}
              alt={file.name}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError(t('fileViewer.errorImage'));
                setLoading(false);
              }}
              className="preview-image"
            />
          </div>
        );

      case 'video':
        return (
          <div className="viewer-content video-viewer">
            <video
              controls
              onLoadedData={() => setLoading(false)}
              onError={() => {
                setError(t('fileViewer.errorVideo'));
                setLoading(false);
              }}
              className="preview-video"
            >
              <source src={authenticatedUrl || ''} />
              {t('fileViewer.videoNotSupported')}
            </video>
          </div>
        );

      case 'pdf':
        return (
          <div className="viewer-content pdf-viewer">
            <iframe
              src={authenticatedUrl || ''}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError(t('fileViewer.errorPdf'));
                setLoading(false);
              }}
              className="preview-iframe"
              title={file.name}
            />
          </div>
        );

      case 'word':
        return (
          <div className="w-full h-full">
            <WordEditor
              file={file}
              fileUrl={`/api/files/preview/${file.id}?token=${encodeURIComponent(getAuthToken() || '')}`}
              onClose={() => {}}
              onFileSaved={() => {}}
            />
          </div>
        );

      case 'excel':
        return (
          <div className="w-full h-full">
            <ExcelEditor
              file={file}
              fileUrl={`/api/files/preview/${file.id}?token=${encodeURIComponent(getAuthToken() || '')}`}
              onClose={() => {}}
              onFileSaved={() => {}}
            />
          </div>
        );

      case 'powerpoint':
        return (
          <div className="w-full h-full">
            <PowerPointEditor
              file={file}
              fileUrl={`/api/files/preview/${file.id}?token=${encodeURIComponent(getAuthToken() || '')}`}
              onClose={() => {}}
              onFileSaved={() => {}}
            />
          </div>
        );

      case 'text':
        return (
          <TextFileViewer
            fileId={file.id}
            fileName={file.name}
            onLoad={() => setLoading(false)}
            onError={(err) => {
              setError(err);
              setLoading(false);
            }}
          />
        );

      default:
        return (
          <div className="viewer-content unsupported">
            <div className="unsupported-content">
              <span className="file-icon-large">{getFileIcon(file.name)}</span>
              <p>{t('fileViewer.unsupportedType')}</p>
              <p>{t('fileViewer.file')}: {file.name}</p>
              <p>{t('fileViewer.size')}: {formatFileSize(file.size || 0)}</p>
            </div>
          </div>
        );
    }
  };

  const isOfficeFile = ['word', 'excel', 'powerpoint'].includes(fileType);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className={`glassmorphism-modal dark:bg-slate-800 rounded-lg shadow-2xl border-gray-200 dark:border-slate-600 mx-4 flex flex-col ${
          isOfficeFile ? 'w-full max-w-7xl h-[95vh]' : 'w-full max-w-4xl max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{file.name}</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleDownload} className="p-2 text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200" title={t('fileViewer.download')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200" title={t('fileViewer.close')}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-hidden ${isOfficeFile ? 'p-0' : 'p-4 overflow-y-auto'}`}>
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400">{t('fileViewer.loading')}</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button onClick={handleDownload} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200">
                {t('fileViewer.downloadFile')}
              </button>
            </div>
          )}

          {!loading && !error && renderFileContent()}
        </div>
      </div>
    </div>
  );
};

export { ExcelViewerWrapper, PowerPointViewerWrapper, WordFileViewer };
export default FileViewerModal;
