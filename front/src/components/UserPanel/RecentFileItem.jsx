import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiUser } from 'react-icons/fi';
import { getFileType, canPreview, getAuthenticatedPreviewUrl, getAuthToken } from '../../utils/fileUtils';
import { useLanguage } from '../../context/LanguageContext';
import FolderIcon from '../Common/FolderIcon';
import FileTypeIcon from '../Common/FileTypeIcon';

const RecentOfficePreview = React.memo(({ fileId, fileType, fileName }) => {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = getAuthToken();
        const url = `/api/files/preview/${encodeURIComponent(fileId)}?token=${encodeURIComponent(token)}`;
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Failed');
        const buf = await resp.arrayBuffer();

        if (fileType === 'word') {
          const mammothModule = await import('mammoth');
          const mammoth = mammothModule.default || mammothModule;
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) setContent({ type: 'html', data: result.value });
        } else if (fileType === 'excel') {
          const XLSX = await import('xlsx');
          const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const html = XLSX.utils.sheet_to_html(ws, { editable: false });
          if (!cancelled) setContent({ type: 'html', data: html });
        } else if (fileType === 'powerpoint') {
          const JSZipModule = await import('jszip');
          const JSZip = JSZipModule.default || JSZipModule;
          const zip = await JSZip.loadAsync(buf);
          let texts = [];
          const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/)).sort();
          for (const sf of slideFiles.slice(0, 3)) {
            const xml = await zip.file(sf).async('text');
            const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
            if (matches) {
              const slideTexts = matches.map(m => m.replace(/<[^>]+>/g, '')).filter(t => t.trim());
              texts.push(...slideTexts);
            }
          }
          if (texts.length > 0 && !cancelled) {
            const html = `<div style="padding:6px;font-size:9px;line-height:1.3;color:#444"><p style="font-weight:600;font-size:10px;margin-bottom:3px">${texts[0]}</p>${texts.slice(1, 5).map(t => `<p style="margin:1px 0">${t}</p>`).join('')}</div>`;
            setContent({ type: 'html', data: html });
          } else {
            if (!cancelled) setError(true);
          }
        } else {
          if (!cancelled) setError(true);
        }
      } catch (e) {
        if (!cancelled) setError(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fileId, fileType, fileName]);

  if (error || !content) {
    return <FileTypeIcon type={fileType} size={36} />;
  }

  return (
    <div className="office-preview-content" style={{ borderRadius: 8 }}>
      <div
        className={`office-preview-html ${fileType === 'excel' ? 'excel-preview' : 'word-preview'}`}
        dangerouslySetInnerHTML={{ __html: content.data }}
      />
    </div>
  );
});

const RecentFileItem = ({ file, isDarkMode, onFileClick }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { t, language } = useLanguage();
  
  const fileType = getFileType(file.name);
  const isOfficeType = ['word', 'excel', 'powerpoint'].includes(fileType);

  useEffect(() => {
    const loadPreview = async () => {
      if (file.type === 'folder' || !canPreview(file.name) || isOfficeType) return;
      
      setIsLoading(true);
      try {
        const url = await getAuthenticatedPreviewUrl(file.id, file.name);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Error loading preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [file.id, file.name, file.type, isOfficeType]);

  const displayDate = file.modifiedAt || file.modified;
  
  return (
    <div 
      className="recent-file-item"
      onClick={() => onFileClick(file)}
      title={file.name}
    >
      <div className="recent-file-preview">
        {file.type === 'folder' ? (
          <div className="folder-icon"><FolderIcon color={file.folder_color} icon={file.folder_icon} size={32} /></div>
        ) : isOfficeType ? (
          <div className="file-preview-container">
            <RecentOfficePreview fileId={file.id} fileType={fileType} fileName={file.name} />
          </div>
        ) : isLoading ? (
          <div className="loading-preview"><FiRefreshCw className="spin" /></div>
        ) : previewUrl && canPreview(file.name) ? (
          <div className="file-preview-container">
            {fileType === 'image' && (
              <img 
                src={previewUrl} 
                alt={file.name}
                className="file-preview-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            )}
            {fileType === 'pdf' && (
              <iframe 
                src={previewUrl}
                className="file-preview-pdf"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                title={file.name}
              />
            )}
            {fileType === 'video' && (
              <video 
                className="file-preview-video"
                muted
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              >
                <source src={previewUrl} />
              </video>
            )}
            
            <div className="file-fallback-icon fallback-icon-hidden">
              <FileTypeIcon type={fileType} size={36} />
            </div>
          </div>
        ) : (
          <div className="file-icon-large">
            <FileTypeIcon type={fileType} size={42} />
          </div>
        )}
        
        
        <div className="file-type-indicator">
          {file.name.split('.').pop()?.toUpperCase()}
        </div>
      </div>
      
      <div className="recent-file-info">
        <p className="recent-file-name">
          {file.name.length > 20 ? `${file.name.substring(0, 17)}...` : file.name}
        </p>
        <p className="recent-file-date">
          {file.shared && file.owner && (
            <span className="recent-shared-badge" title={`${t('contextMenu.from', { owner: file.owner })}`}>
              <FiUser style={{ verticalAlign: 'middle', marginRight: 4 }} /> {file.owner}
            </span>
          )}
          {displayDate ? 
            new Date(displayDate).toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pl' ? 'pl-PL' : 'en-US', { 
              month: 'short', 
              day: 'numeric',
              year: new Date(displayDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            }) : 
            t('userPanel.recentLabel')
          }
        </p>
      </div>
    </div>
  );
};

export default RecentFileItem;
