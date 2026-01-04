import React, { useState, useEffect } from 'react';
import { getFileType, getFileIcon, canPreview, getAuthenticatedPreviewUrl } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';

const RecentFileItem = ({ file, isDarkMode, onFileClick }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    const loadPreview = async () => {
      if (file.type === 'folder' || !canPreview(file.name)) return;
      
      setIsLoading(true);
      try {
        const url = await getAuthenticatedPreviewUrl(file.id, file.name);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Error loading preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [file.id, file.name, file.type]);

  const fileType = getFileType(file.name);
  
  return (
    <div 
      className="recent-file-item"
      onClick={() => onFileClick(file)}
      title={file.name}
    >
      <div className="recent-file-preview">
        {file.type === 'folder' ? (
          <div className="folder-icon">📁</div>
        ) : isLoading ? (
          <div className="loading-preview">⟳</div>
        ) : previewUrl && canPreview(file.name) ? (
          <div className="file-preview-container">
            {fileType === 'image' && (
              <img 
                src={previewUrl} 
                alt={file.name}
                className="file-preview-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            )}
            {fileType === 'pdf' && (
              <iframe 
                src={previewUrl}
                className="file-preview-pdf"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                title={file.name}
              />
            )}
            {fileType === 'video' && (
              <video 
                className="file-preview-video"
                muted
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              >
                <source src={previewUrl} />
              </video>
            )}
            {/* Fallback icon */}
            <div className="file-fallback-icon fallback-icon-hidden">
              {getFileIcon(file.name)}
            </div>
          </div>
        ) : (
          <div className="file-icon-large">
            {getFileIcon(file.name)}
          </div>
        )}
        
        {/* File type indicator */}
        <div className="file-type-indicator">
          {file.name.split('.').pop()?.toUpperCase()}
        </div>
      </div>
      
      <div className="recent-file-info">
        <p className="recent-file-name">
          {file.name.length > 20 ? `${file.name.substring(0, 17)}...` : file.name}
        </p>
        <p className="recent-file-date">
          {file.modifiedAt ? 
            new Date(file.modifiedAt).toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pl' ? 'pl-PL' : 'en-US', { 
              month: 'short', 
              day: 'numeric',
              year: new Date(file.modifiedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            }) : 
            t('userPanel.recentLabel')
          }
        </p>
      </div>
    </div>
  );
};

export default RecentFileItem;
