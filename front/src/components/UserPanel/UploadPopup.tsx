'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './UploadPopup.css';

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

type UploadItem = {
  id: number;
  name: string;
  status: UploadStatus;
  totalSize?: number;
  loadedSize?: number;
  percent?: number;
  speed?: number;
  remainingTime?: number;
  errorMessage?: string | null;
};

type UploadPopupProps = {
  uploads: UploadItem[];
  onClose: () => void;
  onCancel?: (id: number) => void;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatTime = (seconds: number): string => {
  if (!seconds || seconds === Infinity || seconds < 0) return '--:--';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const UploadPopup = ({ uploads, onClose, onCancel }: UploadPopupProps) => {
  const { t } = useLanguage();
  const [minimized, setMinimized] = useState(false);
  const [visible, setVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const allDone = uploads.length > 0 && uploads.every(u => u.status === 'done' || u.status === 'error');
  const hasErrors = uploads.some(u => u.status === 'error');

  useEffect(() => {
    if (allDone && !hasErrors) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose(), 400);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [allDone, hasErrors, onClose]);

  if (uploads.length === 0) return null;

  const completedCount = uploads.filter(u => u.status === 'done').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;
  const totalCount = uploads.length;

  const totalBytes = uploads.reduce((acc, u) => acc + (u.totalSize || 0), 0);
  const loadedBytes = uploads.reduce((acc, u) => acc + (u.loadedSize || 0), 0);
  const overallPercent = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;

  const activeUploads = uploads.filter(u => u.status === 'uploading' && (u.remainingTime || 0) > 0);
  const maxRemaining = activeUploads.length > 0
    ? Math.max(...activeUploads.map(u => u.remainingTime || 0))
    : 0;

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'done':
        return (
          <svg className="upload-item-status-icon done" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'error':
        return (
          <svg className="upload-item-status-icon error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        );
      case 'uploading':
        return <div className="upload-item-spinner" />;
      default:
        return (
          <svg className="upload-item-status-icon pending" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
    }
  };

  const headerText = allDone
    ? (hasErrors
        ? t('upload.completedWithErrors', { done: completedCount, errors: errorCount })
        : t('upload.allComplete', { count: completedCount }))
    : t('upload.uploading', { current: completedCount + uploadingCount, total: totalCount });

  return (
    <div
      ref={containerRef}
      className={`upload-popup ${minimized ? 'minimized' : ''} ${!visible ? 'hiding' : ''}`}
    >

      <div className="upload-popup-header" onClick={() => setMinimized(!minimized)}>
        <div className="upload-popup-header-left">
          {!allDone && (
            <div className="upload-popup-header-spinner" />
          )}
          <span className="upload-popup-header-text">{headerText}</span>
        </div>
        <div className="upload-popup-header-actions">
          <button
            className="upload-popup-btn"
            onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
            title={minimized ? t('upload.expand') : t('upload.minimize')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              {minimized
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />
              }
            </svg>
          </button>
          <button
            className="upload-popup-btn"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title={t('upload.close')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>


      {!allDone && (
        <div className="upload-popup-overall">
          <div className="upload-popup-overall-bar">
            <div
              className="upload-popup-overall-fill"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          {maxRemaining > 0 && (
            <span className="upload-popup-overall-time">
              {formatTime(maxRemaining)} {t('upload.remaining')}
            </span>
          )}
        </div>
      )}


      {!minimized && (
        <div className="upload-popup-list">
          {uploads.map((upload) => (
            <div key={upload.id} className={`upload-popup-item ${upload.status}`}>
              <div className="upload-item-icon">
                {getStatusIcon(upload.status)}
              </div>
              <div className="upload-item-info">
                <div className="upload-item-name" title={upload.name}>
                  {upload.name}
                </div>
                <div className="upload-item-details">
                  {upload.status === 'uploading' && (
                    <>
                      <span>{formatFileSize(upload.loadedSize || 0)} / {formatFileSize(upload.totalSize || 0)}</span>
                      {(upload.speed || 0) > 0 && (
                        <span className="upload-item-speed">* {formatFileSize(upload.speed || 0)}/s</span>
                      )}
                      {(upload.remainingTime || 0) > 0 && (
                        <span className="upload-item-remaining">* {formatTime(upload.remainingTime || 0)}</span>
                      )}
                    </>
                  )}
                  {upload.status === 'done' && (
                    <span className="upload-item-done-size">{formatFileSize(upload.totalSize || 0)}</span>
                  )}
                  {upload.status === 'error' && (
                    <span className="upload-item-error-msg">{upload.errorMessage || t('upload.error')}</span>
                  )}
                  {upload.status === 'pending' && (
                    <span className="upload-item-pending">{t('upload.waiting')}</span>
                  )}
                </div>

                {upload.status === 'uploading' && (
                  <div className="upload-item-progress">
                    <div
                      className="upload-item-progress-fill"
                      style={{ width: `${upload.percent || 0}%` }}
                    />
                  </div>
                )}
              </div>
              {upload.status === 'uploading' && onCancel && (
                <button
                  className="upload-item-cancel"
                  onClick={() => onCancel(upload.id)}
                  title={t('upload.cancel')}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadPopup;
