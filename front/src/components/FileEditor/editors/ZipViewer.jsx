import React, { useState, useEffect } from 'react';
import { FiArchive, FiAlertTriangle } from 'react-icons/fi';
import { useLanguage } from '../../../context/LanguageContext';
import './ZipViewer.css';

const ZipViewer = ({ file }) => {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadZipContents();
  }, [file]);

  const loadZipContents = async () => {
    try {
      setLoading(true);
      setError(null);

      const JSZip = (await import('jszip')).default;
      
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      const entriesData = [];
      
      contents.forEach((relativePath, zipEntry) => {
        entriesData.push({
          name: zipEntry.name,
          path: relativePath,
          isDirectory: zipEntry.dir,
          size: zipEntry._data ? zipEntry._data.uncompressedSize : 0,
          date: zipEntry.date,
          compressed: zipEntry._data ? zipEntry._data.compressedSize : 0,
          entry: zipEntry
        });
      });

      setEntries(entriesData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading ZIP file:', err);
      setError(t('zipViewer.errorLoading', { error: err.message }));
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (entry) => {
    if (entry.isDirectory) {
      return '📁';
    }
    
    const ext = entry.name.split('.').pop().toLowerCase();
    const iconMap = {
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️',
      'pdf': '📄',
      'doc': '📝', 'docx': '📝', 'txt': '📝',
      'xls': '📊', 'xlsx': '📊', 'csv': '📊',
      'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️',
      'mp4': '🎬', 'avi': '🎬', 'mkv': '🎬', 'mov': '🎬',
      'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
      'js': '📜', 'jsx': '📜', 'ts': '📜', 'tsx': '📜',
      'html': '🌐', 'css': '🎨', 'json': '⚙️'
    };
    
    return iconMap[ext] || '📄';
  };

  const handleEntryClick = async (entry) => {
    if (entry.isDirectory) return;
    
    setSelectedEntry(entry);
    setPreviewContent(null);
    
    try {
      const ext = entry.name.split('.').pop().toLowerCase();
      
      if (['txt', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml', 'md'].includes(ext)) {
        const content = await entry.entry.async('string');
        setPreviewContent({
          type: 'text',
          content: content,
          language: ext
        });
      }
      else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) {
        const blob = await entry.entry.async('blob');
        const url = URL.createObjectURL(blob);
        setPreviewContent({
          type: 'image',
          url: url
        });
      }
      else if (ext === 'pdf') {
        const blob = await entry.entry.async('blob');
        const url = URL.createObjectURL(blob);
        setPreviewContent({
          type: 'pdf',
          url: url
        });
      }
      else {
        setPreviewContent({
          type: 'unsupported',
          message: t('zipViewer.unsupportedPreview')
        });
      }
    } catch (err) {
      console.error('Error previewing file:', err);
      setPreviewContent({
        type: 'error',
        message: t('zipViewer.errorPreview', { error: err.message })
      });
    }
  };

  const handleDownload = async (entry) => {
    try {
      const blob = await entry.entry.async('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.name.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert(t('zipViewer.errorDownload', { error: err.message }));
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'name') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="zip-viewer">
        <div className="zip-loading">
          <div className="spinner"></div>
          <p>{t('zipViewer.loadingZip')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="zip-viewer">
        <div className="zip-error">
          <p>❌ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="zip-viewer">
      <div className="zip-header">
        <h3><FiArchive style={{ verticalAlign: 'middle', marginRight: 6 }} /> {file.name}</h3>
        <div className="zip-stats">
          <span>{entries.length} {t('zipViewer.files')}</span>
          <span>{formatSize(entries.reduce((sum, e) => sum + e.size, 0))}</span>
        </div>
      </div>

      <div className="zip-content">
        <div className="zip-list">
          <div className="zip-list-header">
            <div className="header-cell name" onClick={() => handleSort('name')}>
              {t('zipViewer.name')} {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
            </div>
            <div className="header-cell size" onClick={() => handleSort('size')}>
              {t('zipViewer.size')} {sortBy === 'size' && (sortOrder === 'asc' ? '▲' : '▼')}
            </div>
            <div className="header-cell actions">{t('zipViewer.actions')}</div>
          </div>

          <div className="zip-list-body">
            {sortedEntries.map((entry, idx) => (
              <div 
                key={idx} 
                className={`zip-entry ${selectedEntry === entry ? 'selected' : ''}`}
                onClick={() => handleEntryClick(entry)}
              >
                <div className="entry-cell name">
                  <span className="entry-icon">{getFileIcon(entry)}</span>
                  <span className="entry-name">{entry.name}</span>
                </div>
                <div className="entry-cell size">
                  {!entry.isDirectory && formatSize(entry.size)}
                </div>
                <div className="entry-cell actions">
                  {!entry.isDirectory && (
                    <button 
                      className="download-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(entry);
                      }}
                    >
                      ⬇️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedEntry && (
          <div className="zip-preview">
            <div className="preview-header">
              <h4>{selectedEntry.name.split('/').pop()}</h4>
              <button 
                className="close-preview"
                onClick={() => setSelectedEntry(null)}
              >
                x
              </button>
            </div>

            <div className="preview-content">
              {!previewContent && (
                <div className="preview-loading">
                  <div className="spinner"></div>
                  <p>{t('zipViewer.loadingPreview')}</p>
                </div>
              )}

              {previewContent?.type === 'text' && (
                <div className="text-preview">
                  <pre><code>{previewContent.content}</code></pre>
                </div>
              )}

              {previewContent?.type === 'image' && (
                <div className="image-preview">
                  <img src={previewContent.url} alt={selectedEntry.name} />
                </div>
              )}

              {previewContent?.type === 'pdf' && (
                <div className="pdf-preview">
                  <iframe src={previewContent.url} title={selectedEntry.name}></iframe>
                </div>
              )}

              {previewContent?.type === 'unsupported' && (
                <div className="preview-message">
                  <p><FiAlertTriangle style={{ verticalAlign: 'middle', marginRight: 6 }} /> {previewContent.message}</p>
                  <button onClick={() => handleDownload(selectedEntry)}>
                    {t('zipViewer.downloadFile')}
                  </button>
                </div>
              )}

              {previewContent?.type === 'error' && (
                <div className="preview-error">
                  <p>❌ {previewContent.message}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZipViewer;
