'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { FiSave, FiTrash2, FiZoomIn, FiZoomOut, FiType } from 'react-icons/fi';
import { getAuthToken } from '../../../utils/fileUtils';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import './PDFEditor.css';

type PDFEditorFile = {
  id: string;
  name: string;
};

type PDFEditorProps = {
  fileUrl: string;
  file: PDFEditorFile;
  onFileSaved?: () => void;
};

type Point = { x: number; y: number };

type TextAnnotation = {
  type: 'text';
  text: string;
  x: number;
  y: number;
  page: number;
  color: string;
  fontSize: number;
};

type DrawPath = {
  points: Point[];
  color: string;
  page: number;
};

type Highlight = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  page: number;
};

const PDFEditor = ({ fileUrl, file, onFileSaved }: PDFEditorProps) => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedTool, setSelectedTool] = useState('none');
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [fontSize, setFontSize] = useState(14);
  const [isAddingText, setIsAddingText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [drawPaths, setDrawPaths] = useState<DrawPath[]>([]);

  const [highlightStart, setHighlightStart] = useState<Point | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const loadPDF = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const url = fileUrl.includes('token=') ? fileUrl : `${fileUrl}?token=${encodeURIComponent(token || '')}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });

      if (!response.ok) throw new Error('Failed to load PDF');
      const arrayBuf = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);

      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      setPdfDoc(doc);
      setPdfBytes(bytes);
      setTotalPages(doc.getPageCount());
      setCurrentPage(1);
    } catch (err) {
      console.error('[PDFEditor] Error loading PDF:', err);
      addToast(t('pdfEditor.loadError') || 'Error loading PDF', 'error');
    } finally {
      setLoading(false);
    }
  }, [fileUrl, addToast, t]);

  useEffect(() => {
    loadPDF();
  }, [loadPDF]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  useEffect(() => {
    if (pdfBytes) {
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDisplayUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdfBytes]);

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const handleZoomReset = () => setScale(1);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (selectedTool === 'text' && isEditing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      setTextPosition({ x, y });
      setIsAddingText(true);
      setTextInput('');
    }
  };

  const confirmTextAnnotation = () => {
    if (textInput.trim() && textPosition) {
      const newAnnotation: TextAnnotation = {
        type: 'text',
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        page: currentPage,
        color: drawColor,
        fontSize: fontSize
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      setHasChanges(true);
    }
    setIsAddingText(false);
    setTextInput('');
    setTextPosition(null);
  };

  const handleDrawStart = (e: React.MouseEvent) => {
    if (selectedTool !== 'draw' || !isEditing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleDrawMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setCurrentPath(prev => [...prev, { x, y }]);
  };

  const handleDrawEnd = () => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }
    setDrawPaths(prev => [...prev, {
      points: currentPath,
      color: drawColor,
      page: currentPage
    }]);
    setHasChanges(true);
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleHighlightStart = (e: React.MouseEvent) => {
    if (selectedTool !== 'highlight' || !isEditing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    setHighlightStart({ x, y });
  };

  const handleHighlightEnd = (e: React.MouseEvent) => {
    if (!highlightStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const w = Math.abs(x - highlightStart.x);
    const h = Math.abs(y - highlightStart.y);
    if (w > 5 && h > 5) {
      setHighlights(prev => [...prev, {
        x: Math.min(highlightStart.x, x),
        y: Math.min(highlightStart.y, y),
        width: w,
        height: h,
        color: drawColor,
        page: currentPage
      }]);
      setHasChanges(true);
    }
    setHighlightStart(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'draw') handleDrawStart(e);
    else if (selectedTool === 'highlight') handleHighlightStart(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectedTool === 'draw') handleDrawMove(e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (selectedTool === 'draw') handleDrawEnd();
    else if (selectedTool === 'highlight') handleHighlightEnd(e);
  };

  const deleteAnnotation = (index: number, type: string) => {
    if (type === 'text') {
      setAnnotations(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'draw') {
      setDrawPaths(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'highlight') {
      setHighlights(prev => prev.filter((_, i) => i !== index));
    }
    setHasChanges(true);
  };

  const deletePage = async () => {
    if (!pdfDoc || totalPages <= 1) {
      addToast(t('pdfEditor.cannotDeleteLastPage') || 'Cannot delete the only page', 'warning');
      return;
    }
    try {
      pdfDoc.removePage(currentPage - 1);
      const newBytes = await pdfDoc.save();
      const newDoc = await PDFDocument.load(newBytes);
      setPdfDoc(newDoc);
      setPdfBytes(new Uint8Array(newBytes));
      const newTotal = newDoc.getPageCount();
      setTotalPages(newTotal);
      if (currentPage > newTotal) setCurrentPage(newTotal);
      setHasChanges(true);
      addToast(t('pdfEditor.pageDeleted') || 'Page deleted', 'success');
    } catch (err) {
      console.error('[PDFEditor] Error deleting page:', err);
      addToast(t('pdfEditor.pageDeleteError') || 'Error deleting page', 'error');
    }
  };

  const addBlankPage = async () => {
    if (!pdfDoc) return;
    try {
      const page = pdfDoc.getPage(0);
      const { width, height } = page.getSize();
      pdfDoc.insertPage(currentPage, [width, height]);
      const newBytes = await pdfDoc.save();
      const newDoc = await PDFDocument.load(newBytes);
      setPdfDoc(newDoc);
      setPdfBytes(new Uint8Array(newBytes));
      setTotalPages(newDoc.getPageCount());
      setCurrentPage(currentPage + 1);
      setHasChanges(true);
      addToast(t('pdfEditor.pageAdded') || 'Blank page added', 'success');
    } catch (err) {
      console.error('[PDFEditor] Error adding page:', err);
    }
  };

  const rotatePage = async () => {
    if (!pdfDoc) return;
    try {
      const page = pdfDoc.getPage(currentPage - 1);
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees(currentRotation + 90));
      const newBytes = await pdfDoc.save();
      const newDoc = await PDFDocument.load(newBytes);
      setPdfDoc(newDoc);
      setPdfBytes(new Uint8Array(newBytes));
      setHasChanges(true);
      addToast(t('pdfEditor.pageRotated') || 'Page rotated', 'success');
    } catch (err) {
      console.error('[PDFEditor] Error rotating page:', err);
    }
  };

  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  };

  const applyAnnotationsAndSave = async (): Promise<Uint8Array | null> => {
    if (!pdfDoc) return null;
    try {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const ann of annotations) {
        if (ann.page <= totalPages) {
          const page = pdfDoc.getPage(ann.page - 1);
          const { height } = page.getSize();
          const colorParts = hexToRgb(ann.color);
          page.drawText(ann.text, {
            x: ann.x,
            y: height - ann.y,
            size: ann.fontSize || 14,
            font,
            color: rgb(colorParts.r / 255, colorParts.g / 255, colorParts.b / 255),
          });
        }
      }

      for (const hl of highlights) {
        if (hl.page <= totalPages) {
          const page = pdfDoc.getPage(hl.page - 1);
          const { height } = page.getSize();
          const colorParts = hexToRgb(hl.color);
          page.drawRectangle({
            x: hl.x,
            y: height - hl.y - hl.height,
            width: hl.width,
            height: hl.height,
            color: rgb(colorParts.r / 255, colorParts.g / 255, colorParts.b / 255),
            opacity: 0.3,
          });
        }
      }

      for (const path of drawPaths) {
        if (path.page <= totalPages && path.points.length >= 2) {
          const page = pdfDoc.getPage(path.page - 1);
          const { height } = page.getSize();
          const colorParts = hexToRgb(path.color);
          for (let i = 1; i < path.points.length; i++) {
            page.drawLine({
              start: { x: path.points[i - 1].x, y: height - path.points[i - 1].y },
              end: { x: path.points[i].x, y: height - path.points[i].y },
              thickness: 2,
              color: rgb(colorParts.r / 255, colorParts.g / 255, colorParts.b / 255),
            });
          }
        }
      }

      return await pdfDoc.save();
    } catch (err) {
      console.error('[PDFEditor] Error applying annotations:', err);
      return null;
    }
  };

  const handleSave = async () => {
    if (!pdfDoc) return;
    setIsSaving(true);
    try {
      const savedBytes = await applyAnnotationsAndSave();
      if (!savedBytes) throw new Error('Failed to build PDF');

      const blob = new Blob([savedBytes as BlobPart], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', blob, file.name);

      const token = getAuthToken();
      const resp = await fetch(`/api/files/${encodeURIComponent(file.id)}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!resp.ok) throw new Error('Upload failed');

      const newDoc = await PDFDocument.load(savedBytes);
      setPdfDoc(newDoc);
      setPdfBytes(new Uint8Array(savedBytes));
      setTotalPages(newDoc.getPageCount());

      setAnnotations([]);
      setDrawPaths([]);
      setHighlights([]);
      setHasChanges(false);

      addToast(t('pdfEditor.saveSuccess') || 'PDF saved', 'success');
      if (onFileSaved) onFileSaved();
    } catch (err) {
      console.error('[PDFEditor] Error saving:', err);
      addToast(t('pdfEditor.saveError') || 'Error saving PDF', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    try {
      let bytes: Uint8Array | null = null;
      if (hasChanges && pdfDoc) {
        bytes = await applyAnnotationsAndSave();
      }
      if (!bytes) bytes = pdfBytes;
      if (!bytes) return;

      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PDFEditor] Error downloading:', err);
    }
  };

  const clearAnnotations = () => {
    setAnnotations(prev => prev.filter(a => a.page !== currentPage));
    setDrawPaths(prev => prev.filter(p => p.page !== currentPage));
    setHighlights(prev => prev.filter(h => h.page !== currentPage));
    setHasChanges(true);
  };

  const renderAnnotationOverlay = () => {
    const pageAnnotations = annotations.filter(a => a.page === currentPage);
    const pagePaths = drawPaths.filter(p => p.page === currentPage);
    const pageHighlights = highlights.filter(h => h.page === currentPage);

    return (
      <div
        className="pdf-annotation-overlay"
        ref={overlayRef}
        onClick={handleOverlayClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: selectedTool === 'text' ? 'text' : selectedTool === 'draw' ? 'crosshair' : selectedTool === 'highlight' ? 'crosshair' : 'default' }}
      >

        <svg className="pdf-annotation-svg" width="100%" height="100%">

          {pageHighlights.map((hl, i) => (
            <g key={`hl-${i}`}>
              <rect
                x={hl.x} y={hl.y}
                width={hl.width} height={hl.height}
                fill={hl.color} fillOpacity={0.3}
                className="pdf-annotation-shape"
              />
              {isEditing && (
                <foreignObject x={hl.x + hl.width - 18} y={hl.y - 2} width="20" height="20">
                  <button className="pdf-ann-delete-btn" onClick={(e) => { e.stopPropagation(); deleteAnnotation(i, 'highlight'); }}>x</button>
                </foreignObject>
              )}
            </g>
          ))}


          {pagePaths.map((path, i) => (
            <g key={`path-${i}`}>
              <polyline
                points={path.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={path.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pdf-annotation-shape"
              />
              {isEditing && path.points.length > 0 && (
                <foreignObject x={path.points[0].x} y={path.points[0].y - 20} width="20" height="20">
                  <button className="pdf-ann-delete-btn" onClick={(e) => { e.stopPropagation(); deleteAnnotation(i, 'draw'); }}>x</button>
                </foreignObject>
              )}
            </g>
          ))}


          {isDrawing && currentPath.length > 1 && (
            <polyline
              points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={drawColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}
        </svg>


        {pageAnnotations.map((ann, i) => (
          <div
            key={`text-${i}`}
            className="pdf-text-annotation"
            style={{
              left: ann.x + 'px',
              top: ann.y + 'px',
              color: ann.color,
              fontSize: (ann.fontSize || 14) + 'px'
            }}
          >
            {ann.text}
            {isEditing && (
              <button className="pdf-ann-delete-btn inline" onClick={(e) => { e.stopPropagation(); deleteAnnotation(i, 'text'); }}>x</button>
            )}
          </div>
        ))}


        {isAddingText && textPosition && (
          <div className="pdf-text-input-popup" style={{ left: textPosition.x + 'px', top: textPosition.y + 'px' }}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmTextAnnotation();
                if (e.key === 'Escape') { setIsAddingText(false); setTextInput(''); setTextPosition(null); }
              }}
              autoFocus
              placeholder={t('pdfEditor.typeText') || 'Type text...'}
              className="pdf-text-input"
              style={{ color: drawColor, fontSize: fontSize + 'px' }}
            />
            <div className="pdf-text-input-actions">
              <button onClick={confirmTextAnnotation} className="pdf-text-confirm">✓</button>
              <button onClick={() => { setIsAddingText(false); setTextInput(''); setTextPosition(null); }} className="pdf-text-cancel">x</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="pdf-editor-container" ref={containerRef}>
        <div className="pdf-loading">
          <div className="spinner"></div>
          <p>{t('pdfEditor.loading') || 'Loading PDF...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-editor-container ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>

      <div className="pdf-toolbar">
        <div className="pdf-toolbar-section">
          {!isEditing ? (
            <button className="pdf-btn pdf-btn-primary" onClick={() => setIsEditing(true)}>
              ✏️ {t('pdfEditor.edit') || 'Edit'}
            </button>
          ) : (
            <>
              <button className="pdf-btn pdf-btn-success" onClick={handleSave} disabled={isSaving || !hasChanges}>
                {isSaving ? '⏳' : <FiSave />} {t('pdfEditor.save') || 'Save'}
              </button>
              <button className="pdf-btn" onClick={() => { setIsEditing(false); setSelectedTool('none'); }}>
                {t('pdfEditor.readMode') || 'Read'}
              </button>
            </>
          )}
        </div>


        <div className="pdf-toolbar-section">
          <button className="pdf-btn-icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>←</button>
          <span className="pdf-page-info">{currentPage} / {totalPages}</span>
          <button className="pdf-btn-icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>→</button>
        </div>


        <div className="pdf-toolbar-section">
          <button className="pdf-btn-icon" onClick={handleZoomOut} title={t('pdfEditor.zoomOut')}><FiZoomOut /></button>
          <span className="pdf-zoom-info" onClick={handleZoomReset}>{Math.round(scale * 100)}%</span>
          <button className="pdf-btn-icon" onClick={handleZoomIn} title={t('pdfEditor.zoomIn')}><FiZoomIn /></button>
        </div>


        {isEditing && (
          <div className="pdf-toolbar-section pdf-tools">
            <button className={`pdf-btn-tool ${selectedTool === 'text' ? 'active' : ''}`}
              onClick={() => setSelectedTool(selectedTool === 'text' ? 'none' : 'text')}>
              <FiType style={{ verticalAlign: 'middle', marginRight: 4 }} /> {t('pdfEditor.text')}
            </button>
            <button className={`pdf-btn-tool ${selectedTool === 'draw' ? 'active' : ''}`}
              onClick={() => setSelectedTool(selectedTool === 'draw' ? 'none' : 'draw')}>
              ✏️ {t('pdfEditor.draw')}
            </button>
            <button className={`pdf-btn-tool ${selectedTool === 'highlight' ? 'active' : ''}`}
              onClick={() => setSelectedTool(selectedTool === 'highlight' ? 'none' : 'highlight')}>
              🖍️ {t('pdfEditor.highlight')}
            </button>
            <div className="pdf-tool-divider" />
            <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="pdf-color-picker" />
            {selectedTool === 'text' && (
              <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="pdf-font-size-select">
                {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48].map(s => (
                  <option key={s} value={s}>{s}px</option>
                ))}
              </select>
            )}
          </div>
        )}


        {isEditing && (
          <div className="pdf-toolbar-section">
            <button className="pdf-btn-icon" onClick={addBlankPage} title={t('pdfEditor.addPage') || 'Add page'}>📄+</button>
            <button className="pdf-btn-icon" onClick={rotatePage} title={t('pdfEditor.rotatePage') || 'Rotate'}>🔄</button>
            <button className="pdf-btn-icon pdf-btn-danger-icon" onClick={deletePage} title={t('pdfEditor.deletePage') || 'Delete page'}><FiTrash2 /></button>
          </div>
        )}


        <div className="pdf-toolbar-section pdf-toolbar-right">
          {isEditing && (annotations.length > 0 || drawPaths.length > 0 || highlights.length > 0) && (
            <button className="pdf-btn-icon" onClick={clearAnnotations} title={t('pdfEditor.clearPage') || 'Clear page'}>🧹</button>
          )}
          <button className="pdf-btn-icon" onClick={handleDownload} title={t('pdfEditor.download')}>⬇️</button>
          <button className="pdf-btn-icon" onClick={toggleFullscreen}>{isFullscreen ? '⊡' : '⛶'}</button>
        </div>
      </div>


      <div className="pdf-viewer-area">
        <div className="pdf-page-wrapper" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
          <div className="pdf-page-container">
            {displayUrl && (
              <iframe
                src={`${displayUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
                className="pdf-iframe"
                title={file.name}
              />
            )}
            {isEditing && renderAnnotationOverlay()}
          </div>
        </div>
      </div>


      <div className="pdf-status-bar">
        <span>{file.name}</span>
        <span>{t('pdfEditor.page')} {currentPage} / {totalPages}</span>
        {hasChanges && <span className="pdf-unsaved-badge">● {t('pdfEditor.unsavedChanges') || 'Unsaved'}</span>}
        {isEditing && <span className="pdf-edit-badge">✏️ {t('pdfEditor.editMode') || 'Editing'}</span>}
      </div>
    </div>
  );
};

export default PDFEditor;
