import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import JSZip from 'jszip';
import { getAuthToken } from '../../../utils/fileUtils';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import './PowerPointEditor.css';

const SLIDE_BACKGROUNDS = [
  { id: 'white', label: 'White', css: '#ffffff', hex: 'FFFFFF' },
  { id: 'light-gray', label: 'Light Gray', css: '#f3f4f6', hex: 'F3F4F6' },
  { id: 'dark', label: 'Dark', css: '#1e293b', hex: '1E293B' },
  { id: 'navy', label: 'Navy', css: '#1e3a5f', hex: '1E3A5F' },
  { id: 'blue', label: 'Blue', css: 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)', hex: '4472C4' },
  { id: 'green', label: 'Green', css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', hex: '217346' },
  { id: 'sunset', label: 'Sunset', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', hex: 'F5576C' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', hex: '4FACFE' },
];

const DEFAULT_SLIDE = () => ({
  title: '',
  content: '',
  background: 'white',
  titleColor: '#1e3a5f',
  contentColor: '#333333',
  titleAlign: 'center',
  contentAlign: 'left',
  titleSize: 36,
  contentSize: 18,
  notes: '',
});

const PowerPointEditor = ({ fileUrl, fileBlob, file, onClose, onFileSaved }) => {
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [slides, setSlides] = useState([DEFAULT_SLIDE()]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showNotes, setShowNotes] = useState(false);
  const [showSlideSorter, setShowSlideSorter] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const containerRef = useRef(null);
  const presentationRef = useRef(null);


  const currentSlide = slides[activeSlide] || DEFAULT_SLIDE();
  const slideCount = slides.length;

  const isDarkBg = useMemo(() => {
    const bg = currentSlide.background;
    return bg === 'dark' || bg === 'navy';
  }, [currentSlide.background]);


  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));
  const handleZoomReset = () => setZoom(100);


  const startPresentation = () => {
    setIsPresentationMode(true);
    containerRef.current?.requestFullscreen().catch(() => {});
  };

  const stopPresentation = () => {
    setIsPresentationMode(false);
    if (document.fullscreenElement) document.exitFullscreen();
  };

  useEffect(() => {
    if (!isPresentationMode) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') { stopPresentation(); return; }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setActiveSlide(prev => Math.min(prev + 1, slides.length - 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        setActiveSlide(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Home') { setActiveSlide(0); }
      if (e.key === 'End') { setActiveSlide(slides.length - 1); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPresentationMode, slides.length]);


  const loadPresentation = useCallback(async () => {
    try {
      setLoading(true);

      let arrayBuffer;
      let isEmpty = false;

      if (fileBlob) {
        if (fileBlob.size === 0) isEmpty = true;
        else {
          arrayBuffer = await fileBlob.arrayBuffer();
          if (arrayBuffer.byteLength === 0) isEmpty = true;
        }
      } else if (fileUrl) {
        const token = getAuthToken();
        const response = await fetch(fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) isEmpty = true;
        else {
          arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer.byteLength === 0) isEmpty = true;
        }
      } else {
        isEmpty = true;
      }

      if (isEmpty) {
        const first = DEFAULT_SLIDE();
        first.title = t('powerPointEditor.slideTitle', { num: 1 });
        setSlides([first]);
        setIsEditing(true);
        setLoading(false);
        return;
      }

      try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        const loadedSlides = [];
        let slideIdx = 1;

        while (zip.file(`ppt/slides/slide${slideIdx}.xml`)) {
          const slideXml = await zip.file(`ppt/slides/slide${slideIdx}.xml`).async('string');
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(slideXml, 'application/xml');

          const spNodes = xmlDoc.getElementsByTagName('p:sp');
          let title = '';
          let content = '';
          let titleSize = 36, contentSize = 18;
          let titleColor = '#1e3a5f', contentColor = '#333333';
          let titleAlign = 'center', contentAlign = 'left';

          for (let s = 0; s < spNodes.length; s++) {
            const sp = spNodes[s];

            const phNodes = sp.getElementsByTagName('p:ph');
            let phType = null;
            if (phNodes.length > 0) {
              phType = phNodes[0].getAttribute('type') || 'body';
            }

            const txBody = sp.getElementsByTagName('p:txBody');
            if (txBody.length === 0) continue;

            const paragraphs = txBody[0].childNodes;
            let shapeText = '';
            let detectedSize = null;
            let detectedColor = null;
            let detectedAlign = null;
            let paraCount = 0;

            for (let p = 0; p < paragraphs.length; p++) {
              const para = paragraphs[p];
              if (para.nodeName !== 'a:p') continue;

              const pPrs = para.getElementsByTagName('a:pPr');
              if (pPrs.length > 0) {
                const algn = pPrs[0].getAttribute('algn');
                if (algn) {
                  detectedAlign = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : algn === 'just' ? 'left' : 'left';
                }
              }

              let paraText = '';
              const runs = para.getElementsByTagName('a:r');
              for (let r = 0; r < runs.length; r++) {
                const run = runs[r];
                const rPrs = run.getElementsByTagName('a:rPr');
                if (rPrs.length > 0) {
                  const rPr = rPrs[0];
                  const sz = rPr.getAttribute('sz');
                  if (sz && !detectedSize) detectedSize = Math.round(parseInt(sz) / 100);
                  const fills = rPr.getElementsByTagName('a:solidFill');
                  if (fills.length > 0) {
                    const srgbEl = fills[0].getElementsByTagName('a:srgbClr');
                    if (srgbEl.length > 0 && !detectedColor) {
                      detectedColor = '#' + srgbEl[0].getAttribute('val');
                    }
                  }
                }
                const textNodes = run.getElementsByTagName('a:t');
                for (let ti = 0; ti < textNodes.length; ti++) {
                  paraText += textNodes[ti].textContent || '';
                }
              }

              const fields = para.getElementsByTagName('a:fld');
              for (let f = 0; f < fields.length; f++) {
                const textNodes = fields[f].getElementsByTagName('a:t');
                for (let ti = 0; ti < textNodes.length; ti++) {
                  paraText += textNodes[ti].textContent || '';
                }
              }

              if (paraCount > 0 && paraText) shapeText += '\n';
              shapeText += paraText;
              paraCount++;
            }

            if (!shapeText.trim()) continue;

            const isTitle = phType === 'title' || phType === 'ctrTitle';
            if (isTitle && !title) {
              title = shapeText;
              if (detectedSize) titleSize = detectedSize;
              if (detectedColor) titleColor = detectedColor;
              if (detectedAlign) titleAlign = detectedAlign;
            } else {
              if (content && shapeText) content += '\n';
              content += shapeText;
              if (detectedSize && contentSize === 18) contentSize = detectedSize;
              if (detectedColor && contentColor === '#333333') contentColor = detectedColor;
              if (detectedAlign && contentAlign === 'left') contentAlign = detectedAlign;
            }
          }

          if (!title && content) {
            const lines = content.split('\n');
            title = lines[0];
            content = lines.slice(1).join('\n');
          }

          let bg = 'white';
          const bgPr = xmlDoc.getElementsByTagName('p:bg');
          if (bgPr.length > 0) {
            const srgb = bgPr[0].getElementsByTagName('a:srgbClr');
            if (srgb.length > 0) {
              const val = srgb[0].getAttribute('val');
              const found = SLIDE_BACKGROUNDS.find(b => b.hex.toUpperCase() === val.toUpperCase());
              if (found) bg = found.id;
              else {
                const rv = parseInt(val.substr(0, 2), 16);
                const gv = parseInt(val.substr(2, 2), 16);
                const bv = parseInt(val.substr(4, 2), 16);
                if (rv + gv + bv < 200) bg = 'dark';
              }
            }
            const gradFill = bgPr[0].getElementsByTagName('a:gradFill');
            if (gradFill.length > 0 && bg === 'white') {
              const gsLst = gradFill[0].getElementsByTagName('a:gs');
              if (gsLst.length > 0) {
                const firstSrgb = gsLst[0].getElementsByTagName('a:srgbClr');
                if (firstSrgb.length > 0) {
                  const val = firstSrgb[0].getAttribute('val');
                  const found = SLIDE_BACKGROUNDS.find(b => b.hex.toUpperCase() === val.toUpperCase());
                  if (found) bg = found.id;
                }
              }
            }
          }

          const slide = DEFAULT_SLIDE();
          slide.title = title.trim();
          slide.content = content.trim();
          slide.background = bg;
          slide.titleSize = titleSize;
          slide.contentSize = contentSize;
          slide.titleColor = titleColor;
          slide.contentColor = contentColor;
          slide.titleAlign = titleAlign;
          slide.contentAlign = contentAlign;
          loadedSlides.push(slide);
          slideIdx++;
        }

        if (loadedSlides.length > 0) {
          setSlides(loadedSlides);
          setLoading(false);
          return;
        }
      } catch (zipErr) {
        console.log('[PowerPointEditor] Not a valid zip/pptx, trying HTML fallback');
      }

      try {
        const htmlText = new TextDecoder().decode(arrayBuffer);
        if (htmlText && htmlText.includes('<!DOCTYPE html>')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');
          const slideElements = doc.querySelectorAll('.slide');
          if (slideElements.length > 0) {
            const loaded = Array.from(slideElements).map(slideEl => {
              const s = DEFAULT_SLIDE();
              s.title = slideEl.querySelector('h1')?.textContent || '';
              s.content = slideEl.querySelector('.slide-content')?.innerHTML || '';
              return s;
            });
            setSlides(loaded);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.log('[PowerPointEditor] Not HTML format');
      }

      const first = DEFAULT_SLIDE();
      first.title = t('powerPointEditor.slideTitle', { num: 1 });
      setSlides([first]);
      setIsEditing(true);

    } catch (err) {
      console.error('[PowerPointEditor] Error loading presentation:', err);
      addToast(t('powerPointEditor.loadError'), 'error');
      setSlides([DEFAULT_SLIDE()]);
    } finally {
      setLoading(false);
    }
  }, [fileBlob, fileUrl]);

  useEffect(() => { loadPresentation(); }, [loadPresentation]);


  const updateSlide = (index, field, value) => {
    const newSlides = slides.map((s, i) => i === index ? { ...s, [field]: value } : s);
    setSlides(newSlides);
  };

  const addSlide = (templateId) => {
    const s = DEFAULT_SLIDE();
    s.title = t('powerPointEditor.slideTitle', { num: slides.length + 1 });
    if (templateId === 'dark') { s.background = 'dark'; s.titleColor = '#ffffff'; s.contentColor = '#e5e7eb'; }
    if (templateId === 'blue') { s.background = 'blue'; s.titleColor = '#ffffff'; s.contentColor = '#f0f0f0'; }
    if (templateId === 'blank') { s.title = ''; }
    setSlides([...slides, s]);
    setActiveSlide(slides.length);
  };

  const duplicateSlide = (index) => {
    const copy = { ...slides[index] };
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, copy);
    setSlides(newSlides);
    setActiveSlide(index + 1);
    addToast(t('powerPointEditor.duplicated'), 'success', 1500);
  };

  const deleteSlide = (index, e) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (slides.length === 1) {
      addToast(t('powerPointEditor.cannotDeleteLast'), 'warning');
      return;
    }
    const newSlides = slides.filter((_, i) => i !== index);
    setSlides(newSlides);
    if (activeSlide >= newSlides.length) setActiveSlide(newSlides.length - 1);
    else if (activeSlide > index) setActiveSlide(activeSlide - 1);
  };

  const moveSlide = (from, to) => {
    if (from === to) return;
    const newSlides = [...slides];
    const [moved] = newSlides.splice(from, 1);
    newSlides.splice(to, 0, moved);
    setSlides(newSlides);
    setActiveSlide(to);
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      moveSlide(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };


  useEffect(() => {
    if (isPresentationMode) return;
    const handleKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        setActiveSlide(prev => Math.min(prev + 1, slides.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setActiveSlide(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Home') { setActiveSlide(0); }
      if (e.key === 'End') { setActiveSlide(slides.length - 1); }
      if (e.key === 'F5') { e.preventDefault(); startPresentation(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPresentationMode, slides.length]);


  const handleDownload = async () => {
    const blob = await generatePptxBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name || 'presentation.pptx';
    a.click();
    URL.revokeObjectURL(url);
    addToast(t('powerPointEditor.downloaded'), 'success', 2000);
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    let html = '';
    slides.forEach((slide, i) => {
      const bgObj = SLIDE_BACKGROUNDS.find(b => b.id === slide.background) || SLIDE_BACKGROUNDS[0];
      const bgStyle = bgObj.css.startsWith('linear') ? `background:${bgObj.css}` : `background-color:${bgObj.css}`;
      const contentLines = (slide.content || '').split('\n').map(l => `<p style="margin:4px 0">${l || '&nbsp;'}</p>`).join('');
      html += `
        <div style="width:100%;aspect-ratio:4/3;${bgStyle};padding:40px;box-sizing:border-box;page-break-after:always;display:flex;flex-direction:column;justify-content:flex-start;">
          <h1 style="text-align:${slide.titleAlign};color:${slide.titleColor};font-size:${slide.titleSize}px;margin:0 0 20px 0;font-family:Calibri Light,sans-serif">${slide.title || ''}</h1>
          <div style="text-align:${slide.contentAlign};color:${slide.contentColor};font-size:${slide.contentSize}px;font-family:Calibri,sans-serif;line-height:1.6">${contentLines}</div>
        </div>
      `;
    });
    printWin.document.write(`<html><head><title>${file.name}</title><style>@media print { body { margin: 0; } }</style></head><body style="margin:0">${html}</body></html>`);
    printWin.document.close();
    setTimeout(() => printWin.print(), 300);
  };


  const generatePptxBlob = async () => {
    const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const zip = new JSZip();
    const CX = 9144000;
    const CY = 6858000;
    const numSlides = slides.length;

    let ctOverrides = '';
    for (let i = 1; i <= numSlides; i++) {
      ctOverrides += `<Override PartName="/ppt/slides/slide${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    }
    zip.file('[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>` +
      `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>` +
      `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>` +
      `<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
      ctOverrides +
      `</Types>`
    );

    zip.folder('_rels').file('.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
      `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
      `</Relationships>`
    );

    zip.folder('docProps').file('core.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
      `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
      `<dc:title>${esc(file.name)}</dc:title><dc:creator>ProyectoNube</dc:creator>` +
      `<dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>` +
      `<dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>` +
      `</cp:coreProperties>`
    );

    zip.folder('docProps').file('app.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
      `<Application>ProyectoNube</Application><Slides>${numSlides}</Slides><PresentationFormat>On-screen Show (4:3)</PresentationFormat></Properties>`
    );

    const ppt = zip.folder('ppt');
    let sldIdLst = '';
    const presRelsArr = [
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>`,
      `<Relationship Id="rId${numSlides + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>`
    ];
    for (let i = 1; i <= numSlides; i++) {
      sldIdLst += `<p:sldId id="${255 + i}" r:id="rId${1 + i}"/>`;
      presRelsArr.push(`<Relationship Id="rId${1 + i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i}.xml"/>`);
    }

    ppt.file('presentation.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
      `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" saveSubsetFonts="1">` +
      `<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>` +
      `<p:sldIdLst>${sldIdLst}</p:sldIdLst>` +
      `<p:sldSz cx="${CX}" cy="${CY}" type="screen4x3"/>` +
      `<p:notesSz cx="${CY}" cy="${CX}"/>` +
      `<p:defaultTextStyle><a:defPPr><a:defRPr lang="es-ES"/></a:defPPr></p:defaultTextStyle>` +
      `</p:presentation>`
    );
    ppt.folder('_rels').file('presentation.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRelsArr.join('')}</Relationships>`
    );

    ppt.folder('theme').file('theme1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">` +
      `<a:themeElements>` +
      `<a:clrScheme name="Office">` +
      `<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>` +
      `<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>` +
      `<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>` +
      `<a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2>` +
      `<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4>` +
      `<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6>` +
      `<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink>` +
      `</a:clrScheme>` +
      `<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>` +
      `<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>` +
      `<a:fmtScheme name="Office">` +
      `<a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst></a:gradFill><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst></a:gradFill></a:fillStyleLst>` +
      `<a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>` +
      `<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>` +
      `<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>` +
      `</a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`
    );

    const smFolder = ppt.folder('slideMasters');
    smFolder.file('slideMaster1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>` +
      `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
      `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>` +
      `<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
      `<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>` +
      `<p:txStyles>` +
      `<p:titleStyle><a:lvl1pPr algn="ctr"><a:defRPr sz="4400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/><a:ea typeface="+mj-ea"/><a:cs typeface="+mj-cs"/></a:defRPr></a:lvl1pPr></p:titleStyle>` +
      `<p:bodyStyle><a:lvl1pPr marL="342900" indent="-342900"><a:defRPr sz="2400" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:bodyStyle>` +
      `<p:otherStyle><a:lvl1pPr><a:defRPr sz="1800" kern="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:lvl1pPr></p:otherStyle>` +
      `</p:txStyles></p:sldMaster>`
    );
    smFolder.folder('_rels').file('slideMaster1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>` +
      `</Relationships>`
    );

    const slFolder = ppt.folder('slideLayouts');
    slFolder.file('slideLayout1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="blank" preserve="1">` +
      `<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
      `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>` +
      `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`
    );
    slFolder.folder('_rels').file('slideLayout1.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>` +
      `</Relationships>`
    );

    const slideFolder = ppt.folder('slides');
    const slideRelsFolder = slideFolder.folder('_rels');

    slides.forEach((slide, idx) => {
      let spId = 2;
      let shapes = '';

      const bgObj = SLIDE_BACKGROUNDS.find(b => b.id === slide.background) || SLIDE_BACKGROUNDS[0];
      let bgXml = '';
      if (slide.background !== 'white') {
        bgXml = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bgObj.hex}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
      }

      const titleText = slide.title || '';
      const titleColorHex = (slide.titleColor || '#1E3A5F').replace('#', '');
      const titleSz = (slide.titleSize || 36) * 100;
      const algnMap = { left: 'l', center: 'ctr', right: 'r' };
      if (titleText) {
        shapes += `<p:sp>` +
          `<p:nvSpPr><p:cNvPr id="${spId}" name="Title ${idx + 1}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>` +
          `<p:spPr><a:xfrm><a:off x="457200" y="274638"/><a:ext cx="8229600" cy="1143000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
          `<p:txBody><a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="ctr"/>` +
          `<a:lstStyle/><a:p><a:pPr algn="${algnMap[slide.titleAlign] || 'ctr'}"/>` +
          `<a:r><a:rPr lang="es-ES" sz="${titleSz}" b="1" dirty="0"><a:solidFill><a:srgbClr val="${titleColorHex}"/></a:solidFill><a:latin typeface="Calibri Light"/></a:rPr>` +
          `<a:t>${esc(titleText)}</a:t></a:r></a:p></p:txBody></p:sp>`;
        spId++;
      }

      const contentText = slide.content || '';
      const contentColorHex = (slide.contentColor || '#333333').replace('#', '');
      const contentSz = (slide.contentSize || 18) * 100;
      if (contentText.trim()) {
        const lines = contentText.split(/\n/);
        const paras = lines.map(line => {
          if (!line.trim()) return `<a:p><a:endParaRPr lang="es-ES" sz="${contentSz}"/></a:p>`;
          return `<a:p><a:pPr algn="${algnMap[slide.contentAlign] || 'l'}"/>` +
            `<a:r><a:rPr lang="es-ES" sz="${contentSz}" dirty="0"><a:solidFill><a:srgbClr val="${contentColorHex}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr>` +
            `<a:t>${esc(line)}</a:t></a:r></a:p>`;
        }).join('');

        shapes += `<p:sp>` +
          `<p:nvSpPr><p:cNvPr id="${spId}" name="Content ${idx + 1}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph idx="1"/></p:nvPr></p:nvSpPr>` +
          `<p:spPr><a:xfrm><a:off x="457200" y="1600200"/><a:ext cx="8229600" cy="4525963"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
          `<p:txBody><a:bodyPr vert="horz" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="t"/><a:lstStyle/>` +
          paras + `</p:txBody></p:sp>`;
        spId++;
      }

      if (!shapes) {
        shapes = `<p:sp><p:nvSpPr><p:cNvPr id="2" name="TextBox"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
          `<p:spPr><a:xfrm><a:off x="457200" y="274638"/><a:ext cx="8229600" cy="5554663"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>` +
          `<p:txBody><a:bodyPr wrap="square" rtlCol="0"/><a:lstStyle/><a:p><a:endParaRPr lang="es-ES"/></a:p></p:txBody></p:sp>`;
      }

      slideFolder.file(`slide${idx + 1}.xml`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
        `<p:cSld>${bgXml}<p:spTree>` +
        `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
        `<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>` +
        shapes + `</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
      );
      slideRelsFolder.file(`slide${idx + 1}.xml.rels`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>` +
        `</Relationships>`
      );
    });

    return zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const token = getAuthToken();
      if (!token) { addToast(t('powerPointEditor.noToken'), 'error'); return; }

      const pptxBlob = await generatePptxBlob();
      const formData = new FormData();
      formData.append('file', pptxBlob, file.name);

      const response = await fetch(`/api/files/${encodeURIComponent(file.id)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      addToast(t('powerPointEditor.saveSuccess'), 'success');
      setIsEditing(false);
      if (onFileSaved) onFileSaved();
    } catch (error) {
      console.error('[PowerPointEditor] Save error:', error);
      addToast(t('powerPointEditor.saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };


  if (isPresentationMode) {
    const slide = slides[activeSlide] || DEFAULT_SLIDE();
    const bgObj = SLIDE_BACKGROUNDS.find(b => b.id === slide.background) || SLIDE_BACKGROUNDS[0];
    const bgStyle = bgObj.css.startsWith('linear') ? { background: bgObj.css } : { backgroundColor: bgObj.css };
    const contentLines = (slide.content || '').split('\n');

    return (
      <div className="ppt-presentation-mode" ref={containerRef} onClick={(e) => {
        const x = e.clientX;
        const w = window.innerWidth;
        if (x > w * 0.7) setActiveSlide(prev => Math.min(prev + 1, slides.length - 1));
        else if (x < w * 0.3) setActiveSlide(prev => Math.max(prev - 1, 0));
      }}>
        <div className="ppt-presentation-slide" style={bgStyle}>
          <h1 style={{ color: slide.titleColor, textAlign: slide.titleAlign, fontSize: `${slide.titleSize * 1.5}px` }}>
            {slide.title}
          </h1>
          <div className="ppt-presentation-content" style={{ color: slide.contentColor, textAlign: slide.contentAlign, fontSize: `${slide.contentSize * 1.5}px` }}>
            {contentLines.map((line, i) => <p key={i}>{line || '\u00A0'}</p>)}
          </div>
        </div>
        <div className="ppt-presentation-bar">
          <span>{activeSlide + 1} / {slideCount}</span>
          <button onClick={(e) => { e.stopPropagation(); stopPresentation(); }}>x {t('powerPointEditor.exitPresentation')}</button>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="ppt-editor">
        <div className="ppt-loading">
          <div className="ppt-spinner"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }


  if (showSlideSorter) {
    return (
      <div className="ppt-editor" ref={containerRef}>
        <div className="ppt-toolbar">
          <div className="ppt-toolbar-left">
            <h3>[Slides] {file.name}</h3>
          </div>
          <div className="ppt-toolbar-right">
            <button className="ppt-btn" onClick={() => setShowSlideSorter(false)}>
              ← {t('powerPointEditor.backToEditor')}
            </button>
          </div>
        </div>
        <div className="ppt-sorter-grid">
          {slides.map((slide, index) => {
            const bgObj = SLIDE_BACKGROUNDS.find(b => b.id === slide.background) || SLIDE_BACKGROUNDS[0];
            const bgStyle = bgObj.css.startsWith('linear') ? { background: bgObj.css } : { backgroundColor: bgObj.css };
            return (
              <div
                key={index}
                className={`ppt-sorter-card ${activeSlide === index ? 'active' : ''}`}
                onClick={() => { setActiveSlide(index); setShowSlideSorter(false); }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="ppt-sorter-preview" style={bgStyle}>
                  <div className="ppt-sorter-title" style={{ color: slide.titleColor }}>{slide.title || t('powerPointEditor.untitled')}</div>
                </div>
                <div className="ppt-sorter-number">{index + 1}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }


  const bgObj = SLIDE_BACKGROUNDS.find(b => b.id === currentSlide.background) || SLIDE_BACKGROUNDS[0];
  const slideBgStyle = bgObj.css.startsWith('linear') ? { background: bgObj.css } : { backgroundColor: bgObj.css };
  const contentLines = (currentSlide.content || '').split('\n');

  return (
    <div className={`ppt-editor ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      
      <div className="ppt-toolbar">
        <div className="ppt-toolbar-left">
          <h3>[Slides] {file.name}</h3>
        </div>
        <div className="ppt-toolbar-right">
          <button className="ppt-btn" onClick={startPresentation} title={`${t('powerPointEditor.present')} (F5)`}>
            ▶ {t('powerPointEditor.present')}
          </button>
          <button className="ppt-btn" onClick={() => setShowSlideSorter(true)} title={t('powerPointEditor.slideSorter')}>
            🔲 {t('powerPointEditor.slideSorter')}
          </button>
          <div className="ppt-toolbar-sep" />
          <button className="ppt-btn" onClick={handlePrint} title={t('common.print') || 'Print'}>🖨️</button>
          <button className="ppt-btn" onClick={handleDownload} title={t('common.download') || 'Download'}>⬇️</button>
          <button className="ppt-btn" onClick={toggleFullscreen}>
            {isFullscreen ? '🗗' : '🖵'}
          </button>
          <div className="ppt-toolbar-sep" />
          {!isEditing ? (
            <button className="ppt-btn ppt-btn-primary" onClick={() => setIsEditing(true)}>
              ✏️ {t('common.edit')}
            </button>
          ) : (
            <>
              <button className="ppt-btn" onClick={() => { setIsEditing(false); loadPresentation(); }} disabled={isSaving}>
                {t('common.cancel')}
              </button>
              <button className="ppt-btn ppt-btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving ? t('powerPointEditor.saving') : `💾 ${t('common.save')}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="ppt-main">
        
        <div className="ppt-sidebar">
          <div className="ppt-sidebar-list">
            {slides.map((slide, index) => {
              const bg = SLIDE_BACKGROUNDS.find(b => b.id === slide.background) || SLIDE_BACKGROUNDS[0];
              const thumbBg = bg.css.startsWith('linear') ? { background: bg.css } : { backgroundColor: bg.css };
              return (
                <div
                  key={index}
                  className={`ppt-thumb ${activeSlide === index ? 'active' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                  onClick={() => setActiveSlide(index)}
                  draggable={isEditing}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="ppt-thumb-number">{index + 1}</div>
                  <div className="ppt-thumb-preview" style={thumbBg}>
                    <div className="ppt-thumb-title" style={{ color: slide.titleColor }}>
                      {slide.title || t('powerPointEditor.untitled')}
                    </div>
                  </div>
                  {isEditing && slides.length > 1 && (
                    <button className="ppt-thumb-delete" onClick={(e) => deleteSlide(index, e)} title={t('powerPointEditor.deleteSlide')}>×</button>
                  )}
                </div>
              );
            })}
          </div>
          {isEditing && (
            <div className="ppt-sidebar-actions">
              <button className="ppt-add-slide-btn" onClick={() => addSlide()}>
                + {t('powerPointEditor.addSlide')}
              </button>
              <div className="ppt-add-templates">
                <button className="ppt-template-btn" onClick={() => addSlide('blank')} title={t('powerPointEditor.blankSlide')}>
                  <div className="ppt-template-mini" style={{ background: '#fff', border: '1px solid #ddd' }}></div>
                </button>
                <button className="ppt-template-btn" onClick={() => addSlide('dark')} title={t('powerPointEditor.darkSlide')}>
                  <div className="ppt-template-mini" style={{ background: '#1e293b' }}></div>
                </button>
                <button className="ppt-template-btn" onClick={() => addSlide('blue')} title={t('powerPointEditor.blueSlide')}>
                  <div className="ppt-template-mini" style={{ background: 'linear-gradient(135deg, #2563eb, #0891b2)' }}></div>
                </button>
              </div>
            </div>
          )}
        </div>

        
        <div className="ppt-canvas-area">
          
          {isEditing && (
            <div className="ppt-format-bar">
              <div className="ppt-format-group">
                <label className="ppt-format-label">{t('powerPointEditor.background')}:</label>
                <div className="ppt-bg-swatches">
                  {SLIDE_BACKGROUNDS.map(bg => (
                    <button
                      key={bg.id}
                      className={`ppt-bg-swatch ${currentSlide.background === bg.id ? 'active' : ''}`}
                      style={{ background: bg.css.startsWith('linear') ? bg.css : bg.css }}
                      onClick={() => updateSlide(activeSlide, 'background', bg.id)}
                      title={bg.label}
                    />
                  ))}
                </div>
              </div>
              <div className="ppt-format-sep" />
              <div className="ppt-format-group">
                <label className="ppt-format-label">{t('powerPointEditor.titleLabel')}:</label>
                <input
                  type="color"
                  className="ppt-color-input"
                  value={currentSlide.titleColor}
                  onChange={(e) => updateSlide(activeSlide, 'titleColor', e.target.value)}
                />
                <select
                  className="ppt-select"
                  value={currentSlide.titleSize}
                  onChange={(e) => updateSlide(activeSlide, 'titleSize', parseInt(e.target.value))}
                >
                  {[24, 28, 32, 36, 40, 44, 48, 56, 64, 72].map(s => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
                <div className="ppt-align-group">
                  {['left', 'center', 'right'].map(a => (
                    <button
                      key={a}
                      className={`ppt-align-btn ${currentSlide.titleAlign === a ? 'active' : ''}`}
                      onClick={() => updateSlide(activeSlide, 'titleAlign', a)}
                    >
                      {a === 'left' ? '⫷' : a === 'center' ? '[Menu]' : '⫸'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ppt-format-sep" />
              <div className="ppt-format-group">
                <label className="ppt-format-label">{t('powerPointEditor.contentLabel')}:</label>
                <input
                  type="color"
                  className="ppt-color-input"
                  value={currentSlide.contentColor}
                  onChange={(e) => updateSlide(activeSlide, 'contentColor', e.target.value)}
                />
                <select
                  className="ppt-select"
                  value={currentSlide.contentSize}
                  onChange={(e) => updateSlide(activeSlide, 'contentSize', parseInt(e.target.value))}
                >
                  {[12, 14, 16, 18, 20, 24, 28, 32].map(s => (
                    <option key={s} value={s}>{s}px</option>
                  ))}
                </select>
                <div className="ppt-align-group">
                  {['left', 'center', 'right'].map(a => (
                    <button
                      key={a}
                      className={`ppt-align-btn ${currentSlide.contentAlign === a ? 'active' : ''}`}
                      onClick={() => updateSlide(activeSlide, 'contentAlign', a)}
                    >
                      {a === 'left' ? '⫷' : a === 'center' ? '[Menu]' : '⫸'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ppt-format-sep" />
              <div className="ppt-format-group">
                <button className="ppt-format-btn" onClick={() => duplicateSlide(activeSlide)} title={t('powerPointEditor.duplicate')}>
                  📄 {t('powerPointEditor.duplicate')}
                </button>
                <button className="ppt-format-btn" onClick={() => setShowNotes(!showNotes)} title={t('powerPointEditor.notes')}>
                  [Text] {t('powerPointEditor.notes')}
                </button>
              </div>
            </div>
          )}

          <div className="ppt-canvas-scroll">
            <div className="ppt-canvas-zoom" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
              
              <div className="ppt-slide" style={slideBgStyle} ref={presentationRef}>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      className="ppt-slide-title-input"
                      value={currentSlide.title}
                      onChange={(e) => updateSlide(activeSlide, 'title', e.target.value)}
                      placeholder={t('powerPointEditor.titlePlaceholder')}
                      style={{
                        color: currentSlide.titleColor,
                        fontSize: `${currentSlide.titleSize}px`,
                        textAlign: currentSlide.titleAlign,
                      }}
                    />
                    <textarea
                      className="ppt-slide-content-input"
                      value={currentSlide.content}
                      onChange={(e) => updateSlide(activeSlide, 'content', e.target.value)}
                      placeholder={t('powerPointEditor.contentPlaceholder')}
                      style={{
                        color: currentSlide.contentColor,
                        fontSize: `${currentSlide.contentSize}px`,
                        textAlign: currentSlide.contentAlign,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <h1
                      className="ppt-slide-title"
                      style={{
                        color: currentSlide.titleColor,
                        fontSize: `${currentSlide.titleSize}px`,
                        textAlign: currentSlide.titleAlign,
                      }}
                    >
                      {currentSlide.title}
                    </h1>
                    <div
                      className="ppt-slide-content"
                      style={{
                        color: currentSlide.contentColor,
                        fontSize: `${currentSlide.contentSize}px`,
                        textAlign: currentSlide.contentAlign,
                      }}
                    >
                      {contentLines.map((line, i) => <p key={i}>{line || '\u00A0'}</p>)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          
          {showNotes && isEditing && (
            <div className="ppt-notes-panel">
              <div className="ppt-notes-header">
                <span>[Text] {t('powerPointEditor.speakerNotes')}</span>
                <button onClick={() => setShowNotes(false)}>x</button>
              </div>
              <textarea
                className="ppt-notes-input"
                value={currentSlide.notes || ''}
                onChange={(e) => updateSlide(activeSlide, 'notes', e.target.value)}
                placeholder={t('powerPointEditor.notesPlaceholder')}
              />
            </div>
          )}
        </div>
      </div>

      
      <div className="ppt-status-bar">
        <div className="ppt-status-left">
          <span>{t('powerPointEditor.slideLabel')} {activeSlide + 1} / {slideCount}</span>
          <span>*</span>
          <span>{currentSlide.background !== 'white' ? `🎨 ${bgObj.label}` : ''}</span>
        </div>
        <div className="ppt-status-right">
          <div className="ppt-zoom-controls">
            <button onClick={handleZoomOut}>−</button>
            <span onClick={handleZoomReset} className="ppt-zoom-label">{zoom}%</span>
            <button onClick={handleZoomIn}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerPointEditor;
