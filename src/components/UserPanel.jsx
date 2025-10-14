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
  const [initialPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Estado para mostrar límites de arrastre
  const [showDragBounds, setShowDragBounds] = useState(false);
  const [dragBounds, setDragBounds] = useState({ top: 0, left: 0, right: 0, bottom: 0 });

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

  // Función para toggle del tema
  const toggleTheme = () => {
    onThemeToggle();
  };

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
  }, [currentPath, loadFiles]);

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
      
      const panelHeaderHeight = panelHeader.offsetHeight;
      const availableTop = panelHeaderHeight + topMargin;
      const totalAvailableHeight = mainPanel.offsetHeight - panelHeaderHeight - storageBarHeight - topMargin - bottomMargin;
      
      // Límites CONSTANTES - el área completa disponible
      const bounds = {
        top: availableTop,
        left: 0,
        right: mainPanel.offsetWidth,
        bottom: availableTop + totalAvailableHeight
      };
      
      setDragBounds(bounds);
      
      // Obtener posición actual del file-grid
      const fileGridRect = fileGrid.getBoundingClientRect();
      const mainPanelRect = mainPanel.getBoundingClientRect();
      
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
      
      let newX = topLeftX;
      let newY = topLeftY;
      let newWidth = currentWidth;
      let newHeight = currentHeight;
      
      // AJUSTE HORIZONTAL
      if (topLeftX < dragBounds.left) {
        // Se sale por la izquierda
        newX = dragBounds.left;
        // Calcular nuevo ancho: desde el límite izquierdo hasta donde terminaría el grid
        const potentialWidth = currentWidth - (dragBounds.left - topLeftX);
        newWidth = Math.max(minWidthPx, potentialWidth);
      } else if (topLeftX + currentWidth > dragBounds.right) {
        // Se sale por la derecha
        newX = topLeftX;
        // Calcular nuevo ancho disponible desde la posición actual hasta el límite derecho
        const availableWidth = dragBounds.right - topLeftX;
        newWidth = Math.max(minWidthPx, availableWidth);
      } else {
        // Dentro de límites horizontales
        newX = topLeftX;
        newWidth = currentWidth;
      }
      
      // AJUSTE VERTICAL
      if (topLeftY < dragBounds.top) {
        // Se sale por arriba
        newY = dragBounds.top;
        // Calcular nueva altura: desde el límite superior hasta donde terminaría el grid
        const potentialHeight = currentHeight - (dragBounds.top - topLeftY);
        newHeight = Math.max(minHeightPx, potentialHeight);
      } else if (topLeftY + currentHeight > dragBounds.bottom) {
        // Se sale por abajo
        newY = topLeftY;
        // Calcular nueva altura disponible desde la posición actual hasta el límite inferior
        const availableHeight = dragBounds.bottom - topLeftY;
        newHeight = Math.max(minHeightPx, availableHeight);
      } else {
        // Dentro de límites verticales
        newY = topLeftY;
        newHeight = currentHeight;
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
          <button className="acciones-btn" onClick={() => window.location.href = 'http://localhost:3000/calendar'}>
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
            zIndex: isDragging ? 1000 : 'auto'
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
  className={`relative flex items-center overflow-hidden transition-all duration-300 ease-in-out border cursor-text ${
    isDarkMode
      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
      : 'bg-white border-gray-300 hover:bg-gray-100'
  } ${isSearchExpanded
    ? 'w-72 h-9 rounded-lg shadow-md pl-3 pr-8 justify-start'
    : 'w-12 h-12 rounded-full justify-center'
  }`}
>
  {/* 🔍 Icono */}
  <svg
    className={`text-gray-500 transition-all duration-300 ease-in-out ${
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
    className={`absolute left-0 w-full h-full bg-transparent border-none outline-none text-[14px] flex items-center px-8 transition-all duration-300 ease-in-out ${
      isSearchExpanded
        ? 'opacity-100 translate-x-0 cursor-text'
        : 'opacity-0 -translate-x-5 pointer-events-none'
    } ${
      isDarkMode
        ? 'text-slate-100 placeholder-slate-400'
        : 'text-gray-900 placeholder-gray-500'
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
      className={`absolute right-3 flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-200 ${
        isDarkMode
          ? 'text-slate-500 hover:text-slate-300'
          : 'text-gray-400 hover:text-gray-600'
      }`}
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
    </div>
  );
};

// File Item Component
const FileItem = ({ item, onFolderClick, onDelete, onRename, onView, onHover, onLeave, isHovered, onOpenSidebar, onDuplicate, viewMode = 'list' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // useEffect para manejar clicks fuera del menú
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      const menuBtn = document.querySelector('.menu-trespuntos');
      const menuPopup = document.querySelector('.menu-popup');
      
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
        downloadFile(item.id, item.name);
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
          className={`group relative glassmorphism dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-gray-200 dark:border-slate-600 overflow-hidden ${isHovered ? 'ring-2 ring-blue-500' : ''}`}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Thumbnail */}
          <div className="aspect-square p-4 flex items-center justify-center bg-gray-50 dark:bg-black">
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
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate" title={item.name}>
              {item.name}
            </h3>
            <p className="text-xs text-gray-700 dark:text-slate-400 mt-1">
              {item.size ? formatFileSize(item.size) : ''}
            </p>
          </div>

          {/* Menu Button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              className="p-1.5 glassmorphism-button rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-110"
              onClick={handleMenuClick}
            >
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>

          {/* Menu Popup */}
          {menuOpen && (
            <div className="absolute top-12 right-2 z-50 glassmorphism-strong rounded-lg shadow-xl border-gray-200 py-2 min-w-48 animate-fade-in">
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'view'); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Abrir en panel</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'edit'); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar en panel</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onOpenSidebar(item, 'info'); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Información</span>
              </button>
              {canShowPreview ? (
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onView(item); }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Ver completo</span>
                </button>
              ) : (
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Ver</span>
                </button>
              )}
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Descargar</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onDuplicate(item); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Duplicar</span>
              </button>
              <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onRename(item); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Renombrar</span>
              </button>
              <button className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onDelete(item); }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Eliminar</span>
              </button>
            </div>
          )}
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
                  <button className="mini-menu-item" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
                    👁 Ver
                  </button>
                )}
                <button className="mini-menu-item" onClick={() => { setMenuOpen(false); downloadFile(item.id, item.name); }}>
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
  }

  return (
    viewMode === 'grid' ? (
      // Grid View for Folders
      <div
        className="group relative glassmorphism-light backdrop-blur-md rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-gray-200/50 overflow-hidden"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Folder Icon */}
        <div className="aspect-square p-6 flex items-center justify-center glassmorphism-thumbnail">
          <div className="text-6xl">📁</div>
        </div>

        {/* Folder Info */}
        <div className="p-3 glassmorphism">
          <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate" title={item.name}>
            {item.name}
          </h3>
          {item.shared && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 mt-1">
              <span className="mr-1">🤝</span>
              Compartida
            </span>
          )}
        </div>

        {/* Menu Button */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className="p-1.5 glassmorphism-button dark:bg-slate-700 rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-110"
            onClick={handleMenuClick}
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>

        {/* Menu Popup */}
        {menuOpen && (
          <div className="absolute top-12 right-2 z-50 glassmorphism-strong dark:bg-slate-800 rounded-lg shadow-xl border-gray-200 dark:border-slate-600 py-2 min-w-48 animate-fade-in">
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => onFolderClick(item.name)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              <span>Abrir</span>
            </button>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onDuplicate(item); }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Duplicar</span>
            </button>
            <div className="border-t border-gray-200 dark:border-slate-600 my-1"></div>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onRename(item); }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Renombrar</span>
            </button>
            <button className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-150 flex items-center space-x-2" onClick={() => { setMenuOpen(false); onDelete(item); }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Eliminar</span>
            </button>
          </div>
        )}
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