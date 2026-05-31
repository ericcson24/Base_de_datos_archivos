'use client';

import React, { useState, useEffect } from 'react';
import ContextMenu from './ContextMenu';
import { getFileType, canPreview, canEdit, formatFileSize, downloadFile, getAuthenticatedPreviewUrl, getAuthToken } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';
import FolderIcon from '../common/FolderIcon';
import FileTypeIcon from '../common/FileTypeIcon';

type FileItemData = {
  id: string;
  name: string;
  type: string;
  size?: number;
  path?: string;
  shared?: boolean;
  owner?: string;
  ownerAvatarUrl?: string;
  sharedWith?: string[];
  permission?: string;
  folder_color?: string;
  folder_icon?: string;
  ai_excluded?: boolean;
};

type DraggedFile = {
  id: string;
  name: string;
  path?: string;
};

type FileItemProps = {
  item: FileItemData;
  onFolderClick: (item: FileItemData) => void;
  onDelete: (item: FileItemData) => void;
  onRename: (item: FileItemData) => void;
  onMove: (item: FileItemData) => void;
  onView: (item: FileItemData) => void;
  onOpenSidebar: (item: FileItemData, action: string) => void;
  onEdit?: (item: FileItemData) => void;
  onDuplicate: (item: FileItemData) => void;
  onShare: (item: FileItemData) => void;
  onUnshare?: (item: FileItemData) => void;
  onDragStart: (item: FileItemData, e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDropToFolder?: (draggedFile: DraggedFile, folder: FileItemData) => void;
  viewMode?: 'list' | 'grid';
  isSharedView?: boolean;
  onSaveToMyFiles?: (item: FileItemData) => void;
  onRemoveShared?: (item: FileItemData) => void;
  onCustomizeFolder?: (item: FileItemData) => void;
  onToggleAIExclude?: (item: FileItemData) => void;
  onPinToPanel?: (item: FileItemData) => void;
  onUnpinFromPanel?: (item: FileItemData) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildExcelPreviewHtml = (XLSX: any, ws: any): string => {
  const hasData = ws && ws['!ref'];
  const range = hasData ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 7, c: 5 } };
  const maxR = Math.min(hasData ? range.e.r : 7, 15);
  const maxC = Math.min(hasData ? range.e.c : 5, 10);
  let html = '<table><thead><tr><th></th>';
  for (let c = 0; c <= maxC; c++) {
    const letter = c < 26 ? String.fromCharCode(65 + c) : String.fromCharCode(64 + Math.floor(c / 26)) + String.fromCharCode(65 + (c % 26));
    html += `<th>${letter}</th>`;
  }
  html += '</tr></thead><tbody>';
  for (let r = 0; r <= maxR; r++) {
    html += `<tr><td style="background:#f3f4f6;font-weight:600;text-align:center;color:#6b7280;min-width:28px">${r + 1}</td>`;
    for (let c = 0; c <= maxC; c++) {
      if (hasData) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        let val = '';
        let style = '';
        if (cell) {
          val = cell.w || (cell.v != null ? String(cell.v) : '');
          if (cell.t === 'n' && !cell.w) val = String(cell.v);
          val = val.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          if (typeof cell.v === 'number') style += 'text-align:right;';
        }
        html += `<td style="${style}">${val}</td>`;
      } else {
        html += '<td></td>';
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildPptxPreviewHtml = async (zip: any): Promise<string | null> => {
  const slideFiles = Object.keys(zip.files)
    .filter((f: string) => /ppt\/slides\/slide\d+\.xml/.test(f))
    .sort((a: string, b: string) => {
      const nA = parseInt((a.match(/slide(\d+)/) as RegExpMatchArray)[1]);
      const nB = parseInt((b.match(/slide(\d+)/) as RegExpMatchArray)[1]);
      return nA - nB;
    });

  if (slideFiles.length === 0) return null;

  const slides: { title: string; contents: string[] }[] = [];
  for (const sf of slideFiles.slice(0, 2)) {
    const xml = await zip.file(sf).async('text');
    let title = '';
    let contents: string[] = [];

    const spMatches = xml.match(/<p:sp[\s>]([\s\S]*?)<\/p:sp>/g) || [];
    for (const sp of spMatches) {
      const isTitle = /<p:ph[^>]*type="(title|ctrTitle)"/i.test(sp);
      const textMatches = sp.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      if (textMatches) {
        const text = textMatches.map((m: string) => m.replace(/<[^>]+>/g, '')).filter((tx: string) => tx.trim()).join(' ');
        if (text.trim()) {
          if (isTitle && !title) {
            title = text.trim();
          } else {
            contents.push(text.trim());
          }
        }
      }
    }

    if (!title && contents.length === 0) {
      const allTextMatches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g);
      if (allTextMatches) {
        const allTexts = allTextMatches.map((m: string) => m.replace(/<[^>]+>/g, '')).filter((tx: string) => tx.trim());
        if (allTexts.length > 0) {
          title = allTexts[0];
          contents = allTexts.slice(1, 5);
        }
      }
    }

    if (!title && contents.length > 0) {
      title = contents.shift() as string;
    }

    slides.push({ title, contents: contents.slice(0, 4) });
  }

  const hasContent = slides.some(s => s.title || s.contents.length > 0);

  const slideHtml = slides.length > 0 ? slides.map((s) => {
    let h = '<div class="pptx-slide">';
    if (s.title) {
      h += `<div class="pptx-title">${s.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`;
    } else if (!hasContent) {
      h += '<div class="pptx-empty-placeholder">📽️</div>';
    }
    if (s.contents.length > 0) {
      h += s.contents.map(c => `<div class="pptx-content">${c.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`).join('');
    }
    h += '</div>';
    return h;
  }).join('') : '<div class="pptx-slide"><div class="pptx-empty-placeholder">📽️</div></div>';

  return slideHtml;
};

type OfficePreviewProps = {
  fileId: string;
  fileType: string;
  fileName: string;
};

const OfficePreview = React.memo(({ fileId, fileType, fileName }: OfficePreviewProps) => {
  const [content, setContent] = useState<{ type: string; data: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = getAuthToken();
        const url = `/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`;
        const resp = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        if (!resp.ok) throw new Error('Failed');
        const buf = await resp.arrayBuffer();
        if (buf.byteLength === 0) throw new Error('Empty');

        if (fileType === 'word') {
          const mammothModule = await import('mammoth');
          const mammoth = mammothModule.default || mammothModule;
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) setContent({ type: 'html', data: result.value });

        } else if (fileType === 'excel') {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellStyles: true, cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const html = buildExcelPreviewHtml(XLSX, ws);
          if (!cancelled) setContent({ type: 'html', data: html });

        } else if (fileType === 'powerpoint') {
          const JSZipModule = await import('jszip');
          const JSZip = JSZipModule.default || JSZipModule;
          const zip = await JSZip.loadAsync(buf);
          const html = await buildPptxPreviewHtml(zip);
          if (html && !cancelled) {
            setContent({ type: 'html', data: html });
          } else if (!cancelled) {
            setError(true);
          }
        }
      } catch (e) {
        if (!cancelled) setError(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fileId, fileType, fileName]);

  if (error || !content) {
    return (
      <div className="office-preview-fallback">
        <FileTypeIcon type={fileType} size={48} />
      </div>
    );
  }

  const previewClass = fileType === 'excel' ? 'excel-preview'
    : fileType === 'powerpoint' ? 'powerpoint-preview'
    : 'word-preview';

  return (
    <div className="office-preview-content">
      <div
        className={`office-preview-html ${previewClass}`}
        dangerouslySetInnerHTML={{ __html: content.data }}
      />
    </div>
  );
});

OfficePreview.displayName = 'OfficePreview';

type OwnerAvatarProps = {
  username?: string;
  url?: string;
  size?: number;
  title?: string;
};

const OwnerAvatar = ({ username, url, size = 20, title }: OwnerAvatarProps) => {
  const [errored, setErrored] = useState(false);
  const initial = (username || '?').trim().charAt(0).toUpperCase();
  let hash = 0;
  for (let i = 0; i < (username || '').length; i++) hash = (hash * 31 + (username as string).charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue}, 55%, 55%)`;
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color: '#fff', fontSize: Math.max(10, Math.floor(size * 0.45)),
    fontWeight: 700, flexShrink: 0, overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
  };
  if (url && !errored) {
    return (
      <img
        src={url}
        alt={username || ''}
        title={title || username}
        style={{ ...style, background: '#eee', objectFit: 'cover' }}
        onError={() => setErrored(true)}
        loading="lazy"
      />
    );
  }
  return <span style={style} title={title || username}>{initial}</span>;
};

const FileItem = ({ item, onFolderClick, onDelete, onRename, onMove, onView, onOpenSidebar, onEdit, onDuplicate, onShare, onUnshare, onDragStart, onDragEnd, onDropToFolder, viewMode = 'list', isSharedView = false, onSaveToMyFiles, onRemoveShared, onCustomizeFolder, onToggleAIExclude, onPinToPanel, onUnpinFromPanel }: FileItemProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isDragOverFolder, setIsDragOverFolder] = useState(false);
  const { t } = useLanguage();

  const fileType = item.type === 'file' ? getFileType(item.name) : '';
  const isOfficeType = ['word', 'excel', 'powerpoint'].includes(fileType);

  useEffect(() => {
    if (item.type !== 'file' || !canPreview(item.name)) return;

    let cancelled = false;
    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(false);
      try {
        const url = await getAuthenticatedPreviewUrl(item.id, item.name);
        if (!cancelled && url) {
          setPreviewUrl(url);
        }
      } catch (err) {
        if (!cancelled) setPreviewError(true);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };
    loadPreview();
    return () => { cancelled = true; };
  }, [item.id, item.name, item.type]);

  const handleDragStart = (e: React.DragEvent) => {
    if (item.type === 'file') {
      e.dataTransfer.setData('application/x-internal-file', JSON.stringify({ id: item.id, name: item.name, path: item.path }));
      e.dataTransfer.effectAllowed = 'move';
      onDragStart(item, e);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (item.type === 'file') {
      onDragEnd(e);
    }
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    if (item.type !== 'folder') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-internal-file')) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOverFolder(true);
    }
  };

  const handleFolderDragEnter = (e: React.DragEvent) => {
    if (item.type !== 'folder') return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-internal-file')) {
      setIsDragOverFolder(true);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    if (item.type !== 'folder') return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setIsDragOverFolder(false);
    }
  };

  const handleFolderDrop = (e: React.DragEvent) => {
    if (item.type !== 'folder') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFolder(false);

    const internalData = e.dataTransfer.getData('application/x-internal-file');
    if (internalData && onDropToFolder) {
      try {
        const draggedFile = JSON.parse(internalData);
        onDropToFolder(draggedFile, item);
      } catch (err) {
        console.error('Error parsing drag data:', err);
      }
    }
  };

  const handleClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item);
    } else {
      if (canPreview(item.name) || canEdit(item.name)) {
        onView(item);
      }
      else {
        downloadFile(item.id, item.name, t);
      }
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!menuOpen) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const menuHeight = 350;
      const menuWidth = 200;

      let top = rect.bottom + 8;
      let left = rect.right - menuWidth;

      if (top + menuHeight > window.innerHeight) {
        const spaceAbove = rect.top - 8;
        const spaceBelow = window.innerHeight - rect.bottom - 8;

        if (spaceAbove > spaceBelow) {
          top = Math.max(8, rect.top - menuHeight - 8);
        } else {
          top = rect.bottom + 8;
        }
      }

      if (left < 8) {
        left = Math.max(8, rect.left);
      }

      if (left + menuWidth > window.innerWidth) {
        left = Math.max(8, window.innerWidth - menuWidth - 8);
      }

      setMenuPosition({ top, left });
    }

    setMenuOpen(!menuOpen);
  };

  const handleMouseEnter = () => {};
  const handleMouseLeave = () => {};

  const renderFileMenuItems = () => {
    const canShowPreview = canPreview(item.name);
    const isShared = isSharedView || item.shared;

    const isRecipient = isShared && item.owner && item.owner !== 'me' && !item.sharedWith;
    const isReadOnly = isRecipient && item.permission === 'read';

    return (
      <>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleClick(); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{t('contextMenu.open')}</span>
        </button>
        {!isReadOnly && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit ? onEdit(item) : onOpenSidebar(item, 'edit'); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>{t('contextMenu.editInPanel')}</span>
          </button>
        )}
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t('contextMenu.info')}</span>
        </button>
        {canShowPreview ? (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onView(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>{t('contextMenu.preview')}</span>
          </button>
        ) : null}
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); downloadFile(item.id, item.name, t); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{t('contextMenu.download')}</span>
        </button>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{t('contextMenu.duplicate')}</span>
        </button>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>{t('contextMenu.move')}</span>
        </button>
        {!isRecipient && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>{t('contextMenu.share')}</span>
          </button>
        )}
        {isRecipient && onPinToPanel && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onPinToPanel(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z M12 11v6 M9 14h6" />
            </svg>
            <span>{t('contextMenu.pinToPanel') || 'Anclar al panel'}</span>
          </button>
        )}
        {isRecipient && onUnpinFromPanel && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onUnpinFromPanel(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>{t('contextMenu.unpinFromPanel') || 'Quitar del panel'}</span>
          </button>
        )}
        {isRecipient && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigator.clipboard.writeText(item.path || ''); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{t('contextMenu.copyPath') || 'Copiar ruta'}</span>
          </button>
        )}
        {isRecipient && onSaveToMyFiles && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onSaveToMyFiles(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>{t('contextMenu.saveToMyFiles') || 'Guardar en mis archivos'}</span>
          </button>
        )}
        {isReadOnly && (
          <div style={{ padding: '6px 12px', fontSize: 11, color: '#f59e0b', fontStyle: 'italic' }}>
            {t('share.permRead') || 'Solo lectura'}
          </div>
        )}
        {item.shared && item.sharedWith && item.sharedWith.length > 0 && onUnshare && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onUnshare(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <span>{t('contextMenu.unshare') || 'Dejar de compartir'}</span>
          </button>
        )}
        <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>{t('contextMenu.rename')}</span>
        </button>
        {onToggleAIExclude && (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onToggleAIExclude(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {item.ai_excluded
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              }
            </svg>
            <span>{item.ai_excluded ? t('contextMenu.includeInAI') || 'Incluir en IA' : t('contextMenu.excludeFromAI') || 'Excluir de IA'}</span>
          </button>
        )}
        <button className="context-menu-danger" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (isRecipient && onRemoveShared) { onRemoveShared(item); } else { onDelete(item); } }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>{isRecipient ? (t('contextMenu.removeFromShared') || t('contextMenu.delete')) : t('contextMenu.delete')}</span>
        </button>
      </>
    );
  };

  const renderFolderMenuItems = () => {
    const isShared = isSharedView || item.shared;
    const isRecipient = isShared && item.owner && item.owner !== 'me' && !item.sharedWith;
    return (
    <>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); onFolderClick(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
        <span>{t('contextMenu.open')}</span>
      </button>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{t('contextMenu.info')}</span>
      </button>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>{t('contextMenu.duplicate')}</span>
      </button>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span>{t('contextMenu.move')}</span>
      </button>
      {!isRecipient && (
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>{t('contextMenu.share')}</span>
        </button>
      )}
      <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>{t('contextMenu.rename')}</span>
      </button>
      {onCustomizeFolder && (
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onCustomizeFolder(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          <span>{t('contextMenu.customizeFolder') || 'Personalizar carpeta'}</span>
        </button>
      )}
      {onToggleAIExclude && (
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onToggleAIExclude(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {item.ai_excluded
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            }
          </svg>
          <span>{item.ai_excluded ? t('contextMenu.includeInAI') || 'Incluir en IA' : t('contextMenu.excludeFromAI') || 'Excluir de IA'}</span>
        </button>
      )}
      <button className="context-menu-danger" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (isRecipient && onRemoveShared) { onRemoveShared(item); } else { onDelete(item); } }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>{isRecipient ? (t('contextMenu.removeFromShared') || t('contextMenu.delete')) : t('contextMenu.delete')}</span>
      </button>
    </>
    );
  };

  const renderFilePreview = (size: 'grid' | 'list' = 'grid') => {
    const iconSize = size === 'grid' ? 48 : 28;
    const containerClass = size === 'grid' ? 'grid-preview-container' : 'list-preview-container';

    if (previewLoading && !isOfficeType) {
      return (
        <div className={`${containerClass} preview-loading`}>
          <div className="preview-spinner" />
        </div>
      );
    }

    if (isOfficeType) {
      if (size === 'grid') {
        return (
          <div className={containerClass}>
            <OfficePreview fileId={item.id} fileType={fileType} fileName={item.name} />
            <div className="preview-ext-badge">
              {item.name.split('.').pop()?.toUpperCase()}
            </div>
          </div>
        );
      }
      return <FileTypeIcon type={fileType} size={iconSize} />;
    }

    if (previewUrl && !previewError && canPreview(item.name)) {
      return (
        <div className={containerClass}>
          {fileType === 'image' && (
            <img
              src={previewUrl}
              alt={item.name}
              className="item-preview-image"
              loading="lazy"
              onError={() => setPreviewError(true)}
            />
          )}
          {fileType === 'pdf' && (
            <img
              src={`${previewUrl}&page=1`}
              alt={item.name}
              className="item-preview-pdf"
              loading="lazy"
              onError={(e) => {
                if (size === 'grid') {
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const next = img.nextSibling as HTMLElement | null;
                  if (next) next.style.display = 'block';
                } else {
                  setPreviewError(true);
                }
              }}
            />
          )}
          {fileType === 'pdf' && size === 'grid' && (
            <iframe
              src={previewUrl}
              className="item-preview-pdf-iframe"
              title={item.name}
              style={{ display: 'none' }}
            />
          )}
          {fileType === 'video' && (
            <video
              className="item-preview-video"
              muted
              preload="metadata"
              onError={() => setPreviewError(true)}
            >
              <source src={previewUrl} />
            </video>
          )}
          {fileType === 'text' && size === 'grid' && (
            <iframe
              src={previewUrl}
              className="item-preview-text"
              title={item.name}
            />
          )}
          {fileType === 'text' && size === 'list' && (
            <FileTypeIcon type={fileType} size={iconSize} />
          )}

          <div className="preview-ext-badge">
            {item.name.split('.').pop()?.toUpperCase()}
          </div>
        </div>
      );
    }

    return <FileTypeIcon type={fileType} size={iconSize} />;
  };

  if (item.type === 'file') {

    if (viewMode === 'grid') {
      return (
        <div
          className={`group relative file-grid-item cursor-pointer overflow-hidden ${item.shared ? 'shared-item' : ''}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="aspect-square p-2 flex items-center justify-center grid-thumbnail"
            draggable={item.type === 'file'}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {renderFilePreview('grid')}
          </div>

          <div className="p-2 grid-file-info">
            <h3 className="file-grid-name" title={item.name}>
              {item.name}
            </h3>
            {item.shared && (
              <div className="flex items-center text-xs text-gray-500 mt-1">
                {item.owner && item.owner !== 'me' && !item.sharedWith && (
                  <span className="mr-1"><OwnerAvatar username={item.owner} url={item.ownerAvatarUrl} size={16} /></span>
                )}
                <svg className="shared-icon-svg mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {item.owner && item.owner !== 'me' && !item.sharedWith ? (
                  <span className="text-[10px] text-blue-500 truncate">{t('contextMenu.from', { owner: item.owner })}</span>
                ) : item.sharedWith && item.sharedWith.length > 0 ? (
                  <span className="text-[10px] text-blue-500 truncate" title={item.sharedWith.join(', ')}>{t('contextMenu.sharedWithUsers', { users: item.sharedWith.join(', ') })}</span>
                ) : (
                  <span className="text-[10px] text-green-600">{t('contextMenu.shared')}</span>
                )}
                {item.permission === 'read' && !item.sharedWith && (
                  <span className="ml-1 px-1 rounded" style={{ fontSize: 9, background: 'rgba(245,158,11,0.18)', color: '#f59e0b', fontWeight: 600 }}>{t('share.permRead') || 'Solo lectura'}</span>
                )}
              </div>
            )}
            <p className="file-grid-size">
              {item.size ? formatFileSize(item.size) : ''}
            </p>
          </div>

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="grid-menu-button"
              onClick={handleMenuClick}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>

          <ContextMenu
            isOpen={menuOpen}
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          >
            {renderFileMenuItems()}
          </ContextMenu>
        </div>
      );
    } else {
      return (
        <div
          className={`drive-file-row ${item.shared ? 'shared-item' : ''}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="thumbnail cursor-grab active:cursor-grabbing"
            draggable={item.type === 'file'}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="file-icon">
              {renderFilePreview('list')}
            </div>
          </div>
          <div className="file-name" title={item.name}>
            {item.name}
            {item.shared && (
              <span className="shared-label ml-2 text-xs text-gray-500 flex items-center">
                {item.owner && item.owner !== 'me' && !item.sharedWith && (
                  <span className="mr-1"><OwnerAvatar username={item.owner} url={item.ownerAvatarUrl} size={16} /></span>
                )}
                <svg className="shared-icon-svg mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {item.owner && item.owner !== 'me' && !item.sharedWith ? (
                  <span className="text-[10px] text-blue-500">{t('contextMenu.from', { owner: item.owner })}</span>
                ) : item.sharedWith && item.sharedWith.length > 0 ? (
                  <span className="text-[10px] text-blue-500" title={item.sharedWith.join(', ')}>{t('contextMenu.sharedWithUsers', { users: item.sharedWith.join(', ') })}</span>
                ) : (
                  <span className="text-[10px] text-green-600">{t('contextMenu.shared')}</span>
                )}
                {item.permission === 'read' && !item.sharedWith && (
                  <span className="ml-1 px-1 rounded" style={{ fontSize: 9, background: 'rgba(245,158,11,0.18)', color: '#f59e0b', fontWeight: 600 }}>{t('share.permRead') || 'Solo lectura'}</span>
                )}
              </span>
            )}
          </div>
          <span className="file-size">
            {item.size ? formatFileSize(item.size) : ''}
          </span>
          <div className="menu-container">
            <button className="menu-trespuntos" onClick={handleMenuClick}>
              ⋮
            </button>
          </div>

          <ContextMenu
            isOpen={menuOpen}
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          >
            {renderFileMenuItems()}
          </ContextMenu>
        </div>
      );
    }
  }

  return (
    viewMode === 'grid' ? (
      <div
        className={`group relative folder-grid-item cursor-pointer overflow-hidden ${item.shared ? 'shared-item' : ''} ${isDragOverFolder ? 'folder-drop-target' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragOver={handleFolderDragOver}
        onDragEnter={handleFolderDragEnter}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
      >
        <div className="aspect-square p-2 flex items-center justify-center grid-folder-thumbnail" style={{ position: 'relative' }}>
          <FolderIcon color={item.folder_color} icon={item.folder_icon} size={56} />
          {item.shared && item.owner && item.owner !== 'me' && !item.sharedWith && (
            <div style={{ position: 'absolute', bottom: 6, right: 6 }}>
              <OwnerAvatar username={item.owner} url={item.ownerAvatarUrl} size={26} title={item.owner} />
            </div>
          )}
        </div>

        <div className="p-1 grid-folder-info">
          <h3 className="folder-grid-name" title={item.name}>
            {item.name}
          </h3>
          {item.shared && (
            <span className="folder-shared-badge flex flex-col items-start text-xs text-gray-500 mt-1">
              <span className="flex items-center">
                <svg className="shared-icon-svg mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {t('contextMenu.shared')}
              </span>
              {item.owner && item.owner !== 'me' && !item.sharedWith ? (
                <span className="text-[10px] text-blue-500">
                  {t('contextMenu.by', { owner: item.owner })}
                </span>
              ) : item.sharedWith && item.sharedWith.length > 0 ? (
                <span className="text-[10px] text-blue-500" title={item.sharedWith.join(', ')}>
                  {t('contextMenu.sharedWithUsers', { users: item.sharedWith.join(', ') })}
                </span>
              ) : null}
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="grid-menu-button"
            onClick={handleMenuClick}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        <ContextMenu
          isOpen={menuOpen}
          position={menuPosition}
          onClose={() => setMenuOpen(false)}
        >
          {renderFolderMenuItems()}
        </ContextMenu>
      </div>
    ) : (
      <div
        className={`folder-chip ${item.shared ? 'shared-item' : ''} ${isDragOverFolder ? 'folder-drop-target' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragOver={handleFolderDragOver}
        onDragEnter={handleFolderDragEnter}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
      >
        <span className="folder-icon" style={{ position: 'relative', display: 'inline-flex' }}>
          <FolderIcon color={item.folder_color} icon={item.folder_icon} size={22} />
          {item.shared && item.owner && item.owner !== 'me' && !item.sharedWith && (
            <span style={{ position: 'absolute', bottom: -4, right: -4 }}>
              <OwnerAvatar username={item.owner} url={item.ownerAvatarUrl} size={14} title={item.owner} />
            </span>
          )}
        </span>
        <span className="folder-name" title={item.name}>
          {item.name}
          {item.shared && (
            <span className="shared-label ml-2 text-xs text-gray-500">
              <svg className="shared-icon-svg" style={{display:'inline',verticalAlign:'middle',marginRight:'4px'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              {item.owner && item.owner !== 'me' && !item.sharedWith
                ? t('contextMenu.from', { owner: item.owner })
                : item.sharedWith && item.sharedWith.length > 0
                  ? t('contextMenu.sharedWithUsers', { users: item.sharedWith.join(', ') })
                  : t('contextMenu.shared')
              }
            </span>
          )}
        </span>
        <div className="menu-container">
          <button className="menu-trespuntos" onClick={handleMenuClick}>
            ⋮
          </button>
          <ContextMenu
            isOpen={menuOpen}
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          >
            {renderFolderMenuItems()}
          </ContextMenu>
        </div>
      </div>
    )
  );
};

export default FileItem;
