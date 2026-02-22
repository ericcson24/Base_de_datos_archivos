import React, { useState, useEffect, useCallback, useRef } from 'react';
import mammoth from 'mammoth';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import JSZip from 'jszip';
import { getAuthToken } from '../../../utils/fileUtils';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import './WordEditor.css';

// Register custom font sizes for Quill
const Size = Quill.import('attributors/style/size');
Size.whitelist = [
  '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px',
  '20px', '24px', '28px', '32px', '36px', '42px', '48px', '56px', '72px'
];
Quill.register(Size, true);

// Register custom font families for Quill
const Font = Quill.import('attributors/style/font');
Font.whitelist = [
  'arial', 'calibri', 'comic-sans', 'courier-new', 'georgia',
  'helvetica', 'impact', 'lucida-console', 'tahoma', 'times-new-roman',
  'trebuchet-ms', 'verdana'
];
Quill.register(Font, true);

// Register custom line heights for Quill
const Parchment = Quill.import('parchment');
const LineHeightStyle = new Parchment.Attributor.Style('lineHeight', 'line-height', {
  scope: Parchment.Scope.BLOCK,
  whitelist: ['1', '1.15', '1.5', '2', '2.5', '3']
});
Quill.register(LineHeightStyle, true);

// Extend Image blot to preserve width, height, and style attributes through Delta round-trips
const ImageBlot = Quill.import('formats/image');
class StyledImage extends ImageBlot {
  static formats(domNode) {
    const formats = super.formats ? super.formats(domNode) : {};
    if (domNode.hasAttribute('style')) formats.style = domNode.getAttribute('style');
    if (domNode.hasAttribute('width')) formats.width = domNode.getAttribute('width');
    if (domNode.hasAttribute('height')) formats.height = domNode.getAttribute('height');
    return formats;
  }

  format(name, value) {
    if (['style', 'width', 'height'].includes(name)) {
      if (value) {
        this.domNode.setAttribute(name, value);
      } else {
        this.domNode.removeAttribute(name);
      }
    } else {
      super.format(name, value);
    }
  }
}
StyledImage.blotName = 'image';
StyledImage.tagName = 'IMG';
Quill.register(StyledImage, true);

