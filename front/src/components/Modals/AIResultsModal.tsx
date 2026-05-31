'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { FiEye } from 'react-icons/fi';
import FrostedContainer from '../common/FrostedContainer';
import Button from '../common/Button';
import { useLanguage } from '../../context/LanguageContext';
import { getAuthToken } from '../../utils/fileUtils';
import WordEditor from '../fileeditor/editors/WordEditor';
import ExcelEditor from '../fileeditor/editors/ExcelEditor';
import './AIResultsModal.css';

interface TextFileViewerProps {
  fileId: string;
  highlightText?: string | null;
}

const TextFileViewer: React.FC<TextFileViewerProps> = ({ fileId, highlightText }) => {
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    const loadText = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(`/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token || '')}`, {
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

  const renderContent = () => {
    if (!highlightText) return content;

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

interface AIResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: any;
  onOpenFile?: (file: any) => void;
  onDownloadFile?: (file: any) => void;
}

const AIResultsModal: React.FC<AIResultsModalProps> = ({ isOpen, onClose, results }) => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setSelectedHighlight(null);
    }
  }, [isOpen, results]);

  if (!isOpen || !results) return null;

  const { response, files = [], highlights = [] } = results;

  const handleFileClick = (file: any, highlight: any) => {
    setSelectedFile(file);
    setSelectedHighlight(highlight ? highlight.text : null);
  };

  const renderViewer = () => {
    if (!selectedFile) return (
      <div className="empty-viewer-state">
        <span className="text-6xl mb-4 opacity-50"><FiEye /></span>
        <p>{t('aiResults.selectFileToView') || 'Selecciona un archivo para ver su contenido'}</p>
      </div>
    );

    const ext = selectedFile.name.toLowerCase().split('.').pop();
    const isDocx = ext === 'docx' || ext === 'doc';
    const isPdf = ext === 'pdf';
    const isImage = ['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext);
    const isSpreadsheet = ['xlsx','xls','ods'].includes(ext) || selectedFile.mime_type?.includes('spreadsheet') || selectedFile.mime_type?.includes('excel');
    const isPresentation = ['pptx','ppt'].includes(ext) || selectedFile.mime_type?.includes('presentation');
    const isTextReadable = ['txt','md','json','xml','csv','js','ts','jsx','tsx','html','css','py','java','c','cpp','h','sh','yaml','yml','ini','log'].includes(ext);

    const targetId = selectedFile.download_id || selectedFile.id;
    const fileUrl = `/api/files/preview/${encodeURIComponent(targetId)}?token=${encodeURIComponent(getAuthToken() || '')}`;

    const NoPreviewBanner = ({ icon, label }: { icon: string; label: string }) => (
      <div className="viewer-wrapper" style={{ alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#94a3b8' }}>
        <span style={{ fontSize: '4rem' }}>{icon}</span>
        <p style={{ margin: 0, fontSize: '0.95rem', textAlign: 'center', opacity: 0.8 }}>{label}</p>
        <a
          href={`/api/files/download/${encodeURIComponent(targetId)}?token=${encodeURIComponent(getAuthToken() || '')}`}
          download={selectedFile.name}
          style={{
            marginTop: '0.5rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            background: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.3)',
            color: '#38bdf8',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          ⬇ Descargar archivo
        </a>
      </div>
    );

    if (isPdf) {
      return (
        <div className="viewer-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
            <span style={{ fontSize: '1.2rem', marginRight: '8px' }}>📕</span>
            <h3 style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9 }}>{selectedFile.name}</h3>
          </div>
          <iframe
            src={fileUrl}
            style={{ flex: 1, width: '100%', minHeight: 0, border: 'none', borderRadius: '0 0 8px 8px', background: 'white' }}
            title={selectedFile.name}
          />
        </div>
      );
    }

    if (isDocx || selectedFile.mime_type?.includes('word')) {
      return (
        <div className="viewer-wrapper">
          <WordEditor
            file={selectedFile}
            fileUrl={fileUrl}
            onClose={() => setSelectedFile(null)}
            onFileSaved={() => {}}
            highlightText={selectedHighlight || undefined}
          />
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="viewer-wrapper" style={{ alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={selectedFile.name}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      );
    }

    if (isSpreadsheet) {
      return (
        <div className="viewer-wrapper" style={{ background: '#fff' }}>
          <ExcelEditor
            file={selectedFile}
            fileUrl={fileUrl}
            onClose={() => setSelectedFile(null)}
            onFileSaved={() => {}}
          />
        </div>
      );
    }

    if (isPresentation) {
      return <NoPreviewBanner icon="📙" label={`Vista previa no disponible para presentaciones.\n${selectedFile.name}`} />;
    }

    if (isTextReadable) {
      const textTargetId = selectedFile.download_id || selectedFile.id;
      return <TextFileViewer fileId={textTargetId} highlightText={selectedHighlight} />;
    }

    return <NoPreviewBanner icon="📄" label={`Vista previa no disponible para este tipo de archivo.\n${selectedFile.name}`} />;
  };

  return (
    <div className="modal-overlay">
      <FrostedContainer
        variant="modal"
        className={`ai-results-modal ${selectedFile ? 'expanded-mode' : ''}`}
      >
        <div className="modal-header">
          <h2>
            <span className="ai-icon">🤖</span>
            {t('aiResults.title')}
          </h2>
          <button className="close-button" onClick={onClose}>
            x
          </button>
        </div>

        <div className="modal-body-split">

          <div className="results-panel">
               <div className="ai-response-section">
                <h3>{t('aiResults.aiResponse')}</h3>
                <div className="ai-response-text">
                  {response}
                </div>
              </div>


              {files.length > 0 ? (
                <div className="files-section">
                  <h3>{t('aiResults.relevantFiles')} ({files.length})</h3>
                  <div className="files-list">
                    {files.map((file: any) => {
                      const fileHighlights = highlights.filter((h: any) => h.fileId == file.id);
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
                                  {file.folder_path && (
                                    <span className="file-folder-path" title={file.folder_path}>
                                      📁 {file.folder_path} *{' '}
                                    </span>
                                  )}
                                  {formatFileSize(file.size)} * {formatDate(file.upload_date || file.created_at)}
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
                              {fileHighlights.map((h: any, i: number) => (
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


          <div className={`viewer-panel ${selectedFile ? 'visible' : ''}`}>
               {renderViewer()}
          </div>
        </div>
      </FrostedContainer>
    </div>
  );
};

const getFileIcon = (mimeTypeOrName: string): string => {
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
  if (mimeType.includes('zip') || mimeType.includes('compressed') || /\.(zip|rar|7z)$/.test(name)) return '🗜️';
  if (mimeType.includes('text') || name.endsWith('.txt')) return '📃';

  return '📄';
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default AIResultsModal;
