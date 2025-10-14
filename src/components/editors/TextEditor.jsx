import React, { useState, useRef } from 'react';
import './TextEditor.css';

const TextEditor = ({ content, file }) => {
  const [text, setText] = useState(content || '');
  const [fontSize, setFontSize] = useState(14);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [savedText, setSavedText] = useState(content || '');
  const textareaRef = useRef(null);

  const hasChanges = text !== savedText;

  const handleSave = () => {
    setSavedText(text);
    // Here you would typically send to backend
    alert('Archivo guardado localmente. Integrar con backend para guardar cambios.');
  };

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLanguage = () => {
    const ext = file.name.split('.').pop().toLowerCase();
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      css: 'css',
      html: 'html',
      json: 'json',
      xml: 'xml',
      md: 'markdown'
    };
    return languageMap[ext] || 'text';
  };

  const lineCount = text.split('\n').length;

  return (
    <div className="text-editor h-full flex flex-col">
      {/* Toolbar */}
      <div className="toolbar glassmorphism-strong p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Font Size */}
          <div className="tool-group">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Tamaño: {fontSize}px
            </label>
            <input
              type="range"
              min="10"
              max="24"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="slider w-24"
            />
          </div>

          {/* Line Height */}
          <div className="tool-group">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Interlineado: {lineHeight}
            </label>
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="slider w-24"
            />
          </div>

          {/* Options */}
          <div className="flex gap-2">
            <button
              className={`btn-tool ${showLineNumbers ? 'active' : ''}`}
              onClick={() => setShowLineNumbers(!showLineNumbers)}
            >
              #️⃣ Números
            </button>
            <button
              className={`btn-tool ${wordWrap ? 'active' : ''}`}
              onClick={() => setWordWrap(!wordWrap)}
            >
              📄 Ajustar
            </button>
          </div>

          {/* Language */}
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {getLanguage()}
          </div>

          {/* Stats */}
          <div className="text-xs text-gray-600 dark:text-gray-400 ml-auto flex gap-3">
            <span>{lineCount} líneas</span>
            <span>{text.length} caracteres</span>
            {hasChanges && <span className="text-orange-500 font-semibold">● Sin guardar</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {hasChanges && (
              <button className="btn-secondary" onClick={() => setText(savedText)}>
                ↩️ Deshacer
              </button>
            )}
            <button className="btn-secondary" onClick={handleDownload}>
              💾 Descargar
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              💾 Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden flex bg-gray-50 dark:bg-gray-900">
        {/* Line Numbers */}
        {showLineNumbers && (
          <div className="line-numbers glassmorphism-strong border-r border-gray-200 dark:border-gray-700 p-4 text-right select-none">
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="text-xs text-gray-400 dark:text-gray-600"
                style={{ lineHeight: `${lineHeight}em`, fontSize: `${fontSize}px` }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-4 bg-transparent border-none outline-none resize-none font-mono text-gray-800 dark:text-gray-200"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeight}em`,
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            overflowWrap: wordWrap ? 'break-word' : 'normal'
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default TextEditor;