const WordEditor = ({ fileUrl, fileBlob, file, onClose, onFileSaved, highlightText }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const quillRef = useRef(null);
  const containerRef = useRef(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!content) {
      setWordCount(0);
      setCharCount(0);
      return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const text = doc.body.textContent || '';
    setCharCount(text.length);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [content]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${file.name}</title>
          <style>
            body { font-family: Calibri, Arial, sans-serif; padding: 40px; line-height: 1.5; }
            table { border-collapse: collapse; width: 100%; margin: 1em 0; }
            td, th { border: 1px solid #ccc; padding: 8px; }
            img { max-width: 100%; height: auto; }
            blockquote { border-left: 4px solid #ccc; padding-left: 16px; margin-left: 0; color: #666; }
            pre { background: #f4f4f4; padding: 12px; border-radius: 4px; font-family: monospace; }
            .ql-align-center { text-align: center; }
            .ql-align-right { text-align: right; }
            .ql-align-justify { text-align: justify; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

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

      // Determine if this is a real .docx (ZIP) or HTML-based file
      // Check ZIP magic bytes: PK (0x50, 0x4B)
      const headerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
      const isZip = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B;

      if (isZip) {
        // Real .docx file — go straight to Mammoth
        console.log('[WordEditor] Detected ZIP/.docx format, using Mammoth');
        try {
          const options = {
            styleMap: [
              "p[style-name='Title'] => h1",
              "p[style-name='Subtitle'] => h2",
              "p[style-name='Heading 1'] => h1",
              "p[style-name='Heading 2'] => h2",
              "p[style-name='Heading 3'] => h3",
              "p[style-name='Heading 4'] => h4",
              "p[style-name='Heading 5'] => h5",
              "p[style-name='Heading 6'] => h6",
              "p[style-name='Quote'] => blockquote",
              "p[style-name='Code'] => pre",
              "r[style-name='Strong'] => strong",
              "r[style-name='Emphasis'] => em"
            ],
            convertImage: mammoth.images.imgElement(function(image) {
              return image.read('base64').then(function(imageBuffer) {
                const mimeType = image.contentType || 'image/png';
                return { src: `data:${mimeType};base64,${imageBuffer}` };
              });
            })
          };
          let result = await mammoth.convertToHtml({ arrayBuffer }, options);

          // Post-process: ensure all images have proper max-width style
          if (result.value) {
            result = {
              ...result,
              value: result.value.replace(/<img /g, '<img style="max-width:100%;height:auto" ')
            };
          }

          if (result.value && result.value.trim().length > 0) {
            let processingContent = result.value;
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
      } else {
        // Not a ZIP — try HTML / MHT text formats
        try {
          const htmlText = new TextDecoder().decode(arrayBuffer);

          // Check if HTML
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

          // Check MHT format
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

          // Plain text fallback — just wrap in a paragraph
          if (htmlText && htmlText.trim().length > 0) {
            console.log('[WordEditor] Treating as plain text');
            setContent(`<p>${htmlText.replace(/\n/g, '<br>')}</p>`);
          } else {
            setContent('<p><br></p>');
            setIsEditing(true);
          }
        } catch (textErr) {
          console.error('[WordEditor] Text decode error:', textErr);
          setContent('<p><br></p>');
          setIsEditing(true);
          addToast(t('wordEditor.loadErrorFallback'), 'warning', 5000);
        }
      }
      
    } catch (err) {
      console.error('[WordEditor] Error loading document:', err);
      setContent('<p><br></p>');
      setIsEditing(true);
      addToast(t('wordEditor.loadErrorFallback'), 'warning', 5000);
    } finally {
      setLoading(false);
    }
  }, [file.name, fileBlob, fileUrl, t, addToast, highlightText]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Setup image paste handler and custom image insertion
  useEffect(() => {
    if (!isEditing || !quillRef.current) return;
    const quill = quillRef.current.getEditor();
    if (!quill) return;

    // Custom image handler for toolbar button
    const toolbar = quill.getModule('toolbar');
    if (toolbar) {
      toolbar.addHandler('image', () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = () => {
          const file = input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', e.target.result);
              // After inserting, set the width/height via DOM
              setTimeout(() => {
                const editor = quill.root;
                const images = editor.querySelectorAll('img[src^="data:"]');
                const lastImg = images[images.length - 1];
                if (lastImg && !lastImg.getAttribute('width')) {
                  let w = img.naturalWidth;
                  let h = img.naturalHeight;
                  const maxW = 700;
                  if (w > maxW) {
                    h = Math.round(h * maxW / w);
                    w = maxW;
                  }
                  lastImg.setAttribute('width', w);
                  lastImg.setAttribute('height', h);
                  lastImg.style.width = w + 'px';
                  lastImg.style.height = h + 'px';
                }
              }, 100);
              quill.setSelection(range.index + 1);
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        };
      });
    }

    // Handle paste events for images
    const handlePaste = (e) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData || !clipboardData.items) return;

      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          e.stopPropagation();
          const blob = item.getAsFile();
          if (!blob) continue;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', ev.target.result);
              setTimeout(() => {
                const editor = quill.root;
                const images = editor.querySelectorAll('img[src^="data:"]');
                const lastImg = images[images.length - 1];
                if (lastImg && !lastImg.getAttribute('width')) {
                  let w = img.naturalWidth;
                  let h = img.naturalHeight;
                  const maxW = 700;
                  if (w > maxW) {
                    h = Math.round(h * maxW / w);
                    w = maxW;
                  }
                  lastImg.setAttribute('width', w);
                  lastImg.setAttribute('height', h);
                  lastImg.style.width = w + 'px';
                  lastImg.style.height = h + 'px';
                }
              }, 100);
              quill.setSelection(range.index + 1);
            };
            img.src = ev.target.result;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    };

    quill.root.addEventListener('paste', handlePaste);

    // ── Image Resize System ──
    // We use a floating overlay positioned relative to the scroll container (.word-content)
    // instead of inside ql-editor, to avoid Quill interfering with our DOM.
    let activeImg = null;
    let resizeOverlay = null;

    const removeOverlay = () => {
      if (resizeOverlay) {
        resizeOverlay.remove();
        resizeOverlay = null;
      }
      activeImg = null;
    };

    const updateOverlayPosition = () => {
      if (!activeImg || !resizeOverlay) return;
      const imgRect = activeImg.getBoundingClientRect();
      const scrollParent = quill.root.closest('.word-content');
      if (!scrollParent) return;
      const parentRect = scrollParent.getBoundingClientRect();
      resizeOverlay.style.left = (imgRect.left - parentRect.left + scrollParent.scrollLeft) + 'px';
      resizeOverlay.style.top = (imgRect.top - parentRect.top + scrollParent.scrollTop) + 'px';
      resizeOverlay.style.width = imgRect.width + 'px';
      resizeOverlay.style.height = imgRect.height + 'px';
    };

    const showOverlay = (img) => {
      removeOverlay();
      activeImg = img;

      const scrollParent = quill.root.closest('.word-content');
      if (!scrollParent) return;

      // Ensure scroll parent is positioned
      if (getComputedStyle(scrollParent).position === 'static') {
        scrollParent.style.position = 'relative';
      }

      const overlay = document.createElement('div');
      overlay.className = 'img-resize-overlay';
      overlay.style.cssText = 'position:absolute;border:2px solid #3b82f6;box-sizing:border-box;z-index:100;pointer-events:none;';

      // Corner handles (all 4 corners)
      const corners = ['nw', 'ne', 'sw', 'se'];
      corners.forEach(corner => {
        const h = document.createElement('div');
        h.className = `img-resize-handle img-resize-${corner}`;
        const cursors = { nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize' };
        const positions = {
          nw: 'top:-5px;left:-5px;',
          ne: 'top:-5px;right:-5px;',
          sw: 'bottom:-5px;left:-5px;',
          se: 'bottom:-5px;right:-5px;'
        };
        h.style.cssText = `position:absolute;${positions[corner]}width:10px;height:10px;background:#3b82f6;border:1px solid #fff;border-radius:2px;cursor:${cursors[corner]};pointer-events:all;z-index:101;`;
        overlay.appendChild(h);

        h.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const startX = ev.clientX;
          const startY = ev.clientY;
          const startW = img.offsetWidth || img.naturalWidth;
          const startH = img.offsetHeight || img.naturalHeight;
          const ratio = startW / startH;

          const onMove = (me) => {
            me.preventDefault();
            let dx = me.clientX - startX;
            let dy = me.clientY - startY;

            let newW, newH;
            if (corner === 'se') {
              newW = Math.max(30, startW + dx);
            } else if (corner === 'sw') {
              newW = Math.max(30, startW - dx);
            } else if (corner === 'ne') {
              newW = Math.max(30, startW + dx);
            } else {
              newW = Math.max(30, startW - dx);
            }
            newH = Math.round(newW / ratio);

            img.style.width = newW + 'px';
            img.style.height = newH + 'px';
            img.setAttribute('width', newW);
            img.setAttribute('height', newH);
            updateOverlayPosition();
            // Update size label
            const lbl = overlay.querySelector('.img-resize-label');
            if (lbl) lbl.textContent = `${newW} × ${newH}`;
          };

          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      });

      // Size label
      const label = document.createElement('div');
      label.className = 'img-resize-label';
      label.style.cssText = 'position:absolute;bottom:-24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;font-size:11px;padding:2px 8px;border-radius:4px;pointer-events:none;white-space:nowrap;font-family:monospace;';
      label.textContent = `${img.offsetWidth || img.naturalWidth} × ${img.offsetHeight || img.naturalHeight}`;
      overlay.appendChild(label);

      scrollParent.appendChild(overlay);
      resizeOverlay = overlay;
      updateOverlayPosition();
    };

    const handleEditorClick = (e) => {
      const img = e.target.closest ? e.target.closest('img') : (e.target.tagName === 'IMG' ? e.target : null);
      if (img && quill.root.contains(img)) {
        e.preventDefault();
        showOverlay(img);
      } else {
        removeOverlay();
      }
    };

    // Use mousedown on document to also catch clicks outside editor
    const handleDocClick = (e) => {
      if (resizeOverlay && !resizeOverlay.contains(e.target)) {
        const img = e.target.closest ? e.target.closest('img') : null;
        if (!img || !quill.root.contains(img)) {
          removeOverlay();
        }
      }
    };

    quill.root.addEventListener('click', handleEditorClick);
    document.addEventListener('mousedown', handleDocClick);

    return () => {
      quill.root.removeEventListener('paste', handlePaste);
      quill.root.removeEventListener('click', handleEditorClick);
      document.removeEventListener('mousedown', handleDocClick);
      removeOverlay();
    };
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadDocument();
  };

  const generateDocxBlob = async () => {
    const htmlContent = content;

    // Helper to XML-escape text
    const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Parse HTML to extract text and images
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');

    // Collect images (base64 data URIs) for embedding
    const images = []; // { rId, data (Uint8Array), ext, cx, cy, node }

    // Pre-process images to get their actual dimensions
    const imgNodes = doc.querySelectorAll('img');
    for (let i = 0; i < imgNodes.length; i++) {
      const node = imgNodes[i];
      const src = node.getAttribute('src') || '';
      if (src.startsWith('data:')) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            node.setAttribute('data-real-width', img.width);
            node.setAttribute('data-real-height', img.height);
            resolve();
          };
          img.onerror = resolve;
          img.src = src;
        });
      }
    }

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

    // Helper: parse CSS color to hex (for OOXML)
    const colorToHex = (color) => {
      if (!color) return null;
      // Already hex
      if (/^#[0-9a-f]{6}$/i.test(color)) return color.slice(1).toUpperCase();
      if (/^#[0-9a-f]{3}$/i.test(color)) {
        const r = color[1], g = color[2], b = color[3];
        return (r+r+g+g+b+b).toUpperCase();
      }
      // rgb(r,g,b)
      const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        const hex = (n) => parseInt(n).toString(16).padStart(2, '0');
        return (hex(m[1]) + hex(m[2]) + hex(m[3])).toUpperCase();
      }
      return null;
    };

    // Helper: parse font-size CSS value to OOXML half-point size
    const cssSizeToHalfPt = (size) => {
      if (!size) return null;
      const px = parseFloat(size);
      if (isNaN(px)) return null;
      // 1px ≈ 0.75pt, OOXML uses half-points
      return String(Math.round(px * 0.75 * 2));
    };

    // Helper: clean font family name from CSS value
    const cleanFontFamily = (font) => {
      if (!font) return null;
      // take first family, strip quotes
      const first = font.split(',')[0].trim().replace(/['"]/g, '');
      if (!first) return null;
      // Map CSS names back to proper names
      const map = {
        'arial': 'Arial', 'calibri': 'Calibri', 'comic-sans': 'Comic Sans MS',
        'courier-new': 'Courier New', 'georgia': 'Georgia', 'helvetica': 'Helvetica',
        'impact': 'Impact', 'lucida-console': 'Lucida Console', 'tahoma': 'Tahoma',
        'times-new-roman': 'Times New Roman', 'trebuchet-ms': 'Trebuchet MS', 'verdana': 'Verdana'
      };
      return map[first.toLowerCase()] || first;
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
          let underline = el.closest('u') !== null || el.tagName?.toLowerCase() === 'u';
          const strike = el.closest('s, strike, del') !== null;
          const sub = el.closest('sub') !== null || el.tagName?.toLowerCase() === 'sub';
          const sup = el.closest('sup') !== null || el.tagName?.toLowerCase() === 'sup';
          const isLink = el.closest('a') !== null || el.tagName?.toLowerCase() === 'a';
          const isCode = el.closest('code') !== null || el.tagName?.toLowerCase() === 'code';

          // Collect font/size/color from inline styles walking up the tree
          let fontFamily = isCode ? 'Courier New' : 'Calibri';
          let fontSize = '24'; // half-points = 12pt
          let fontColor = isLink ? '0563C1' : null;
          if (isLink) underline = true;
          let bgColor = isCode ? 'f3f4f6' : null;
          let ancestor = el;
          while (ancestor && ancestor !== doc.body) {
            if (ancestor.tagName?.toLowerCase() === 'pre' || ancestor.classList?.contains('ql-code-block')) {
              fontFamily = 'Courier New';
            }
            const style = ancestor.getAttribute?.('style') || '';
            if (style) {
              const ffMatch = style.match(/font-family:\s*([^;]+)/i);
              if (ffMatch && fontFamily === 'Calibri') {
                const cleaned = cleanFontFamily(ffMatch[1]);
                if (cleaned) fontFamily = cleaned;
              }
              const fsMatch = style.match(/font-size:\s*([^;]+)/i);
              if (fsMatch && fontSize === '24') {
                const hp = cssSizeToHalfPt(fsMatch[1]);
                if (hp) fontSize = hp;
              }
              const fcMatch = style.match(/(?:^|[^-])color:\s*([^;]+)/i);
              if (fcMatch && !fontColor) {
                fontColor = colorToHex(fcMatch[1].trim());
              }
              const bgMatch = style.match(/background-color:\s*([^;]+)/i);
              if (bgMatch && !bgColor) {
                bgColor = colorToHex(bgMatch[1].trim());
              }
            }
            // Check class-based Quill styles
            if (ancestor.classList) {
              for (let i = 0; i < ancestor.classList.length; i++) {
                const cls = ancestor.classList[i];
                if (cls.startsWith('ql-font-') && fontFamily === 'Calibri') {
                  const cleaned = cleanFontFamily(cls.replace('ql-font-', ''));
                  if (cleaned) fontFamily = cleaned;
                }
                if (cls.startsWith('ql-size-') && fontSize === '24') {
                  const hp = cssSizeToHalfPt(cls.replace('ql-size-', ''));
                  if (hp) fontSize = hp;
                }
              }
            }
            ancestor = ancestor.parentElement;
          }

          let rPr = `<w:rPr><w:rFonts w:ascii="${esc(fontFamily)}" w:hAnsi="${esc(fontFamily)}"/><w:sz w:val="${fontSize}"/><w:szCs w:val="${fontSize}"/>`;
          if (bold) rPr += '<w:b/>';
          if (italic) rPr += '<w:i/>';
          if (underline) rPr += '<w:u w:val="single"/>';
          if (strike) rPr += '<w:strike/>';
          if (sub) rPr += '<w:vertAlign w:val="subscript"/>';
          if (sup) rPr += '<w:vertAlign w:val="superscript"/>';
          if (fontColor) rPr += `<w:color w:val="${fontColor}"/>`;
          if (bgColor) rPr += `<w:shd w:val="clear" w:fill="${bgColor}"/>`;
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
              
              // Get actual dimensions - check style first (image resize module uses inline styles)
              const imgStyle = node.getAttribute('style') || '';
              const styleW = imgStyle.match(/width:\s*(\d+)/)?.[1];
              const styleH = imgStyle.match(/height:\s*(\d+)/)?.[1];
              let w = parseInt(styleW) || parseInt(node.getAttribute('width')) || parseInt(node.getAttribute('data-real-width')) || 400;
              let h = parseInt(styleH) || parseInt(node.getAttribute('height')) || parseInt(node.getAttribute('data-real-height')) || 300;
              
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
          let jc = '';
          const style = node.getAttribute('style') || '';
          const align = node.getAttribute('align') || '';
          if (style.includes('text-align: center') || align === 'center' || node.classList?.contains('ql-align-center')) jc = 'center';
          else if (style.includes('text-align: right') || align === 'right' || node.classList?.contains('ql-align-right')) jc = 'right';
          else if (style.includes('text-align: justify') || node.classList?.contains('ql-align-justify')) jc = 'both';
          
          const pPr = `<w:pPr><w:pStyle w:val="Heading${level}"/>${jc ? `<w:jc w:val="${jc}"/>` : ''}</w:pPr>`;
          bodyXml += `<w:p>${pPr}${runXml(node)}</w:p>`;
          return;
        }

        // Lists
        if (tag === 'ol' || tag === 'ul') {
          const numId = tag === 'ol' ? '1' : '2';
          const items = node.querySelectorAll(':scope > li');
          items.forEach((li) => {
            let jc = '';
            let ilvl = 0;
            const style = li.getAttribute('style') || '';
            const align = li.getAttribute('align') || '';
            if (style.includes('text-align: center') || align === 'center' || li.classList?.contains('ql-align-center')) jc = 'center';
            else if (style.includes('text-align: right') || align === 'right' || li.classList?.contains('ql-align-right')) jc = 'right';
            else if (style.includes('text-align: justify') || li.classList?.contains('ql-align-justify')) jc = 'both';
            
            if (li.classList) {
              li.classList.forEach(cls => {
                if (cls.startsWith('ql-indent-')) {
                  const level = parseInt(cls.replace('ql-indent-', ''));
                  if (!isNaN(level)) ilvl = level;
                }
              });
            }
            
            const pPr = `<w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr>${jc ? `<w:jc w:val="${jc}"/>` : ''}</w:pPr>`;
            bodyXml += `<w:p>${pPr}${runXml(li)}</w:p>`;
          });
          return;
        }

        // Tables
        if (tag === 'table') {
          bodyXml += `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr>`;
          const rows = node.querySelectorAll('tr');
          rows.forEach(row => {
            bodyXml += `<w:tr>`;
            const cells = row.querySelectorAll('td, th');
            cells.forEach(cell => {
              bodyXml += `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>`;
              const inner = runXml(cell);
              bodyXml += `<w:p>${inner || '<w:r><w:t></w:t></w:r>'}</w:p>`;
              bodyXml += `</w:tc>`;
            });
            bodyXml += `</w:tr>`;
          });
          bodyXml += `</w:tbl>`;
          return;
        }

        // Block elements
        if (['p', 'div', 'blockquote', 'pre', 'li'].includes(tag)) {
          let pPr = '';
          const style = node.getAttribute('style') || '';
          const align = node.getAttribute('align') || '';
          let jc = '';
          
          if (style.includes('text-align: center') || align === 'center' || node.classList?.contains('ql-align-center')) jc = 'center';
          else if (style.includes('text-align: right') || align === 'right' || node.classList?.contains('ql-align-right')) jc = 'right';
          else if (style.includes('text-align: justify') || node.classList?.contains('ql-align-justify')) jc = 'both';
          
          let ind = '';
          if (node.classList) {
            node.classList.forEach(cls => {
              if (cls.startsWith('ql-indent-')) {
                const level = parseInt(cls.replace('ql-indent-', ''));
                if (!isNaN(level)) {
                  // 720 twips = 0.5 inch per indent level
                  ind = `<w:ind w:left="${level * 720}"/>`;
                }
              }
            });
          }

          let spacing = '';
          const lhMatch = style.match(/line-height:\s*([\d.]+)/);
          if (lhMatch) {
            const val = parseFloat(lhMatch[1]);
            if (!isNaN(val)) {
              // 240 twips = 1 line (single spacing)
              spacing = `<w:spacing w:line="${Math.round(val * 240)}" w:lineRule="auto"/>`;
            }
          }

          let borders = '';
          let shd = '';
          if (tag === 'blockquote') {
            ind = `<w:ind w:left="720"/>`;
            borders = `<w:pBdr><w:left w:val="single" w:sz="12" w:space="10" w:color="cccccc"/></w:pBdr>`;
          } else if (tag === 'pre' || node.classList?.contains('ql-code-block')) {
            shd = `<w:shd w:val="clear" w:color="auto" w:fill="f3f4f6"/>`;
            borders = `<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="e5e7eb"/><w:left w:val="single" w:sz="4" w:space="4" w:color="e5e7eb"/><w:bottom w:val="single" w:sz="4" w:space="4" w:color="e5e7eb"/><w:right w:val="single" w:sz="4" w:space="4" w:color="e5e7eb"/></w:pBdr>`;
          }

          if (jc || ind || borders || shd || spacing) {
            pPr = `<w:pPr>${jc ? `<w:jc w:val="${jc}"/>` : ''}${spacing}${ind}${borders}${shd}</w:pPr>`;
          }
          
          const inner = runXml(node);
          bodyXml += `<w:p>${pPr}${inner || '<w:r><w:t></w:t></w:r>'}</w:p>`;
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

    // Add page setup (A4 size, standard margins)
    bodyXml += `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;

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
      `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
      `</Types>`
    );

    // _rels/.rels
    zip.folder('_rels').file('.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`
    );

    // word/numbering.xml
    const wordFolder = zip.folder('word');
    wordFolder.file('numbering.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:abstractNum w:abstractNumId="1"><w:nsid w:val="12345678"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="12345678"/>` +
      `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>` +
      `<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>` +
      `<w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl>` +
      `</w:abstractNum>` +
      `<w:abstractNum w:abstractNumId="2"><w:nsid w:val="87654321"/><w:multiLevelType w:val="hybridMultilevel"/><w:tmpl w:val="87654321"/>` +
      `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl>` +
      `<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:hint="default"/></w:rPr></w:lvl>` +
      `<w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="▪"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl>` +
      `</w:abstractNum>` +
      `<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>` +
      `<w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>` +
      `</w:numbering>`
    );

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
    let docRels = `<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`;
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
    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  };

  const handleDownload = async () => {
    try {
      addToast(t('common.downloading') || 'Downloading...', 'info');
      const docxBlob = await generateDocxBlob();
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.endsWith('.docx') ? file.name : `${file.name}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[WordEditor] Download error:', error);
      addToast(t('common.error') || 'Error downloading file', 'error');
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const token = getAuthToken();
      if (!token) {
        addToast(t('wordEditor.noToken'), 'error');
        return;
      }

      const docxBlob = await generateDocxBlob();
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
    toolbar: {
      container: [
        [{ 'font': ['', 'arial', 'calibri', 'comic-sans', 'courier-new', 'georgia', 'helvetica', 'impact', 'lucida-console', 'tahoma', 'times-new-roman', 'trebuchet-ms', 'verdana'] }],
        [{ 'size': ['8px', '9px', '10px', '11px', '12px', false, '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px', '48px', '56px', '72px'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        [{ 'lineHeight': ['1', '1.15', '1.5', '2', '2.5', '3'] }],
        [{ 'direction': 'rtl' }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ]
    },
    history: {
      delay: 1000,
      maxStack: 100,
      userOnly: true
    },
    clipboard: {
      matchVisual: false
    }
  };

  const formats = [
    'font', 'size', 'header',
    'bold', 'italic', 'underline', 'strike',
    'script',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align', 'lineHeight', 'direction',
    'blockquote', 'code-block',
    'link', 'image', 'video'
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
    <div className={`word-editor-container ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div className="word-toolbar">
        <div className="word-toolbar-left">
          <h3>{file.name}</h3>
        </div>
        <div className="word-toolbar-right">
          <button className="btn-fullscreen" onClick={toggleFullscreen} title={isFullscreen ? t('common.exitFullscreen') || 'Exit Fullscreen' : t('common.fullscreen') || 'Fullscreen'}>
            {isFullscreen ? '🗗' : '🖵'}
          </button>
          <button className="btn-print" onClick={handlePrint} title={t('common.print') || 'Print'}>
            🖨️
          </button>
          <button className="btn-download" onClick={handleDownload} title={t('common.download') || 'Download'}>
            ⬇️
          </button>
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
        <div className="word-zoom-wrapper" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
          {isEditing ? (
            <ReactQuill
              key="editor-snow"
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              modules={modules}
              formats={formats}
              placeholder={t('wordEditor.emptyDocumentMessage')}
            />
          ) : (
            <ReactQuill
              key="viewer-bubble"
              theme="bubble"
              value={content}
              readOnly={true}
              modules={{ toolbar: false }}
              className="word-preview-quill"
            />
          )}
        </div>
      </div>

      <div className="word-status-bar">
        <div className="word-status-left">
          <span>📝 {wordCount} {t('wordEditor.words')}</span>
          <span>🔤 {charCount} {t('wordEditor.characters')}</span>
          <span>⏱️ {Math.ceil(wordCount / 200)} {t('wordEditor.minRead')}</span>
        </div>
        <div className="word-status-right">
          <button onClick={handleZoomOut} title={t('common.zoomOut') || 'Zoom Out'}>-</button>
          <span onClick={handleZoomReset} style={{ cursor: 'pointer', width: '40px', textAlign: 'center' }} title={t('common.resetZoom') || 'Reset Zoom'}>{zoom}%</span>
          <button onClick={handleZoomIn} title={t('common.zoomIn') || 'Zoom In'}>+</button>
        </div>
      </div>
    </div>
  );
};

export default WordEditor;
