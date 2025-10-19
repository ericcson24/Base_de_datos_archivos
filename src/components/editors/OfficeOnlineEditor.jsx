import React, { useState, useEffect } from 'react';
import './OfficeOnlineEditor.css';

/**
 * Componente para editar archivos de Microsoft Office en línea
 * Soporta Word, Excel, PowerPoint usando Office Online
 */
const OfficeOnlineEditor = ({ 
  file, 
  onSave, 
  onClose, 
  isVisible,
  user 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [editMode, setEditMode] = useState('view'); // 'view' | 'edit'
  const [isSupported, setIsSupported] = useState(false);

  // Tipos de archivo soportados por Office Online
  const supportedTypes = {
    'docx': { type: 'word', name: 'Word Document', icon: '📄' },
    'doc': { type: 'word', name: 'Word Document', icon: '📄' },
    'xlsx': { type: 'excel', name: 'Excel Spreadsheet', icon: '📊' },
    'xls': { type: 'excel', name: 'Excel Spreadsheet', icon: '📊' },
    'pptx': { type: 'powerpoint', name: 'PowerPoint Presentation', icon: '📽️' },
    'ppt': { type: 'powerpoint', name: 'PowerPoint Presentation', icon: '📽️' }
  };

  useEffect(() => {
    if (file && isVisible) {
      checkFileSupport();
      generateOfficeUrl();
    }
  }, [file, isVisible]);

  const checkFileSupport = () => {
    const extension = file.fileName.split('.').pop().toLowerCase();
    setIsSupported(!!supportedTypes[extension]);
  };

  const generateOfficeUrl = async () => {
    if (!file || !isSupported) return;

    setIsLoading(true);
    setError(null);

    try {
      // Generar URL de Office Online usando WOPI (Web Application Open Platform Interface)
      const response = await fetch('/api/office/generate-wopi-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fileId: file._id,
          fileName: file.fileName,
          action: editMode === 'edit' ? 'edit' : 'view',
          userId: user?.id
        })
      });

      if (!response.ok) {
        throw new Error('Error generando URL de Office Online');
      }

      const data = await response.json();
      setEmbedUrl(data.embedUrl);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (newMode) => {
    setEditMode(newMode);
    // Regenerar URL con el nuevo modo
    generateOfficeUrl();
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Notificar a Office Online que guarde
      const iframe = document.getElementById('office-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          MessageId: 'Save_File_UI',
          SendTime: Date.now(),
          Values: {}
        }, '*');
      }

      // Llamar callback del padre
      if (onSave) {
        onSave(file);
      }
    } catch (error) {
      setError('Error guardando archivo');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = () => {
    const extension = file?.fileName.split('.').pop().toLowerCase();
    return supportedTypes[extension]?.icon || '📄';
  };

  const getFileTypeName = () => {
    const extension = file?.fileName.split('.').pop().toLowerCase();
    return supportedTypes[extension]?.name || 'Archivo';
  };

  if (!isVisible) return null;

  return (
    <div className="office-editor-overlay">
      <div className="office-editor-container">
        {/* Header */}
        <div className="office-editor-header">
          <div className="file-info">
            <span className="file-icon">{getFileIcon()}</span>
            <div className="file-details">
              <h3 className="file-name">{file?.fileName}</h3>
              <span className="file-type">{getFileTypeName()}</span>
            </div>
          </div>
          
          <div className="editor-controls">
            {isSupported && (
              <div className="mode-selector">
                <button 
                  className={`mode-btn ${editMode === 'view' ? 'active' : ''}`}
                  onClick={() => handleModeChange('view')}
                  disabled={isLoading}
                >
                  👁️ Ver
                </button>
                <button 
                  className={`mode-btn ${editMode === 'edit' ? 'active' : ''}`}
                  onClick={() => handleModeChange('edit')}
                  disabled={isLoading}
                >
                  ✏️ Editar
                </button>
              </div>
            )}
            
            {editMode === 'edit' && (
              <button 
                className="save-btn"
                onClick={handleSave}
                disabled={isLoading}
              >
                💾 Guardar
              </button>
            )}
            
            <button 
              className="close-btn"
              onClick={onClose}
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="office-editor-content">
          {isLoading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cargando Office Online...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Error cargando archivo</h3>
              <p>{error}</p>
              <button 
                className="retry-btn"
                onClick={generateOfficeUrl}
              >
                🔄 Reintentar
              </button>
            </div>
          )}

          {!isSupported && !isLoading && (
            <div className="unsupported-state">
              <div className="unsupported-icon">❌</div>
              <h3>Archivo no soportado</h3>
              <p>Este tipo de archivo no puede editarse en línea.</p>
              <p>Tipos soportados: Word (.docx, .doc), Excel (.xlsx, .xls), PowerPoint (.pptx, .ppt)</p>
              <button 
                className="download-btn"
                onClick={() => window.open(`/api/files/download/${file._id}`, '_blank')}
              >
                ⬇️ Descargar archivo
              </button>
            </div>
          )}

          {isSupported && embedUrl && !isLoading && !error && (
            <iframe
              id="office-iframe"
              src={embedUrl}
              className="office-iframe"
              frameBorder="0"
              allowFullScreen
              title={`Office Online - ${file.fileName}`}
            />
          )}
        </div>

        {/* Footer */}
        <div className="office-editor-footer">
          <div className="editor-info">
            <span className="status-indicator">
              {isLoading ? '🔄 Cargando...' : 
               error ? '❌ Error' : 
               embedUrl ? '✅ Conectado' : '⏳ Preparando...'}
            </span>
          </div>
          
          <div className="editor-actions">
            <button 
              className="action-btn secondary"
              onClick={() => window.open(`/api/files/download/${file._id}`, '_blank')}
            >
              ⬇️ Descargar
            </button>
            
            <button 
              className="action-btn secondary"
              onClick={() => navigator.share && navigator.share({
                title: file.fileName,
                url: `/api/files/share/${file._id}`
              })}
            >
              🔗 Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeOnlineEditor;