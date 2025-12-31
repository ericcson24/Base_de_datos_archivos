import React, { useState, useRef } from 'react';
import { getAuthToken } from '../../../utils/fileUtils';
import { useLanguage } from '../../../context/LanguageContext';
import './TextEditor.css';

const TextEditor = ({ content, file }) => {
  const { t } = useLanguage();
  const [text, setText] = useState(content || '');
  const [fontSize, setFontSize] = useState(14);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [savedText, setSavedText] = useState(content || '');
  const textareaRef = useRef(null);

  const hasChanges = text !== savedText;

  const handleSave = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert(t('fileEditor.noSession'));
        return;
      }

      const response = await fetch(`/api/files/${file.id}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: text })
      });

      const data = await response.json();

      if (data.success) {
        setSavedText(text);
        alert(t('fileEditor.saveSuccess'));
      } else {
        alert(t('fileEditor.saveError', { error: data.message }));
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert(t('fileEditor.genericSaveError'));
    }
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
              {t('fileEditor.fontSize')}: {fontSize}px
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
              {t('fileEditor.lineHeight')}: {lineHeight}
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
              #️⃣ {t('fileEditor.lineNumbersShort')}
            </button>
            <button
              className={`btn-tool ${wordWrap ? 'active' : ''}`}
              onClick={() => setWordWrap(!wordWrap)}
            >
              📄 {t('fileEditor.wordWrapShort')}
            </button>
          </div>

          {/* Language */}
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {getLanguage()}
          </div>

          {/* Stats */}
          <div className="text-xs text-gray-600 dark:text-gray-400 ml-auto flex gap-3">
            <span>{lineCount} {t('fileEditor.lines')}</span>
            <span>{text.length} {t('fileEditor.characters')}</span>
            {hasChanges && <span className="text-orange-500 font-semibold">● {t('fileEditor.unsaved')}</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {hasChanges && (
              <button className="btn-secondary" onClick={() => setText(savedText)}>
                ↩️ {t('fileEditor.undo')}
              </button>
            )}
            <button className="btn-secondary" onClick={handleDownload}>
              💾 {t('fileEditor.download')}
            </button>
            <button 
              className="btn-primary" 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              💾 {t('fileEditor.save')}
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
