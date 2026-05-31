'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiAlertTriangle, FiImage, FiVideo, FiMusic, FiArchive, FiFileText } from 'react-icons/fi';
import ImageEditor from './editors/ImageEditor';
import PDFEditor from './editors/PDFEditor';
import TextEditor from './editors/TextEditor';
import VideoPlayer from './editors/VideoPlayer';
import AudioPlayer from './editors/AudioPlayer';
import ZipViewer from './editors/ZipViewer';
import ExcelEditor from './editors/ExcelEditor';
import WordEditor from './editors/WordEditor';
import PowerPointEditor from './editors/PowerPointEditor';
import { getAuthToken } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';
import './FileEditorPanel.css';

const getFileType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
  if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'php'].includes(ext)) return 'text';
  return 'unsupported';
};

interface FileEditorFile {
  id: string;
  name: string;
  path?: string;
  type?: string;
}

interface Position {
  x: number;
  y: number;
}

interface FileEditorPanelProps {
  file: FileEditorFile;
  onClose: () => void;
  position?: Position;
  zIndex?: number;
  onBringToFront: () => void;
  panelId?: string;
  isInline?: boolean;
  onFileSaved?: () => void;
}

const FileEditorPanel: React.FC<FileEditorPanelProps> = ({ file, onClose, position, zIndex, onBringToFront, isInline = false, onFileSaved }) => {
  const { t } = useLanguage();
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [pos, setPos] = useState<Position>(position || { x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizeState, setPreMaximizeState] = useState<{ pos: Position; size: { width: number; height: number } } | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  const fileType = getFileType(file.name);


  useEffect(() => {
    const loadFile = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const authenticatedUrl = `/api/files/preview/${encodeURIComponent(file.id)}?token=${encodeURIComponent(token || '')}`;
        console.log('🔗 [FileEditorPanel] Generated URL:', authenticatedUrl);

        if (['image', 'video', 'audio', 'pdf'].includes(fileType)) {
          console.log('🔗 [FileEditorPanel] Using direct URL for native type:', fileType);
          setFileUrl(authenticatedUrl);
          setLoading(false);
          return;
        }

        console.log('📥 [FileEditorPanel] Fetching blob for processed type:', fileType);
        const response = await fetch(authenticatedUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📥 [FileEditorPanel] Response status:', response.status);

        if (!response.ok) {
          console.error('❌ [FileEditorPanel] Preview fetch failed:', response.status, response.statusText);
          throw new Error(`Error loading file: ${response.status}`);
        }

        if (['zip', 'excel', 'word', 'powerpoint'].includes(fileType)) {
          const blob = await response.blob();
          console.log('[Archive] [FileEditorPanel] Blob created:', blob.size, blob.type);

          if (blob.size === 0 && !['word', 'excel', 'powerpoint'].includes(fileType)) {
             console.error('❌ [FileEditorPanel] Blob is empty');
             throw new Error(t('fileEditor.emptyFile'));
          }

          if (blob.size === 0 && ['word', 'excel', 'powerpoint'].includes(fileType)) {
             console.log('[Text] [FileEditorPanel] Empty file - will allow editing');
          }

          if (blob.size > 0 && (blob.type.includes('text/html') || blob.type.includes('application/json'))) {
             console.warn('[Warning] [FileEditorPanel] Blob type is suspicious for binary file:', blob.type);
             const text = await blob.text();
             console.log('📄 [FileEditorPanel] Suspicious blob content start:', text.substring(0, 100));
             if (text.includes('Error') || text.includes('success":false')) {
                throw new Error(t('fileEditor.serverError'));
             }
          }

          setFileBlob(blob);
          const url = URL.createObjectURL(blob);
          setFileUrl(url);
        } else if (fileType === 'text') {
          const text = await response.text();
          console.log('📄 [FileEditorPanel] Text content loaded, length:', text.length);
          setFileUrl(text);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ [FileEditorPanel] Error loading file:', error);
        setError(t('fileEditor.errorLoading', { error: message }));
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, fileType, t]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.resize-handle')) return;
    if (target.closest('.panel-controls')) return;
    if (target.closest('.editor-content')) return;

    e.preventDefault();
    onBringToFront();

    const panel = panelRef.current;
    const mainPanel = document.querySelector('.main-panel') as HTMLElement | null;

    if (!mainPanel || !panel) return;

    const currentWidth = panel.offsetWidth;
    const currentHeight = panel.offsetHeight;
    setSize({ width: currentWidth, height: currentHeight });

    const panelRect = panel.getBoundingClientRect();
    const offsetX = e.clientX - panelRect.left;
    const offsetY = e.clientY - panelRect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  }, [onBringToFront]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const mainPanel = document.querySelector('.main-panel') as HTMLElement | null;
      const panel = panelRef.current;
      if (!mainPanel || !panel) return;

      const mainPanelRect = mainPanel.getBoundingClientRect();

      const newX = e.clientX - mainPanelRect.left - dragOffset.x;
      const newY = e.clientY - mainPanelRect.top - dragOffset.y;

      const panelHeaderMain = document.querySelector('.panel-header-main') as HTMLElement | null;
      const headerHeight = panelHeaderMain ? panelHeaderMain.offsetHeight : 0;

      const maxX = mainPanel.offsetWidth - panel.offsetWidth - 40;
      const maxY = mainPanel.offsetHeight - panel.offsetHeight - 40;
      const minX = 40;
      const minY = headerHeight + 60;

      setPos({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMaximize = () => {
    if (isMaximized) {
      if (preMaximizeState) {
        setPos(preMaximizeState.pos);
        setSize(preMaximizeState.size);
      }
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

    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-red-500">
          <div className="text-center">
            <p className="text-xl mb-2"><FiAlertTriangle /></p>
            <p>{error}</p>
          </div>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return <ImageEditor fileUrl={fileUrl || ''} file={file} />;
      case 'pdf':
        return <PDFEditor fileUrl={fileUrl || ''} file={file} onFileSaved={onFileSaved} />;
      case 'text':
        return <TextEditor content={fileUrl || ''} file={file} />;
      case 'video':
        return <VideoPlayer fileUrl={fileUrl || ''} file={file} />;
      case 'audio':
        return <AudioPlayer fileUrl={fileUrl || ''} file={file} />;
      case 'zip':
        return <ZipViewer file={fileBlob} fileUrl={fileUrl} onClose={onClose} />;
      case 'word':
        return <WordEditor fileBlob={fileBlob} fileUrl={fileUrl || undefined} file={file} onClose={onClose} onFileSaved={onFileSaved} />;
      case 'excel':
        return <ExcelEditor fileBlob={fileBlob} fileUrl={fileUrl || undefined} file={file} onClose={onClose} onFileSaved={onFileSaved} />;
      case 'powerpoint':
        return <PowerPointEditor fileBlob={fileBlob} fileUrl={fileUrl || undefined} file={file} onClose={onClose} onFileSaved={onFileSaved} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>{t('fileEditor.cannotEdit')}</p>
              <p className="text-sm mt-2">{t('fileEditor.type', { type: fileType })}</p>
            </div>
          </div>
        );
    }
  };

  if (isInline) {
    return (
      <div className="file-editor-panel-inline w-full h-full flex flex-col">

        <div className="panel-header-inline glassmorphism-strong p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-xl">
              {fileType === 'image' ? <FiImage /> :
               fileType === 'pdf' ? '📄' :
               fileType === 'video' ? <FiVideo /> :
               fileType === 'audio' ? <FiMusic /> :
               fileType === 'zip' ? <FiArchive /> :
               <FiFileText />}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
              {file.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center"
            title={t('common.close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="editor-content flex-1 overflow-auto">
          {renderEditor()}
        </div>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 glassmorphism rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:scale-105 transition-transform z-50"
        style={{ left: `${pos.x}px`, zIndex }}
        onClick={handleMinimize}
      >
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{fileType === 'image' ? <FiImage /> : fileType === 'pdf' ? '📄' : fileType === 'video' ? <FiVideo /> : <FiFileText />}</span>
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

      <div
        className="panel-header glassmorphism-strong"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="text-xl">
            {fileType === 'image' ? <FiImage /> :
             fileType === 'pdf' ? '📄' :
             fileType === 'video' ? <FiVideo /> :
             fileType === 'audio' ? <FiMusic /> :
             fileType === 'zip' ? <FiArchive /> :
             <FiFileText />}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {file.name}
          </span>
        </div>


        <div className="panel-controls flex items-center space-x-1">
          <button
            onClick={handleMinimize}
            className="w-8 h-8 rounded-lg hover:bg-yellow-500/20 transition-colors flex items-center justify-center"
            title={t('common.minimize')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="w-8 h-8 rounded-lg hover:bg-green-500/20 transition-colors flex items-center justify-center"
            title={t('common.maximize')}
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
            title={t('common.close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>


      <div className="editor-content">
        {renderEditor()}
      </div>
    </div>
  );
};

export default FileEditorPanel;
