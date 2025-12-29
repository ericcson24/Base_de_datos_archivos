import React, { useState, useEffect, useCallback } from 'react';
import FileEditorPanel from '../FileEditor/FileEditorPanel';
import RecentFileItem from './RecentFileItem';
import FileViewerModal from '../Modals/FileViewerModal';
import HoverPreview from './HoverPreview';
import CreateFolderModal from '../Modals/CreateFolderModal';
import RenameModal from '../Modals/RenameModal';
import MoveModal from '../Modals/MoveModal';
import SidebarPanel from './SidebarPanel';
import FileItem from './FileItem';
import { 
  getAuthToken, 
  downloadFile, 
  formatFileSize, 
  canPreview
} from '../../utils/fileUtils';
import './UserPanel.css';

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
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveItem, setMoveItem] = useState(null);

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

  // Función para toggle del tema
  const toggleTheme = () => {
    onThemeToggle();
  };

  // Inicializar file-grid con ancho al 100% en píxeles
  useEffect(() => {
    const initializeFileGridWidth = () => {
      // Si hay paneles de edición abiertos, no forzar el ancho
      if (editorPanels.length > 0) return;

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
  }, [editorPanels.length]); // Dependencia añadida para recalcular si se cierran paneles

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

  // Función para validar archivos antes de subir
  // Nota: El backend también valida el tamaño, pero esto mejora la UX
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
    const queryParams = new URLSearchParams();
    if (currentPath.length > 0) {
      // currentPath contiene objetos carpeta, necesitamos sus nombres
      const pathString = currentPath.map(p => p.name).join('/');
      queryParams.append('path', pathString);
    }
    if (searchQuery) queryParams.append('search', searchQuery);
    queryParams.append('sortBy', sortBy);
    queryParams.append('order', sortOrder);

    const response = await fetch(`/api/files?${queryParams.toString()}`, {
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
}, [currentPath, searchQuery, sortBy, sortOrder]);

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
      console.log('Recent files loaded:', data);
      setRecentFiles(data.files || []);
    } else {
      console.error('Failed to load recent files:', response.status);
    }
  } catch (error) {
    console.error('Error loading recent files:', error);
  }
}, []);

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
      
      // Recargar archivos y recientes después de subir
      loadFiles();
      loadRecentFiles();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setUploadProgress(null), 3000);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadProgress({ status: 'error', message: '❌ Error al subir archivos: ' + error.message });
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => setUploadProgress(null), 5000);
    }
  }, [currentPath, loadFiles, loadRecentFiles]);

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
        
        // Recargar archivos y recientes
        loadFiles();
        loadRecentFiles();
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

  const handleMoveItem = async (item, destinationPath) => {
    try {
      const response = await fetch(`/api/files/${item.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          destinationPath: destinationPath
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setShowMoveModal(false);
        setMoveItem(null);
        loadFiles(); // Recargar archivos
        alert('Elemento movido exitosamente');
      } else {
        alert('Error al mover: ' + result.message);
      }
    } catch (error) {
      console.error('Error moving item:', error);
      alert('Error al mover');
    }
  };

  const openRenameModal = (item) => {
    setRenameItem(item);
    setRenameValue(item.name);
    setShowRenameModal(true);
  };

  const openMoveModal = (item) => {
    setMoveItem(item);
    setShowMoveModal(true);
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
    return files;
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
                 Subir carpeta
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
            width: editorPanels.length > 0 ? '50%' : fileGridSize.width,
            height: fileGridSize.height,
            position: (isDragging || fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? 'absolute' : 'relative',
            left: (isDragging || fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? `${fileGridPosition.x}px` : 'auto',
            top: (isDragging || fileGridPosition.x !== 0 || fileGridPosition.y !== 0) ? `${fileGridPosition.y}px` : 'auto',
            zIndex: isDragging ? 1000 : 1,
            transition: 'width 0.3s ease-in-out'
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
                  {files.length} resultado{files.length !== 1 ? 's' : ''}
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
          <div className="mb-6 w-full px-1">
            <button
              onClick={() => setShowRecentSection(true)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-gray-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Archivos Recientes
                  </span>
                </div>
              </div>
              
              <div className="flex items-center text-gray-400 group-hover:text-blue-500 transition-colors">
                <span className="text-sm mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">Mostrar</span>
                <svg className="w-5 h-5 transform group-hover:translate-y-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
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
          {/* Move Handle - Only show if no editor panels are open */}
          {editorPanels.length === 0 && (
            <div 
              className="move-handle"
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            ></div>
          )}

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
                    onMove={openMoveModal}
                    onView={openFileViewer}
                    onHover={handleFileHover}
                    onLeave={handleFileLeave}
                    onOpenSidebar={openSidebarPanel}
                    onEdit={openEditorPanel}
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

          {/* Resize Handle - Only show if no editor panels are open */}
          {editorPanels.length === 0 && (
            <div 
              className="resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'resize')}
            ></div>
          )}
        </div>

        {/* Editor Panels Container - Al lado del file-grid */}
        {editorPanels.length > 0 && (
          <div className="editor-panels-container flex-1 flex flex-col gap-4 overflow-y-auto p-4 transition-all duration-300">
            {editorPanels.map(panel => (
              <div key={panel.id} className="editor-panel-inline glassmorphism rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 h-full">
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
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        renameItem={renameItem}
        renameValue={renameValue}
        setRenameValue={setRenameValue}
        handleRenameItem={handleRenameItem}
      />

      {/* Move Modal */}
      <MoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        itemToMove={moveItem}
        onMove={handleMoveItem}
      />

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

export default UserPanel;
