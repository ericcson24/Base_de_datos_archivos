import React, { useState, useEffect, useCallback } from 'react';
import mammoth from 'mammoth';
import { useLanguage } from '../../../context/LanguageContext';
import { downloadFile } from '../../../utils/fileUtils';
import './WordEditor.css';

const WordEditor = ({ fileUrl, fileBlob, file }) => {
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check for .doc extension
      if (file.name.toLowerCase().endsWith('.doc')) {
        setError(t('wordEditor.docNotSupported'));
        setLoading(false);
        return;
      }

      let arrayBuffer;

      if (fileBlob) {
        console.log('📄 [WordEditor] Loading from blob, size:', fileBlob.size);
        if (fileBlob.size === 0) {
          throw new Error(t('wordEditor.emptyFile'));
        }
        arrayBuffer = await fileBlob.arrayBuffer();
      } else if (fileUrl) {
        console.log('📄 [WordEditor] Loading from URL');
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(t('wordEditor.downloadError'));
        arrayBuffer = await response.arrayBuffer();
      } else {
        return;
      }
      
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      
      if (!result.value) {
        console.warn('Mammoth returned empty content');
        if (result.messages.length > 0) {
           console.warn('Mammoth messages:', result.messages);
        }
        // Don't error out, just show empty or warning
        setContent(`<div class="alert alert-warning">${t('wordEditor.emptyContent')}</div>`);
      } else {
        setContent(result.value);
      }
      
      if (result.messages.length > 0) {
        console.log('Mammoth messages:', result.messages);
      }
    } catch (err) {
      console.error('Error loading Word document:', err);
      setError(`${t('wordEditor.loadErrorGeneric')}${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [file.name, fileBlob, fileUrl]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  if (loading) return <div className="flex items-center justify-center h-full">{t('wordEditor.loading')}</div>;
  if (error) return <div className="flex items-center justify-center h-full text-red-500">{error}</div>;

  return (
    <div className="word-editor">
      <div className="word-toolbar">
        <button 
          onClick={() => downloadFile(file.id, file.name, t)}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center"
        >
          ⬇️ {t('wordEditor.download')}
        </button>
        <span className="text-sm text-gray-500 ml-2">{file.name}</span>
        <span className="text-xs text-orange-500 ml-auto">{t('wordEditor.readMode')}</span>
      </div>

      <div className="word-content-container">
        <div 
          className="word-page"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
};

export default WordEditor;
