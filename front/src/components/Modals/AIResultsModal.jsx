import React, { useState } from 'react';
import FrostedContainer from '../Common/FrostedContainer';
import Button from '../Common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';
import WordEditor from '../FileEditor/editors/WordEditor';
import './AIResultsModal.css';

// Simple text viewer for preview
const TextFileViewer = ({ fileId, highlightText }) => {
  const [content, setContent] = React.useState('');
  const { t } = useLanguage();

  React.useEffect(() => {
    const loadText = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
           const text = await response.text();
           setContent(text);
        }
      } catch (e) {
        console.error("Error loading text", e);
      }
    };
    loadText();
  }, [fileId]);

  if (!content) return <div>Loading...</div>;

  // Render text with highlighting
  const renderContent = () => {
    if (!highlightText) return content;
    
    // Escape regex characters
    const parts = content.split(new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlightText.toLowerCase() ? (
            <span key={i} style={{ backgroundColor: 'yellow', color: '#000', fontWeight: 'bold' }}>{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="text-viewer-container p-4 overflow-auto h-full bg-white dark:bg-slate-800 rounded">
       <pre className="whitespace-pre-wrap font-mono text-sm dark:text-gray-200">{renderContent()}</pre>
    </div>
  );
};

const AIResultsModal = ({ isOpen, onClose, results, onOpenFile, onDownloadFile }) => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);

  if (!isOpen || !results) return null;

  const { response, files = [], sources = [], highlights = [] } = results;

  const handleFileClick = (file, highlight) => {
    setSelectedFile(file);
    setSelectedHighlight(highlight ? highlight.text : null);
  };

  const renderViewer = () => {
    if (!selectedFile) return (
      <div className="empty-viewer-state">
        <span className="text-6xl mb-4 opacity-50">👁️</span>
        <p>{t('aiResults.selectFileToView') || 'Selecciona un archivo para ver su contenido'}</p>
      </div>
    );

    const ext = selectedFile.name.toLowerCase().split('.').pop();
    const isDocx = ext === 'docx' || ext === 'doc';
    
    // Build auth URL for WordEditor
    // AI adds download_id for compatibility with file-service
    const targetId = selectedFile.download_id || selectedFile.id;
    const fileUrl = `/api/files/preview/${targetId}?token=${encodeURIComponent(getAuthToken())}`;

    if (isDocx || selectedFile.mime_type?.includes('word')) {
      return (
         <div className="viewer-wrapper h-full"> 
             <WordEditor 
               file={selectedFile}
               fileUrl={fileUrl}
               onClose={() => setSelectedFile(null)}
               onFileSaved={() => {}}
               highlightText={selectedHighlight}
             />
         </div>
      );
    } else {
      // Fallback to text viewer
      return <TextFileViewer fileId={selectedFile.id} highlightText={selectedHighlight} />;
    }
  };

  return (
    <div className="modal-overlay">
      <FrostedContainer 
        variant="modal" 
        className={`ai-results-modal ${selectedFile ? 'expanded-mode' : ''}`}
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

        <div className="modal-body-split">
          {/* LEFT PANEL: Results List */}
          <div className="results-panel">
               <div className="ai-response-section">
                <h3>{t('aiResults.aiResponse')}</h3>
                <div className="ai-response-text">
                  {response}
                </div>
              </div>

              {/* Files Section */}
              {files.length > 0 ? (
                <div className="files-section">
                  <h3>{t('aiResults.relevantFiles')} ({files.length})</h3>
                  <div className="files-list">
                    {files.map((file) => {
                      const fileHighlights = highlights.filter(h => h.fileId == file.id);
                      return (
                        <div 
                          key={file.id} 
                          className={`ai-file-item ${selectedFile && selectedFile.id === file.id ? 'active' : ''}`}
                          onClick={() => handleFileClick(file, fileHighlights[0])}
                        >
                          <div className="ai-file-main-content" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileClick(file, fileHighlights[0]);
                                }}
                              >
                                {t('aiResults.viewInContext') || 'Ver'}
                              </Button>
                            </div>
                          </div>

                          {fileHighlights.length > 0 && (
                            <div className="file-highlights">
                              <div className="ai-highlight-label">{t('aiResults.foundIn')}</div>
                              {fileHighlights.map((h, i) => (
                                <div 
                                    key={i} 
                                    className="ai-highlight-item"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFileClick(file, h);
                                    }}
                                >
                                  <span className="ai-highlight-text">
                                     "{h.text}"
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="no-files">
                  <p>{t('aiResults.noFilesFound')}</p>
                </div>
              )}
          </div>

          {/* RIGHT PANEL: Viewer */}
          <div className={`viewer-panel ${selectedFile ? 'visible' : ''}`}>
               {renderViewer()}
          </div>
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
