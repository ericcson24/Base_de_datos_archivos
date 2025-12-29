import React, { useState, useEffect, useCallback } from 'react';
import { getFileType, getFileIcon, canPreview, getAuthenticatedPreviewUrl, formatFileSize } from '../../utils/fileUtils';

const HoverPreview = ({ file, preview }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [authenticatedUrl, setAuthenticatedUrl] = useState(null);

  const loadAuthenticatedPreview = useCallback(async () => {
    if (file && canPreview(file.name)) {
      try {
        const url = await getAuthenticatedPreviewUrl(file.id, file.name);
        setAuthenticatedUrl(url);
      } catch (error) {
        console.error('Error cargando preview autenticada:', error);
      }
    }
  }, [file]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    loadAuthenticatedPreview();
  }, [file, loadAuthenticatedPreview]);

  const renderPreview = () => {
    if (!file) return null;

    if (!authenticatedUrl) {
      return (
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg">
          <span className="text-2xl">{getFileIcon(file.name)}</span>
        </div>
      );
    }

    const fileType = getFileType(file.name);

    switch (fileType) {
      case 'image':
        return (
          <img
            src={authenticatedUrl}
            alt={file.name}
            className="w-16 h-16 object-cover rounded-lg shadow-sm"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        );

      case 'video':
        return (
          <video
            className="w-16 h-16 object-cover rounded-lg shadow-sm"
            muted
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => e.target.pause()}
          >
            <source src={authenticatedUrl} />
          </video>
        );

      case 'pdf':
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <span className="text-xl">📄</span>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg">
            <span className="text-2xl">{getFileIcon(file.name)}</span>
          </div>
        );
    }
  };

  if (!file) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none glassmorphism-preview dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 p-3 max-w-xs"
      style={{
        left: position.x + 10,
        top: position.y + 10,
      }}
    >
      {renderPreview()}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{file.name}</p>
        <p className="text-xs text-gray-700 dark:text-slate-400">{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
};

export default HoverPreview;
