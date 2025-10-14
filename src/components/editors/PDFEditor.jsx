import React, { useState } from 'react';
import './PDFEditor.css';

const PDFEditor = ({ fileUrl, file }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [annotations, setAnnotations] = useState([]);
  const [selectedTool, setSelectedTool] = useState('none'); // 'none', 'draw', 'highlight', 'text'

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name;
    link.click();
  };

  const handleZoomIn = () => {
    setScale(s => Math.min(s + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(s => Math.max(s - 0.25, 0.5));
  };

  const addTextAnnotation = () => {
    const text = prompt('Ingrese el texto de la anotación:');
    if (text) {
      setAnnotations([...annotations, {
        type: 'text',
        content: text,
        x: 100,
        y: 100,
        page: currentPage
      }]);
    }
  };

  return (
    <div className="pdf-editor h-full flex flex-col">
      {/* Toolbar */}
      <div className="toolbar glassmorphism-strong p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Navigation */}
          <div className="tool-group flex items-center gap-2">
            <button className="btn-icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
              ←
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Página {currentPage}
            </span>
            <button className="btn-icon" onClick={() => setCurrentPage(p => p + 1)}>
              →
            </button>
          </div>

          {/* Zoom */}
          <div className="tool-group flex items-center gap-2">
            <button className="btn-icon" onClick={handleZoomOut} title="Alejar">
              🔍−
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(scale * 100)}%
            </span>
            <button className="btn-icon" onClick={handleZoomIn} title="Acercar">
              🔍+
            </button>
          </div>

          {/* Tools */}
          <div className="flex gap-2">
            <button
              className={`btn-tool ${selectedTool === 'draw' ? 'active' : ''}`}
              onClick={() => setSelectedTool(selectedTool === 'draw' ? 'none' : 'draw')}
              title="Dibujar"
            >
              ✏️ Dibujar
            </button>
            <button
              className={`btn-tool ${selectedTool === 'highlight' ? 'active' : ''}`}
              onClick={() => setSelectedTool(selectedTool === 'highlight' ? 'none' : 'highlight')}
              title="Resaltar"
            >
              🖍️ Resaltar
            </button>
            <button
              className={`btn-tool ${selectedTool === 'text' ? 'active' : ''}`}
              onClick={() => {
                setSelectedTool('text');
                addTextAnnotation();
              }}
              title="Añadir texto"
            >
              📝 Texto
            </button>
            {selectedTool !== 'none' && (
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <button className="btn-secondary" onClick={() => setAnnotations([])}>
              🗑️ Limpiar
            </button>
            <button className="btn-primary" onClick={handleDownload}>
              💾 Descargar
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}>
          <iframe
            src={`${fileUrl}#page=${currentPage}`}
            className="w-full h-[800px] shadow-2xl rounded-lg border-4 border-white dark:border-gray-800"
            style={{ width: '800px' }}
            title={file.name}
          />
          
          {/* Annotations Overlay */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {annotations
              .filter(a => a.page === currentPage)
              .map((annotation, idx) => (
                <div
                  key={idx}
                  className="absolute"
                  style={{
                    left: `${annotation.x}px`,
                    top: `${annotation.y}px`,
                    color: annotation.type === 'text' ? drawColor : 'transparent',
                    backgroundColor: annotation.type === 'highlight' ? `${drawColor}40` : 'transparent',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {annotation.content}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor;
