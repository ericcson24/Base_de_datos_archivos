import React, { useState, useEffect, useCallback } from 'react';
import FileEditorPanel from '../FileEditor/FileEditorPanel';
import RecentFileItem from './RecentFileItem';
import FileViewerModal from '../Modals/FileViewerModal';
import HoverPreview from './HoverPreview';
import CreateFolderModal from '../Modals/CreateFolderModal';
import RenameModal from '../Modals/RenameModal';
import MoveModal from '../Modals/MoveModal';
import ShareModal from '../Modals/ShareModal';
import DeleteConfirmationModal from '../Modals/DeleteConfirmationModal';
import SettingsModal from '../Modals/SettingsModal';
import SidebarPanel from './SidebarPanel';
import FileItem from './FileItem';
import { 
  getAuthToken, 
  downloadFile, 
  formatFileSize, 
  canPreview
} from '../../utils/fileUtils';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import './UserPanel.css';

const UserPanel = ({ user, onLogout, onBackToFolders, onThemeToggle, isDarkMode, onGoToCalendar }) => {
  console.log('UserPanel se está renderizando con user:', user);
  const { addToast } = useToast();
  const fetchWithNotify = useFetch();
  const { t } = useLanguage();

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('general');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Check for URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('settings') === 'true') {
      setShowSettingsModal(true);
      if (params.get('tab')) {
        setSettingsInitialTab(params.get('tab'));
      }
      if (params.get('status') === 'success') {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Show success message
        addToast(t('userPanel.microsoftLinkedSuccess'), 'success');
      }
    }
  }, []);

  // Estados para viewer y hover
  const [viewerFile, setViewerFile] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [hoveredFile, setHoveredFile] = useState(null);

  // Nuevos estados para redimensionamiento y panel lateral
  const [sidebarPanelOpen, setSidebarPanelOpen] = useState(false);
  const [sidebarPanelFile, setSidebarPanelFile] = useState(null);
  
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
  const [viewMode, setViewMode] = useState('grid'); // 'list', 'grid'

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

  // Funciones para búsqueda y ordenamiento
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleAISearch = (e) => {
    setAIQuery(e.target.value);
  };

  const submitAIQuery = async () => {
    if (!aiQuery.trim()) return;
    
    console.log('Consulta IA:', aiQuery);
    addToast(t('userPanel.aiComingSoon', { query: aiQuery }), 'info');
    
    setAIQuery('');
    setIsAIExpanded(false);
  };

  const validateFiles = (files) => {
    const maxFileSize = 100 * 1024 * 1024; // 100MB por archivo
    const maxTotalSize = 500 * 1024 * 1024; // 500MB total
    const invalidFiles = [];
    let totalSize = 0;

    for (let file of files) {
      if (file.size > maxFileSize) {
        invalidFiles.push(t('userPanel.fileTooBig', { name: file.name }));
      }
      totalSize += file.size;
    }

    if (totalSize > maxTotalSize) {
      invalidFiles.push(t('userPanel.totalSizeTooBig'));
    }

    return invalidFiles;
  };

  // useEffect para manejar clicks fuera de los menús
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Cerrar mini-menu-frosted si se hace click fuera
      if (uploadMenuOpen) {
        const uploadBtn = document.querySelector('.create-event-btn');
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
    
    if (currentView === 'shared' && currentPath.length === 0) {
      // Cargar lista de compartidos conmigo (raíz de compartidos)
      const response = await fetch('/api/files/shared-with-me', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      setFiles(data.files || []);
      return;
    }

    const queryParams = new URLSearchParams();
    if (currentPath.length > 0) {
      // currentPath contiene objetos carpeta, necesitamos sus nombres
      const pathString = currentPath.map(p => p.name).join('/');
      queryParams.append('path', pathString);
      
      // Si estamos navegando dentro de una carpeta compartida, necesitamos pasar el owner
      if (currentView === 'shared') {
        // El primer elemento del path debe tener la info del owner si venimos de la vista compartida
        // Pero currentPath se construye al navegar.
        // Necesitamos saber quién es el owner de la carpeta raíz compartida.
        // Una forma es guardar el owner en el estado currentPath o tener un estado separado.
        // Vamos a asumir que el primer elemento de currentPath tiene la propiedad 'owner' si es compartido.
        const rootShared = currentPath[0];
        if (rootShared && rootShared.owner) {
          queryParams.append('owner', rootShared.owner);
        }
      }
    }
    
    if (searchQuery) queryParams.append('search', searchQuery);
    queryParams.append('sortBy', sortBy);
    queryParams.append('order', sortOrder);

    const response = await fetch(`/api/files/list?${queryParams.toString()}`, {
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
}, [currentPath, searchQuery, sortBy, sortOrder, currentView]);

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
      addToast(t('userPanel.validationErrors') + '\n' + validationErrors.join('\n'), 'error');
      return;
    }

    try {
      setUploadProgress({ status: 'uploading', message: t('userPanel.uploadingFiles') });
      
      const formData = new FormData();
      
      // Agregar todos los archivos al FormData
      for (let file of files) {
        formData.append('files', file);
      }
      
      // Agregar el path actual
      formData.append('path', currentPath.map(p => p.name).join('/'));

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('userPanel.errorUploadingFiles'));
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      setUploadProgress({ status: 'success', message: t('userPanel.uploadSuccess', { count: files.length }) });
      addToast(t('userPanel.uploadSuccess', { count: files.length }), 'success');
      
      // Recargar archivos y recientes después de subir
      loadFiles();
      loadRecentFiles();
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setUploadProgress(null), 3000);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadProgress({ status: 'error', message: t('userPanel.uploadError', { error: error.message }) });
      addToast(t('userPanel.uploadError', { error: error.message }), 'error');
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => setUploadProgress(null), 5000);
    }
  }, [currentPath, loadFiles, loadRecentFiles]);

  const handleFolderUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    // Validar archivos
    const validationErrors = validateFiles(files);
    if (validationErrors.length > 0) {
      addToast(t('userPanel.validationErrors') + '\n' + validationErrors.join('\n'), 'error');
      return;
    }

    try {
      setUploadProgress({ status: 'uploading', message: t('userPanel.uploadingFolder') });
      
      let uploadedCount = 0;
      let failedCount = 0;
      
      // Procesar cada archivo de la carpeta
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', currentPath.map(p => p.name).join('/'));
        
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
            throw new Error(errorData.message || t('userPanel.errorUploadingFile'));
          }
          
          uploadedCount++;
          
          // Actualizar progreso
          setUploadProgress({ 
            status: 'uploading', 
            message: t('userPanel.uploadingFolderProgress', { current: uploadedCount, total: files.length }) 
          });
          
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          failedCount++;
        }
      }

      console.log(`Uploaded ${uploadedCount} files from folder, ${failedCount} failed`);
      
      if (failedCount === 0) {
        setUploadProgress({ status: 'success', message: t('userPanel.folderUploadSuccess', { count: uploadedCount }) });
        addToast(t('userPanel.folderUploadSuccess', { count: uploadedCount }), 'success');
      } else {
        setUploadProgress({ status: 'warning', message: t('userPanel.folderUploadPartial', { errors: failedCount }) });
        addToast(t('userPanel.folderUploadPartial', { errors: failedCount }), 'warning');
      }
      
      // Recargar archivos
      loadFiles();
      
      setTimeout(() => setUploadProgress(null), 3000);
      
    } catch (error) {
      console.error('Error uploading folder:', error);
      setUploadProgress({ status: 'error', message: t('userPanel.folderUploadError', { error: error.message }) });
      addToast(t('userPanel.folderUploadError', { error: error.message }), 'error');
      setTimeout(() => setUploadProgress(null), 5000);
    }
  }, [currentPath, loadFiles, addToast]);

  const handleCreateFile = useCallback(async (defaultName, type) => {
    const fileName = prompt(t('userPanel.fileNamePrompt'), defaultName);
    if (!fileName) return;

    try {
      const response = await fetch('/api/files/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          name: fileName,
          type: type,
          path: currentPath.map(p => p.name).join('/')
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t('userPanel.errorCreatingFile'));
      }

      loadFiles();
      setUploadMenuOpen(false);
      addToast(t('userPanel.fileCreatedSuccess'), 'success');
    } catch (error) {
      console.error('Error creating file:', error);
      addToast(t('userPanel.errorCreatingFile') + ': ' + error.message, 'error');
    }
  }, [currentPath, loadFiles, addToast]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      addToast(t('userPanel.enterFolderName'), 'warning');
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
          path: currentPath.map(p => p.name).join('/')
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setShowCreateFolderModal(false);
        setNewFolderName('');
        
        // Recargar archivos y recientes
        loadFiles();
        loadRecentFiles();
        addToast(t('userPanel.folderCreatedSuccess'), 'success');
      } else {
        addToast(t('userPanel.errorCreatingFolder') + ': ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      addToast(t('userPanel.errorCreatingFolder'), 'error');
    }
  };

  const handleDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(itemToDelete.id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        loadFiles(); // Recargar archivos
        loadRecentFiles(); // Recargar recientes
        addToast(t('userPanel.itemDeletedSuccess'), 'success');
      } else {
        addToast(t('userPanel.errorDeleting') + ': ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      addToast(t('userPanel.errorDeleting'), 'error');
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleRenameItem = async () => {
    if (!renameValue.trim()) {
      addToast(t('userPanel.enterNewName'), 'warning');
      return;
    }

    try {
      const response = await fetch(`/api/files/${encodeURIComponent(renameItem.id)}/rename`, {
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
        addToast(t('userPanel.itemRenamedSuccess'), 'success');
      } else {
        addToast(t('userPanel.errorRenaming') + ': ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error renaming item:', error);
      addToast(t('userPanel.errorRenaming'), 'error');
    }
  };

  const handleDuplicateItem = async (item) => {
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(item.id)}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        loadFiles(); // Recargar archivos
        addToast(t('userPanel.fileDuplicatedSuccess'), 'success');
      } else {
        addToast(t('userPanel.errorDuplicating') + ': ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error duplicating item:', error);
      addToast(t('userPanel.errorDuplicating'), 'error');
    }
  };

  const handleMoveItem = async (item, destinationPath) => {
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(item.id)}/move`, {
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
        addToast(t('userPanel.itemMovedSuccess'), 'success');
      } else {
        addToast(t('userPanel.errorMoving') + ': ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error moving item:', error);
      addToast(t('userPanel.errorMoving'), 'error');
    }
  };

  const handleShareItem = async (item, targetUsername) => {
    try {
      const response = await fetchWithNotify('/api/files/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          path: item.path,
          username: targetUsername
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Notification handled by backend
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error sharing item:', error);
      throw error;
    }
  };

  const openShareModal = (item) => {
    setShareItem(item);
    setShowShareModal(true);
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

  const navigateToFolder = (folder) => {
    setCurrentPath([...currentPath, { name: folder.name, owner: folder.owner }]);
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
        <div className="sidebar-header">
          <div className="logo-container">
            <img className="logo-img" src="/icons/nube.svg" alt="Nube" />
            <span>{t('userPanel.personalCloud')}</span>
          </div>
        </div>

        <div className="sidebar-content">
          <div className="upload-btn-container relative">
            <button
              className="create-event-btn"
              onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
              title={t('common.create')}
            >
              <span>+</span> {t('common.create')}
            </button>
            {uploadMenuOpen && (
              <div className={`mini-menu-frosted show absolute top-12 left-0 z-50 w-64`}>
                <button
                  className="mini-menu-item"
                  onClick={() => document.getElementById('fileInput').click()}
                >
                  {t('userPanel.uploadMenu.file')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => document.getElementById('folderInput').click()}
                >
                  {t('userPanel.uploadMenu.folder')}
                </button>
                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
                <button
                  className="mini-menu-item"
                  onClick={() => {
                    setShowCreateFolderModal(true);
                    setUploadMenuOpen(false);
                  }}
                >
                  {t('userPanel.uploadMenu.createFolder')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => {
                    handleCreateFile(t('userPanel.defaultFileName.text'), 'text');
                    setUploadMenuOpen(false);
                  }}
                >
                  {t('userPanel.uploadMenu.createDoc')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => {
                    handleCreateFile(t('userPanel.defaultFileName.word'), 'word');
                    setUploadMenuOpen(false);
                  }}
                >
                  {t('userPanel.uploadMenu.createWord')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => {
                    handleCreateFile(t('userPanel.defaultFileName.excel'), 'excel');
                    setUploadMenuOpen(false);
                  }}
                >
                  {t('userPanel.uploadMenu.createExcel')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => {
                    handleCreateFile(t('userPanel.defaultFileName.powerpoint'), 'powerpoint');
                    setUploadMenuOpen(false);
                  }}
                >
                  {t('userPanel.uploadMenu.createPowerPoint')}
                </button>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            <div className="section-title">{t('userPanel.navigation')}</div>
            <div className="category-list">
              <button
                className={`sidebar-btn ${currentView === 'privada' ? 'active' : ''}`}
                onClick={() => changeView('privada')}
              >
                {t('userPanel.myDrive')}
              </button>

              <button
                className={`sidebar-btn ${currentView === 'shared' ? 'active' : ''}`}
                onClick={() => changeView('shared')}
              >
                {t('userPanel.sharedWithMe')}
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-btn" onClick={onBackToFolders}>
            {t('common.back')}
          </button>
          <button className="sidebar-btn" onClick={() => {
            if (onGoToCalendar) {
              onGoToCalendar();
            }
          }}>
            {t('userPanel.calendar')}
          </button>
          <button className="sidebar-btn" onClick={() => setShowSettingsModal(true)}>
            {t('userPanel.settings')}
          </button>
          <button className="sidebar-btn" onClick={onLogout}>
            {t('userPanel.logout')}
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="main-panel">
        <div className="panel-header">
          <h1 className="panel-title">
            {currentView === 'privada' ? t('userPanel.myDrive') :
             currentView === 'public' ? t('userPanel.sharedGeneral') :
             currentView.startsWith('shared') ? t('userPanel.sharedFolder') :
             t('userPanel.files')}
          </h1>
        </div>

        {/* Contenedor flexible para file-grid y paneles */}
        <div className="main-content-container">
        
        <div 
          className={`file-grid ${isDragOver ? 'drag-over' : ''}`}
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
    ? 'w-80 h-11 rounded-xl shadow-lg pl-3 pr-10 justify-start'
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

  {/* Input */}
  <input
    type="text"
    placeholder={t('userPanel.searchPlaceholder')}
    value={searchQuery}
    onChange={handleSearch}
    onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
    onBlur={() => setIsSearchExpanded(false)}
    autoFocus={isSearchExpanded}
    className={`search-input absolute left-0 w-full h-full bg-transparent border-none outline-none text-[14px] flex items-center px-9 transition-all duration-300 ease-in-out ${
      isSearchExpanded
        ? 'opacity-100 translate-x-0 cursor-text'
        : 'opacity-0 -translate-x-5 pointer-events-none'
    }`}
    style={{ outline: 'none', boxShadow: 'none' }}
  />

  {/* Botón limpiar */}
  {isSearchExpanded && searchQuery && (
    <button
      onClick={(e) => {
        e.stopPropagation(); // evita cerrar el buscador
        setSearchQuery('');
      }}
      className="search-clear-btn absolute right-3 flex items-center justify-center w-6 h-6 rounded-full transition-colors duration-200"
      title={t('userPanel.clearSearch')}
    >
      <svg
        className="w-4 h-4"
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
                title={t('userPanel.aiChatbotTitle')}
              >
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

                <input
                  type="text"
                  placeholder={t('userPanel.aiPlaceholder')}
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

                {isAIExpanded && aiQuery && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      submitAIQuery();
                    }}
                    className="absolute right-3 flex items-center justify-center w-5 h-5 rounded-full transition-colors duration-200 text-purple-500 hover:text-purple-700"
                    title={t('userPanel.sendAIQuery')}
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
                  {t('userPanel.searchResults', { count: files.length })}
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
                  title={t('userPanel.sort.name')}
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
                  title={t('userPanel.sort.type')}
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
                  title={t('userPanel.sort.date')}
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
                title={t('userPanel.sortOrder', { order: sortOrder === 'asc' ? t('userPanel.sortAsc') : t('userPanel.sortDesc') })}
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
                  title={t('userPanel.view.list')}
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
                  title={t('userPanel.view.grid')}
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
                <span className="recent-icon"></span>
                <h3>{t('userPanel.recent')}</h3>
              </div>
              <button
                onClick={() => setShowRecentSection(false)}
                className="recent-close-btn"
                title={t('userPanel.hideRecent')}
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
                      downloadFile(file.id, file.name, t);
                    }
                  }}
                />
              ))}
              
              {/* Botón Ver todos rediseñado */}
              <div 
                className="recent-view-all"
                onClick={() => {
                  // TODO: Implementar vista completa de archivos recientes
                  console.log(t('userPanel.viewAllRecent'));
                }}
                title={t('userPanel.viewAllRecent')}
              >
                <div className="recent-view-all-content">
                  <div className="recent-view-all-icon"></div>
                  <span>{t('userPanel.viewAll')}</span>
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
                    {t('userPanel.recentFiles')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center text-gray-400 group-hover:text-blue-500 transition-colors">
                <span className="text-sm mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">{t('userPanel.show')}</span>
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
                  {uploadProgress.status === 'uploading' && ''}
                  {uploadProgress.status === 'success' && ''}
                  {uploadProgress.status === 'error' && ''}
                  {uploadProgress.status === 'warning' && ''}
                </span>
                <span className="upload-progress-message">{uploadProgress.message}</span>
              </div>
            </div>
          )}

          {/* Files and folders */}
          <div className={`files-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
            {loading ? (
              <div className="loading">{t('common.loading')}</div>
            ) : (
              <>
                {/* Back button */}
                {currentPath.length > 0 && (
                  <button className="back-btn" onClick={goBack}>
                    {t('common.back')}
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
                    onShare={openShareModal}
                    onDragStart={handleFileDragStart}
                    onDragEnd={handleFileDragEnd}
                    isHovered={hoveredFile?.id === item.id}
                    viewMode={viewMode}
                  />
                ))}

                {/* Empty state */}
                {getCurrentFiles().length === 0 && !loading && (
                  <div className="empty-state">
                    <span></span>
                    <p>
                      {searchQuery 
                        ? t('userPanel.noSearchResults', { query: searchQuery })
                        : t('userPanel.emptyFolder')
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

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareItem}
        item={shareItem}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          user={user}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
          initialTab={settingsInitialTab}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={executeDelete}
        itemName={itemToDelete ? itemToDelete.name : ''}
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
            <p className="text-base font-semibold">{t('userPanel.dropToView')}</p>
            <p className="text-xs opacity-75">{fileDragging?.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPanel;
