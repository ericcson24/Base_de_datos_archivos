import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import FileEditorPanel from './FileEditorPanel';
import './UserPanel.css';

// Utility functions
const getAuthToken = () => {
  return localStorage.getItem('auth_token') || '';
};

const getAuthenticatedUrl = (url) => {
  const token = getAuthToken();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

// Función para descargar archivos de manera más confiable
const downloadFile = async (fileId, fileName) => {
  try {
    const token = getAuthToken();
    const downloadUrl = `/api/files/download/${fileId}?download=true&token=${encodeURIComponent(token)}`;

    // Usar fetch para obtener el archivo y crear un blob URL
    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const blob = await response.blob();

    // Crear un enlace con blob URL
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';

    // Agregar al DOM, hacer click y remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar el blob URL después de un tiempo
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

  } catch (error) {
    console.error('Error descargando archivo:', error);
    alert('Error al descargar el archivo: ' + error.message);
  }
};

// Utility function
const formatFileSize = (bytes) => {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

// File type detection and preview utilities
const getFileType = (filename) => {
  const ext = filename.toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return 'audio';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
  if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'php'].includes(ext)) return 'text';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'file';
};

const getFileIcon = (filename) => {
  const type = getFileType(filename);
  const icons = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    pdf: '📄',
    word: '📝',
    excel: '📊',
    powerpoint: '📽️',
    text: '📄',
    archive: '📦',
    file: '📄'
  };
  return icons[type] || '📄';
};

const canPreview = (filename) => {
  const type = getFileType(filename);
  return ['image', 'video', 'pdf', 'text'].includes(type);
};

