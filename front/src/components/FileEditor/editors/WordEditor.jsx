import React, { useState, useEffect, useCallback, useRef } from 'react';
import mammoth from 'mammoth';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { getAuthToken } from '../../../utils/fileUtils';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import './WordEditor.css';

const WordEditor = ({ fileUrl, fileBlob, file, onClose, onFileSaved, highlightText }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const quillRef = useRef(null);

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      
      if (file.name.toLowerCase().endsWith('.doc')) {
        addToast(t('wordEditor.docNotSupported'), 'error', 5000);
        setLoading(false);
        return;
      }

      let arrayBuffer;
      let isEmpty = false;

      if (fileBlob) {
        console.log('[WordEditor] Loading from blob, size:', fileBlob.size);
        if (fileBlob.size === 0) {
          console.log('[WordEditor] Empty file - starting in edit mode');
          isEmpty = true;
        } else {
          arrayBuffer = await fileBlob.arrayBuffer();
          if (arrayBuffer.byteLength === 0) isEmpty = true;
        }
      } else if (fileUrl) {
        console.log('[WordEditor] Loading from URL:', fileUrl);
        const token = getAuthToken();
        const response = await fetch(fileUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) {
          console.error('[WordEditor] Fetch failed:', response.status);
          isEmpty = true;
        } else {
          arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength === 0) isEmpty = true;
        }
      } else {
        isEmpty = true;
      }

      if (isEmpty) {
        console.log('[WordEditor] Empty document - enabling edit mode');
        setContent('<p><br></p>');
        setIsEditing(true);
        addToast(t('wordEditor.emptyDocumentWarning'), 'info', 5000);
        setLoading(false);
        return;
      }

      // Primero intentar leer como HTML (más rápido y evita errores de Mammoth)
      try {
        const htmlText = new TextDecoder().decode(arrayBuffer);
        
        // Verificar si es HTML completo
        if (htmlText && htmlText.includes('<!DOCTYPE html>')) {
          console.log('[WordEditor] File is HTML format, extracting body content');
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          const bodyContent = doc.body.innerHTML;
          if (bodyContent && bodyContent.trim().length > 0) {
            let processingContent = bodyContent;
             if (highlightText && highlightText.length > 2) {
               const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
               processingContent = processingContent.replace(regex, '<span style="background-color: yellow; color: black; font-weight: bold;">$1</span>');
            }
            setContent(processingContent);
            setLoading(false);
            return;
          }
        }
        
        // Verificar si es formato MHT (usado por html-docx-js antiguo)
        if (htmlText.includes('Content-Type: text/html')) {
          console.log('[WordEditor] Detected MHT format, extracting content');
          const lines = htmlText.split('\n');
          let inHtmlSection = false;
          let htmlContent = '';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('Content-Type: text/html')) {
              inHtmlSection = true;
              i += 3;
              continue;
            }
            
            if (inHtmlSection && line.startsWith('------=mht')) {
              break;
            }
            
            if (inHtmlSection) {
              htmlContent += line + '\n';
            }
          }
          
          if (htmlContent.trim().length > 0) {
            htmlContent = htmlContent.replace(/=\r?\n/g, '');
            console.log('[WordEditor] Extracted MHT content');
            setContent(htmlContent);
            setLoading(false);
            return;
          }
        }
      } catch (htmlErr) {
        console.log('[WordEditor] Not HTML format, trying Mammoth');
      }

      // Si no es HTML, intentar con Mammoth (archivos .docx reales)
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        if (result.value && result.value.trim().length > 0) {
          let processingContent = result.value;
          // Apply highlighting if props provided
          if (highlightText && highlightText.length > 2) {
               const regex = new RegExp(`(${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
               processingContent = processingContent.replace(regex, '<span style="background-color: yellow; color: black; font-weight: bold;">$1</span>');
          }
          setContent(processingContent);
        } else {
          console.log('[WordEditor] Mammoth returned empty content');
          setContent('<p><br></p>');
          setIsEditing(true);
          addToast(t('wordEditor.emptyDocumentWarning'), 'info', 5000);
        }
      } catch (mammothErr) {
        console.error('[WordEditor] Mammoth error:', mammothErr);
        setContent('<p><br></p>');
        setIsEditing(true);
        addToast(t('wordEditor.docxReadError'), 'error', 5000);
      }
      
    } catch (err) {
      console.error('[WordEditor] Error loading document:', err);
      setContent('<p><br></p>');
      setIsEditing(true);
      addToast(t('wordEditor.loadErrorFallback'), 'warning', 5000);
    } finally {
      setLoading(false);
    }
  }, [file.name, fileBlob, fileUrl, t, addToast]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadDocument();
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
      if (!token) {
        addToast(t('wordEditor.noToken'), 'error');
        return;
      }

      const htmlContent = content;
      
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${file.name}</title>
            <style>
              body { 
                font-family: Calibri, Arial, sans-serif; 
                color: #000000 !important;
                background: white;
                line-height: 1.5;
                margin: 1in;
              }
              p, h1, h2, h3, h4, h5, h6, span, div, td, th, li {
                color: #000000 !important;
              }
              table { 
                border-collapse: collapse; 
                width: 100%; 
              }
              td, th { 
                border: 1px solid #000; 
                padding: 8px; 
                color: #000000 !important;
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;

      // Guardar como HTML (Word puede abrir HTML con extensión .docx)
      const htmlBlob = new Blob([fullHtml], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      const formData = new FormData();
      formData.append('file', htmlBlob, file.name);

      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      addToast(t('wordEditor.saveSuccess'), 'success');
      setIsEditing(false);
      
      // Llamar al callback para actualizar la lista de archivos
      console.log('[WordEditor] Save successful, calling onFileSaved callback');
      if (onFileSaved) {
        console.log('[WordEditor] Executing onFileSaved callback');
        onFileSaved();
      } else {
        console.warn('[WordEditor] No onFileSaved callback provided');
      }
      
    } catch (error) {
      console.error('[WordEditor] Save error:', error);
      addToast(t('wordEditor.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'color', 'background',
    'link'
  ];

  if (loading) {
    return (
      <div className="word-editor-container">
        <div className="word-loading">
          <div className="spinner"></div>
          <p>{t('wordEditor.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="word-editor-container">
      <div className="word-toolbar">
        <div className="word-toolbar-left">
          <h3>{file.name}</h3>
        </div>
        <div className="word-toolbar-right">
          {!isEditing ? (
            <button className="btn-edit" onClick={handleEdit}>
              ✏️ {t('common.edit')}
            </button>
          ) : (
            <>
              <button 
                className="btn-cancel" 
                onClick={handleCancel}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </button>
              <button 
                className="btn-save" 
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? t('excelEditor.saving') : `💾 ${t('common.save')}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="word-content">
        {isEditing ? (
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            formats={formats}
            placeholder={t('wordEditor.emptyDocumentMessage')}
            style={{ height: 'calc(100% - 42px)' }}
          />
        ) : (
          <div 
            className="word-preview"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  );
};

export default WordEditor;
