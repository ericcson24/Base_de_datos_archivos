import React, { useState, useEffect, useCallback } from 'react';
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
  const name = filename.toLowerCase();

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

const getPreviewUrl = (fileId, filename) => {
  const type = getFileType(filename);
  if (type === 'image') return `/api/files/preview/${fileId}`;
  if (type === 'video') return `/api/files/preview/${fileId}`;
  if (type === 'pdf') return `/api/files/preview/${fileId}`;
  return null;
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

const UserPanel = ({ user, onLogout, onBackToFolders }) => {
  console.log('🎯 UserPanel se está renderizando con user:', user);

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
  const [fileGridSize, setFileGridSize] = useState({ width: '70%', height: '70vh' });
  const [fileGridPosition, setFileGridPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  const [initialMouse, setInitialMouse] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [fileGridWidth, setFileGridWidth] = useState(0);

  // Estados para drag and drop
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  
  // Estado para progreso de subida
  const [uploadProgress, setUploadProgress] = useState(null);

  // Estado para el tema
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Cargar preferencia del localStorage
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });  // Aplicar tema cuando cambia
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Estados para búsqueda y ordenamiento
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'type', 'date'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // Función para toggle del tema
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Funciones para búsqueda y ordenamiento
  const toggleSearch = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery('');
    }
  };

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
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          // Carpetas primero, luego por tipo de archivo
          if (a.type === 'folder' && b.type !== 'folder') return -1;
          if (a.type !== 'folder' && b.type === 'folder') return 1;
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

  // Función para cerrar todos los menús
  const closeAllMenus = () => {
    setUploadMenuOpen(false);
    setSharedDropdownOpen(false);
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [uploadMenuOpen, sharedDropdownOpen, isSearchExpanded]);

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
}, [currentView, currentPath, loadFiles, loadSharedFolders]);

  const handleFileUpload = async (files) => {
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
  };

  const handleFolderUpload = async (files) => {
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
  };

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
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

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
  }, []);

  // Funciones para redimensionamiento y movimiento del file-grid
  const handleMouseDown = (e, action) => {
    e.preventDefault();
    const fileGrid = e.currentTarget.closest('.file-grid');
    const rect = fileGrid.getBoundingClientRect();

    if (action === 'move') {
      setIsDragging(true);
      setInitialMouse({ x: e.clientX, y: e.clientY });
      setInitialPosition({ x: rect.left, y: rect.top });
      setFileGridWidth(rect.width);
    } else if (action === 'resize') {
      setIsResizing(true);
      // Guardar tamaño inicial y posición del mouse
      const currentWidth = fileGrid.offsetWidth;
      const currentHeight = fileGrid.offsetHeight;
      setInitialSize({ width: currentWidth, height: currentHeight });
      setInitialMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const deltaY = e.clientY - initialMouse.y;
      const deltaX = e.clientX - initialMouse.x;
      const newX = initialPosition.x + deltaX;
      const newY = initialPosition.y + deltaY;
      setFileGridPosition({ x: newX, y: newY });
    } else if (isResizing) {
      // Calcular nuevo tamaño basado en la diferencia desde el mouse inicial
      const deltaX = e.clientX - initialMouse.x;
      const deltaY = e.clientY - initialMouse.y;
      
      const newWidth = Math.max(200, initialSize.width + deltaX);
      const maxHeight = window.innerHeight * 0.98; // Aumentar máximo a 95% de la altura de la ventana
      const newHeight = Math.min(maxHeight, Math.max(200, initialSize.height + deltaY));
      
      setFileGridSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
    }
  }, [isDragging, isResizing, initialMouse, initialPosition, initialSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    // Convertir posición absoluta a relativa al contenedor cuando se suelta el movimiento
    if (isDragging && (fileGridPosition.x !== 0 || fileGridPosition.y !== 0)) {
      const container = document.querySelector('.main-panel');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const containerStyles = window.getComputedStyle(container);
        const paddingLeft = parseFloat(containerStyles.paddingLeft);
        const paddingTop = parseFloat(containerStyles.paddingTop);
        
        // Calcular posición relativa al área de contenido del main-panel
        const relativeX = fileGridPosition.x - (containerRect.left + paddingLeft);
        const relativeY = fileGridPosition.y - (containerRect.top + paddingTop);
        
        setFileGridPosition({
          x: Math.max(0, relativeX),
          y: Math.max(0, relativeY)
        });
      }
    }
  }, [isDragging, fileGridPosition]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
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

        {/* Upload Button */}
        <div className="upload-btn-wrapper">
          <button
            className="upload-btn"
            onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
          >
            <span>⬆️</span> Subir
          </button>
          {uploadMenuOpen && (
            <div className="mini-menu-frosted">
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
                📁 Subir carpeta
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

        {/* Navigation */}
        <div className="sidebar-nav">
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
          <button className="acciones-btn" onClick={() => window.open('/calendar', '_blank')}>
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

        <div 
          className={`file-grid ${isDragOver ? 'drag-over' : ''}`}
          style={{
            width: fileGridSize.width,
            height: fileGridSize.height,
            position: isDragging ? 'fixed' : (fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? 'absolute' : 'relative',
            left: isDragging ? fileGridPosition.x : (fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? `${fileGridPosition.x}px` : 'auto',
            top: isDragging ? fileGridPosition.y : (fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? `${fileGridPosition.y}px` : 'auto',
            zIndex: isDragging ? 1000 : 'auto'
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
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

          {/* Search and Sort Controls */}
          <div className="search-sort-container">
            <div className="search-container">
              <button
                className={`search-btn ${isSearchExpanded ? 'active' : ''} ${searchQuery ? 'has-query' : ''}`}
                onClick={toggleSearch}
                title={searchQuery ? `Búsqueda activa: "${searchQuery}"` : "Buscar archivos"}
              >
                🔍
              </button>
              <input
                type="text"
                className={`search-input ${isSearchExpanded ? 'expanded' : ''}`}
                placeholder="Buscar archivos..."
                value={searchQuery}
                onChange={handleSearch}
                onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
              />
            </div>

            <div className="sort-buttons">
              <button
                className={`sort-btn ${sortBy === 'name' ? 'active' : ''} ${sortBy === 'name' ? sortOrder : ''}`}
                onClick={() => handleSort('name')}
                title="Ordenar por nombre"
              >
                📝
              </button>
              <button
                className={`sort-btn ${sortBy === 'type' ? 'active' : ''} ${sortBy === 'type' ? sortOrder : ''}`}
                onClick={() => handleSort('type')}
                title="Ordenar por tipo"
              >
                📁
              </button>
              <button
                className={`sort-btn ${sortBy === 'date' ? 'active' : ''} ${sortBy === 'date' ? sortOrder : ''}`}
                onClick={() => handleSort('date')}
                title="Ordenar por fecha"
              >
                📅
              </button>
            </div>
          </div>

          {/* Search Results Indicator */}
          {searchQuery && (
            <div style={{
              position: 'absolute',
              top: '50px',
              left: '10px',
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              color: 'var(--panel-text)',
              backdropFilter: 'blur(10px)',
              zIndex: 15,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>🔍 {filteredFiles().length} resultado{filteredFiles().length !== 1 ? 's' : ''} para "{searchQuery}"</span>
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--panel-secondary-text)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '0',
                  lineHeight: 1
                }}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            </div>
          )}

          {/* Resize Handle */}
          <div 
            className="resize-handle"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
          ></div>

          {/* Files and folders */}
          <div className="files-container">
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
                    isHovered={hoveredFile?.id === item.id}
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
        </div>
      </div>

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
        <div className="modal-overlay" onClick={() => setShowCreateFolderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Nueva Carpeta</h3>
            <input
              type="text"
              placeholder="Nombre de la carpeta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => setShowCreateFolderModal(false)}>Cancelar</button>
              <button onClick={handleCreateFolder}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Renombrar {renameItem?.type === 'folder' ? 'Carpeta' : 'Archivo'}</h3>
            <input
              type="text"
              placeholder="Nuevo nombre"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRenameItem()}
              autoFocus
            />
            <div className="modal-buttons">
              <button onClick={() => setShowRenameModal(false)}>Cancelar</button>
              <button onClick={handleRenameItem}>Renombrar</button>
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
    </div>
  );
};

// File Item Component
const FileItem = ({ item, onFolderClick, onDelete, onRename, onView, onHover, onLeave, isHovered, onOpenSidebar, onDuplicate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // useEffect para manejar clicks fuera del menú
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      const menuBtn = event.currentTarget.closest('.menu-container')?.querySelector('.menu-trespuntos');
      const menuPopup = event.currentTarget.closest('.menu-container')?.querySelector('.menu-popup');
      
      if (menuBtn && menuPopup && !menuBtn.contains(event.target) && !menuPopup.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleClick = () => {
    if (item.type === 'folder') {
      onFolderClick(item.name);
    } else {
      // Si se puede previsualizar, abrir viewer, sino descargar
      if (canPreview(item.name)) {
        onView(item);
      } else {
        window.open(getAuthenticatedUrl(`/api/files/download/${item.id}?download=true`), '_blank');
      }
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
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

  const loadPreview = async () => {
    setPreviewLoading(true);
    try {
      const url = await getAuthenticatedPreviewUrl(item.id, item.name);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error cargando preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    // Cargar preview automáticamente para archivos que se pueden previsualizar
    if (item.type === 'file' && canPreview(item.name) && !previewUrl && !previewLoading) {
      loadPreview();
    }
  }, [item.id, item.name]);

  if (item.type === 'file') {
    const fileType = getFileType(item.name);
    const canShowPreview = canPreview(item.name);

    return (
      <div
        className={`drive-file-row ${isHovered ? 'hovered' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="thumbnail">
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
          {menuOpen && (
            <div className={`mini-menu-frosted ${menuOpen ? 'show' : ''}`}>
              <button className="mini-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'view'); }}>
                👁 Abrir en panel
              </button>
              <button className="mini-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'edit'); }}>
                ✏️ Editar en panel
              </button>
              <button className="mini-menu-item" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
                ℹ️ Información
              </button>
              {canShowPreview ? (
                <button className="mini-menu-item" onClick={() => { setMenuOpen(false); onView(item); }}>
                  👁 Ver completo
                </button>
              ) : (
                <button className="mini-menu-item" onClick={() => window.open(getAuthenticatedUrl(`/api/files/download/${item.id}?download=true`), '_blank')}>
                  👁 Ver
                </button>
              )}
              <button className="mini-menu-item" onClick={() => window.open(getAuthenticatedUrl(`/api/files/download/${item.id}?download=true`), '_blank')}>
                ⬇️ Descargar
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
    );
  }

  return (
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
  );
};

export default UserPanel;

// Sidebar Panel Component
const SidebarPanel = ({ file, onClose, user }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [authenticatedUrl, setAuthenticatedUrl] = useState(null);

  const fileType = getFileType(file.name);
  const canEdit = ['text', 'json', 'xml', 'html', 'css', 'js', 'py', 'java', 'cpp', 'c', 'php'].includes(fileType);

  useEffect(() => {
    if (file.action === 'view' || file.action === 'edit') {
      loadFileContent();
      loadAuthenticatedPreview();
    }
  }, [file]);

  const loadFileContent = async () => {
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
  };

  const loadAuthenticatedPreview = async () => {
    if (!canPreview(file.name)) return;

    try {
      const url = await getAuthenticatedPreviewUrl(file.id, file.name);
      setAuthenticatedUrl(url);
    } catch (error) {
      console.error('Error cargando preview autenticada:', error);
    }
  };

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
      setEditMode(false);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error al guardar el archivo');
    }
  };

  const handleDownload = () => {
    window.open(getAuthenticatedUrl(`/api/files/download/${file.id}?download=true`), '_blank');
  };

  const renderPanelContent = () => {
    switch (file.action) {
      case 'view':
        return (
          <div className="panel-file-preview">
            {fileType === 'image' && authenticatedUrl && (
              <img
                src={authenticatedUrl}
                alt={file.name}
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
              />
            )}
            {fileType === 'video' && authenticatedUrl && (
              <video
                controls
                style={{ maxWidth: '100%', maxHeight: '300px' }}
              >
                <source src={authenticatedUrl} />
              </video>
            )}
            {fileType === 'pdf' && authenticatedUrl && (
              <iframe
                src={authenticatedUrl}
                style={{ width: '100%', height: '400px', border: 'none' }}
                title={file.name}
              />
            )}
            {(fileType === 'text' || canEdit) && (
              <div className="text-viewer">
                <pre className="text-content" style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {loading ? 'Cargando...' : content}
                </pre>
              </div>
            )}
            {!canPreview(file.name) && (
              <div className="unsupported-content">
                <span className="file-icon-large">{getFileIcon(file.name)}</span>
                <p>Este archivo no se puede previsualizar en el panel</p>
              </div>
            )}
          </div>
        );

      case 'edit':
        return (
          <div className="panel-file-preview">
            {canEdit ? (
              <div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{
                    width: '100%',
                    height: '400px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    padding: '1rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    resize: 'vertical'
                  }}
                />
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleSave} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                    💾 Guardar
                  </button>
                  <button onClick={() => setEditMode(false)} style={{ background: '#f44336', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                    ❌ Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="unsupported-content">
                <p>Este tipo de archivo no se puede editar</p>
              </div>
            )}
          </div>
        );

      case 'info':
      default:
        return (
          <div className="panel-file-info">
            <h4>Información del archivo</h4>
            <p><strong>Nombre:</strong> {file.name}</p>
            <p><strong>Tamaño:</strong> {formatFileSize(file.size)}</p>
            <p><strong>Tipo:</strong> {fileType.toUpperCase()}</p>
            <p><strong>Fecha:</strong> {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Desconocida'}</p>
            <p><strong>ID:</strong> {file.id}</p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="sidebar-panel-overlay show" onClick={onClose}></div>
      <div className="sidebar-panel open">
        <div className="sidebar-panel-header">
          <h3>{file.name}</h3>
          <div className="sidebar-panel-actions">
            {file.action === 'view' && canEdit && (
              <button
                className="sidebar-close-btn"
                onClick={() => setEditMode(true)}
                style={{ background: 'rgba(33, 150, 243, 0.1)', color: '#2196f3' }}
                title="Editar"
              >
                ✏️
              </button>
            )}
            <button
              className="sidebar-close-btn"
              onClick={handleDownload}
              title="Descargar"
            >
              ⬇️
            </button>
            <button
              className="sidebar-close-btn"
              onClick={onClose}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="sidebar-panel-content">
          {renderPanelContent()}

          <div className="panel-file-actions">
            <button className="panel-action-btn" onClick={handleDownload}>
              ⬇️ Descargar archivo
            </button>
            <button className="panel-action-btn" onClick={() => window.open(getAuthenticatedUrl(`/api/files/preview/${file.id}`), '_blank')}>
              🔗 Abrir en nueva ventana
            </button>
            <button className="panel-action-btn danger" onClick={onClose}>
              ❌ Cerrar panel
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadAuthenticatedPreview();
  }, [file]);

  const loadAuthenticatedPreview = async () => {
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
  };

  const handleDownload = () => {
    window.open(getAuthenticatedUrl(`/api/files/download/${file.id}?download=true`), '_blank');
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
    <div className="modal-overlay file-viewer-overlay" onClick={onClose}>
      <div className="file-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <h3>{file.name}</h3>
          <div className="viewer-actions">
            <button onClick={handleDownload} className="download-btn">
              ⬇️ Descargar
            </button>
            <button onClick={onClose} className="close-btn">
              ✕
            </button>
          </div>
        </div>

        <div className="viewer-body">
          {loading && (
            <div className="viewer-loading">
              <div className="loading-spinner"></div>
              <p>Cargando archivo...</p>
            </div>
          )}

          {error && (
            <div className="viewer-error">
              <p>❌ {error}</p>
              <button onClick={handleDownload}>Descargar archivo</button>
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
    <div className="viewer-content text-viewer">
      <pre className="text-content">{content}</pre>
    </div>
  );
};

// Hover Preview Component
const HoverPreview = ({ file, preview }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [authenticatedUrl, setAuthenticatedUrl] = useState(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const loadAuthenticatedPreview = async () => {
      if (file && canPreview(file.name)) {
        try {
          const url = await getAuthenticatedPreviewUrl(file.id, file.name);
          setAuthenticatedUrl(url);
        } catch (error) {
          console.error('Error cargando preview autenticada:', error);
        }
      }
    };

    loadAuthenticatedPreview();
  }, [file?.id, file?.name]);

  const renderPreview = () => {
    if (!file) return null;

    if (!authenticatedUrl) {
      return (
        <div className="file-preview">
          <span>{getFileIcon(file.name)}</span>
          <p>{file.name}</p>
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
            style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        );

      case 'video':
        return (
          <video
            style={{ maxWidth: '200px', maxHeight: '200px' }}
            muted
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => e.target.pause()}
          >
            <source src={authenticatedUrl} />
          </video>
        );

      case 'pdf':
        return (
          <div className="pdf-preview">
            <span>📄</span>
            <p>PDF Preview</p>
          </div>
        );

      default:
        return (
          <div className="file-preview">
            <span>{getFileIcon(file.name)}</span>
            <p>{file.name}</p>
          </div>
        );
    }
  };

  if (!file) return null;

  return (
    <div
      className="hover-preview"
      style={{
        left: position.x + 10,
        top: position.y + 10,
        pointerEvents: 'none'
      }}
    >
      {renderPreview()}
      <div className="preview-info">
        <p className="preview-filename">{file.name}</p>
        <p className="preview-size">{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
};