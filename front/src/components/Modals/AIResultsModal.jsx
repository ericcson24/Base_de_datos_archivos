import React from 'react';
import FrostedContainer from '../Common/FrostedContainer';
import Button from '../Common/Button';
import { useLanguage } from '../../context/LanguageContext';
import './AIResultsModal.css';

const AIResultsModal = ({ isOpen, onClose, results, onOpenFile, onDownloadFile }) => {
  const { t } = useLanguage();

  if (!isOpen || !results) return null;

  const { response, files = [], sources = [] } = results;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <FrostedContainer 
        variant="modal" 
        className="ai-results-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            <span className="ai-icon">🤖</span>
            {t('aiResults.title')}
          </h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* AI Response Section */}
          <div className="ai-response-section">
            <h3>{t('aiResults.aiResponse')}</h3>
            <div className="ai-response-text">
              {response}
            </div>
          </div>

          {/* Sources Section */}
          {sources.length > 0 && (
            <div className="sources-section">
              <h3>{t('aiResults.sources')}</h3>
              <div className="sources-list">
                {sources.map((source, idx) => (
                  <span key={idx} className="source-tag">
                    📄 {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {files.length > 0 ? (
            <div className="files-section">
              <h3>{t('aiResults.relevantFiles')} ({files.length})</h3>
              <div className="files-list">
                {files.map((file) => (
                  <div key={file.id} className="ai-file-item">
                    <div className="file-info">
                      <div className="file-icon">
                        {getFileIcon(file.mime_type || file.name)}
                      </div>
                      <div className="file-details">
                        <div className="file-name">{file.name}</div>
                        <div className="file-meta">
                          {formatFileSize(file.size)} • {formatDate(file.upload_date)}
                        </div>
                      </div>
                    </div>
                    <div className="file-actions">
                      <Button
                        variant="frosted"
                        size="small"
                        onClick={() => onOpenFile(file)}
                      >
                        {t('aiResults.open')}
                      </Button>
                      <Button
                        variant="frosted"
                        size="small"
                        onClick={() => onDownloadFile(file)}
                      >
                        {t('aiResults.download')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-files">
              <p>{t('aiResults.noFilesFound')}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <Button variant="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </FrostedContainer>
    </div>
  );
};

// Helper functions
const getFileIcon = (mimeTypeOrName) => {
  if (!mimeTypeOrName) return '📄';
  
  const mimeType = mimeTypeOrName.toLowerCase();
  const name = mimeTypeOrName.toLowerCase();
  
  if (mimeType.includes('pdf') || name.endsWith('.pdf')) return '📕';
  if (mimeType.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return '📘';
  if (mimeType.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) return '📗';
  if (mimeType.includes('powerpoint') || name.endsWith('.pptx') || name.endsWith('.ppt')) return '📙';
  if (mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|svg)$/.test(name)) return '🖼️';
  if (mimeType.includes('video') || /\.(mp4|avi|mov|mkv)$/.test(name)) return '🎬';
  if (mimeType.includes('audio') || /\.(mp3|wav|ogg)$/.test(name)) return '🎵';
  if (mimeType.includes('zip') || mimeType.includes('compressed') || /\.(zip|rar|7z)$/.test(name)) return '📦';
  if (mimeType.includes('text') || name.endsWith('.txt')) return '📃';
  
  return '📄';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

export default AIResultsModal;
