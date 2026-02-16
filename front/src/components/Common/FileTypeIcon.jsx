import React from 'react';

/**
 * SVG File Type Icon - consistent across all platforms.
 * Replaces emoji file icons with proper SVG icons.
 */

const FILE_TYPE_CONFIGS = {
  image: { color: '#8b5cf6', label: 'IMG', icon: 'image' },
  video: { color: '#ef4444', label: 'VID', icon: 'video' },
  audio: { color: '#f59e0b', label: 'MP3', icon: 'audio' },
  pdf:   { color: '#dc2626', label: 'PDF', icon: 'pdf' },
  word:  { color: '#2563eb', label: 'DOC', icon: 'word' },
  excel: { color: '#16a34a', label: 'XLS', icon: 'excel' },
  powerpoint: { color: '#ea580c', label: 'PPT', icon: 'powerpoint' },
  text:  { color: '#6b7280', label: 'TXT', icon: 'text' },
  archive: { color: '#a16207', label: 'ZIP', icon: 'archive' },
  file:  { color: '#94a3b8', label: 'FILE', icon: 'file' },
};

const ICON_PATHS = {
  image: (
    <g>
      <circle cx="11" cy="10.5" r="1.5" fill="rgba(255,255,255,0.9)" />
      <path d="M7 15.5l3-3 2 1.5 3-3.5 3 4v1H7z" fill="rgba(255,255,255,0.7)" />
    </g>
  ),
  video: (
    <g>
      <polygon points="11,9.5 11,15.5 16,12.5" fill="rgba(255,255,255,0.9)" />
    </g>
  ),
  audio: (
    <g>
      <path d="M12 9v5.5a1.5 1.5 0 11-1-1.4V10.5l3-.8V9zm-2 5a.5.5 0 100 1 .5.5 0 000-1z" fill="rgba(255,255,255,0.9)" />
      <path d="M14 10l-3 .8" stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" fill="none" />
    </g>
  ),
  pdf: (
    <g fill="rgba(255,255,255,0.9)">
      <rect x="8.5" y="9.5" width="7" height="1" rx="0.3" />
      <rect x="8.5" y="11.5" width="7" height="1" rx="0.3" />
      <rect x="8.5" y="13.5" width="5" height="1" rx="0.3" />
    </g>
  ),
  word: (
    <g fill="rgba(255,255,255,0.95)">
      <path d="M9 10h6M9 12h6M9 14h4" stroke="rgba(255,255,255,0.9)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    </g>
  ),
  excel: (
    <g>
      <rect x="8" y="9" width="3" height="2.2" rx="0.3" fill="rgba(255,255,255,0.5)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" />
      <rect x="11.5" y="9" width="3" height="2.2" rx="0.3" fill="rgba(255,255,255,0.5)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" />
      <rect x="8" y="11.7" width="3" height="2.2" rx="0.3" fill="rgba(255,255,255,0.5)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" />
      <rect x="11.5" y="11.7" width="3" height="2.2" rx="0.3" fill="rgba(255,255,255,0.5)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.4" />
    </g>
  ),
  powerpoint: (
    <g fill="rgba(255,255,255,0.9)">
      <rect x="8.5" y="9" width="7" height="7" rx="1" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" />
      <circle cx="12" cy="12.5" r="2" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" />
    </g>
  ),
  text: (
    <g stroke="rgba(255,255,255,0.8)" strokeWidth="0.7" strokeLinecap="round" fill="none">
      <line x1="9" y1="10" x2="15" y2="10" />
      <line x1="9" y1="11.8" x2="15" y2="11.8" />
      <line x1="9" y1="13.6" x2="13" y2="13.6" />
    </g>
  ),
  archive: (
    <g>
      <rect x="9" y="9" width="6" height="7" rx="0.8" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="0.6" />
      <rect x="10.5" y="9" width="3" height="1.4" rx="0.3" fill="rgba(255,255,255,0.4)" />
      <rect x="10.5" y="10.8" width="3" height="1.4" rx="0.3" fill="rgba(255,255,255,0.4)" />
      <rect x="11" y="13" width="2" height="1.5" rx="0.3" fill="rgba(255,255,255,0.6)" />
    </g>
  ),
  file: (
    <g stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" strokeLinecap="round" fill="none">
      <line x1="9" y1="10.5" x2="15" y2="10.5" />
      <line x1="9" y1="12.5" x2="14" y2="12.5" />
    </g>
  ),
};

const FileTypeIcon = ({ type = 'file', size = 24, className = '' }) => {
  const config = FILE_TYPE_CONFIGS[type] || FILE_TYPE_CONFIGS.file;
  const iconOverlay = ICON_PATHS[config.icon] || ICON_PATHS.file;

  return (
    <svg
      viewBox="0 0 24 22"
      width={size}
      height={size * (22/24)}
      className={`file-type-svg-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* File shape with folded corner */}
      <path
        d="M5 1 L15 1 L19 5 L19 20 C19 20.6 18.6 21 18 21 L6 21 C5.4 21 5 20.6 5 20 L5 2 C5 1.4 5.4 1 6 1 Z"
        fill={config.color}
      />
      {/* Folded corner */}
      <path
        d="M15 1 L15 5 L19 5 Z"
        fill="rgba(255,255,255,0.25)"
      />
      {/* Subtle top highlight */}
      <rect
        x="5" y="1"
        width="14" height="3"
        rx="1" ry="0"
        fill="rgba(255,255,255,0.08)"
      />
      {/* Icon overlay */}
      {iconOverlay}
    </svg>
  );
};

export default FileTypeIcon;