// Función para obtener preview con autenticación
const getAuthenticatedPreviewUrl = async (fileId, filename) => {
  const type = getFileType(filename);
  if (!canPreview(filename)) return null;

  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    const response = await fetch(`/api/files/preview/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return null;

    // Para imágenes, convertir a data URL
    if (type === 'image') {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }

    // Para otros tipos, devolver la URL normal (el servidor debe manejar la autenticación)
    return `/api/files/preview/${fileId}?token=${encodeURIComponent(token)}`;

  } catch (error) {
    console.error('Error obteniendo preview autenticada:', error);
    return null;
  }
};

// Componente RecentFileItem - Estilo Google Drive con previews reales
const RecentFileItem = ({ file, isDarkMode, onFileClick }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar preview del archivo
  useEffect(() => {
    const loadPreview = async () => {
      if (file.type === 'folder' || !canPreview(file.name)) return;
      
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
  }, [file.id, file.name, file.type]);

  const fileType = getFileType(file.name);
  
  return (
    <div 
      className="recent-file-item"
      onClick={() => onFileClick(file)}
      title={file.name}
    >
      <div className="recent-file-preview">
        {file.type === 'folder' ? (
          <div className="folder-icon">📁</div>
        ) : isLoading ? (
          <div className="loading-preview">⟳</div>
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
            {/* Fallback icon */}
            <div className="file-fallback-icon" style={{ display: 'none' }}>
              {getFileIcon(file.name)}
            </div>
          </div>
        ) : (
          <div className="file-icon-large">
            {getFileIcon(file.name)}
          </div>
        )}
        
        {/* File type indicator */}
        <div className="file-type-indicator">
          {file.name.split('.').pop()?.toUpperCase()}
        </div>
      </div>
      
      <div className="recent-file-info">
        <p className="recent-file-name">
          {file.name.length > 20 ? `${file.name.substring(0, 17)}...` : file.name}
        </p>
        <p className="recent-file-date">
          {file.modifiedAt ? 
            new Date(file.modifiedAt).toLocaleDateString('es-ES', { 
              month: 'short', 
              day: 'numeric',
              year: new Date(file.modifiedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            }) : 
            'Reciente'
          }
        </p>
      </div>
    </div>
  );
};

const UserPanel = ({ user, onLogout, onBackToFolders, onThemeToggle, isDarkMode, onGoToCalendar }) => {
  console.log('🎯 UserPanel se está renderizando con user:', user);

  // Grid snapping constants
  const GRID_SIZE = 40; // Tamaño del grid en píxeles (aumentado de 20 a 40)
  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 200;

  const [files, setFiles] = useState([]);
  const [currentView, setCurrentView] = useState('privada');
  const [currentPath, setCurrentPath] = useState([]);
  const [loading, setLoading] = useState(false); // Cambiar a false para evitar loading inicial
  // const [sidebarExpanded, setSidebarExpanded] = useState(true); // Comentado por ahora
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [sharedFolders, setSharedFolders] = useState([]);
  const [sharedDropdownOpen, setSharedDropdownOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(5 * 1024 * 1024 * 1024); // 5GB
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Estados para viewer y hover
  const [viewerFile, setViewerFile] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [hoveredFile, setHoveredFile] = useState(null);

  // Nuevos estados para redimensionamiento y panel lateral
  const [sidebarPanelOpen, setSidebarPanelOpen] = useState(false);
  const [sidebarPanelFile, setSidebarPanelFile] = useState(null);
  const [fileGridSize, setFileGridSize] = useState({ width: '100%', height: '70vh' });
  const [fileGridPosition, setFileGridPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialMouse, setInitialMouse] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Estado para mostrar límites de arrastre
  const [showDragBounds, setShowDragBounds] = useState(false);
  const [dragBounds, setDragBounds] = useState({ top: 0, left: 0, right: 0, bottom: 0 });
  
  // Z-index para file-grid (inicia en 1, paneles en 10+)
  
  // Estados para drag and drop
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Estado para progreso de subida
  const [uploadProgress, setUploadProgress] = useState(null);

  // Estados para búsqueda y ordenamiento
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('type'); // 'name', 'type', 'date' - Default: type
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc' - Default: asc
  const [viewMode, setViewMode] = useState('list'); // 'list', 'grid'

  // Estados para múltiples paneles de edición
  const [editorPanels, setEditorPanels] = useState([]);
  const [nextPanelId, setNextPanelId] = useState(1);
  const [highestZIndex, setHighestZIndex] = useState(1000);
  const [showDropZone, setShowDropZone] = useState(false);
  const [fileDragging, setFileDragging] = useState(null);

  // Estados para archivos recientes y IA
  const [recentFiles, setRecentFiles] = useState([]);
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  const [aiQuery, setAIQuery] = useState('');
  const [showRecentSection, setShowRecentSection] = useState(true);

  // Funciones para persistencia de archivos recientes
  const getStorageKey = useCallback(() => `recentFiles_${user?.username || 'default'}`, [user?.username]);

  const loadRecentFilesFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filtrar archivos más antiguos de 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filtered = parsed.filter(file => {
          const fileDate = new Date(file.modifiedAt || file.accessedAt);
          return fileDate > thirtyDaysAgo;
        });
        
        return filtered.slice(0, 10); // Solo los 10 más recientes
      }
    } catch (error) {
      console.error('Error loading recent files from storage:', error);
    }
    return [];
  }, [getStorageKey]);

  const saveRecentFilesToStorage = useCallback((recentFiles) => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(recentFiles));
    } catch (error) {
      console.error('Error saving recent files to storage:', error);
    }
  }, [getStorageKey]);

  // Función para toggle del tema
  const toggleTheme = () => {
    onThemeToggle();
  };

  // Inicializar file-grid con ancho al 100% en píxeles
  useEffect(() => {
    const initializeFileGridWidth = () => {
      const mainContent = document.querySelector('.main-content-container');
      if (mainContent) {
        // Obtener el ancho completo del contenedor disponible
        const availableWidth = mainContent.offsetWidth;
        
        // Restar paddings del contenedor
        const mainContentStyles = window.getComputedStyle(mainContent);
        const paddingLeft = parseFloat(mainContentStyles.paddingLeft) || 0;
        const paddingRight = parseFloat(mainContentStyles.paddingRight) || 0;
        
        // Ancho inicial del file-grid (100% del espacio disponible)
        const initialWidth = availableWidth - paddingLeft - paddingRight;
        
        setFileGridSize({ 
          width: `${initialWidth}px`, 
          height: '70vh' 
        });
      }
    };

    // Ejecutar después de que el DOM esté listo
    const timer = setTimeout(initializeFileGridWidth, 100);
    
    // También ejecutar cuando cambie el tamaño de la ventana
    window.addEventListener('resize', initializeFileGridWidth);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', initializeFileGridWidth);
    };
  }, []);

  // Cargar archivos recientes desde localStorage al inicializar
  useEffect(() => {
    const storedRecent = loadRecentFilesFromStorage();
    if (storedRecent.length > 0) {
      setRecentFiles(storedRecent);
    } else {
      // Solo usar datos de prueba si no hay nada guardado
      const sampleData = [
        { id: 'recent1', name: 'Proyecto_Final.docx', type: 'file', modifiedAt: new Date().toISOString() },
        { id: 'recent2', name: 'Presentacion.pptx', type: 'file', modifiedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'recent3', name: 'Documentos', type: 'folder', modifiedAt: new Date(Date.now() - 172800000).toISOString() },
        { id: 'recent4', name: 'imagen_perfil.jpg', type: 'file', modifiedAt: new Date(Date.now() - 259200000).toISOString() }
      ];
      setRecentFiles(sampleData);
      saveRecentFilesToStorage(sampleData);
    }
  }, [loadRecentFilesFromStorage, saveRecentFilesToStorage]); // Recargar cuando cambie el usuario

  // Limpiar archivos recientes antiguos periódicamente
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const cleaned = loadRecentFilesFromStorage();
      if (cleaned.length !== recentFiles.length) {
        setRecentFiles(cleaned);
      }
    }, 60000 * 60); // Cada hora

    return () => clearInterval(cleanupInterval);
  }, [loadRecentFilesFromStorage, recentFiles.length]);

  // Funciones para búsqueda y ordenamiento
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Nuevo campo de ordenamiento
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Funciones para la IA
  const handleAISearch = (e) => {
    setAIQuery(e.target.value);
  };

  const submitAIQuery = async () => {
    if (!aiQuery.trim()) return;
    
    // TODO: Implementar llamada al chatbot de IA
    console.log('Consulta IA:', aiQuery);
    // Placeholder para futura implementación
    alert(`Funcionalidad de IA próximamente disponible!\nConsulta: "${aiQuery}"`);
    
    setAIQuery('');
    setIsAIExpanded(false);
  };

  // Función para añadir archivo a recientes (actualizada)
  const addToRecentFiles = useCallback((file) => {
    setRecentFiles(prevRecent => {
      // Filtrar el archivo si ya existe para evitar duplicados
      const filtered = prevRecent.filter(f => f.id !== file.id);
      // Añadir al principio con timestamp actualizado
      const updated = [{
        ...file,
        modifiedAt: new Date().toISOString(),
        accessedAt: new Date().toISOString()
      }, ...filtered];
      // Mantener solo los 10 más recientes
      const final = updated.slice(0, 10);
      
      // Guardar en localStorage
      saveRecentFilesToStorage(final);
      
      return final;
    });
  }, [saveRecentFilesToStorage]);

  // Función para filtrar archivos según búsqueda
  const filteredFiles = () => {
    if (!searchQuery.trim()) return files;

    const query = searchQuery.toLowerCase();
    return files.filter(file => {
      return file.name.toLowerCase().includes(query) ||
             getFileType(file.name).toLowerCase().includes(query) ||
             (file.type === 'folder' && 'carpeta'.includes(query));
    });
  };

  // Función para ordenar archivos
  const sortedFiles = () => {
    const filtered = filteredFiles();

    return filtered.sort((a, b) => {
      // Folders always come first, regardless of sort type
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          // Within same type group, sort by file type
          aValue = getFileType(a.name);
          bValue = getFileType(b.name);
          break;
        case 'date':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  // Función para validar archivos antes de subir
  const validateFiles = (files) => {
    const maxFileSize = 100 * 1024 * 1024; // 100MB por archivo
    const maxTotalSize = 500 * 1024 * 1024; // 500MB total
    const invalidFiles = [];
    let totalSize = 0;

    for (let file of files) {
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name}: archivo demasiado grande (máx. 100MB)`);
      }
      totalSize += file.size;
    }

    if (totalSize > maxTotalSize) {
      invalidFiles.push(`Tamaño total demasiado grande (máx. 500MB)`);
    }

    return invalidFiles;
  };

  // useEffect para manejar clicks fuera de los menús
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Cerrar mini-menu-frosted si se hace click fuera
      if (uploadMenuOpen) {
        const uploadBtn = document.querySelector('.upload-btn');
        const miniMenu = document.querySelector('.mini-menu-frosted');
        if (uploadBtn && miniMenu && !uploadBtn.contains(event.target) && !miniMenu.contains(event.target)) {
          setUploadMenuOpen(false);
        }
      }

      // Cerrar shared dropdown si se hace click fuera
      if (sharedDropdownOpen) {
        const sharedBtn = document.querySelector('.sidebar-btn[title="Compartidos"]');
        const dropdown = document.querySelector('.dropdown-content');
        if (sharedBtn && dropdown && !sharedBtn.contains(event.target) && !dropdown.contains(event.target)) {
          setSharedDropdownOpen(false);
        }
      }

      // Cerrar búsqueda si se hace click fuera
      if (isSearchExpanded) {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !searchContainer.contains(event.target)) {
          setIsSearchExpanded(false);
          setSearchQuery('');
        }
      }

      // Cerrar IA si se hace click fuera
      if (isAIExpanded) {
        const aiContainer = document.querySelector('.ai-container');
        if (aiContainer && !aiContainer.contains(event.target)) {
          setIsAIExpanded(false);
          setAIQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [uploadMenuOpen, sharedDropdownOpen, isSearchExpanded, isAIExpanded]);

const loadFiles = useCallback(async () => {
  try {
    setLoading(true);
    const pathParam = currentPath.length > 0 ? `?path=${encodeURIComponent(currentPath.join('/'))}` : '';
    const response = await fetch(`/api/files${pathParam}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    const data = await response.json();
    setFiles(data.files || []);
    setStorageUsed(data.storageUsed || 0);
  } catch (error) {
    console.error('Error loading files:', error);
  } finally {
    setLoading(false);
  }
}, [currentPath]);

// Función para cargar archivos recientes
const loadRecentFiles = useCallback(async () => {
  try {
    const response = await fetch('/api/files/recent', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      // Ordenar por fecha de modificación más reciente
      const sortedRecent = (data.files || [])
        .sort((a, b) => new Date(b.modifiedAt || b.createdAt) - new Date(a.modifiedAt || a.createdAt))
        .slice(0, 10); // Solo los 10 más recientes
      
      // Combinar con archivos de localStorage
      const storedRecent = loadRecentFilesFromStorage();
      const combined = [...sortedRecent];
      
      // Añadir archivos de localStorage que no estén en la respuesta del servidor
      storedRecent.forEach(stored => {
        if (!combined.find(c => c.id === stored.id)) {
          combined.push(stored);
        }
      });
      
      const final = combined.slice(0, 10);
      setRecentFiles(final);
      saveRecentFilesToStorage(final);
    } else {
      // Si no hay endpoint de archivos recientes, usar solo localStorage
      const storedRecent = loadRecentFilesFromStorage();
      setRecentFiles(storedRecent);
    }
  } catch (error) {
    console.error('Error loading recent files:', error);
    // En caso de error, usar archivos de localStorage
    const storedRecent = loadRecentFilesFromStorage();
    setRecentFiles(storedRecent);
  }
}, [loadRecentFilesFromStorage, saveRecentFilesToStorage]);

const loadSharedFolders = useCallback(async () => {
  try {
    const response = await fetch('/api/files/shared-folders', {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    const data = await response.json();
    setSharedFolders(data.folders || []);
  } catch (error) {
    console.error('Error loading shared folders:', error);
  }
}, []);

useEffect(() => {
  loadFiles();
  loadSharedFolders();
  loadRecentFiles();
}, [currentView, currentPath, loadFiles, loadSharedFolders, loadRecentFiles]);

  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    // Validar archivos
    const validationErrors = validateFiles(files);
    if (validationErrors.length > 0) {
      alert('❌ Errores de validación:\n' + validationErrors.join('\n'));
      return;
    }

    try {
      setUploadProgress({ status: 'uploading', message: 'Subiendo archivos...' });
      
      const formData = new FormData();
      
      // Agregar todos los archivos al FormData
      for (let file of files) {
        formData.append('files', file);
      }
      
      // Agregar el path actual
      formData.append('path', currentPath.join('/'));

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error uploading files');
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      setUploadProgress({ status: 'success', message: `✅ ${files.length} archivo(s) subido(s) exitosamente` });
      
      // Añadir archivos subidos a recientes
      if (result.files) {
        result.files.forEach(file => addToRecentFiles(file));
      }
      
      // Recargar archivos después de subir
      loadFiles();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setUploadProgress(null), 3000);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadProgress({ status: 'error', message: '❌ Error al subir archivos: ' + error.message });
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => setUploadProgress(null), 5000);
    }
  }, [currentPath, loadFiles, addToRecentFiles]);

  const handleFolderUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    // Validar archivos
    const validationErrors = validateFiles(files);
    if (validationErrors.length > 0) {
      alert('❌ Errores de validación:\n' + validationErrors.join('\n'));
      return;
    }

    try {
      setUploadProgress({ status: 'uploading', message: 'Subiendo carpeta...' });
      
      let uploadedCount = 0;
      let failedCount = 0;
      
      // Procesar cada archivo de la carpeta
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath.join('/'));
        
        // Si el archivo tiene webkitRelativePath, usarlo
        if (file.webkitRelativePath) {
          formData.append('relativePath', file.webkitRelativePath);
        }

        try {
          const response = await fetch('/api/files/upload-folder', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error uploading file');
          }
          
          uploadedCount++;
          
          // Actualizar progreso
          setUploadProgress({ 
            status: 'uploading', 
            message: `Subiendo carpeta... ${uploadedCount}/${files.length} archivos` 
          });
          
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          failedCount++;
        }
      }

      console.log(`Uploaded ${uploadedCount} files from folder, ${failedCount} failed`);
      
      if (failedCount === 0) {
        setUploadProgress({ status: 'success', message: `✅ Carpeta subida exitosamente con ${uploadedCount} archivo(s)` });
      } else {
        setUploadProgress({ 
          status: 'warning', 
          message: `⚠️ Carpeta subida parcialmente: ${uploadedCount} exitosos, ${failedCount} fallidos` 
        });
      }
      
      // Recargar archivos después de subir
      loadFiles();
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setUploadProgress(null), 5000);
      
    } catch (error) {
      console.error('Error uploading folder:', error);
      setUploadProgress({ status: 'error', message: '❌ Error al subir carpeta: ' + error.message });
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => setUploadProgress(null), 5000);
    }
  }, [currentPath, loadFiles]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Por favor ingresa un nombre para la carpeta');
      return;
    }

    try {
      const response = await fetch('/api/files/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          path: currentPath.join('/')
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setShowCreateFolderModal(false);
        setNewFolderName('');
        
        // Añadir carpeta creada a recientes
        if (result.folder) {
          addToRecentFiles(result.folder);
        }
        
        loadFiles(); // Recargar archivos
      } else {
        alert('Error al crear carpeta: ' + result.message);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Error al crear carpeta');
    }
  };

  const handleDeleteItem = async (item) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`¿Estás seguro de que quieres eliminar "${item.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        loadFiles(); // Recargar archivos
      } else {
        alert('Error al eliminar: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error al eliminar');
    }
  };

  const handleRenameItem = async () => {
    if (!renameValue.trim()) {
      alert('Por favor ingresa un nuevo nombre');
      return;
    }

    try {
      const response = await fetch(`/api/files/${renameItem.id}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          newName: renameValue.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setShowRenameModal(false);
        setRenameItem(null);
        setRenameValue('');
        loadFiles(); // Recargar archivos
      } else {
        alert('Error al renombrar: ' + result.message);
      }
    } catch (error) {
      console.error('Error renaming item:', error);
      alert('Error al renombrar');
    }
  };

  const handleDuplicateItem = async (item) => {
    try {
      const response = await fetch(`/api/files/${item.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        loadFiles(); // Recargar archivos
        alert('Archivo duplicado exitosamente');
      } else {
        alert('Error al duplicar: ' + result.message);
      }
    } catch (error) {
      console.error('Error duplicating item:', error);
      alert('Error al duplicar');
    }
  };

  const openRenameModal = (item) => {
    setRenameItem(item);
    setRenameValue(item.name);
    setShowRenameModal(true);
  };

  const changeView = (view) => {
    setCurrentView(view);
    setCurrentPath([]);
  };

  const navigateToFolder = (folderName) => {
    setCurrentPath([...currentPath, folderName]);
    
    // Buscar la carpeta en la lista actual y añadirla a recientes
    const folder = files.find(f => f.name === folderName && f.type === 'folder');
    if (folder) {
      addToRecentFiles(folder);
    }
  };

  const goBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const getCurrentFiles = () => {
    return sortedFiles();
  };

  const getStoragePercentage = () => {
    return Math.min(100, (storageUsed / storageLimit) * 100);
  };

  const openFileViewer = (file) => {
    setViewerFile(file);
    setShowFileViewer(true);
    // Añadir a archivos recientes cuando se abre
    addToRecentFiles(file);
  };

  const closeFileViewer = () => {
    setShowFileViewer(false);
    setViewerFile(null);
  };

  const handleFileHover = async (file) => {
    if (!file || file.type === 'folder') return;

    setHoveredFile(file);

    // El preview se carga automáticamente en el componente FileItem
    // No necesitamos hacer nada aquí
  };

  const handleFileLeave = () => {
    setHoveredFile(null);
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Verificar si son archivos de carpeta (webkitRelativePath)
      const hasFolders = files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));
      
      if (hasFolders) {
        await handleFolderUpload(files);
      } else {
        await handleFileUpload(files);
      }
    }
  }, [handleFileUpload, handleFolderUpload]);

  // Funciones para redimensionamiento y movimiento del file-grid
  const handleMouseDown = (e, action) => {
    e.preventDefault();
    const fileGrid = e.currentTarget.closest('.file-grid');
    const mainPanel = document.querySelector('.main-panel');
    const panelHeader = document.querySelector('.panel-header');
    
    if (!mainPanel || !panelHeader) return;

    if (action === 'move') {
      // Capturar dimensiones actuales
      const currentWidth = fileGrid.offsetWidth;
      const currentHeight = fileGrid.offsetHeight;
      
      // Fijar dimensiones en píxeles
      setFileGridSize({ 
        width: `${currentWidth}px`, 
        height: `${currentHeight}px` 
      });
      
      // Calcular área CONSTANTE donde puede estar el grid (independiente del tamaño del grid)
      const storageBar = document.querySelector('.storage-bar');
      const storageBarHeight = storageBar ? storageBar.offsetHeight : 0;
      
      const topMargin = 20;
      const bottomMargin = 20;
      const leftPadding = 40;   // Padding izquierdo
      const topPadding = 40;    // Padding superior adicional
      const rightPadding = 40;  // Padding derecho
      const bottomPadding = 40; // Padding inferior adicional
      
      const panelHeaderHeight = panelHeader.offsetHeight;
      const availableTop = panelHeaderHeight + topMargin + topPadding;
      const totalAvailableHeight = mainPanel.offsetHeight - panelHeaderHeight - storageBarHeight - topMargin - bottomMargin - bottomPadding - topPadding;
      
      // Límites CONSTANTES - el área completa disponible con padding en todos los lados
      const bounds = {
        top: availableTop,
        left: leftPadding,
        right: mainPanel.offsetWidth - rightPadding,
        bottom: availableTop + totalAvailableHeight
      };
      
      setDragBounds(bounds);
      
      // Obtener posición actual del file-grid
      const fileGridRect = fileGrid.getBoundingClientRect();
      
      // Offset entre el click y la esquina del grid - esto es CRÍTICO para mantener el ratón en su lugar
      const offsetX = e.clientX - fileGridRect.left;
      const offsetY = e.clientY - fileGridRect.top;
      setDragOffset({ x: offsetX, y: offsetY });
      
      setInitialMouse({ x: e.clientX, y: e.clientY });
      
      setIsDragging(true);
      setShowDragBounds(true);
    } else if (action === 'resize') {
      setIsResizing(true);
      const currentWidth = fileGrid.offsetWidth;
      const currentHeight = fileGrid.offsetHeight;
      setInitialSize({ width: currentWidth, height: currentHeight });
      setInitialMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const mainPanel = document.querySelector('.main-panel');
      const fileGrid = document.querySelector('.file-grid');
      if (!mainPanel || !fileGrid) return;
      
      const mainPanelRect = mainPanel.getBoundingClientRect();
      
      // Posición donde DEBE estar la esquina superior izquierda del grid
      // para que el ratón se mantenga en el move-handle
      let topLeftX = e.clientX - mainPanelRect.left - dragOffset.x;
      let topLeftY = e.clientY - mainPanelRect.top - dragOffset.y;
      
      // Dimensiones actuales
      let currentWidth = fileGrid.offsetWidth;
      let currentHeight = fileGrid.offsetHeight;
      
      // Tamaño mínimo en píxeles (20% del ancho del panel)
      const minWidthPx = Math.max(MIN_WIDTH, mainPanel.offsetWidth * 0.20);
      const minHeightPx = MIN_HEIGHT;
      
      // Factor de reducción de sensibilidad (cuanto más alto, más lento se redimensiona)
      const resizeSensitivity = 0.3; // Solo aplica 30% del cambio
      
      let newX = topLeftX;
      let newY = topLeftY;
      let newWidth = currentWidth;
      let newHeight = currentHeight;
      
      // AJUSTE HORIZONTAL
      if (topLeftX < dragBounds.left) {
        // Se sale por la izquierda
        const overflow = dragBounds.left - topLeftX;
        newX = dragBounds.left;
        // Reducir solo una fracción del overflow
        const widthReduction = overflow * resizeSensitivity;
        newWidth = Math.max(minWidthPx, currentWidth - widthReduction);
      } else if (topLeftX + currentWidth > dragBounds.right) {
        // La parte derecha del grid se sale
        const overflow = (topLeftX + currentWidth) - dragBounds.right;
        
        // Verificar si el grid ya está en su tamaño mínimo
        const isAtMinWidth = currentWidth <= minWidthPx;
        
        if (isAtMinWidth) {
          // Grid YA está en tamaño mínimo: NO permitir que se salga
          // Limitar la posición para que la parte derecha no exceda dragBounds.right
          newX = Math.min(topLeftX, dragBounds.right - currentWidth);
          newWidth = minWidthPx;
        } else {
          // Aún puede reducirse
          const widthReduction = overflow * resizeSensitivity;
          const potentialWidth = currentWidth - widthReduction;
          newX = topLeftX;
          newWidth = Math.max(minWidthPx, potentialWidth);
        }
      } else {
        // Dentro de límites horizontales
        newX = topLeftX;
        newWidth = currentWidth;
      }
      
      // AJUSTE VERTICAL
      if (topLeftY < dragBounds.top) {
        // Se sale por arriba
        const overflow = dragBounds.top - topLeftY;
        newY = dragBounds.top;
        // Reducir solo una fracción del overflow
        const heightReduction = overflow * resizeSensitivity;
        const potentialHeight = currentHeight - heightReduction;
        
        // Si ya está en el mínimo, no puede seguir moviéndose hacia arriba
        if (potentialHeight <= minHeightPx && currentHeight <= minHeightPx) {
          newY = dragBounds.top;
          newHeight = minHeightPx;
        } else {
          newHeight = Math.max(minHeightPx, potentialHeight);
        }
      } else if (topLeftY + currentHeight > dragBounds.bottom) {
        // La parte inferior del grid se sale
        const overflow = (topLeftY + currentHeight) - dragBounds.bottom;
        
        // Verificar si el grid ya está en su tamaño mínimo
        const isAtMinHeight = currentHeight <= minHeightPx;
        
        if (isAtMinHeight) {
          // Grid YA está en tamaño mínimo: NO permitir que se salga
          // Limitar la posición para que la parte inferior no exceda dragBounds.bottom
          newY = Math.min(topLeftY, dragBounds.bottom - currentHeight);
          newHeight = minHeightPx;
        } else {
          // Aún puede reducirse
          const heightReduction = overflow * resizeSensitivity;
          const potentialHeight = currentHeight - heightReduction;
          newY = topLeftY;
          newHeight = Math.max(minHeightPx, potentialHeight);
        }
      } else {
        // Dentro de límites verticales
        newY = topLeftY;
        newHeight = currentHeight;
      }
      
      // VERIFICACIÓN FINAL: Doble seguridad para evitar que se salga
      if (newY + newHeight > dragBounds.bottom) {
        newY = dragBounds.bottom - newHeight;
      }
      
      if (newX + newWidth > dragBounds.right) {
        newX = dragBounds.right - newWidth;
      }
      
      // Actualizar estado
      setFileGridPosition({ x: newX, y: newY });
      if (newWidth !== currentWidth || newHeight !== currentHeight) {
        setFileGridSize({ width: `${newWidth}px`, height: `${newHeight}px` });
      }
    } else if (isResizing) {
      // ...existing code...
      const deltaX = e.clientX - initialMouse.x;
      const deltaY = e.clientY - initialMouse.y;

      let newWidth = Math.max(MIN_WIDTH, initialSize.width + deltaX);
      let newHeight = Math.max(MIN_HEIGHT, initialSize.height + deltaY);

      // Snap to grid durante resize (esto sí funciona bien)
      newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
      newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;

      // Get main-panel boundaries for size constraints
      const mainPanel = document.querySelector('.main-panel');
      if (mainPanel) {
        const maxWidth = mainPanel.offsetWidth;
        const maxHeight = mainPanel.offsetHeight * 0.8; // Max 80% of main-panel height

        // Limit to main-panel dimensions
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);
      }

      setFileGridSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
    }
  }, [isDragging, isResizing, initialMouse, initialSize, GRID_SIZE, MIN_WIDTH, MIN_HEIGHT, dragOffset.x, dragOffset.y, dragBounds.left, dragBounds.right, dragBounds.top, dragBounds.bottom]);

  const handleMouseUp = useCallback((e) => {
    setIsDragging(false);
    setIsResizing(false);
    setShowDragBounds(false);
    
    // La posición y el tamaño ya están establecidos por handleMouseMove
    // No necesitamos hacer nada más aquí
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      // Crear un wrapper para pasar el evento a handleMouseUp
      const mouseUpHandler = (e) => handleMouseUp(e);
      document.addEventListener('mouseup', mouseUpHandler);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Funciones para el panel lateral
  const openSidebarPanel = (file, action = 'view') => {
    setSidebarPanelFile({ ...file, action });
    setSidebarPanelOpen(true);
  };

  const closeSidebarPanel = () => {
    setSidebarPanelOpen(false);
    setSidebarPanelFile(null);
  };

  // Funciones para múltiples paneles de edición
  const openEditorPanel = (file) => {
    // Verificar si el archivo ya está abierto
    const existingPanel = editorPanels.find(panel => panel.file.id === file.id);
    if (existingPanel) {
      // Traer al frente el panel existente
      bringPanelToFront(existingPanel.id);
      return;
    }

    // Crear nuevo panel
    const newZIndex = highestZIndex + 1;
    const newPanel = {
      id: nextPanelId,
      file: file,
      position: {
        x: 100 + (nextPanelId * 30), // Offset para que no se superpongan exactamente
        y: 100 + (nextPanelId * 30)
      },
      zIndex: newZIndex
    };

    setEditorPanels([...editorPanels, newPanel]);
    setNextPanelId(nextPanelId + 1);
    setHighestZIndex(newZIndex);
    
    // Añadir a archivos recientes cuando se abre en editor
    addToRecentFiles(file);
  };

  const closeEditorPanel = (panelId) => {
    setEditorPanels(editorPanels.filter(panel => panel.id !== panelId));
  };

  const bringPanelToFront = (panelId) => {
    const newZIndex = highestZIndex + 1;
    setEditorPanels(editorPanels.map(panel => 
      panel.id === panelId 
        ? { ...panel, zIndex: newZIndex }
        : panel
    ));
    setHighestZIndex(newZIndex);
  };

  // Drag and Drop para abrir archivos en paneles
  const handleFileDragStart = useCallback((file, e) => {
    setFileDragging(file);
    setShowDropZone(true);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleFileDragEnd = useCallback(() => {
    setFileDragging(null);
    setShowDropZone(false);
  }, []);

  const handleDropZoneDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDropZoneDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileDragging) {
      openEditorPanel(fileDragging);
    }
    setFileDragging(null);
    setShowDropZone(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileDragging]);

  return (
    <div className="user-panel">
      {/* Background */}
      <div className="bg"></div>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo */}
        <div className="logo">
          <img className="logo-img" src="/icons/nube.svg" alt="Nube" />
          <span>Nube Personal</span>
        </div>

        {/* Upload Button - Arriba de navegación */}
        <div className="upload-btn-container">
          <button
            className="upload-btn-separado"
            onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
          >
            <span>⬆️</span> Subir
          </button>
          {uploadMenuOpen && (
            <div className={`mini-menu-frosted show`}>
              <button
                className="mini-menu-item"
                onClick={() => document.getElementById('fileInput').click()}
              >
                📄 Subir archivos
              </button>
              <button
                className="mini-menu-item"
                onClick={() => document.getElementById('folderInput').click()}
              >
                � Subir carpeta
              </button>
              <button
                className="mini-menu-item"
                onClick={() => setShowCreateFolderModal(true)}
              >
                ➕ Nueva carpeta
              </button>
            </div>
          )}
        </div>

        {/* Navigation - En contenedor superior */}
        <div className="sidebar-navigation">
          <button
            className={`sidebar-btn ${currentView === 'privada' ? 'active' : ''}`}
            onClick={() => changeView('privada')}
          >
            <span>🗂️</span> Mi unidad
          </button>

          {/* Shared Folders Dropdown */}
          <div className="dropdown-container">
            <button
              className={`sidebar-btn ${currentView.startsWith('shared') ? 'active' : ''}`}
              onClick={() => setSharedDropdownOpen(!sharedDropdownOpen)}
            >
              <span>🌍</span> Compartidos
              <span className={`dropdown-arrow ${sharedDropdownOpen ? 'open' : ''}`}>▾</span>
            </button>
            {sharedDropdownOpen && (
              <div className="dropdown-content">
                <div className="dropdown-section">
                  <button className="dropdown-item" onClick={() => changeView('public')}>
                    📂 Compartido general
                  </button>
                  {sharedFolders.map(folder => (
                    <button
                      key={folder.id}
                      className="dropdown-item"
                      onClick={() => changeView(`shared-${folder.id}`)}
                    >
                      👥 Con {folder.withUser}
                    </button>
                  ))}
                  <button className="dropdown-item" onClick={() => {/* open create shared modal */}}>
                    ➕ Nueva carpeta compartida
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sidebar-actions">
          <button className="acciones-btn" onClick={onBackToFolders}>
            ⬅️ Volver
          </button>
          <button className="acciones-btn" onClick={async () => {
            // Verificar si tiene sesión de Microsoft
            try {
              const response = await fetch('http://localhost:5000/api/auth/verify-microsoft', {
                credentials: 'include'
              });
              const data = await response.json();
              
              if (data.hasMicrosoftAuth) {
                // Tiene sesión de Microsoft, ir al calendario
                window.location.href = 'http://localhost:3000/calendar';
              } else {
                // No tiene sesión, redirigir a login de Microsoft
                if (window.confirm('Para acceder al calendario necesitas iniciar sesión con tu cuenta de Microsoft Outlook. ¿Deseas continuar?')) {
                  window.location.href = 'http://localhost:5000/api/auth/login';
                }
              }
            } catch (error) {
              console.error('Error verificando sesión de Microsoft:', error);
              // En caso de error, intentar login de Microsoft
              if (window.confirm('Para acceder al calendario necesitas iniciar sesión con tu cuenta de Microsoft Outlook. ¿Deseas continuar?')) {
                window.location.href = 'http://localhost:5000/api/auth/login';
              }
            }
          }}>
            📅 Abrir calendario
          </button>
          <button className="acciones-btn" onClick={onLogout}>
            🚪 Cerrar sesión
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-panel">
        <div className="panel-header">
          <h1 className="panel-title">
            {currentView === 'privada' ? 'Mi unidad' :
             currentView === 'public' ? 'Compartido general' :
             currentView.startsWith('shared') ? 'Carpeta compartida' :
             'Archivos'}
          </h1>
          <button 
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Contenedor flexible para file-grid y paneles */}
        <div className="main-content-container">
        
        {/* Overlay de límites de arrastre - ÁREA CONSTANTE */}
        {showDragBounds && (
          <div 
            className="drag-bounds-overlay"
            style={{
              position: 'absolute',
              top: `${dragBounds.top}px`,
              left: `${dragBounds.left}px`,
              width: `${dragBounds.right - dragBounds.left}px`,
              height: `${dragBounds.bottom - dragBounds.top}px`,
              border: '2px dashed rgba(59, 130, 246, 0.6)',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              borderRadius: '8px',
              pointerEvents: 'none',
              zIndex: 999,
              transition: 'opacity 0.2s ease-in-out'
            }}
          />
        )}

        <div 
          className={`file-grid ${isDragOver ? 'drag-over' : ''}`}
          
          style={{
            width: fileGridSize.width,
            height: fileGridSize.height,
            position: (isDragging || fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? 'absolute' : 'relative',
            left: (isDragging || fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? `${fileGridPosition.x}px` : 'auto',
            top: (isDragging || fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? `${fileGridPosition.y}px` : 'auto',
            zIndex: isDragging ? 1000 : 1
          }}
          onClick={() => {
            // Traer file-grid al frente al hacer click
            const newZIndex = highestZIndex + 1;
            setHighestZIndex(newZIndex);
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >{/* Modern Search and Controls Bar - Moved outside file-grid */}
        <div className="relative z-10 mb-6 w-full px-6 min-h-[5%]">
          <div className="search-container flex items-center justify-between glassmorphism rounded-2xl p-4 shadow-lg border-gray-200/50 transition-all duration-300 hover:shadow-xl">
            {/* Search Section */}
            <div className="flex items-center space-x-3 flex-1 max-w-md">
              <div
  role="search"
  onClick={() => setIsSearchExpanded(true)}
  className={`search-container relative flex items-center overflow-hidden transition-all duration-300 ease-in-out border cursor-text ${isSearchExpanded
    ? 'w-72 h-9 rounded-lg shadow-md pl-3 pr-8 justify-start'
    : 'w-12 h-12 rounded-full justify-center'
  }`}
>
  {/* 🔍 Icono */}
  <svg
    className={`search-clear-btn transition-all duration-300 ease-in-out ${
      isSearchExpanded
        ? 'w-4 h-4 mr-2 opacity-70 translate-x-0'
        : 'w-5 h-5 opacity-100'
    }`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>

  {/* 🔤 Input */}
  <input
    type="text"
    placeholder="Buscar archivos..."
    value={searchQuery}
    onChange={handleSearch}
    onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
    onBlur={() => setIsSearchExpanded(false)}
    autoFocus={isSearchExpanded}
    className={`search-input absolute left-0 w-full h-full bg-transparent border-none outline-none text-[14px] flex items-center px-8 transition-all duration-300 ease-in-out ${
      isSearchExpanded
        ? 'opacity-100 translate-x-0 cursor-text'
        : 'opacity-0 -translate-x-5 pointer-events-none'
    }`}
    style={{ outline: 'none', boxShadow: 'none' }}
  />

  {/* ❌ Botón limpiar */}
  {isSearchExpanded && searchQuery && (
    <button
      onClick={(e) => {
        e.stopPropagation(); // 👈 evita cerrar el buscador
        setSearchQuery('');
      }}
      className="search-clear-btn absolute right-3 flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-200"
      title="Limpiar búsqueda"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  )}
</div>



              {/* Botón IA */}
              <div
                role="button"
                onClick={() => setIsAIExpanded(true)}
                className={`ai-container relative flex items-center overflow-hidden transition-all duration-300 ease-in-out border cursor-text ${isAIExpanded
                  ? 'w-72 h-9 rounded-lg shadow-md pl-3 pr-8 justify-start'
                  : 'w-12 h-12 rounded-full justify-center'
                }`}
                title="Chatbot IA (Próximamente)"
              >
                {/* 🤖 Icono IA */}
                <svg
                  className={`transition-all duration-300 ease-in-out ${
                    isAIExpanded
                      ? 'w-4 h-4 mr-2 opacity-70 translate-x-0'
                      : 'w-5 h-5 opacity-100'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>

                {/* Input IA */}
                <input
                  type="text"
                  placeholder="Pregunta al asistente IA..."
                  value={aiQuery}
                  onChange={handleAISearch}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      submitAIQuery();
                    }
                  }}
                  onBlur={() => setIsAIExpanded(false)}
                  autoFocus={isAIExpanded}
                  className={`absolute left-0 w-full h-full bg-transparent border-none outline-none text-[14px] flex items-center px-8 transition-all duration-300 ease-in-out ${
                    isAIExpanded
                      ? 'opacity-100 translate-x-0 cursor-text'
                      : 'opacity-0 -translate-x-5 pointer-events-none'
                  }`}
                  style={{ outline: 'none', boxShadow: 'none' }}
                />

                {/* Botón enviar IA */}
                {isAIExpanded && aiQuery && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      submitAIQuery();
                    }}
                    className="absolute right-3 flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-200 text-purple-500 hover:text-purple-700"
                    title="Enviar consulta IA"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Search Results Counter */}
              {searchQuery && (
                <div className={`animate-fade-in ${isDarkMode ? 'bg-blue-900/20 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'} px-3 py-1 rounded-lg text-sm font-medium border`}>
                  {filteredFiles().length} resultado{filteredFiles().length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Controls Section */}
            <div className="flex items-center space-x-2">
              {/* Sort Controls */}
              <div className={`flex items-center space-x-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-xl p-1`}>
                <button
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    sortBy === 'name'
                      ? 'bg-blue-500 text-white shadow-md'
                      : `text-gray-600 ${isDarkMode ? 'text-slate-300 hover:bg-slate-600' : 'hover:bg-gray-200'}`
                  }`}
                  onClick={() => handleSort('name')}
                  title="Ordenar por nombre"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
                  </svg>
                </button>
                <button
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    sortBy === 'type'
                      ? 'bg-blue-500 text-white shadow-md'
                      : `text-gray-600 ${isDarkMode ? 'text-slate-300 hover:bg-slate-600' : 'hover:bg-gray-200'}`
                  }`}
                  onClick={() => handleSort('type')}
                  title="Ordenar por tipo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                  </svg>
                </button>
                <button
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    sortBy === 'date'
                      ? 'bg-blue-500 text-white shadow-md'
                      : `text-gray-600 ${isDarkMode ? 'text-slate-300 hover:bg-slate-600' : 'hover:bg-gray-200'}`
                  }`}
                  onClick={() => handleSort('date')}
                  title="Ordenar por fecha"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              {/* Sort Direction */}
              <button
                className={`p-2 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-50 hover:bg-gray-200'} rounded-xl transition-all duration-200 transform hover:scale-105`}
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`Orden ${sortOrder === 'asc' ? 'ascendente' : 'descendente'}`}
              >
                <svg
                  className={`w-4 h-4 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'} transition-transform duration-200 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>

              {/* View Mode Toggle */}
              <div className={`flex items-center space-x-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-xl p-1`}>
                <button
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white shadow-md'
                      : `text-gray-600 ${isDarkMode ? 'text-slate-300 hover:bg-slate-600' : 'hover:bg-gray-200'}`
                  }`}
                  onClick={() => setViewMode('list')}
                  title="Vista de lista"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  className={`p-2 rounded-lg transition-all duration-200 transform hover:scale-105 ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white shadow-md'
                      : `text-gray-600 ${isDarkMode ? 'text-slate-300 hover:bg-slate-600' : 'hover:bg-gray-200'}`
                  }`}
                  onClick={() => setViewMode('grid')}
                  title="Vista de cuadrícula"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Archivos Recientes - Rediseño Elegante */}
        {showRecentSection && recentFiles.length > 0 && (
          <div className="recent-files-section">
            <div className="recent-files-header">
              <div className="recent-files-title">
                <span className="recent-icon">⚡</span>
                <h3>Recientes</h3>
              </div>
              <button
                onClick={() => setShowRecentSection(false)}
                className="recent-close-btn"
                title="Ocultar archivos recientes"
              >
                ✕
              </button>
            </div>
            
            {/* Lista horizontal de archivos recientes */}
            <div className="recent-files-grid">
              {recentFiles.slice(0, 15).map((file, index) => (
                <RecentFileItem
                  key={`recent-${file.id}-${index}`}
                  file={file}
                  isDarkMode={isDarkMode}
                  onFileClick={(file) => {
                    if (file.type === 'folder') {
                      navigateToFolder(file.name);
                    } else if (canPreview(file.name)) {
                      openFileViewer(file);
                    } else {
                      downloadFile(file.id, file.name);
                    }
                  }}
                />
              ))}
              
              {/* Botón Ver todos rediseñado */}
              <div 
                className="recent-view-all"
                onClick={() => {
                  // TODO: Implementar vista completa de archivos recientes
                  console.log('Ver todos los archivos recientes');
                }}
                title="Ver todos los archivos recientes"
              >
                <div className="recent-view-all-content">
                  <div className="recent-view-all-icon">📂</div>
                  <span>Ver todos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botón para mostrar archivos recientes si está oculto */}
        {!showRecentSection && (
          <div className="relative z-10 mb-4 w-full px-6">
            <button
              onClick={() => setShowRecentSection(true)}
              className="show-recent-files-btn"
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-medium">Mostrar archivos recientes</span>
              </div>
            </button>
          </div>
        )}

          {/* Upload Progress */}
          {uploadProgress && (
            <div className={`upload-progress ${uploadProgress.status}`}>
              <div className="upload-progress-content">
                <span className="upload-progress-icon">
                  {uploadProgress.status === 'uploading' && '⏳'}
                  {uploadProgress.status === 'success' && '✅'}
                  {uploadProgress.status === 'error' && '❌'}
                  {uploadProgress.status === 'warning' && '⚠️'}
                </span>
                <span className="upload-progress-message">{uploadProgress.message}</span>
              </div>
            </div>
          )}
          {/* Move Handle */}
          <div 
            className="move-handle"
            onMouseDown={(e) => handleMouseDown(e, 'move')}
          ></div>

          {/* Files and folders */}
          <div className={`files-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
            {loading ? (
              <div className="loading">Cargando archivos...</div>
            ) : (
              <>
                {/* Back button */}
                {currentPath.length > 0 && (
                  <button className="back-btn" onClick={goBack}>
                    ⬅ Volver
                  </button>
                )}

                {/* Files and folders */}
                {getCurrentFiles().map((item, index) => (
                  <FileItem
                    key={`${item.name}-${index}`}
                    item={item}
                    onFolderClick={navigateToFolder}
                    onDelete={handleDeleteItem}
                    onRename={openRenameModal}
                    onView={openFileViewer}
                    onHover={handleFileHover}
                    onLeave={handleFileLeave}
                    onOpenSidebar={openSidebarPanel}
                    onDuplicate={handleDuplicateItem}
                    onDragStart={handleFileDragStart}
                    onDragEnd={handleFileDragEnd}
                    isHovered={hoveredFile?.id === item.id}
                    viewMode={viewMode}
                  />
                ))}

                {/* Empty state */}
                {getCurrentFiles().length === 0 && !loading && (
                  <div className="empty-state">
                    <span>📁</span>
                    <p>
                      {searchQuery 
                        ? `No se encontraron archivos que coincidan con "${searchQuery}"`
                        : 'No hay archivos en esta carpeta'
                      }
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar Panel */}
          {sidebarPanelOpen && sidebarPanelFile && (
            <SidebarPanel
              file={sidebarPanelFile}
              onClose={closeSidebarPanel}
              user={user}
            />
          )}

          {/* Resize Handle */}
          <div 
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
          ></div>
        </div>

        {/* Editor Panels Container - Al lado del file-grid */}
        {editorPanels.length > 0 && (
          <div className="editor-panels-container flex-1 flex flex-col gap-4 overflow-y-auto p-4">
            {editorPanels.map(panel => (
              <div key={panel.id} className="editor-panel-inline glassmorphism rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <FileEditorPanel
                  file={panel.file}
                  position={{x:0,y:0}}
                  zIndex={panel.zIndex}
                  panelId={panel.id}
                  onClose={() => closeEditorPanel(panel.id)}
                  onBringToFront={() => bringPanelToFront(panel.id)}
                  isInline={true}
                />
              </div>
            ))}
          </div>
        )}
        
        </div> {/* Cierre main-content-container */}
      </div> {/* Cierre main-panel */}

      {/* Storage Bar */}
      <div className="storage-bar">
        <div className="storage-text">
          {formatFileSize(storageUsed)} de {formatFileSize(storageLimit)}
        </div>
        <div
          className="storage-bar-fill"
          style={{ width: `${getStoragePercentage()}%` }}
        ></div>
      </div>

      {/* Hidden file inputs */}
      <input
        type="file"
        id="fileInput"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFileUpload(Array.from(e.target.files));
          e.target.value = ''; // Reset input
        }}
      />
      <input
        type="file"
        id="folderInput"
        webkitdirectory=""
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFolderUpload(Array.from(e.target.files));
          e.target.value = ''; // Reset input
        }}
      />

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={() => setShowCreateFolderModal(false)}>
          <div className="glassmorphism-modal dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Nueva Carpeta</h3>
            <input
              type="text"
              placeholder="Nombre de la carpeta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="w-full px-3 py-2 glassmorphism-input dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowCreateFolderModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateFolder}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={() => setShowRenameModal(false)}>
          <div className="glassmorphism-modal dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Renombrar {renameItem?.type === 'folder' ? 'Carpeta' : 'Archivo'}</h3>
            <input
              type="text"
              placeholder="Nuevo nombre"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRenameItem()}
              className="w-full px-3 py-2 glassmorphism-input dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRenameItem}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                Renombrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      {showFileViewer && viewerFile && (
        <FileViewerModal
          file={viewerFile}
          onClose={closeFileViewer}
          user={user}
        />
      )}

      {/* Hover Preview Tooltip */}
      {hoveredFile && (
        <HoverPreview
          file={hoveredFile}
        />
      )}

      {/* Drop Zone for Editor Panels - Inline */}
      {showDropZone && fileDragging && (
        <div 
          className="editor-drop-zone-inline"
          onDragOver={handleDropZoneDragOver}
          onDrop={handleDropZoneDrop}
          onDragLeave={() => setShowDropZone(false)}
        >
          <div className="drop-zone-content">
            <svg className="w-12 h-12 mb-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <p className="text-base font-semibold">Suelta para ver/editar</p>
            <p className="text-xs opacity-75">{fileDragging?.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para el menú contextual usando portal
const ContextMenu = ({ isOpen, position, onClose, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      const menuElement = event.target.closest('.context-menu-portal');
      if (!menuElement) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="context-menu-portal"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000000,
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--sidebar-border)',
        borderRadius: '8px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
        padding: '8px 0',
        minWidth: '180px',
        animation: 'fadeInScale 0.2s ease-out'
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// File Item Component
const FileItem = ({ item, onFolderClick, onDelete, onRename, onView, onHover, onLeave, isHovered, onOpenSidebar, onDuplicate, onDragStart, onDragEnd, viewMode = 'list' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Handlers para drag and drop
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

  // useEffect simplificado - ContextMenu maneja click outside
  useEffect(() => {
    // Solo para cerrar con Escape si no usamos ContextMenu en algún lugar
  }, [menuOpen]);

  const handleClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item.name);
    } else {
      // Si se puede previsualizar, abrir viewer, sino descargar
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
      // Calcular posición del menú
      const rect = e.target.getBoundingClientRect();
      const menuHeight = 300; // Altura estimada del menú
      const menuWidth = 180;
      
      let top = rect.bottom + 8;
      let left = rect.right - menuWidth;
      
      // Ajustar si se sale de la pantalla por abajo
      if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 8;
      }
      
      // Ajustar si se sale de la pantalla por la izquierda
      if (left < 8) {
        left = rect.left;
      }
      
      // Ajustar si se sale de la pantalla por la derecha
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 8;
      }
      
      setMenuPosition({ top, left });
    }
    
    setMenuOpen(!menuOpen);
  };

  const handleMouseEnter = () => {
    onHover(item);
    // Cargar preview cuando se hace hover
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
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error cargando preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  }, [item.id, item.name]);

  useEffect(() => {
    // Cargar preview automáticamente para archivos que se pueden previsualizar
    if (item.type === 'file' && canPreview(item.name) && !previewUrl && !previewLoading) {
      loadPreview();
    }
  }, [item.id, item.name, item.type, loadPreview, previewLoading, previewUrl]);

  if (item.type === 'file') {
    const fileType = getFileType(item.name);
    const canShowPreview = canPreview(item.name);

    if (viewMode === 'grid') {
      // Grid View
      return (
        <div
          className={`group relative file-grid-item cursor-pointer overflow-hidden ${isHovered ? 'ring-2 ring-blue-500' : ''}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Thumbnail - DRAGGABLE */}
          <div 
            className="aspect-square p-4 flex items-center justify-center grid-thumbnail"
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
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
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

          {/* File Info */}
          <div className="p-3 grid-file-info">
            <h3 className="file-grid-name" title={item.name}>
              {item.name}
            </h3>
            <p className="file-grid-size">
              {item.size ? formatFileSize(item.size) : ''}
            </p>
          </div>

          {/* Menu Button */}
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

          {/* Menu Popup */}
          <ContextMenu
            isOpen={menuOpen}
            position={menuPosition}
            onClose={() => setMenuOpen(false)}
          >
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'view'); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Abrir en panel</span>
              </button>
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'edit'); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar en panel</span>
              </button>
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Información</span>
              </button>
              {canShowPreview ? (
                <button className="context-menu-item" onClick={() => { setMenuOpen(false); onView(item); }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Ver completo</span>
                </button>
              ) : (
                <button className="context-menu-item" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Ver</span>
                </button>
              )}
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Descargar</span>
              </button>
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); onDuplicate(item); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Duplicar</span>
              </button>
              <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); onRename(item); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Renombrar</span>
              </button>
              <button className="context-menu-danger" onClick={() => { setMenuOpen(false); onDelete(item); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Eliminar</span>
              </button>
          </ContextMenu>
        </div>
      );
    } else {
      // List View (existing code)
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
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
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
            <button className="context-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'view'); }}>
              👁 Abrir en panel
            </button>
            <button className="context-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'edit'); }}>
              ✏️ Editar en panel
            </button>
            <button className="context-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
              ℹ️ Información
            </button>
            {canShowPreview ? (
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); onView(item); }}>
                👁 Ver completo
              </button>
            ) : (
              <button className="context-menu-item" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
                👁 Ver
              </button>
            )}
            <button className="context-menu-item" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
              ⬇️ Descargar
            </button>
            <button className="context-menu-item" onClick={() => { setMenuOpen(false); onDuplicate(item); }}>
              📋 Duplicar
            </button>
            <button className="context-menu-item">📁 Mover</button>
            <button className="context-menu-item" onClick={() => { setMenuOpen(false); onRename(item); }}>
              ✏️ Renombrar
            </button>
            <button className="context-menu-item context-menu-danger" onClick={() => { setMenuOpen(false); onDelete(item); }}>
              🗑️ Eliminar
            </button>
          </ContextMenu>
        </div>
      );
    }
  }

  return (
    viewMode === 'grid' ? (
      // Grid View for Folders
      <div
        className="group relative folder-grid-item cursor-pointer overflow-hidden"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Folder Icon */}
        <div className="aspect-square p-6 flex items-center justify-center grid-folder-thumbnail">
          <div className="text-6xl">📁</div>
        </div>

        {/* Folder Info */}
        <div className="p-3 grid-folder-info">
          <h3 className="folder-grid-name" title={item.name}>
            {item.name}
          </h3>
          {item.shared && (
            <span className="folder-shared-badge">
              <span className="mr-1">🤝</span>
              Compartida
            </span>
          )}
        </div>

        {/* Menu Button */}
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

        {/* Menu Popup */}
        <ContextMenu
          isOpen={menuOpen}
          position={menuPosition}
          onClose={() => setMenuOpen(false)}
        >
          <button className="context-menu-item" onClick={() => onFolderClick(item.name)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
            </svg>
            <span>Abrir</span>
          </button>
          <button className="context-menu-item" onClick={() => { setMenuOpen(false); onDuplicate(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Duplicar</span>
          </button>
          <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
          <button className="context-menu-item" onClick={() => { setMenuOpen(false); onRename(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Renombrar</span>
          </button>
          <button className="context-menu-danger" onClick={() => { setMenuOpen(false); onDelete(item); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Eliminar</span>
          </button>
        </ContextMenu>
      </div>
    ) : (
      // List View for Folders (existing code)
      <div
        className="folder-chip"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span className="folder-icon">📁</span>
        <span className="folder-name" title={item.name}>
          {item.name}
          {item.shared && <span className="shared-label">🤝 Compartida</span>}
        </span>
        <div className="menu-container">
          <button className="menu-trespuntos" onClick={handleMenuClick}>
            ⋮
          </button>
          {menuOpen && (
            <div className={`mini-menu-frosted ${menuOpen ? 'show' : ''}`}>
              <button className="mini-menu-item" onClick={() => onFolderClick(item.name)}>
                📁 Abrir
              </button>
              <button className="mini-menu-item" onClick={() => { setMenuOpen(false); onDuplicate(item); }}>
                📋 Duplicar
              </button>
              <button className="mini-menu-item">📁 Mover</button>
              <button className="mini-menu-item" onClick={() => { setMenuOpen(false); onRename(item); }}>
                ✏️ Renombrar
              </button>
              <button className="mini-menu-item danger" onClick={() => { setMenuOpen(false); onDelete(item); }}>
                🗑️ Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  );
};

export default UserPanel;

// Sidebar Panel Component
const SidebarPanel = ({ file, onClose, user }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [editMode, setEditMode] = useState(false); // eslint-disable-line no-unused-vars
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
          // Edit mode for view action
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
          // Normal view mode
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

// File Viewer Modal Component
const FileViewerModal = ({ file, onClose, user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticatedUrl, setAuthenticatedUrl] = useState(null);
  const fileType = getFileType(file.name);

  const loadAuthenticatedPreview = useCallback(async () => {
    if (!canPreview(file.name)) {
      setLoading(false);
      return;
    }

    try {
      const url = await getAuthenticatedPreviewUrl(file.id, file.name);
      setAuthenticatedUrl(url);
      setLoading(false);
    } catch (error) {
      console.error('Error cargando preview autenticada:', error);
      setError('Error al cargar el archivo');
      setLoading(false);
    }
  }, [file.id, file.name]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadAuthenticatedPreview();
  }, [file, loadAuthenticatedPreview]);

  const handleDownload = () => {
    downloadFile(file.id, file.name);
  };

  const renderFileContent = () => {
    if (!authenticatedUrl && canPreview(file.name)) {
      return (
        <div className="viewer-content loading">
          <div className="loading-spinner"></div>
          <p>Cargando archivo...</p>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="viewer-content image-viewer">
            <img
              src={authenticatedUrl}
              alt={file.name}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError('Error al cargar la imagen');
                setLoading(false);
              }}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="viewer-content video-viewer">
            <video
              controls
              onLoadedData={() => setLoading(false)}
              onError={() => {
                setError('Error al cargar el video');
                setLoading(false);
              }}
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
            >
              <source src={authenticatedUrl} />
              Tu navegador no soporta el elemento de video.
            </video>
          </div>
        );

      case 'pdf':
        return (
          <div className="viewer-content pdf-viewer">
            <iframe
              src={authenticatedUrl}
              onLoad={() => setLoading(false)}
              onError={() => {
                setError('Error al cargar el PDF');
                setLoading(false);
              }}
              style={{ width: '100%', height: '70vh', border: 'none' }}
              title={file.name}
            />
          </div>
        );

      case 'text':
        return (
          <TextFileViewer
            fileId={file.id}
            fileName={file.name}
            onLoad={() => setLoading(false)}
            onError={(err) => {
              setError(err);
              setLoading(false);
            }}
          />
        );

      default:
        return (
          <div className="viewer-content unsupported">
            <div className="unsupported-content">
              <span className="file-icon-large">{getFileIcon(file.name)}</span>
              <p>Este tipo de archivo no se puede previsualizar</p>
              <p>Archivo: {file.name}</p>
              <p>Tamaño: {formatFileSize(file.size)}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glassmorphism-modal dark:bg-slate-800 rounded-lg shadow-2xl border-gray-200 dark:border-slate-600 w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{file.name}</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleDownload} className="p-2 text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200" title="Descargar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button onClick={onClose} className="p-2 text-gray-700 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200" title="Cerrar">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400">Cargando archivo...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button onClick={handleDownload} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200">
                Descargar archivo
              </button>
            </div>
          )}

          {!loading && !error && renderFileContent()}
        </div>
      </div>
    </div>
  );
};

// Text File Viewer Component
const TextFileViewer = ({ fileId, fileName, onLoad, onError }) => {
  const [content, setContent] = useState('');

  useEffect(() => {
    const loadTextFile = async () => {
      try {
        const token = localStorage.getItem('auth_token') || '';
        const response = await fetch(`/api/files/preview/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Error al cargar el archivo');

        const text = await response.text();
        setContent(text);
        onLoad();
      } catch (error) {
        onError('Error al cargar el archivo de texto');
      }
    };

    loadTextFile();
  }, [fileId, onLoad, onError]);

  return (
    <div className="glassmorphism-textarea dark:bg-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
      <pre className="text-sm text-gray-900 dark:text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
    </div>
  );
};

// Hover Preview Component
const HoverPreview = ({ file, preview }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [authenticatedUrl, setAuthenticatedUrl] = useState(null);

  const loadAuthenticatedPreview = useCallback(async () => {
    if (file && canPreview(file.name)) {
      try {
        const url = await getAuthenticatedPreviewUrl(file.id, file.name);
        setAuthenticatedUrl(url);
      } catch (error) {
        console.error('Error cargando preview autenticada:', error);
      }
    }
  }, [file]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    loadAuthenticatedPreview();
  }, [file, loadAuthenticatedPreview]);

  const renderPreview = () => {
    if (!file) return null;

    if (!authenticatedUrl) {
      return (
        <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg">
          <span className="text-2xl">{getFileIcon(file.name)}</span>
        </div>
      );
    }

    const fileType = getFileType(file.name);

    switch (fileType) {
      case 'image':
        return (
          <img
            src={authenticatedUrl}
            alt={file.name}
            className="w-16 h-16 object-cover rounded-lg shadow-sm"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        );

      case 'video':
        return (
          <video
            className="w-16 h-16 object-cover rounded-lg shadow-sm"
            muted
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => e.target.pause()}
          >
            <source src={authenticatedUrl} />
          </video>
        );

      case 'pdf':
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <span className="text-xl">📄</span>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg">
            <span className="text-2xl">{getFileIcon(file.name)}</span>
          </div>
        );
    }
  };

  if (!file) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none glassmorphism-preview dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 p-3 max-w-xs"
      style={{
        left: position.x + 10,
        top: position.y + 10,
      }}
    >
      {renderPreview()}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600">
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{file.name}</p>
        <p className="text-xs text-gray-700 dark:text-slate-400">{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
};