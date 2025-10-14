import React, { useState, useRef, useEffect } from 'react';
import './ImageEditor.css';

const ImageEditor = ({ fileUrl, file }) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [filter, setFilter] = useState('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [drawSize, setDrawSize] = useState(3);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const drawingCanvasRef = useRef(null);

  useEffect(() => {
    if (fileUrl && imageRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Setup drawing canvas
        const drawCanvas = drawingCanvasRef.current;
        drawCanvas.width = img.width;
        drawCanvas.height = img.height;
      };
      img.src = fileUrl;
      imageRef.current = img;
    }
  }, [fileUrl]);

  const applyFilters = () => {
    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${filter !== 'none' ? filter : ''}`,
      transform: `rotate(${rotation}deg) scale(${scale})`
    };
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    
    // Create a temporary canvas to merge both layers
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext('2d');
    
    // Draw main image with filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(canvas, 0, 0);
    
    // Draw annotations on top
    ctx.filter = 'none';
    ctx.drawImage(drawingCanvas, 0, 0);
    
    // Download
    const link = document.createElement('a');
    link.download = `edited_${file.name}`;
    link.href = tempCanvas.toDataURL();
    link.click();
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setRotation(0);
    setScale(1);
    setFilter('none');
    
    // Clear drawing canvas
    const drawingCanvas = drawingCanvasRef.current;
    const ctx = drawingCanvas.getContext('2d');
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  };

  // Drawing functionality
  const startDrawing = (e) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = drawSize;
    ctx.lineCap = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  return (
    <div className="image-editor h-full flex flex-col">
      {/* Toolbar */}
      <div className="toolbar glassmorphism-strong p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Brightness */}
          <div className="tool-group">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Brillo: {brightness}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(e.target.value)}
              className="slider"
            />
          </div>

          {/* Contrast */}
          <div className="tool-group">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Contraste: {contrast}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(e.target.value)}
              className="slider"
            />
          </div>

          {/* Saturation */}
          <div className="tool-group">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Saturación: {saturation}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(e.target.value)}
              className="slider"
            />
          </div>

          {/* Rotation */}
          <div className="tool-group">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Rotación: {rotation}°
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setRotation(r => r - 90)}
                className="btn-icon"
                title="Rotar izquierda"
              >
                ↶
              </button>
              <button
                onClick={() => setRotation(r => r + 90)}
                className="btn-icon"
                title="Rotar derecha"
              >
                ↷
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="tool-group">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Filtro
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="select-filter"
            >
              <option value="none">Normal</option>
              <option value="grayscale(100%)">Blanco y Negro</option>
              <option value="sepia(100%)">Sepia</option>
              <option value="blur(2px)">Desenfoque</option>
              <option value="invert(100%)">Invertir</option>
            </select>
          </div>

          {/* Drawing */}
          <div className="tool-group">
            <button
              onClick={() => setIsDrawing(!isDrawing)}
              className={`btn-tool ${isDrawing ? 'active' : ''}`}
              title="Dibujar"
            >
              ✏️ {isDrawing ? 'Dibujando' : 'Dibujar'}
            </button>
            {isDrawing && (
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={drawSize}
                  onChange={(e) => setDrawSize(e.target.value)}
                  className="slider w-20"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <button onClick={handleReset} className="btn-secondary">
              🔄 Resetear
            </button>
            <button onClick={handleDownload} className="btn-primary">
              💾 Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="relative inline-block" style={applyFilters()}>
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto shadow-lg rounded-lg"
          />
          <canvas
            ref={drawingCanvasRef}
            className="absolute top-0 left-0 max-w-full h-auto"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={() => {}}
            onMouseLeave={() => {}}
            style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
