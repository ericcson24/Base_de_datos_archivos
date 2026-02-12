import React, { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../../../utils/fileUtils';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import './PowerPointEditor.css';

const PowerPointEditor = ({ fileUrl, fileBlob, file, onClose, onFileSaved }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [slides, setSlides] = useState([{ title: '', content: '' }]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadPresentation = useCallback(async () => {
    try {
      setLoading(true);
      
      let arrayBuffer;
      let isEmpty = false;

      if (fileBlob) {
        console.log('[PowerPointEditor] Loading from blob, size:', fileBlob.size);
        if (fileBlob.size === 0) {
          isEmpty = true;
        } else {
          arrayBuffer = await fileBlob.arrayBuffer();
          if (arrayBuffer.byteLength === 0) isEmpty = true;
        }
      } else if (fileUrl) {
        console.log('[PowerPointEditor] Loading from URL:', fileUrl);
        const token = localStorage.getItem('token');
        const response = await fetch(fileUrl, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (!response.ok) {
          isEmpty = true;
        } else {
          arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength === 0) isEmpty = true;
        }
      } else {
        isEmpty = true;
      }

      if (isEmpty) {
        console.log('[PowerPointEditor] Empty presentation - enabling edit mode');
        setSlides([{ title: t('powerPointEditor.slideTitle', { num: 1 }), content: '' }]);
        setIsEditing(true);
        setLoading(false);
        return;
      }

      // Intentar leer como HTML (formato simplificado)
      try {
        const htmlText = new TextDecoder().decode(arrayBuffer);
        
        if (htmlText && htmlText.includes('<!DOCTYPE html>')) {
          console.log('[PowerPointEditor] File is HTML format');
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          
          // Extraer diapositivas (cada div.slide)
          const slideElements = doc.querySelectorAll('.slide');
          if (slideElements.length > 0) {
            const loadedSlides = Array.from(slideElements).map(slideEl => ({
              title: slideEl.querySelector('h1')?.textContent || '',
              content: slideEl.querySelector('.slide-content')?.innerHTML || ''
            }));
            setSlides(loadedSlides);
          } else {
            setSlides([{ title: t('powerPointEditor.slideTitle', { num: 1 }), content: '' }]);
            setIsEditing(true);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('[PowerPointEditor] Not HTML format');
      }

      // Si no se puede leer, mostrar vacío para editar
      setSlides([{ title: t('powerPointEditor.slideTitle', { num: 1 }), content: '' }]);
      setIsEditing(true);
      
    } catch (err) {
      console.error('[PowerPointEditor] Error loading presentation:', err);
      addToast(t('powerPointEditor.loadError'), 'error');
      setSlides([{ title: t('powerPointEditor.slideTitle', { num: 1 }), content: '' }]);
    } finally {
      setLoading(false);
    }
  }, [fileBlob, fileUrl, file, t, addToast]);

  useEffect(() => {
    loadPresentation();
  }, [loadPresentation]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const token = getAuthToken();
      if (!token) {
        addToast(t('powerPointEditor.noToken'), 'error');
        return;
      }

      // Generar HTML simple para presentación
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${file.name}</title>
            <style>
              body {
                font-family: Calibri, Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f0f0f0;
              }
              .slide {
                background: white;
                margin: 20px auto;
                padding: 40px;
                max-width: 800px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                page-break-after: always;
              }
              .slide h1 {
                color: #1e40af;
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              .slide-content {
                font-size: 16px;
                line-height: 1.6;
              }
            </style>
          </head>
          <body>
            ${slides.map(slide => `
              <div class="slide">
                <h1>${slide.title}</h1>
                <div class="slide-content">${slide.content}</div>
              </div>
            `).join('')}
          </body>
        </html>
      `;

      const htmlBlob = new Blob([fullHtml], { 
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      });

      const formData = new FormData();
      formData.append('file', htmlBlob, file.name);

      const response = await fetch(`/api/files/${encodeURIComponent(file.id)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      addToast(t('powerPointEditor.saveSuccess'), 'success');
      setIsEditing(false);
      
      console.log('[PowerPointEditor] Save successful, calling onFileSaved callback');
      if (onFileSaved) {
        onFileSaved();
      }
      
    } catch (error) {
      console.error('[PowerPointEditor] Save error:', error);
      addToast(t('powerPointEditor.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addSlide = () => {
    setSlides([...slides, { 
      title: t('powerPointEditor.slideTitle', { num: slides.length + 1 }), 
      content: '' 
    }]);
    setActiveSlide(slides.length);
  };

  const deleteSlide = (index) => {
    if (slides.length === 1) {
      addToast(t('powerPointEditor.cannotDeleteLast'), 'warning');
      return;
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (activeSlide >= newSlides.length) {
      setActiveSlide(newSlides.length - 1);
    }
  };

  const updateSlide = (index, field, value) => {
    const newSlides = [...slides];
    newSlides[index][field] = value;
    setSlides(newSlides);
  };

  if (loading) {
    return <div className="loading-container">{t('common.loading')}</div>;
  }

  return (
    <div className="powerpoint-editor">
      <div className="editor-header">
        <h2>📽️ {file.name}</h2>
        <div className="editor-actions">
          {!isEditing ? (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              ✏️ {t('common.edit')}
            </button>
          ) : (
            <>
              <button className="btn-cancel" onClick={() => setIsEditing(false)} disabled={isSaving}>
                {t('common.cancel')}
              </button>
              <button className="btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving ? t('powerPointEditor.saving') : `💾 ${t('common.save')}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="presentation-container">
        <div className="slides-sidebar">
          <div className="slides-list">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`slide-thumbnail ${activeSlide === index ? 'active' : ''}`}
                onClick={() => setActiveSlide(index)}
              >
                <div className="thumbnail-number">{index + 1}</div>
                <div className="thumbnail-title">{slide.title || t('powerPointEditor.untitled')}</div>
                {isEditing && slides.length > 1 && (
                  <button
                    className="delete-slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSlide(index);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {isEditing && (
            <button className="add-slide-btn" onClick={addSlide}>
              + {t('powerPointEditor.addSlide')}
            </button>
          )}
        </div>

        <div className="slide-editor">
          <div className="slide-content-wrapper">
            {isEditing ? (
              <>
                <input
                  type="text"
                  className="slide-title-input"
                  value={slides[activeSlide]?.title || ''}
                  onChange={(e) => updateSlide(activeSlide, 'title', e.target.value)}
                  placeholder={t('powerPointEditor.titlePlaceholder')}
                />
                <textarea
                  className="slide-content-input"
                  value={slides[activeSlide]?.content || ''}
                  onChange={(e) => updateSlide(activeSlide, 'content', e.target.value)}
                  placeholder={t('powerPointEditor.contentPlaceholder')}
                />
              </>
            ) : (
              <div className="slide-preview">
                <h1>{slides[activeSlide]?.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: slides[activeSlide]?.content || '' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerPointEditor;
