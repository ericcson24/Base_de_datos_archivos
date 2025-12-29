import React, { useState, useEffect, useCallback } from 'react';
import ContextMenu from './ContextMenu';
import { getFileType, getFileIcon, canPreview, getAuthenticatedPreviewUrl, formatFileSize, downloadFile } from '../../utils/fileUtils';

const FileItem = ({ item, onFolderClick, onDelete, onRename, onMove, onView, onHover, onLeave, isHovered, onOpenSidebar, onEdit, onDuplicate, onShare, onDragStart, onDragEnd, viewMode = 'list' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const handleDragStart = (e) => {
    if (item.type === 'file') {
      onDragStart(item, e);
    }
  };

  const handleDragEnd = (e) => {
    if (item.type === 'file') {
      onDragEnd(e);
    }
  };

  const handleClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item);
    } else {
      if (canPreview(item.name)) {
        onView(item);
      } else {
        downloadFile(item.id, item.name);
      }
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    
    if (!menuOpen) {
      const rect = e.target.getBoundingClientRect();
      const menuHeight = 300;
      const menuWidth = 180;
      
      let top = rect.bottom + 8;
      let left = rect.right - menuWidth;
      
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 8;
      }
      
      if (left < 8) {
        left = rect.left;
      }
      
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 8;
      }
      
      setMenuPosition({ top, left });
    }
    
    setMenuOpen(!menuOpen);
  };

  const handleMouseEnter = () => {
    onHover(item);
    if (item.type === 'file' && canPreview(item.name) && !previewUrl && !previewLoading) {
      loadPreview();
    }
  };

  const handleMouseLeave = () => {
    onLeave();
  };

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const url = await getAuthenticatedPreviewUrl(item.id, item.name);
      console.log('🖼️ [FileItem] Preview URL:', url);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error cargando preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  }, [item.id, item.name]);

  useEffect(() => {
    if (item.type === 'file' && canPreview(item.name) && !previewUrl && !previewLoading) {
      loadPreview();
    }
  }, [item.id, item.name, item.type, loadPreview, previewLoading, previewUrl]);

  const renderFileMenuItems = () => {
    const canShowPreview = canPreview(item.name);
    return (
      <>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleClick(); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Abrir</span>
        </button>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit ? onEdit(item) : onOpenSidebar(item, 'edit'); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Editar en panel</span>
        </button>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Información</span>
        </button>
        {canShowPreview ? (
          <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onView(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Vista Previa</span>
          </button>
        ) : null}
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); downloadFile(item.id, item.name); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Descargar</span>
        </button>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Duplicar</span>
        </button>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>Mover</span>
        </button>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>Compartir</span>
        </button>
        <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
        <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Renombrar</span>
        </button>
        <button className="context-menu-danger" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(item); }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Eliminar</span>
        </button>
      </>
    );
  };

  const renderFolderMenuItems = () => (
    <>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); onFolderClick(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
        <span>Abrir</span>
      </button>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Información</span>
      </button>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span>Duplicar</span>
      </button>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMove(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        <span>Mover</span>
      </button>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span>Compartir</span>
      </button>
      <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
      <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>Renombrar</span>
      </button>
      <button className="context-menu-danger" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(item); }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span>Eliminar</span>
      </button>
    </>
  );

  if (item.type === 'file') {
    const fileType = getFileType(item.name);
    const canShowPreview = canPreview(item.name);

    if (viewMode === 'grid') {
      return (
        <div
          className={`group relative file-grid-item cursor-pointer overflow-hidden ${isHovered ? 'ring-2 ring-blue-500' : ''}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div 
            className="aspect-square p-2 flex items-center justify-center grid-thumbnail"
            draggable={item.type === 'file'}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {canShowPreview && previewUrl ? (
              <>
                {fileType === 'image' && (
                  <img
                    src={previewUrl}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      console.error('❌ [FileItem] Image load error:', e);
                      // e.target.style.display = 'none';
                      // e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                )}
                {fileType === 'video' && (
                  <video
                    muted
                    className="w-full h-full object-cover rounded-lg"
                    onMouseEnter={(e) => e.target.play()}
                    onMouseLeave={(e) => e.target.pause()}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  >
                    <source src={previewUrl} />
                  </video>
                )}
                {fileType === 'pdf' && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-none rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    title={item.name}
                  />
                )}
                <div className="file-icon absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg" style={{ display: 'none' }}>
                  {getFileIcon(item.name)}
                </div>
              </>
            ) : previewLoading ? (
              <div className="file-icon animate-pulse">⟳</div>
            ) : (
              <div className="file-icon text-4xl">{getFileIcon(item.name)}</div>
            )}
          </div>

          <div className="p-2 grid-file-info">
            <h3 className="file-grid-name" title={item.name}>
              {item.name}
            </h3>
            {item.shared && (
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <span className="mr-1">🤝</span>
                {item.owner && <span className="text-[10px] text-blue-500 truncate">de {item.owner}</span>}
              </div>
            )}
            <p className="file-grid-size">
              {item.size ? formatFileSize(item.size) : ''}
            </p>
          </div>

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="grid-menu-button"
              onClick={handleMenuClick}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>

          <ContextMenu
            isOpen={menuOpen}
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          >
            {renderFileMenuItems()}
          </ContextMenu>
        </div>
      );
    } else {
      return (
        <div
          className={`drive-file-row ${isHovered ? 'hovered' : ''}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div 
            className="thumbnail cursor-grab active:cursor-grabbing"
            draggable={item.type === 'file'}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {canShowPreview && previewUrl ? (
              <>
                {fileType === 'image' && (
                  <img
                    src={previewUrl}
                    alt={item.name}
                    onError={(e) => {
                      console.error('❌ [FileItem] Image load error (list):', e);
                      // e.target.style.display = 'none';
                      // e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                )}
                {fileType === 'video' && (
                  <video
                    muted
                    onMouseEnter={(e) => e.target.play()}
                    onMouseLeave={(e) => e.target.pause()}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  >
                    <source src={previewUrl} />
                  </video>
                )}
                {fileType === 'pdf' && (
                  <iframe
                    src={previewUrl}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                    title={item.name}
                  />
                )}
                <div className="file-icon" style={{ display: 'none' }}>
                  {getFileIcon(item.name)}
                </div>
              </>
            ) : previewLoading ? (
              <div className="file-icon loading">⟳</div>
            ) : (
              <div className="file-icon">
                {getFileIcon(item.name)}
              </div>
            )}
          </div>
          <div className="file-name" title={item.name}>
            {item.name}
            {item.shared && (
              <span className="shared-label ml-2 text-xs text-gray-500 flex items-center">
                <span className="mr-1">🤝</span>
                {item.owner && <span className="text-[10px] text-blue-500">de {item.owner}</span>}
              </span>
            )}
          </div>
          <span className="file-size">
            {item.size ? formatFileSize(item.size) : ''}
          </span>
          <div className="menu-container">
            <button className="menu-trespuntos" onClick={handleMenuClick}>
              ⋮
            </button>
          </div>
          
          <ContextMenu
            isOpen={menuOpen}
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          >
            {renderFileMenuItems()}
          </ContextMenu>
        </div>
      );
    }
  }

  return (
    viewMode === 'grid' ? (
      <div
        className="group relative folder-grid-item cursor-pointer overflow-hidden"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="aspect-square p-2 flex items-center justify-center grid-folder-thumbnail">
          <div className="text-5xl">📁</div>
        </div>

        <div className="p-1 grid-folder-info">
          <h3 className="folder-grid-name" title={item.name}>
            {item.name}
          </h3>
          {item.shared && (
            <span className="folder-shared-badge flex flex-col items-start text-xs text-gray-500 mt-1">
              <span className="flex items-center">
                <span className="mr-1">🤝</span>
                Compartido
              </span>
              {item.owner && (
                <span className="text-[10px] text-blue-500">
                  por {item.owner}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="grid-menu-button"
            onClick={handleMenuClick}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        <ContextMenu
          isOpen={menuOpen}
          position={menuPosition}
          onClose={() => setMenuOpen(false)}
        >
          {renderFolderMenuItems()}
        </ContextMenu>
      </div>
    ) : (
      <div
        className="folder-chip"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="folder-icon">📁</span>
        <span className="folder-name" title={item.name}>
          {item.name}
          {item.shared && (
            <span className="shared-label ml-2 text-xs text-gray-500">
              🤝 {item.owner ? `de ${item.owner}` : 'Compartido'}
            </span>
          )}
        </span>
        <div className="menu-container">
          <button className="menu-trespuntos" onClick={handleMenuClick}>
            ⋮
          </button>
          <ContextMenu
            isOpen={menuOpen}
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          >
            {renderFolderMenuItems()}
          </ContextMenu>
        </div>
      </div>
    )
  );
};

export default FileItem;
