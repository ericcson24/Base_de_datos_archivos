import React from 'react';

/**
 * SVG Folder Icon - consistent across all platforms.
 * Supports custom color and size.
 * 
 * Icon options:
 *  - 'default'  : classic folder
 *  - 'open'     : open folder
 *  - 'star'     : folder with star
 *  - 'heart'    : folder with heart
 *  - 'lock'     : folder with lock
 *  - 'shared'   : folder with share icon
 *  - 'music'    : folder with music note
 *  - 'photos'   : folder with image icon
 *  - 'docs'     : folder with document
 *  - 'code'     : folder with code brackets
 *  - 'download' : folder with down arrow
 *  - 'work'     : folder with briefcase
 */

const FOLDER_ICONS = {
  default: null,
  star: (
    <path d="M18 13.5l-1.2 1.1.3 1.7-1.5-.9-1.5.9.3-1.7-1.2-1.1 1.7-.2.7-1.5.7 1.5z" 
          fill="rgba(255,255,255,0.95)" />
  ),
  heart: (
    <path d="M18 13.8c0-.5-.2-.9-.5-1.2-.7-.7-1.8-.7-2.5 0l-.5.5-.5-.5c-.7-.7-1.8-.7-2.5 0-.3.3-.5.7-.5 1.2 0 .4.2.8.5 1.1l3 2.8 3-2.8c.3-.3.5-.7.5-1.1z" 
          fill="rgba(255,255,255,0.95)" />
  ),
  lock: (
    <path d="M17.5 14h-.5v-1a2 2 0 10-4 0v1h-.5a.5.5 0 00-.5.5v3a.5.5 0 00.5.5h5a.5.5 0 00.5-.5v-3a.5.5 0 00-.5-.5zm-1.5 0h-2v-1a1 1 0 112 0v1z" 
          fill="rgba(255,255,255,0.95)" />
  ),
  shared: (
    <g fill="rgba(255,255,255,0.95)">
      <circle cx="17.5" cy="12" r="1" />
      <circle cx="13.5" cy="14.5" r="1" />
      <circle cx="17.5" cy="17" r="1" />
      <line x1="14.4" y1="14" x2="16.6" y2="12.5" stroke="rgba(255,255,255,0.95)" strokeWidth="0.6" />
      <line x1="14.4" y1="15" x2="16.6" y2="16.5" stroke="rgba(255,255,255,0.95)" strokeWidth="0.6" />
    </g>
  ),
  music: (
    <path d="M17 11v4.5a1.5 1.5 0 11-1-1.4V12.5l3-1V11zm-3 4.5a.5.5 0 10-1 0 .5.5 0 001 0z" 
          fill="rgba(255,255,255,0.95)" />
  ),
  photos: (
    <g fill="rgba(255,255,255,0.95)">
      <rect x="12.5" y="11.5" width="7" height="5" rx="0.5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.6" />
      <circle cx="14.5" cy="13.2" r="0.7" />
      <path d="M12.5 15.5l2-1.5 1.5 1 2-2 1.5 1.5v1h-7z" />
    </g>
  ),
  docs: (
    <g fill="rgba(255,255,255,0.95)">
      <rect x="13" y="11" width="5" height="6.5" rx="0.5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.6" />
      <line x1="14.2" y1="13" x2="16.8" y2="13" stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" />
      <line x1="14.2" y1="14.3" x2="16.8" y2="14.3" stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" />
      <line x1="14.2" y1="15.6" x2="15.8" y2="15.6" stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" />
    </g>
  ),
  code: (
    <g stroke="rgba(255,255,255,0.95)" strokeWidth="0.8" fill="none" strokeLinecap="round">
      <polyline points="14,12.5 12.5,14.2 14,16" />
      <polyline points="17,12.5 18.5,14.2 17,16" />
      <line x1="16" y1="12" x2="15" y2="16.5" />
    </g>
  ),
  download: (
    <g stroke="rgba(255,255,255,0.95)" strokeWidth="0.7" fill="none" strokeLinecap="round">
      <line x1="15.5" y1="11.5" x2="15.5" y2="15.5" />
      <polyline points="13.5,14 15.5,16 17.5,14" />
      <line x1="13" y1="17" x2="18" y2="17" />
    </g>
  ),
  work: (
    <g fill="rgba(255,255,255,0.95)">
      <rect x="12.5" y="12.5" width="6" height="4.5" rx="0.5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.6" />
      <path d="M14 12.5v-1a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.6" />
    </g>
  ),
};

const FolderIcon = ({ color = '#5f9ee9', icon = 'default', size = 24, className = '' }) => {
  // Ensure color is valid
  const folderColor = color || '#5f9ee9';
  
  // Darken the color slightly for the tab
  const darken = (hex, amount = 0.15) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return `rgb(${r},${g},${b})`;
  };

  const tabColor = darken(folderColor.startsWith('#') ? folderColor : '#5f9ee9');
  const overlay = FOLDER_ICONS[icon] || null;

  return (
    <svg
      viewBox="0 0 24 20"
      width={size}
      height={size * (20/24)}
      className={`folder-svg-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Folder tab */}
      <path
        d="M1 4 C1 2.9 1.9 2 3 2 L9 2 C9.6 2 10.1 2.3 10.4 2.7 L11.6 4.3 C11.9 4.7 12.4 5 13 5 L21 5 C22.1 5 23 5.9 23 7 L23 7 L1 7 Z"
        fill={tabColor}
      />
      {/* Folder body */}
      <rect
        x="1" y="6"
        width="22" height="13"
        rx="2" ry="2"
        fill={folderColor}
      />
      {/* Subtle highlight */}
      <rect
        x="1" y="6"
        width="22" height="3"
        rx="2" ry="0"
        fill="rgba(255,255,255,0.12)"
      />
      {/* Optional overlay icon */}
      {overlay}
    </svg>
  );
};

// Available colors for the color picker
export const FOLDER_COLORS = [
  { name: 'Azul', value: '#5f9ee9' },
  { name: 'Azul oscuro', value: '#4a7cc4' },
  { name: 'Rojo', value: '#e85d5d' },
  { name: 'Rosa', value: '#e88db5' },
  { name: 'Naranja', value: '#e8a44d' },
  { name: 'Amarillo', value: '#e8d44d' },
  { name: 'Verde', value: '#5dba6e' },
  { name: 'Verde azulado', value: '#4db8a8' },
  { name: 'Morado', value: '#9b7fe8' },
  { name: 'Gris', value: '#8e9aaf' },
  { name: 'Marrón', value: '#a07855' },
  { name: 'Negro', value: '#4a5568' },
];

// Available icon options
export const FOLDER_ICON_OPTIONS = [
  { name: 'Por defecto', value: 'default' },
  { name: 'Estrella', value: 'star' },
  { name: 'Corazón', value: 'heart' },
  { name: 'Candado', value: 'lock' },
  { name: 'Compartido', value: 'shared' },
  { name: 'Música', value: 'music' },
  { name: 'Fotos', value: 'photos' },
  { name: 'Documentos', value: 'docs' },
  { name: 'Código', value: 'code' },
  { name: 'Descargas', value: 'download' },
  { name: 'Trabajo', value: 'work' },
];

export default FolderIcon;
