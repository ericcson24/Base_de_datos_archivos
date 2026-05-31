'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { BiCrop, BiAdjust, BiRotateRight, BiSave, BiReset, BiUndo, BiCheck, BiX } from 'react-icons/bi';
import './ImageEditor.css';

type ImageEditorFile = {
  name: string;
  path?: string;
  type?: string;
};

type ImageEditorProps = {
  fileUrl: string;
  file: ImageEditorFile;
};

type ImageParams = {
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: number;
  sepia: number;
  blur: number;
  rotation: number;
};

type CropRect = { x: number; y: number; w: number; h: number };

type SliderControlProps = {
  label: string;
  val: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
};

const ImageEditor = ({ fileUrl, file }: ImageEditorProps) => {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('adjust');
  const [params, setParams] = useState<ImageParams>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    rotation: 0
  });

  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const originalUrlRef = useRef(fileUrl);

  const renderImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rot = params.rotation % 360;
    const isVertical = rot === 90 || rot === 270 || rot === -90 || rot === -270;

    canvas.width = isVertical ? img.height : img.width;
    canvas.height = isVertical ? img.width : img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const filterString = `
      brightness(${params.brightness}%) 
      contrast(${params.contrast}%) 
      saturate(${params.saturation}%) 
      grayscale(${params.grayscale}%) 
      sepia(${params.sepia}%) 
      blur(${params.blur}px)
    `;
    ctx.filter = filterString;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((params.rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

  }, [params]);

  useEffect(() => {
    if (fileUrl) {
      setLoading(true);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        renderImage();
        setLoading(false);
      };
      img.onerror = (e) => {
        console.error('Error loading image', e);
        setLoading(false);
      };
      img.src = fileUrl;
      originalUrlRef.current = fileUrl;
    }
  }, [fileUrl, renderImage]);

  useEffect(() => {
    renderImage();
  }, [renderImage]);

  const handleReset = () => {
    setParams({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      grayscale: 0,
      sepia: 0,
      blur: 0,
      rotation: 0
    });
  };

  const initCrop = () => {
    if (!canvasRef.current) return;
    const cw = canvasRef.current.clientWidth;
    const ch = canvasRef.current.clientHeight;
    setCropRect({
      x: cw * 0.1,
      y: ch * 0.1,
      w: cw * 0.8,
      h: ch * 0.8
    });
    setCropMode(true);
    setActiveTab('crop');
  };

  const applyCrop = () => {
    if (!cropRect || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;

    const cropX = cropRect.x * scaleX;
    const cropY = cropRect.y * scaleY;
    const cropW = cropRect.w * scaleX;
    const cropH = cropRect.h * scaleY;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropW;
    tempCanvas.height = cropH;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const newImg = new Image();
    newImg.onload = () => {
      imageRef.current = newImg;
      handleReset();
      setCropMode(false);
      setActiveTab('adjust');
    };
    newImg.src = tempCanvas.toDataURL();
  };

  const cancelCrop = () => {
    setCropMode(false);
    setCropRect(null);
    setActiveTab('adjust');
  };

  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cropRect || !dragHandle) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    const newRect = { ...cropRect };

    /*
      Handles: tl, tc, tr, cl, cr, bl, bc, br, move
    */

    if (dragHandle === 'move') {
      newRect.x += dx;
      newRect.y += dy;
    } else {
      if (dragHandle.includes('l')) { newRect.x += dx; newRect.w -= dx; }
      if (dragHandle.includes('r')) { newRect.w += dx; }
      if (dragHandle.includes('t')) { newRect.y += dy; newRect.h -= dy; }
      if (dragHandle.includes('b')) { newRect.h += dy; }
    }

    if (newRect.w < 50) newRect.w = 50;
    if (newRect.h < 50) newRect.h = 50;

    setCropRect(newRect);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  const handleSave = async (saveAsCopy: boolean) => {
    setShowSaveModal(false);
    setLoading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, file.type || 'image/png', 0.95));
      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, file.name);
      formData.append('originalPath', file.path || '');
      formData.append('saveAsCopy', String(saveAsCopy));

      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/files/image/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
      } else {
        console.error(data.message);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ie-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>


      <div className="ie-viewport" ref={containerRef}>
        {loading && (
          <div className="ie-loading-overlay">
            <div className="ie-spinner"></div>
            <p>{t('common.processing') || 'Processing...'}</p>
          </div>
        )}

        <div className="ie-canvas-wrap">
          <canvas ref={canvasRef} className="ie-canvas" />


          {cropMode && cropRect && (
            <div
              className="ie-crop-overlay"
              style={{
                left: cropRect.x,
                top: cropRect.y,
                width: cropRect.w,
                height: cropRect.h
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {['tl', 'tc', 'tr', 'cl', 'cr', 'bl', 'bc', 'br'].map(h => (
                <div
                  key={h}
                  className={`ie-crop-handle ie-h-${h}`}
                  onMouseDown={(e) => handleMouseDown(e, h)}
                />
              ))}
            </div>
          )}
        </div>
      </div>


      <div className="ie-toolbar">
        <button className={`ie-btn ${activeTab === 'adjust' ? 'active' : ''}`} onClick={() => { setActiveTab('adjust'); setCropMode(false); }}>
          <BiAdjust />
          <span>{t('imageEditor.adjust')}</span>
        </button>
        <button className={`ie-btn ${activeTab === 'crop' ? 'active' : ''}`} onClick={initCrop}>
          <BiCrop />
          <span>{t('imageEditor.crop')}</span>
        </button>
        <button className={`ie-btn ${activeTab === 'rotate' ? 'active' : ''}`} onClick={() => { setActiveTab('rotate'); setCropMode(false); }}>
          <BiRotateRight />
          <span>{t('imageEditor.rotate')}</span>
        </button>

        <div style={{ flex: 1 }}></div>

        <button className="ie-btn" onClick={handleReset}>
          <BiReset />
          <span>{t('imageEditor.reset')}</span>
        </button>

        <button className="ie-btn" style={{ color: '#60a5fa' }} onClick={() => setShowSaveModal(true)}>
          <BiSave />
          <span>{t('imageEditor.save')}</span>
        </button>
      </div>


      {activeTab === 'adjust' && !cropMode && (
        <div className="ie-controls-panel">
          <SliderControl label={t('imageEditor.brightness')} val={params.brightness} min={0} max={200} onChange={v => setParams({ ...params, brightness: v })} suffix="%" />
          <SliderControl label={t('imageEditor.contrast')} val={params.contrast} min={0} max={200} onChange={v => setParams({ ...params, contrast: v })} suffix="%" />
          <SliderControl label={t('imageEditor.saturation')} val={params.saturation} min={0} max={200} onChange={v => setParams({ ...params, saturation: v })} suffix="%" />
          <SliderControl label={t('imageEditor.blur')} val={params.blur} min={0} max={20} onChange={v => setParams({ ...params, blur: v })} suffix="px" />
          <SliderControl label={t('imageEditor.sepia')} val={params.sepia} min={0} max={100} onChange={v => setParams({ ...params, sepia: v })} suffix="%" />
          <SliderControl label={t('imageEditor.grayscale')} val={params.grayscale} min={0} max={100} onChange={v => setParams({ ...params, grayscale: v })} suffix="%" />
        </div>
      )}

      {activeTab === 'rotate' && (
        <div className="ie-controls-panel">
          <div className="ie-rotate-controls">
            <button className="ie-icon-btn" onClick={() => setParams(p => ({ ...p, rotation: p.rotation - 90 }))}>
              <BiUndo />
            </button>
            <span style={{ lineHeight: '40px' }}>{params.rotation}°</span>
            <button className="ie-icon-btn" onClick={() => setParams(p => ({ ...p, rotation: p.rotation + 90 }))}>
              <BiRotateRight />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'crop' && cropMode && (
        <div className="ie-controls-panel" style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <button className="ie-action-btn ie-btn-secondary" onClick={cancelCrop}>
            <BiX style={{ display: 'inline', marginRight: 4 }} />
            {t('common.cancel')}
          </button>
          <button className="ie-action-btn ie-btn-primary" onClick={applyCrop}>
            <BiCheck style={{ display: 'inline', marginRight: 4 }} />
            {t('common.apply')}
          </button>
        </div>
      )}


      {showSaveModal && (
        <div className="ie-save-modal">
          <h3>{t('imageEditor.saveOptions')}</h3>
          <div className="ie-save-options">
            <button className="ie-save-opt-btn primary" onClick={() => handleSave(false)}>
              <span>{t('imageEditor.overwrite')}</span>
              <small>{t('imageEditor.overwriteDesc')}</small>
            </button>
            <button className="ie-save-opt-btn" onClick={() => handleSave(true)}>
              <span>{t('imageEditor.saveAsCopy')}</span>
              <small>{t('imageEditor.saveAsCopyDesc')}</small>
            </button>
            <button className="ie-save-opt-btn" style={{ marginTop: 8, justifyContent: 'center' }} onClick={() => setShowSaveModal(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

const SliderControl = ({ label, val, min, max, onChange }: SliderControlProps) => (
  <div className="ie-slider-group">
    <div className="ie-slider-label">{label}</div>
    <div className="ie-slider-wrap">
      <input
        type="range"
        className="ie-slider"
        min={min}
        max={max}
        value={val}
        onChange={(e) => onChange(parseInt(e.target.value))}
      />
      <div className="ie-slider-val">{val}</div>
    </div>
  </div>
);

export default ImageEditor;
