import React, { useState, useEffect, useCallback, useRef } from 'react';
import mammoth from 'mammoth';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import JSZip from 'jszip';
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
      
      const token = getAuthToken();
      if (!token) {
        addToast(t('wordEditor.noToken'), 'error');
        return;
      }

      const htmlContent = content;

      // Helper to XML-escape text
      const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

      // Parse HTML to extract text and images
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');

      // Collect images (base64 data URIs) for embedding
      const images = []; // { rId, data (Uint8Array), ext, cx, cy }

      // Convert a base64 data URI to Uint8Array
      const dataUriToBytes = (dataUri) => {
        const base64 = dataUri.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      };

      const getImageExt = (dataUri) => {
        const mime = dataUri.split(';')[0].split(':')[1] || '';
        if (mime.includes('png')) return 'png';
        if (mime.includes('gif')) return 'gif';
        if (mime.includes('bmp')) return 'bmp';
        return 'jpeg';
      };

      // Build OOXML paragraph runs from inline nodes
      const runXml = (el) => {
        let xml = '';
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.textContent;
            if (!txt) return;
            const bold = el.closest('strong, b') !== null || ['b','strong'].includes(el.tagName?.toLowerCase());
            const italic = el.closest('em, i') !== null || ['i','em'].includes(el.tagName?.toLowerCase());
            const underline = el.closest('u') !== null || el.tagName?.toLowerCase() === 'u';
            const strike = el.closest('s, strike, del') !== null;
            let rPr = '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/>';
            if (bold) rPr += '<w:b/>';
            if (italic) rPr += '<w:i/>';
            if (underline) rPr += '<w:u w:val="single"/>';
            if (strike) rPr += '<w:strike/>';
            rPr += '</w:rPr>';
            xml += `<w:r>${rPr}<w:t xml:space="preserve">${esc(txt)}</w:t></w:r>`;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            if (tag === 'br') {
              xml += '<w:r><w:br/></w:r>';
            } else if (tag === 'img') {
              // Embed image
              const src = node.getAttribute('src') || '';
              if (src.startsWith('data:')) {
                const imgIdx = images.length;
                const rId = `rIdImg${imgIdx + 1}`;
                const ext = getImageExt(src);
                const data = dataUriToBytes(src);
                // Default size: 400x300 px → EMU (1 px ≈ 9525 EMU)
                let w = parseInt(node.getAttribute('width')) || 400;
                let h = parseInt(node.getAttribute('height')) || 300;
                // Clamp to max page width (~6 inches = 5486400 EMU)
                const maxW = 575;
                if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                const cx = w * 9525;
                const cy = h * 9525;
                images.push({ rId, data, ext, cx, cy });
                xml += `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
                  `<wp:extent cx="${cx}" cy="${cy}"/>` +
                  `<wp:docPr id="${imgIdx + 100}" name="Image${imgIdx + 1}"/>` +
                  `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
                  `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
                  `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
                  `<pic:nvPicPr><pic:cNvPr id="${imgIdx + 100}" name="Image${imgIdx + 1}"/><pic:cNvPicPr/></pic:nvPicPr>` +
                  `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
                  `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
                  `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
                  `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
              }
            } else {
              xml += runXml(node);
            }
          }
        });
        return xml;
      };

      // Build OOXML paragraphs from block nodes
      let bodyXml = '';

      const walkNodes = (container) => {
        container.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.textContent?.trim();
            if (txt) {
              bodyXml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${esc(txt)}</w:t></w:r></w:p>`;
            }
            return;
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const tag = node.tagName.toLowerCase();

          // Heading levels
          const headingMap = { h1: '1', h2: '2', h3: '3', h4: '4', h5: '5', h6: '6' };
          if (headingMap[tag]) {
            const level = headingMap[tag];
            const szMap = { '1': '48', '2': '40', '3': '36', '4': '32', '5': '28', '6': '24' };
            bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>${runXml(node)}</w:p>`;
            return;
          }

          // Lists
          if (tag === 'ol' || tag === 'ul') {
            const items = node.querySelectorAll(':scope > li');
            items.forEach((li, idx) => {
              const prefix = tag === 'ol' ? `${idx + 1}. ` : '• ';
              bodyXml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${esc(prefix)}</w:t></w:r>${runXml(li)}</w:p>`;
            });
            return;
          }

          // Block elements
          if (['p', 'div', 'blockquote', 'pre', 'li'].includes(tag)) {
            let pPr = '';
            const style = node.getAttribute('style') || '';
            const align = node.getAttribute('align') || '';
            if (style.includes('text-align: center') || align === 'center') pPr = '<w:pPr><w:jc w:val="center"/></w:pPr>';
            else if (style.includes('text-align: right') || align === 'right') pPr = '<w:pPr><w:jc w:val="right"/></w:pPr>';
            else if (style.includes('text-align: justify')) pPr = '<w:pPr><w:jc w:val="both"/></w:pPr>';
            const inner = runXml(node);
            bodyXml += `<w:p>${pPr}${inner || '<w:r><w:t></w:t></w:r>'}</w:p>`;
            return;
          }

          // Tables
          if (tag === 'table') {
            const rows = node.querySelectorAll('tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td, th');
              const cellTexts = [];
              cells.forEach(cell => cellTexts.push(cell.textContent || ''));
              bodyXml += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${esc(cellTexts.join(' | '))}</w:t></w:r></w:p>`;
            });
            return;
          }

          // Standalone images at block level
          if (tag === 'img') {
            const src = node.getAttribute('src') || '';
            if (src.startsWith('data:')) {
              bodyXml += `<w:p>${runXml(node)}</w:p>`;
            }
            return;
          }

          // Inline elements at block level
          if (['span', 'strong', 'b', 'em', 'i', 'u', 'a', 's', 'strike', 'del', 'sub', 'sup', 'code'].includes(tag)) {
            const inner = runXml(node);
            if (inner) bodyXml += `<w:p>${inner}</w:p>`;
            return;
          }

          // Fallback
          walkNodes(node);
        });
      };

      walkNodes(doc.body);

      // If nothing was generated, add an empty paragraph
      if (!bodyXml) {
        bodyXml = '<w:p><w:r><w:t></w:t></w:r></w:p>';
      }

      // Build the real .docx using JSZip (OOXML structure)
      const zip = new JSZip();

      // Image content type defaults
      const imgExts = [...new Set(images.map(img => img.ext))];
      let imgDefaults = '';
      imgExts.forEach(ext => {
        const ct = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        imgDefaults += `<Default Extension="${ext}" ContentType="${ct}"/>`;
      });

      // [Content_Types].xml
      zip.file('[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        imgDefaults +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`
      );

      // _rels/.rels
      zip.folder('_rels').file('.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`
      );

      // word/document.xml
      const wordFolder = zip.folder('word');
      wordFolder.file('document.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
        `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
        `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
        `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
        `<w:body>${bodyXml}</w:body></w:document>`
      );

      // word/_rels/document.xml.rels — include image relationships
      let docRels = '';
      images.forEach(img => {
        docRels += `<Relationship Id="${img.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${img.rId}.${img.ext}"/>`;
      });
      wordFolder.folder('_rels').file('document.xml.rels',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${docRels}</Relationships>`
      );

      // word/media/ — embed image files
      if (images.length > 0) {
        const mediaFolder = wordFolder.folder('media');
        images.forEach(img => {
          mediaFolder.file(`${img.rId}.${img.ext}`, img.data);
        });
      }

      // Generate the zip as a Blob
      const docxBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      console.log('[WordEditor] Generated real .docx blob, size:', docxBlob.size);

      const formData = new FormData();
      formData.append('file', docxBlob, file.name);

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
      ['link', 'image'],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'color', 'background',
    'link', 'image'
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
