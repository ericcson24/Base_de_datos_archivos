'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import './DocumentAIEditor.css';

interface DocumentAIEditorDoc {
  id?: string;
  content?: string;
  filename?: string;
}

interface Highlight {
  start: number;
  end: number;
  importance?: string;
}

interface DocumentAIEditorProps {
  document?: DocumentAIEditorDoc;
  onSave?: (content: string) => void | Promise<void>;
  onClose?: () => void;
  user?: any;
}

const DocumentAIEditor: React.FC<DocumentAIEditorProps> = ({
  document,
  onSave,
  onClose,
}) => {
  const { addToast } = useToast();
  const { language } = useLanguage();
  const showToast = (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => addToast(msg, type);

  const [content, setContent] = useState(document?.content || '');
  const [selectedText, setSelectedText] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const t: any = {
    en: {
      title: 'AI Document Editor',
      save: 'Save',
      close: 'Close',
      analyze: 'Analyze',
      summary: 'Summary',
      explanation: 'Explanation',
      suggestions: 'Suggestions',
      highlights: 'Highlights',
      readability: 'Readability',
      explainSelected: 'Explain Selected',
      editSuggestions: 'Edit Suggestions',
      highlightImportant: 'Highlight Important',
      customQuery: 'Ask AI Anything',
      selectText: 'Select text to explain',
      analyzing: 'Analyzing...',
      analyzed: 'Document analyzed!',
      error: 'Error analyzing document',
      unsavedChanges: 'Unsaved changes',
      wordCount: 'Words',
      charCount: 'Characters'
    },
    es: {
      title: 'Editor de Documentos con IA',
      save: 'Guardar',
      close: 'Cerrar',
      analyze: 'Analizar',
      summary: 'Resumen',
      explanation: 'Explicación',
      suggestions: 'Sugerencias',
      highlights: 'Resaltes',
      readability: 'Legibilidad',
      explainSelected: 'Explicar Seleccionado',
      editSuggestions: 'Sugerencias de Edición',
      highlightImportant: 'Resaltar Importante',
      customQuery: 'Pregunta a IA',
      selectText: 'Selecciona texto para explicar',
      analyzing: 'Analizando...',
      analyzed: 'Documento analizado!',
      error: 'Error analizando documento',
      unsavedChanges: 'Cambios sin guardar',
      wordCount: 'Palabras',
      charCount: 'Caracteres'
    }
  };

  const labels = t[language] || t.en;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleTextSelect = () => {
    const editor = editorRef.current;
    if (editor) {
      const selected = editor.value.substring(editor.selectionStart, editor.selectionEnd);
      setSelectedText(selected);
    }
  };

  const performAnalysis = useCallback(async (type: string | null, customText: string | null = null) => {
    if (!content.trim()) {
      showToast('El documento está vacío', 'error');
      return;
    }

    setIsAnalyzing(true);

    try {
      const endpoint = customText ? '/api/ai/explain-text' : '/api/ai/analyze-document';

      const payload = customText
        ? {
            documentId: document?.id,
            fragment: customText,
            documentTitle: document?.filename
          }
        : {
            documentId: document?.id,
            content: content,
            filename: document?.filename,
            analysisType: type
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Error en análisis');
      }

      const data = await response.json();

      if (customText) {
        setAnalysisResult(data.explanation || '');
      } else {
        setAnalysisResult(data.analysis || '');
      }

      setActiveTab('analysis');
      showToast(labels.analyzed, 'success');
    } catch (error) {
      console.error('Analysis error:', error);
      showToast(labels.error, 'error');
    } finally {
      setIsAnalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, document, labels]);

  const getHighlights = useCallback(async () => {
    if (!content.trim()) {
      showToast('El documento está vacío', 'error');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/ai/highlight-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentId: document?.id,
          content: content
        })
      });

      if (!response.ok) {
        throw new Error('Error en análisis de resaltes');
      }

      const data = await response.json();
      setHighlights(data.highlights || []);
      setActiveTab('highlights');
      showToast(labels.analyzed, 'success');
    } catch (error) {
      console.error('Highlight error:', error);
      showToast(labels.error, 'error');
    } finally {
      setIsAnalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, document, labels]);

  const getEditSuggestions = useCallback(async () => {
    if (!content.trim()) {
      showToast('El documento está vacío', 'error');
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/ai/edit-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documentId: document?.id,
          content: content,
          focusArea: 'clarity and structure'
        })
      });

      if (!response.ok) {
        throw new Error('Error en sugerencias');
      }

      const data = await response.json();
      setAnalysisResult(data.suggestions || '');
      setActiveTab('analysis');
      showToast(labels.analyzed, 'success');
    } catch (error) {
      console.error('Edit suggestion error:', error);
      showToast(labels.error, 'error');
    } finally {
      setIsAnalyzing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, document, labels]);

  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave(content);
        setIsDirty(false);
        showToast('Documento guardado', 'success');
      }
    } catch (error) {
      console.error('Save error:', error);
      showToast('Error guardando documento', 'error');
    }
  };

  const wordCount = content.trim().split(/\s+/).length;
  const charCount = content.length;

  const renderHighlightedContent = () => {
    if (!highlights.length) {
      return content;
    }

    const result: React.ReactNode[] = [];
    let lastEnd = 0;

    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

    sortedHighlights.forEach((highlight, idx) => {
      const { start, end, importance } = highlight;

      if (start > lastEnd) {
        result.push(
          <span key={`text-${lastEnd}`}>
            {content.substring(lastEnd, start)}
          </span>
        );
      }

      const highlightClass = `highlight-${importance || 'medium'}`;
      result.push(
        <span key={`highlight-${idx}`} className={`highlighted-text ${highlightClass}`}>
          {content.substring(start, end)}
        </span>
      );

      lastEnd = end;
    });

    if (lastEnd < content.length) {
      result.push(
        <span key={`text-${lastEnd}`}>
          {content.substring(lastEnd)}
        </span>
      );
    }

    return result;
  };

  return (
    <div className="document-ai-editor">
      <div className="editor-header">
        <h2>{labels.title}</h2>
        <div className="header-actions">
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={!isDirty}
            title={isDirty ? labels.unsavedChanges : ''}
          >
            {labels.save}
          </button>
          <button
            className="btn-close"
            onClick={onClose}
          >
            {labels.close}
          </button>
        </div>
      </div>

      <div className="editor-container">

        <div className="editor-main">
          <textarea
            ref={editorRef}
            className="editor-textarea"
            value={content}
            onChange={handleContentChange}
            onMouseUp={handleTextSelect}
            onKeyUp={handleTextSelect}
            placeholder="Escribe o pega tu documento aquí..."
          />
          <div className="editor-stats">
            <span>{wordCount} {labels.wordCount}</span>
            <span>{charCount} {labels.charCount}</span>
          </div>
        </div>


        <div className="ai-panel">
          <div className="ai-tabs">
            <button
              className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              {labels.analyze}
            </button>
            <button
              className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              Análisis
            </button>
            <button
              className={`tab-btn ${activeTab === 'highlights' ? 'active' : ''}`}
              onClick={() => setActiveTab('highlights')}
            >
              {labels.highlights}
            </button>
          </div>


          <div className="tab-content">
            {activeTab === 'editor' && (
              <div className="analysis-controls">
                <div className="control-group">
                  <label>{labels.summary}</label>
                  <button
                    className="btn-action"
                    onClick={() => performAnalysis('summary')}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? labels.analyzing : labels.analyze}
                  </button>
                </div>

                <div className="control-group">
                  <label>{labels.explanation}</label>
                  <button
                    className="btn-action"
                    onClick={() => performAnalysis('explanation')}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? labels.analyzing : labels.analyze}
                  </button>
                </div>

                <div className="control-group">
                  <label>{labels.readability}</label>
                  <button
                    className="btn-action"
                    onClick={() => performAnalysis('readability')}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? labels.analyzing : labels.analyze}
                  </button>
                </div>

                <div className="control-group">
                  <label>{labels.editSuggestions}</label>
                  <button
                    className="btn-action"
                    onClick={getEditSuggestions}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? labels.analyzing : labels.analyze}
                  </button>
                </div>

                <div className="control-group">
                  <label>{labels.highlightImportant}</label>
                  <button
                    className="btn-action"
                    onClick={getHighlights}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? labels.analyzing : labels.analyze}
                  </button>
                </div>

                {selectedText && (
                  <div className="control-group">
                    <label>{labels.explainSelected}</label>
                    <div className="selected-text-preview">
                      {selectedText.substring(0, 100)}
                      {selectedText.length > 100 ? '...' : ''}
                    </div>
                    <button
                      className="btn-action btn-explain-selected"
                      onClick={() => performAnalysis(null, selectedText)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? labels.analyzing : labels.explainSelected}
                    </button>
                  </div>
                )}

                <div className="control-group custom-query">
                  <label>{labels.customQuery}</label>
                  <input
                    type="text"
                    className="query-input"
                    placeholder="Pregunta algo específico..."
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                  />
                  <button
                    className="btn-action"
                    onClick={() => performAnalysis(null, customQuery)}
                    disabled={isAnalyzing || !customQuery.trim()}
                  >
                    {isAnalyzing ? labels.analyzing : 'Enviar'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="analysis-result">
                {analysisResult ? (
                  <div className="result-text">
                    {analysisResult.split('\n').map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">Selecciona un tipo de análisis para comenzar</p>
                )}
              </div>
            )}

            {activeTab === 'highlights' && (
              <div className="highlights-view">
                {highlights.length > 0 ? (
                  <>
                    <div className="highlighted-content">
                      {renderHighlightedContent()}
                    </div>
                    <div className="highlights-legend">
                      <div className="legend-item">
                        <span className="legend-color high"></span>
                        Alta importancia
                      </div>
                      <div className="legend-item">
                        <span className="legend-color medium"></span>
                        Importancia media
                      </div>
                      <div className="legend-item">
                        <span className="legend-color low"></span>
                        Baja importancia
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="empty-state">Ejecuta el análisis de resaltes para ver los puntos importantes</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentAIEditor;
