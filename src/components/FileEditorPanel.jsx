import React, { useState, useEffect, useCallback, useRef } from 'react';
import ImageEditor from './editors/ImageEditor';
import PDFEditor from './editors/PDFEditor';
import TextEditor from './editors/TextEditor';
import VideoPlayer from './editors/VideoPlayer';
import AudioPlayer from './editors/AudioPlayer';
import ZipViewer from './editors/ZipViewer';
import './FileEditorPanel.css';

const getFileType = (filename) => {
  const ext = filename.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'php'].includes(ext)) return 'text';
  return 'unsupported';
};

const FileEditorPanel = ({ file, onClose, position, zIndex, onBringToFront, panelId, isInline = false }) => {
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [pos, setPos] = useState(position || { x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const panelRef = useRef(null);
  const resizeHandleRef = useRef(null);

  const fileType = getFileType(file.name);
  
  // Si es inline, no usar dragging ni positioning
  // const isFloating = !isInline; // No usado actualmente

  // Load file content
  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/files/preview/${file.id}?token=${encodeURIComponent(token)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Error loading file');

        if (fileType === 'image' || fileType === 'video' || fileType === 'audio' || fileType === 'pdf') {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setFileUrl(url);
        } else if (fileType === 'text') {
          const text = await response.text();
          setFileUrl(text);
        }
      } catch (error) {
        console.error('Error loading file:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      if (fileUrl && (fileType === 'image' || fileType === 'video' || fileType === 'audio' || fileType === 'pdf')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, fileType]);

  // Dragging handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.resize-handle')) return;
    if (e.target.closest('.panel-controls')) return;
    if (e.target.closest('.editor-content')) return;

    onBringToFront();
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, [onBringToFront]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Boundaries
      const maxX = window.innerWidth - 100;
      const maxY = window.innerHeight - 50;

      setPos({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e) => {
    e.stopPropagation();
    setIsResizing(true);
    onBringToFront();
  }, [onBringToFront]);

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing) return;

    const rect = panelRef.current.getBoundingClientRect();
    const newWidth = Math.max(400, e.clientX - rect.left);
    const newHeight = Math.max(300, e.clientY - rect.top);

    setSize({ width: newWidth, height: newHeight });
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleMouseUp]);

  // Window controls
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      setPos(preMaximizeState.pos);
      setSize(preMaximizeState.size);
      setIsMaximized(false);
    } else {
      setPreMaximizeState({ pos, size });
      setPos({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
  };

  const renderEditor = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return <ImageEditor fileUrl={fileUrl} file={file} />;
      case 'pdf':
        return <PDFEditor fileUrl={fileUrl} file={file} />;
      case 'text':
        return <TextEditor content={fileUrl} file={file} />;
      case 'video':
        return <VideoPlayer fileUrl={fileUrl} file={file} />;
      case 'audio':
        return <AudioPlayer fileUrl={fileUrl} file={file} />;
      case 'zip':
        return <ZipViewer file={file} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No se puede editar este tipo de archivo</p>
              <p className="text-sm mt-2">Tipo: {fileType}</p>
            </div>
          </div>
        );
    }
  };

  // Modo Inline - Diseño simple sin flotación
  if (isInline) {
    return (
      <div className="file-editor-panel-inline w-full h-full flex flex-col">
        {/* Header Simple */}
        <div className="panel-header-inline glassmorphism-strong p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-xl">
              {fileType === 'image' ? '🖼️' : 
               fileType === 'pdf' ? '📄' : 
               fileType === 'video' ? '🎥' : 
               fileType === 'audio' ? '🎵' : 
               fileType === 'zip' ? '📦' : 
               '📝'}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {file.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center"
            title="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Editor Content */}
        <div className="editor-content flex-1 overflow-auto">
          {renderEditor()}
        </div>
      </div>
    );
  }

  // Modo Flotante (original)
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 glassmorphism rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:scale-105 transition-transform z-50"
        style={{ left: `${pos.x}px`, zIndex }}
        onClick={handleMinimize}
      >
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{fileType === 'image' ? '🖼️' : fileType === 'pdf' ? '📄' : fileType === 'video' ? '🎥' : '📝'}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`file-editor-panel glassmorphism ${isDragging ? 'dragging' : ''} ${isMaximized ? 'maximized' : ''}`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex
      }}
      onClick={onBringToFront}
    >
      {/* Header */}
      <div
        className="panel-header glassmorphism-strong"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="text-xl">
            {fileType === 'image' ? '🖼️' : 
             fileType === 'pdf' ? '📄' : 
             fileType === 'video' ? '🎥' : 
             fileType === 'audio' ? '🎵' : 
             fileType === 'zip' ? '📦' : 
             '📝'}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {file.name}
          </span>
        </div>

        {/* Window Controls */}
        <div className="panel-controls flex items-center space-x-1">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 rounded-lg hover:bg-yellow-500/20 transition-colors flex items-center justify-center"
            title="Minimizar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 rounded-lg hover:bg-green-500/20 transition-colors flex items-center justify-center"
            title="Maximizar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMaximized ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center"
            title="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="editor-content">
        {renderEditor()}
      </div>

      {/* Resize Handle */}
      {!isMaximized && (
        <div
          ref={resizeHandleRef}
          className="resize-handle"
          onMouseDown={handleResizeMouseDown}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default FileEditorPanel;
