import React, { useState, useEffect, useCallback } from 'react';
import { getFileType, getFileIcon, canPreview, getAuthenticatedPreviewUrl, formatFileSize, downloadFile, getAuthenticatedUrl } from '../../utils/fileUtils';

const SidebarPanel = ({ file, onClose, user }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [authenticatedUrl, setAuthenticatedUrl] = useState(null);

  const fileType = getFileType(file.name);
  const canEdit = ['text', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'php'].includes(fileType);

  const loadFileContent = useCallback(async () => {
    if (!canPreview(file.name)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || user?.token || '';
      const response = await fetch(`/api/files/preview/${file.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al cargar el archivo');

      const text = await response.text();
      setContent(text);
    } catch (error) {
      console.error('Error loading file content:', error);
      setContent('Error al cargar el contenido del archivo');
    } finally {
      setLoading(false);
    }
  }, [file.id, file.name, user?.token]);

  const loadAuthenticatedPreview = useCallback(async () => {
    if (!canPreview(file.name)) return;

    try {
      const url = await getAuthenticatedPreviewUrl(file.id, file.name);
      setAuthenticatedUrl(url);
    } catch (error) {
      console.error('Error cargando preview autenticada:', error);
    }
  }, [file.id, file.name]);

  useEffect(() => {
    if (file.action === 'view' || file.action === 'edit') {
      loadFileContent();
      loadAuthenticatedPreview();
    }
  }, [file.action, file, loadFileContent, loadAuthenticatedPreview]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('auth_token') || user?.token || '';
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: content,
          action: 'update'
        })
      });

      if (!response.ok) throw new Error('Error al guardar');

      alert('Archivo guardado correctamente');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error al guardar el archivo');
    }
  };

  const handleDownload = () => {
    downloadFile(file.id, file.name);
  };

  const renderPanelContent = () => {
    switch (file.action) {
      case 'view':
        if (editMode) {
          return (
            <div className="space-y-4">
              {canEdit ? (
                <div className="space-y-4">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-64 p-3 glassmorphism-textarea dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex space-x-3">
                    <button onClick={handleSave} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar</span>
                    </button>
                    <button onClick={() => setEditMode(false)} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-700 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <p>Este tipo de archivo no se puede editar</p>
                </div>
              )}
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              {fileType === 'image' && authenticatedUrl && (
                <div className="flex justify-center">
                  <img
                    src={authenticatedUrl}
                    alt={file.name}
                    className="max-w-full max-h-64 object-contain rounded-lg shadow-md"
                  />
                </div>
              )}
              {fileType === 'video' && authenticatedUrl && (
                <div className="flex justify-center">
                  <video
                    controls
                    className="max-w-full max-h-64 rounded-lg shadow-md"
                  >
                    <source src={authenticatedUrl} />
                  </video>
                </div>
              )}
              {fileType === 'pdf' && authenticatedUrl && (
                <div className="flex justify-center">
                  <iframe
                    src={authenticatedUrl}
                    className="w-full h-64 border border-gray-300 dark:border-gray-600 rounded-lg"
                    title={file.name}
                  />
                </div>
              )}
              {(fileType === 'text' || canEdit) && (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-900 dark:text-slate-100 whitespace-pre-wrap font-mono">
                      {loading ? 'Cargando...' : content}
                    </pre>
                  </div>
                  {canEdit && (
                    <div className="text-center">
                      <button onClick={() => setEditMode(true)} className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Editar</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!canPreview(file.name) && (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">{getFileIcon(file.name)}</div>
                  <p className="text-gray-700 dark:text-gray-400">Este archivo no se puede previsualizar en el panel</p>
                </div>
              )}
            </div>
          );
        }

      case 'edit':
        return (
          <div className="space-y-4">
            {canEdit ? (
              <div className="space-y-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-64 p-3 glassmorphism-textarea dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex space-x-3">
                  <button onClick={handleSave} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Guardar</span>
                  </button>
                  <button onClick={() => setEditMode(false)} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-700 dark:text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p>Este tipo de archivo no se puede editar</p>
              </div>
            )}
          </div>
        );

      case 'info':
      default:
        return (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Información del archivo</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-600">
                <span className="text-gray-600 dark:text-slate-400 font-medium">Nombre:</span>
                <span className="text-gray-900 dark:text-slate-100 text-right">{file.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-600">
                <span className="text-gray-600 dark:text-slate-400 font-medium">Tamaño:</span>
                <span className="text-gray-900 dark:text-slate-100 text-right">{formatFileSize(file.size)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-600">
                <span className="text-gray-600 dark:text-slate-400 font-medium">Tipo:</span>
                <span className="text-gray-900 dark:text-slate-100 text-right">{fileType.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-slate-400 font-medium">Fecha:</span>
                <span className="text-gray-900 dark:text-slate-100 text-right">{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Desconocida'}</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40" onClick={onClose}></div>
      <div className="fixed right-0 top-0 h-full w-96 glassmorphism-panel dark:bg-slate-800 shadow-xl border-l border-gray-200 dark:border-slate-600 z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{file.name}</h3>
          <div className="flex items-center space-x-2">
            <button
              className="p-2 text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
              onClick={handleDownload}
              title="Descargar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              className="p-2 text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
              onClick={onClose}
              title="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {renderPanelContent()}

          <div className="mt-6 space-y-3">
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200" onClick={handleDownload}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar archivo</span>
            </button>
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg transition-colors duration-200" onClick={() => window.open(getAuthenticatedUrl(`/api/files/preview/${file.id}`), '_blank')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Abrir en nueva ventana</span>
            </button>
            <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors duration-200" onClick={onClose}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cerrar panel</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarPanel;
