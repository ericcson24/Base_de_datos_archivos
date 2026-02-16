import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { BiCrop, BiAdjust, BiRotateRight, BiSave, BiReset, BiUndo, BiCheck, BiX } from 'react-icons/bi';
import './ImageEditor.css';

const ImageEditor = ({ fileUrl, file }) => {
  const { t } = useLanguage();
  
  // State
  const [activeTab, setActiveTab] = useState('adjust'); // adjust, crop, rotate
  const [params, setParams] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    sepia: 0,
    blur: 0,
    rotation: 0
  });

  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState(null); // { x, y, w, h } relative to canvas displayed size
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState(null); // 'tl', 'tr', 'bl', 'br', 'move'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [loading, setLoading] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [history, setHistory] = useState([]); // Array of params/imageSrc states? Too complex for now.
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null); // The source image (can be updated after crop)
  const originalUrlRef = useRef(fileUrl);

  // Load image
  useEffect(() => {
    if (fileUrl) {
      setLoading(true);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageRef.current = img;
        renderImage();
        setLoading(false);
      };
      img.onerror = (e) => {
        console.error("Error loading image", e);
        setLoading(false);
      };
      img.src = fileUrl;
      originalUrlRef.current = fileUrl;
    }
  }, [fileUrl]);

  // Render function (apply filters, rotation)
  const renderImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    
    // Handle Rotation dimensions
    const rot = params.rotation % 360;
    const isVertical = rot === 90 || rot === 270 || rot === -90 || rot === -270;
    
    canvas.width = isVertical ? img.height : img.width;
    canvas.height = isVertical ? img.width : img.height;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Filters logic
    // We apply filters before drawing? No, context.filter is best
    const filterString = `
      brightness(${params.brightness}%) 
      contrast(${params.contrast}%) 
      saturate(${params.saturation}%) 
      grayscale(${params.grayscale}%) 
      sepia(${params.sepia}%) 
      blur(${params.blur}px)
    `;
    ctx.filter = filterString;

    // Transform logic
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((params.rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

  }, [params]);

  useEffect(() => {
    renderImage();
  }, [renderImage]);

  // Reset
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
    // Reload original if cropped? 
    // Ideally we keep original source separate. 
    // For now, reset just resets params.
  };

  // Crop Logic
  const initCrop = () => {
    if (!canvasRef.current) return;
    const cw = canvasRef.current.clientWidth;
    const ch = canvasRef.current.clientHeight;
    // Default 80% center crop
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
    // Calculate ratio between displayed canvas size and actual resolution
    const scaleX = canvas.width / canvas.clientWidth;
    const scaleY = canvas.height / canvas.clientHeight;
    
    const cropX = cropRect.x * scaleX;
    const cropY = cropRect.y * scaleY;
    const cropW = cropRect.w * scaleX;
    const cropH = cropRect.h * scaleY;

    // Create temp canvas for the cropped part
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropW;
    tempCanvas.height = cropH;
    const tCtx = tempCanvas.getContext('2d');

    // Draw the current state (with filters) to temp canvas, clipped
    tCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Apply as new image source
    const newImg = new Image();
    newImg.onload = () => {
        imageRef.current = newImg;
        // Reset params as they are "baked in" now? 
        // Yes, for simple implementation. 
        // Or we keep params and apply them ON TOP? 
        // Best UX: bake in rotation/crop, but maybe keep filters?
        // Let's bake in everything to simplify "Apply".
        handleReset(); 
        setCropMode(false);
        setActiveTab('adjust');
    };
    newImg.src = tempCanvas.toDataURL(); // DataURL is easiest way to "copy" canvas to image
  };

  const cancelCrop = () => {
    setCropMode(false);
    setCropRect(null);
    setActiveTab('adjust');
  };

  // Crop Interaction
  const handleMouseDown = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !cropRect) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    let newRect = { ...cropRect };
    
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

    // Constraints check (simplified)
    if (newRect.w < 50) newRect.w = 50;
    if (newRect.h < 50) newRect.h = 50;
    // Don't go out of bounds (omitted for brevity, but should be added for robustness)

    setCropRect(newRect);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
  };

  // Saving
  const handleSave = async (saveAsCopy) => {
    setShowSaveModal(false);
    setLoading(true);
    try {
        const canvas = canvasRef.current;
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, file.type || 'image/png', 0.95));
        
        const formData = new FormData();
        formData.append('file', blob, file.name); // Same name, logic handles rename if copy
        formData.append('originalPath', file.path); // Need path
        formData.append('saveAsCopy', saveAsCopy);

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
            // alert(t('saveSuccess'));
             // Maybe close or refresh?
        } else {
            console.error(data.message);
            // alert(t('error'));
        }

    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="ie-container" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      
      {/* Viewport */}
      <div className="ie-viewport" ref={containerRef}>
        {loading && (
            <div className="ie-loading-overlay">
                <div className="ie-spinner"></div>
                <p>{t('common.processing') || 'Processing...'}</p>
            </div>
        )}
        
        <div className="ie-canvas-wrap">
            <canvas ref={canvasRef} className="ie-canvas" />
            
            {/* Crop Overlay */}
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

      {/* Toolbar */}
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

      {/* Controls Panel */}
      {activeTab === 'adjust' && !cropMode && (
          <div className="ie-controls-panel">
               <SliderControl label={t('imageEditor.brightness')} val={params.brightness} min={0} max={200} onChange={v => setParams({...params, brightness: v})} suffix="%" />
               <SliderControl label={t('imageEditor.contrast')} val={params.contrast} min={0} max={200} onChange={v => setParams({...params, contrast: v})} suffix="%" />
               <SliderControl label={t('imageEditor.saturation')} val={params.saturation} min={0} max={200} onChange={v => setParams({...params, saturation: v})} suffix="%" />
               <SliderControl label={t('imageEditor.blur')} val={params.blur} min={0} max={20} onChange={v => setParams({...params, blur: v})} suffix="px" />
               <SliderControl label={t('imageEditor.sepia')} val={params.sepia} min={0} max={100} onChange={v => setParams({...params, sepia: v})} suffix="%" />
               <SliderControl label={t('imageEditor.grayscale')} val={params.grayscale} min={0} max={100} onChange={v => setParams({...params, grayscale: v})} suffix="%" />
          </div>
      )}

      {activeTab === 'rotate' && (
          <div className="ie-controls-panel">
              <div className="ie-rotate-controls">
                  <button className="ie-icon-btn" onClick={() => setParams(p => ({...p, rotation: p.rotation - 90}))}>
                      <BiUndo />
                  </button>
                  <span style={{ lineHeight: '40px' }}>{params.rotation}°</span>
                  <button className="ie-icon-btn" onClick={() => setParams(p => ({...p, rotation: p.rotation + 90}))}>
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
      
      {/* Save Modal */}
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

const SliderControl = ({ label, val, min, max, onChange, suffix }) => (
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