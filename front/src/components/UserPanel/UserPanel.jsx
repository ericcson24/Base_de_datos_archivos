import React, { useState, useEffect, useCallback, useRef } from 'react';
import FileEditorPanel from '../FileEditor/FileEditorPanel';
import RecentFileItem from './RecentFileItem';
import UploadPopup from './UploadPopup';
import FileViewerModal from '../Modals/FileViewerModal';
import CreateFolderModal from '../Modals/CreateFolderModal';
import FolderCustomizeModal from '../Modals/FolderCustomizeModal';
import RenameModal from '../Modals/RenameModal';
import MoveModal from '../Modals/MoveModal';
import ShareModal from '../Modals/ShareModal';
import FileDeleteModal from '../Modals/FileDeleteModal';
import DuplicateFilesModal from '../Modals/DuplicateFilesModal';
import SettingsModal from '../Modals/SettingsModal';
import RDPViewer from '../RDP/RDPViewer';
import RDPConnectionModal from '../Modals/RDPConnectionModal';
import AIResultsModal from '../Modals/AIResultsModal';
import CreateFileModal from '../Modals/CreateFileModal';
import SidebarPanel from './SidebarPanel';
import FileItem from './FileItem';
import NotificationCenter from '../Common/NotificationCenter';
import { FiHardDrive, FiUsers, FiArrowLeft, FiCalendar, FiMonitor, FiSettings, FiLogOut, FiLayout } from 'react-icons/fi';
import { 
  getAuthToken, 
  downloadFile, 
  canPreview,
  canEdit
} from '../../utils/fileUtils';
import { useFetch } from '../../hooks/useFetch';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import './UserPanel.css';
import './UserPanelDesktop.css';
import './UserPanelMobile.css';

const UserPanel = ({ user, onLogout, onBackToFolders, onThemeToggle, isDarkMode, onGoToCalendar, onGoToRemote, onUserUpdate }) => {
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
  const [showRDPViewer, setShowRDPViewer] = useState(false);
  const [showRDPModal, setShowRDPModal] = useState(false);
  const [rdpConnectionId, setRdpConnectionId] = useState(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [customizeFolder, setCustomizeFolder] = useState(null);

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
    
    // Check for initialView prop
    // if (initialView === 'remote') {
    //   setShowRDPModal(true);
    // }
  }, []);

  // Listener para abrir editor desde el modal
  useEffect(() => {
    const handleOpenEditor = (event) => {
      openEditorPanel(event.detail);
    };

    window.addEventListener('openEditorPanel', handleOpenEditor);
    return () => {
      window.removeEventListener('openEditorPanel', handleOpenEditor);
    };
  }, []);

  // Estados para viewer
  const [viewerFile, setViewerFile] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);

  // Nuevos estados para redimensionamiento y panel lateral
  const [sidebarPanelOpen, setSidebarPanelOpen] = useState(false);
  const [sidebarPanelFile, setSidebarPanelFile] = useState(null);
  
  // Z-index para file-grid (inicia en 1, paneles en 10+)
  
  // Estados para drag and drop
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Estado para progreso de subida (popup estilo Google Drive)
  const [uploads, setUploads] = useState([]);
  const uploadIdRef = useRef(0);
  const xhrMapRef = useRef({});
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Estado para modal de archivos duplicados
  const [duplicateModalData, setDuplicateModalData] = useState(null);

  // Ref para acceder a la lista de archivos actual dentro de callbacks
  const filesRef = useRef([]);
  useEffect(() => { filesRef.current = files; }, [files]);

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
  const [backBtnDragOver, setBackBtnDragOver] = useState(false);

  // Estados para archivos recientes y IA
  const [recentFiles, setRecentFiles] = useState([]);
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  const [aiQuery, setAIQuery] = useState('');
  const [showAIResults, setShowAIResults] = useState(false);
  const [aiResultsData, setAIResultsData] = useState(null);
  const [showRecentSection, setShowRecentSection] = useState(true);
  const [indexingStatus, setIndexingStatus] = useState(null);
  const [isAILoading, setIsAILoading] = useState(false);

  // Estados para modal de crear archivo
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [createFileDefaultName, setCreateFileDefaultName] = useState('');
  const [createFileType, setCreateFileType] = useState('');

  // Check indexing status when AI is expanded
  useEffect(() => {
    if (!isAIExpanded) return;

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/ai/indexing-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setIndexingStatus(data);
        }
      } catch (err) {
        console.error('Error checking indexing status:', err);
      }
    };

    checkStatus();
    // Only keep polling while the index is actively building; once ready, a single check is enough.
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/ai/indexing-status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setIndexingStatus(data);
          // Stop polling once index is ready and not actively building
          if (data.isIndexed && !data.isBuilding) {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error checking indexing status:', err);
      }
    }, 15000); // poll at most every 15s
    return () => clearInterval(interval);
  }, [isAIExpanded]);

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
    setIsAILoading(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      // Usar el endpoint real de búsqueda de AI
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: aiQuery })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
           setAIResultsData(data);
           setShowAIResults(true);
           setAIQuery('');
           setIsAIExpanded(false);
        } else {
           addToast(data.response || 'No se encontraron resultados', 'info');
        }
      } else {
        addToast('Error al conectar con el servicio de IA', 'error');
      }
    } catch (error) {
      console.error('Error AI search:', error);
      addToast('Error al procesar la consulta', 'error');
    } finally {
      setIsAILoading(false);
    }
  };

  const validateFiles = (files) => {
    const invalidFiles = [];

    for (let file of files) {
      // Validar que el archivo no esté vacío
      if (file.size === 0) {
        invalidFiles.push(t('userPanel.fileEmpty', { name: file.name }));
      }
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
    console.log('[UserPanel] loadFiles() called - starting file list refresh');
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
    console.log('[UserPanel] Files loaded:', data.files?.length || 0, 'files');
    setFiles(data.files || []);
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
    setSharedFolders(data.files || data.folders || []);
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

    let filesToUpload = Array.from(files);

    // ── Detección de archivos duplicados ──────────────────────
    const existingNames = new Set(
      (Array.isArray(filesRef.current) ? filesRef.current : [])
        .filter(f => f.type !== 'folder')
        .map(f => f.name.toLowerCase())
    );
    const dupNames = filesToUpload
      .map(f => f.name)
      .filter(n => existingNames.has(n.toLowerCase()));

    let duplicateAction = null; // 'replace' | 'keepBoth' | 'skip' | null(cancel)
    if (dupNames.length > 0) {
      duplicateAction = await new Promise((resolve) => {
        setDuplicateModalData({ names: dupNames, resolve });
      });
      setDuplicateModalData(null);

      if (!duplicateAction) return; // user closed modal = cancel upload

      if (duplicateAction === 'skip') {
        const dupSet = new Set(dupNames.map(n => n.toLowerCase()));
        filesToUpload = filesToUpload.filter(f => !dupSet.has(f.name.toLowerCase()));
        if (filesToUpload.length === 0) return;
      }
      // 'replace' → upload normally (multer overwrites)
      // 'keepBoth' → we send duplicateAction header so backend renames
    }

    // Crear entradas de upload para cada archivo
    const newUploads = filesToUpload.map((file) => {
      uploadIdRef.current += 1;
      return {
        id: uploadIdRef.current,
        name: file.name,
        status: 'pending',
        totalSize: file.size,
        loadedSize: 0,
        percent: 0,
        speed: 0,
        remainingTime: 0,
        errorMessage: null,
        _file: file,
        _startTime: null,
      };
    });

    setUploads(prev => [...prev, ...newUploads]);

    const uploadPath = currentPath.map(p => p.name).join('/');

    // Subir archivos uno a uno con XHR para tracking de progreso
    let successCount = 0;
    let failCount = 0;
    for (const entry of newUploads) {
      await new Promise((resolve) => {
        const startTime = Date.now();
        setUploads(prev => prev.map(u =>
          u.id === entry.id ? { ...u, status: 'uploading', _startTime: startTime } : u
        ));

        const xhr = new XMLHttpRequest();
        xhrMapRef.current[entry.id] = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const speed = elapsed > 0 ? e.loaded / elapsed : 0;
            const remaining = speed > 0 ? (e.total - e.loaded) / speed : 0;
            setUploads(prev => prev.map(u =>
              u.id === entry.id ? {
                ...u,
                loadedSize: e.loaded,
                totalSize: e.total,
                percent: Math.round((e.loaded / e.total) * 100),
                speed,
                remainingTime: remaining,
              } : u
            ));
          }
        };

        xhr.onload = () => {
          delete xhrMapRef.current[entry.id];
          if (xhr.status >= 200 && xhr.status < 300) {
            successCount++;
            setUploads(prev => prev.map(u =>
              u.id === entry.id ? { ...u, status: 'done', percent: 100, loadedSize: u.totalSize, speed: 0, remainingTime: 0 } : u
            ));
          } else {
            failCount++;
            let errMsg = t('userPanel.errorUploadingFiles');
            try { errMsg = JSON.parse(xhr.responseText).message || errMsg; } catch (_) {}
            setUploads(prev => prev.map(u =>
              u.id === entry.id ? { ...u, status: 'error', errorMessage: errMsg } : u
            ));
          }
          resolve();
        };

        xhr.onerror = () => {
          delete xhrMapRef.current[entry.id];
          failCount++;
          setUploads(prev => prev.map(u =>
            u.id === entry.id ? { ...u, status: 'error', errorMessage: t('userPanel.errorUploadingFiles') } : u
          ));
          resolve();
        };

        xhr.onabort = () => {
          delete xhrMapRef.current[entry.id];
          setUploads(prev => prev.filter(u => u.id !== entry.id));
          resolve();
        };

        const formData = new FormData();
        formData.append('path', uploadPath);
        if (duplicateAction === 'keepBoth') {
          formData.append('duplicateAction', 'rename');
        }
        formData.append('files', entry._file);

        xhr.open('POST', '/api/files/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
        xhr.send(formData);
      });
    }

    // Recargar archivos después de subir todo
    loadFiles();
    loadRecentFiles();

    if (failCount === 0) {
      addToast(t('userPanel.uploadSuccess', { count: successCount }), 'success');
    } else if (successCount > 0) {
      addToast(t('userPanel.uploadPartial', { count: successCount, errors: failCount }), 'warning');
    } else {
      addToast(t('userPanel.errorUploadingFiles'), 'error');
    }
  }, [currentPath, loadFiles, loadRecentFiles, addToast, t]);

  const handleFolderUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    // Validar archivos
    const validationErrors = validateFiles(files);
    if (validationErrors.length > 0) {
      addToast(t('userPanel.validationErrors') + '\n' + validationErrors.join('\n'), 'error');
      return;
    }

    // Crear entradas de upload para cada archivo de la carpeta
    const newUploads = Array.from(files).map((file) => {
      uploadIdRef.current += 1;
      return {
        id: uploadIdRef.current,
        name: file.webkitRelativePath || file.name,
        status: 'pending',
        totalSize: file.size,
        loadedSize: 0,
        percent: 0,
        speed: 0,
        remainingTime: 0,
        errorMessage: null,
        _file: file,
        _startTime: null,
      };
    });

    setUploads(prev => [...prev, ...newUploads]);

    const uploadPath = currentPath.map(p => p.name).join('/');
    let uploadedCount = 0;
    let failedCount = 0;

    // Subir archivos uno a uno con XHR
    for (const entry of newUploads) {
      await new Promise((resolve) => {
        const startTime = Date.now();
        setUploads(prev => prev.map(u =>
          u.id === entry.id ? { ...u, status: 'uploading', _startTime: startTime } : u
        ));

        const xhr = new XMLHttpRequest();
        xhrMapRef.current[entry.id] = xhr;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const speed = elapsed > 0 ? e.loaded / elapsed : 0;
            const remaining = speed > 0 ? (e.total - e.loaded) / speed : 0;
            setUploads(prev => prev.map(u =>
              u.id === entry.id ? {
                ...u,
                loadedSize: e.loaded,
                totalSize: e.total,
                percent: Math.round((e.loaded / e.total) * 100),
                speed,
                remainingTime: remaining,
              } : u
            ));
          }
        };

        xhr.onload = () => {
          delete xhrMapRef.current[entry.id];
          if (xhr.status >= 200 && xhr.status < 300) {
            uploadedCount++;
            setUploads(prev => prev.map(u =>
              u.id === entry.id ? { ...u, status: 'done', percent: 100, loadedSize: u.totalSize, speed: 0, remainingTime: 0 } : u
            ));
          } else {
            failedCount++;
            let errMsg = t('userPanel.errorUploadingFile');
            try { errMsg = JSON.parse(xhr.responseText).message || errMsg; } catch (_) {}
            setUploads(prev => prev.map(u =>
              u.id === entry.id ? { ...u, status: 'error', errorMessage: errMsg } : u
            ));
          }
          resolve();
        };

        xhr.onerror = () => {
          delete xhrMapRef.current[entry.id];
          failedCount++;
          setUploads(prev => prev.map(u =>
            u.id === entry.id ? { ...u, status: 'error', errorMessage: t('userPanel.errorUploadingFile') } : u
          ));
          resolve();
        };

        xhr.onabort = () => {
          delete xhrMapRef.current[entry.id];
          setUploads(prev => prev.filter(u => u.id !== entry.id));
          resolve();
        };

        const formData = new FormData();
        formData.append('path', uploadPath);
        if (entry._file.webkitRelativePath) {
          formData.append('relativePath', entry._file.webkitRelativePath);
        }
        formData.append('file', entry._file);

        xhr.open('POST', '/api/files/upload-folder');
        xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
        xhr.send(formData);
      });
    }

    console.log(`Uploaded ${uploadedCount} files from folder, ${failedCount} failed`);

    // Recargar archivos
    loadFiles();

    if (failedCount === 0) {
      addToast(t('userPanel.folderUploadSuccess', { count: uploadedCount }), 'success');
    } else {
      addToast(t('userPanel.folderUploadPartial', { errors: failedCount }), 'warning');
    }
  }, [currentPath, loadFiles, addToast, t]);

  const handleCreateFile = useCallback(async (defaultName, type) => {
    setCreateFileDefaultName(defaultName);
    setCreateFileType(type);
    setShowCreateFileModal(true);
    setUploadMenuOpen(false);
  }, []);

  const handleCreateFileConfirm = useCallback(async (fileName, type) => {
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

  // Remove a shared file from recipient's view (does NOT delete the original)
  const handleRemoveShared = async (item) => {
    try {
      const response = await fetch('/api/files/remove-shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          path: item.path,
          ownerUsername: item.owner
        })
      });
      const result = await response.json();
      if (result.success) {
        loadFiles();
        addToast(t('userPanel.removedFromShared'), 'success');
      } else {
        addToast(result.message || t('common.error'), 'error');
      }
    } catch (error) {
      console.error('Error removing shared:', error);
      addToast(t('common.error'), 'error');
    }
  };

  // Save a shared file to own files (copies the file, removes from shared)
  const handleToggleAIExclude = async (item) => {
    const itemPath = (item.path || '').replace(/\\/g, '/');
    try {
      const response = await fetch('/api/files/ai-exclude/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ path: itemPath })
      });
      const result = await response.json();
      if (result.success) {
        const msg = result.excluded
          ? (t('contextMenu.excludedFromAIMsg') || `"${item.name}" excluido de la IA`)
          : (t('contextMenu.includedInAIMsg') || `"${item.name}" incluido en la IA`);
        addToast(msg, 'success');
        loadFiles();
      } else {
        addToast(t('common.error'), 'error');
      }
    } catch (error) {
      console.error('Error toggling AI exclusion:', error);
      addToast(t('common.error'), 'error');
    }
  };

  // Unshare - Owner removes sharing for a file (removes ALL shares for that file)
  const handleUnshare = async (item) => {
    try {
      let allSuccess = true;
      for (const targetUsername of item.sharedWith) {
        const response = await fetch('/api/files/unshare', {
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
        if (!result.success) allSuccess = false;
      }
      loadFiles();
      if (allSuccess) {
        addToast(t('share.unshareSuccess') || 'Se dejó de compartir correctamente', 'success');
      } else {
        addToast(t('common.error'), 'error');
      }
    } catch (error) {
      console.error('Error unsharing:', error);
      addToast(t('common.error'), 'error');
    }
  };

  const handleSaveToMyFiles = async (item) => {
    try {
      const response = await fetch('/api/files/save-to-my-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          path: item.path,
          ownerUsername: item.owner
        })
      });
      const result = await response.json();
      if (result.success) {
        addToast(t('userPanel.savedToMyFiles', { name: result.savedName || item.name }) || `"${result.savedName || item.name}" guardado en tus archivos`, 'success');
        loadFiles(); // Refresh - file now appears as own file, removed from shared
      } else {
        addToast(result.message || t('common.error'), 'error');
      }
    } catch (error) {
      console.error('Error saving to my files:', error);
      addToast(t('common.error'), 'error');
    }
  };

  // Unpin a shared file from own panel (remove from main listing, keep in shared)
  const handleUnpinFromPanel = async (item) => {
    try {
      const response = await fetch('/api/files/unpin-from-panel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          path: item.path,
          ownerUsername: item.owner
        })
      });
      const result = await response.json();
      if (result.success) {
        addToast(t('userPanel.unpinnedFromPanel') || 'Removed from panel', 'success');
        loadFiles();
      } else {
        addToast(result.message || t('common.error'), 'error');
      }
    } catch (error) {
      console.error('Error unpinning from panel:', error);
      addToast(t('common.error'), 'error');
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
        loadFiles();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error sharing item:', error);
      throw error;
    }
  };

  const handleUnshareUser = async (item, targetUsername) => {
    try {
      const response = await fetch('/api/files/unshare', {
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
      if (!result.success) throw new Error(result.message);
      loadFiles();
    } catch (error) {
      console.error('Error unsharing:', error);
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

  const openCustomizeFolder = (item) => {
    setCustomizeFolder(item);
    setShowCustomizeModal(true);
  };

  const handleSaveFolderCustomization = async (folderPath, color, icon) => {
    try {
      const res = await fetch('/api/files/folder-customize', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ folderPath, color, icon })
      });
      if (!res.ok) throw new Error('Error saving folder customization');
      setShowCustomizeModal(false);
      setCustomizeFolder(null);
      loadFiles();
      addToast(t('folderCustomize.saved') || 'Folder customized', 'success');
    } catch (err) {
      console.error('Error customizing folder:', err);
      addToast(t('folderCustomize.error') || 'Error customizing folder', 'error');
    }
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

  const openFileViewer = (file) => {
    setViewerFile(file);
    setShowFileViewer(true);
    
    // Log file open for recents tracking (fire and forget)
    try {
      fetch('/api/files/log-open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ fileId: file.id })
      }).then(() => {
        // Refresh recents after a short delay
        setTimeout(() => loadRecentFiles(), 500);
      }).catch(() => {});
    } catch (e) {
      // Don't block file viewer
    }
  };

  const closeFileViewer = () => {
    setShowFileViewer(false);
    setViewerFile(null);
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only show upload drag-over for external files (not internal file moves)
    if (!e.dataTransfer.types.includes('application/x-internal-file')) {
      setIsDragOver(true);
    }
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

    // Ignore internal file drags (those are handled by folder drop targets)
    const internalData = e.dataTransfer.getData('application/x-internal-file');
    if (internalData) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // External files from desktop/system → upload to current folder
      const hasFolders = files.some(file => file.webkitRelativePath && file.webkitRelativePath.includes('/'));
      
      if (hasFolders) {
        await handleFolderUpload(files);
      } else {
        await handleFileUpload(files);
      }
    }
  }, [handleFileUpload, handleFolderUpload]);

  // Handle dropping a file onto a folder to move it
  const handleDropToFolder = useCallback(async (draggedFile, targetFolder) => {
    try {
      // Build the destination path: currentPath + target folder name
      const basePath = currentPath.map(p => p.name).join('/');
      const destinationPath = basePath ? `${basePath}/${targetFolder.name}` : targetFolder.name;
      
      const response = await fetch(`/api/files/${encodeURIComponent(draggedFile.id)}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ destinationPath })
      });

      const result = await response.json();
      
      if (result.success) {
        addToast(t('userPanel.itemMovedSuccess') || `"${draggedFile.name}" movido a "${targetFolder.name}"`, 'success');
        loadFiles();
        loadRecentFiles();
      } else {
        addToast(t('userPanel.errorMoving') + ': ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error moving file to folder:', error);
      addToast(t('userPanel.errorMoving'), 'error');
    }
    // Clean up drag state
    setFileDragging(null);
    setShowDropZone(false);
  }, [currentPath, loadFiles, loadRecentFiles, addToast, t]);

  // Handle dropping a file onto the back button to move it to the parent folder
  const handleDropToParent = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBackBtnDragOver(false);
    
    const internalData = e.dataTransfer.getData('application/x-internal-file');
    if (!internalData || currentPath.length === 0) return;
    
    try {
      const draggedFile = JSON.parse(internalData);
      // Parent path is one level up from current
      const parentPath = currentPath.slice(0, -1).map(p => p.name).join('/');
      
      const response = await fetch(`/api/files/${encodeURIComponent(draggedFile.id)}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ destinationPath: parentPath || '' })
      });

      const result = await response.json();
      
      if (result.success) {
        addToast(t('userPanel.itemMovedSuccess') || `"${draggedFile.name}" movido al nivel superior`, 'success');
        loadFiles();
        loadRecentFiles();
      } else {
        addToast(t('userPanel.errorMoving') + ': ' + result.message, 'error');
      }
    } catch (error) {
      console.error('Error moving file to parent:', error);
      addToast(t('userPanel.errorMoving'), 'error');
    }
    setFileDragging(null);
    setShowDropZone(false);
  }, [currentPath, loadFiles, loadRecentFiles, addToast, t]);

  const handleBackBtnDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/x-internal-file')) {
      setBackBtnDragOver(true);
    }
  }, []);

  const handleBackBtnDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setBackBtnDragOver(false);
  }, []);

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

    // NUEVO: Cerrar todos los paneles anteriores (solo un panel a la vez)
    // Esto asegura que solo haya un editor abierto a la vez
    
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

    // Reemplazar todos los paneles con solo el nuevo panel
    setEditorPanels([newPanel]);
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

  // Drag and Drop para archivos internos
  const handleFileDragStart = useCallback((file, e) => {
    setFileDragging(file);
    // Don't show drop zone overlay — it blocks folder drop targets
    e.dataTransfer.effectAllowed = 'move';
    // Set internal drag marker
    e.dataTransfer.setData('application/x-internal-file', JSON.stringify({ id: file.id, name: file.name, path: file.path }));
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

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="user-panel">
      {/* Background */}
      <div className="bg"></div>

      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="logo-container">
          <img className="logo-img" src="/icons/nube.svg" alt="Nube" />
          <span>{t('userPanel.personalCloud')}</span>
        </div>
        <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
          ☰
        </button>
      </div>

      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${mobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <img className="logo-img" src="/icons/nube.svg" alt="Nube" />
            <span>{t('userPanel.personalCloud')}</span>
          </div>
          {/* Close button for mobile sidebar */}
          <button 
            className="mobile-close-btn" 
            onClick={() => setMobileSidebarOpen(false)}
          >
            ✕
          </button>
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
                  onClick={() => fileInputRef.current.click()}
                >
                  {t('userPanel.uploadMenu.file')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => folderInputRef.current.click()}
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
                  onClick={() => handleCreateFile(t('userPanel.defaultFileName.text'), 'text')}
                >
                  {t('userPanel.uploadMenu.createDoc')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => handleCreateFile(t('userPanel.defaultFileName.word'), 'word')}
                >
                  {t('userPanel.uploadMenu.createWord')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => handleCreateFile(t('userPanel.defaultFileName.excel'), 'excel')}
                >
                  {t('userPanel.uploadMenu.createExcel')}
                </button>
                <button
                  className="mini-menu-item"
                  onClick={() => handleCreateFile(t('userPanel.defaultFileName.powerpoint'), 'powerpoint')}
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
                <FiHardDrive className="sidebar-btn-icon" /> {t('userPanel.myDrive')}
              </button>

              <button
                className={`sidebar-btn ${currentView === 'shared' ? 'active' : ''}`}
                onClick={() => changeView('shared')}
              >
                <FiUsers className="sidebar-btn-icon" /> {t('userPanel.sharedWithMe')}
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-btn" onClick={onBackToFolders}>
            <FiArrowLeft className="sidebar-btn-icon" /> {t('common.back')}
          </button>
          <button className="sidebar-btn" onClick={() => {
              if (onGoToCalendar) {
                onGoToCalendar();
              }
            }}>
            <FiCalendar className="sidebar-btn-icon" /> {t('userPanel.calendar')}
          </button>
          <button className="sidebar-btn" onClick={() => {
                   if (onGoToRemote) onGoToRemote();
            }}>
            <FiMonitor className="sidebar-btn-icon" /> {t('common.remoteDesktop')}
          </button>
          <button className="sidebar-btn" onClick={() => setShowSettingsModal(true)}>
            <FiSettings className="sidebar-btn-icon" /> {t('userPanel.settings')}
          </button>
          <button className="sidebar-btn sidebar-btn-logout" onClick={onLogout}>
            <FiLogOut className="sidebar-btn-icon" /> {t('userPanel.logout')}
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
          <div style={{ marginLeft: 'auto', marginRight: '20px' }}>
            <NotificationCenter />
          </div>
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
        <div className="search-controls-wrapper relative z-10 mb-6 w-full min-h-[5%]">
          <div className="search-controls-bar flex items-center justify-between glassmorphism rounded-2xl p-4 shadow-lg border-gray-200/50 transition-all duration-300 hover:shadow-xl">
            {/* Search Section */}
            <div className="flex items-center space-x-3 flex-1 max-w-md">
              <div
  role="search"
  onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
  className={`search-container flex items-center transition-all duration-300 ease-in-out cursor-text ${
    isSearchExpanded
      ? 'expanded w-72 h-10 rounded-lg px-3 gap-2'
      : 'collapsed w-10 h-10 rounded-lg justify-center'
  }`}
>
  {/* 🔍 Icono */}
  <svg
    className="w-4 h-4 flex-shrink-0 search-icon-color"
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

  {/* Input — solo visible cuando expandido, en flujo normal */}
  {isSearchExpanded && (
    <>
      <input
        type="text"
        placeholder={t('userPanel.searchPlaceholder')}
        value={searchQuery}
        onChange={handleSearch}
        onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
        autoFocus
        className="search-input flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] search-input-reset"
      />
      {searchQuery && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSearchQuery('');
          }}
          className="search-clear-btn flex-shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors duration-200"
          title={t('userPanel.clearSearch')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </>
  )}
</div>



              {/* Botón IA — mismo estilo cuadrado que el buscador */}
              <div
                role="search"
                onClick={() => !isAIExpanded && setIsAIExpanded(true)}
                className={`ai-container flex items-center transition-all duration-300 ease-in-out cursor-pointer ${
                  isAIExpanded
                    ? 'expanded w-72 h-10 rounded-lg px-3 gap-2'
                    : 'collapsed w-10 h-10 rounded-lg justify-center'
                }`}
                title={t('userPanel.aiChatbotTitle')}
              >
                  {/* Icono IA */}
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    stroke="url(#aiIconGrad)"
                    viewBox="0 0 24 24"
                  >
                    <defs>
                      <linearGradient id="aiIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#c084fc" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>

                  {/* Input + controles — solo visible cuando expandido, en flujo normal */}
                  {isAIExpanded && (
                    <>
                      <input
                        type="text"
                        placeholder={
                          (indexingStatus?.isBuilding)
                            ? "Procesando archivos... (Espere)"
                            : (!indexingStatus?.isIndexed || indexingStatus?.fileCount === 0)
                                ? "Indexando tus archivos..."
                                : t('userPanel.aiPlaceholder')
                        }
                        value={aiQuery}
                        onChange={handleAISearch}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            submitAIQuery();
                            e.target.blur();
                          }
                        }}
                        onBlur={() => !aiQuery && setIsAIExpanded(false)}
                        autoFocus
                        className="ai-input flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] search-input-reset"
                      />

                      {/* Indicador de indexación */}
                      {indexingStatus && (indexingStatus.isBuilding || !indexingStatus.isIndexed) && (
                        <span className="flex h-2.5 w-2.5 flex-shrink-0 relative" title="Indexando archivos...">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                        </span>
                      )}

                      {/* Botón enviar */}
                      {aiQuery && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            submitAIQuery();
                          }}
                          className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded transition-colors duration-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                          title={t('userPanel.sendAIQuery')}
                        >
                          <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      )}
                    </>
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
                    } else if (canEdit(file.name) || canPreview(file.name)) {
                      // Abrir archivos de Office y previsualizable en el visor modal
                      openFileViewer(file);
                    } else {
                      downloadFile(file.id, file.name, t);
                    }
                  }}
                />
              ))}
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

          {/* Files and folders */}
          <div className={`files-container ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
            {loading ? (
              <div className="files-loading-container">
                <div className="files-loading-spinner"></div>
                <p className="files-loading-text">{t('common.loading')}</p>
              </div>
            ) : (
              <>
                {/* Back button — also a drop target for moving files up one level */}
                {currentPath.length > 0 && (
                  <button 
                    className={`back-btn${backBtnDragOver ? ' back-btn-drag-over' : ''}`}
                    onClick={goBack}
                    onDragOver={handleBackBtnDragOver}
                    onDragEnter={handleBackBtnDragOver}
                    onDragLeave={handleBackBtnDragLeave}
                    onDrop={handleDropToParent}
                  >
                    ← {t('common.back')}
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
                    onOpenSidebar={openSidebarPanel}
                    onEdit={openEditorPanel}
                    onDuplicate={handleDuplicateItem}
                    onShare={openShareModal}
                    onUnshare={currentView !== 'shared' ? handleUnshare : undefined}
                    onDragStart={handleFileDragStart}
                    onDragEnd={handleFileDragEnd}
                    onDropToFolder={handleDropToFolder}
                    viewMode={viewMode}
                    isSharedView={currentView === 'shared' || item.pinnedFromShared}
                    onSaveToMyFiles={currentView === 'shared' ? handleSaveToMyFiles : (item.pinnedFromShared ? handleUnpinFromPanel : undefined)}
                    onRemoveShared={currentView === 'shared' ? handleRemoveShared : undefined}
                    onCustomizeFolder={openCustomizeFolder}
                    onToggleAIExclude={currentView !== 'shared' ? handleToggleAIExclude : undefined}
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
          <div className="editor-panels-container transition-all duration-300">
            {editorPanels.map(panel => (
              <div key={panel.id} className="editor-panel-inline glassmorphism rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <FileEditorPanel
                  file={panel.file}
                  position={{x:0,y:0}}
                  zIndex={panel.zIndex}
                  panelId={panel.id}
                  onClose={() => closeEditorPanel(panel.id)}
                  onBringToFront={() => bringPanelToFront(panel.id)}
                  onFileSaved={() => {
                    console.log('File saved, reloading files...');
                    loadFiles();
                  }}
                  isInline={true}
                />
              </div>
            ))}
          </div>
        )}
        
        </div> {/* Cierre main-content-container */}
      </div> {/* Cierre main-panel */}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        id="fileInput"
        multiple
        className="hidden-input"
        onClick={(e) => { e.target.value = null; }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(Array.from(e.target.files));
          }
          e.target.value = null;
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        id="folderInput"
        webkitdirectory=""
        multiple
        className="hidden-input"
        onClick={(e) => { e.target.value = null; }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFolderUpload(Array.from(e.target.files));
          }
          e.target.value = null;
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
        onUnshareUser={handleUnshareUser}
        item={shareItem}
      />

      {/* AI Results Modal */}
      <AIResultsModal 
        isOpen={showAIResults}
        onClose={() => setShowAIResults(false)}
        results={aiResultsData}
        onOpenFile={(file) => openFileViewer(file)}
        onDownloadFile={(file) => downloadFile(file.id, file.name, t)}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          user={user}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
          initialTab={settingsInitialTab}
          onUserUpdate={onUserUpdate}
        />
      )}

      {/* Delete Confirmation Modal */}
      <FileDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={executeDelete}
        itemName={itemToDelete ? itemToDelete.name : ''}
        itemType={itemToDelete ? itemToDelete.type : 'file'}
      />

      {/* File Viewer Modal */}
      {showFileViewer && viewerFile && (
        <FileViewerModal
          file={viewerFile}
          onClose={closeFileViewer}
          user={user}
        />
      )}

      {/* RDP Connection Modal (Deprecated in favor of /remote page but kept for backward compatibility if triggered internally) */}
      {showRDPModal && (
        <RDPConnectionModal
            onClose={() => setShowRDPModal(false)}
            onConnect={(id) => {
                setRdpConnectionId(id);
                setShowRDPModal(false);
                setShowRDPViewer(true);
            }}
        />
      )}

      {/* RDP Viewer */}
      {showRDPViewer && (
        <RDPViewer
          token={getAuthToken()}
          connectionId={rdpConnectionId}
          onClose={() => {
              setShowRDPViewer(false);
              setRdpConnectionId(null);
          }}
        />
      )}

      {/* Create File Modal */}
      <CreateFileModal
        isOpen={showCreateFileModal}
        onClose={() => setShowCreateFileModal(false)}
        onCreateFile={handleCreateFileConfirm}
        defaultName={createFileDefaultName}
        fileType={createFileType}
      />

      {/* AI Loading Overlay — Dark Metal Glass */}
      {isAILoading && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-[9999] backdrop-blur-md">
          <div className="relative rounded-2xl p-8 flex flex-col items-center gap-5 max-w-sm mx-4 border overflow-hidden"
               style={{
                 background: 'linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,41,59,0.82), rgba(15,23,42,0.9))',
                 borderColor: 'rgba(129,140,248,0.2)',
                 backdropFilter: 'blur(40px) saturate(180%)',
                 WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                 boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08), 0 25px 60px -12px rgba(0,0,0,0.5), 0 0 80px -20px rgba(129,140,248,0.12)',
               }}>
            {/* Animated glow ring behind spinner */}
            <div className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
                 style={{
                   background: 'radial-gradient(circle at 50% 30%, rgba(129,140,248,0.15), transparent 70%)',
                 }} />
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-[3px] animate-spin"
                   style={{
                     borderColor: 'rgba(129,140,248,0.15)',
                     borderTopColor: '#818cf8',
                     borderRightColor: '#38bdf8',
                     filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.3))',
                   }} />
              <svg className="w-7 h-7 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" stroke="url(#aiGradient)" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-200"
               >
              {t('userPanel.aiLoading')}
            </p>
            <p className="text-sm text-slate-400 text-center">{t('userPanel.aiLoadingDescription')}</p>
          </div>
        </div>
      )}

      {/* Folder Customize Modal */}
      <FolderCustomizeModal
        isOpen={showCustomizeModal}
        onClose={() => { setShowCustomizeModal(false); setCustomizeFolder(null); }}
        folder={customizeFolder}
        onSave={handleSaveFolderCustomization}
      />

      {/* Upload Progress Popup (Google Drive style) */}
      <UploadPopup
        uploads={uploads}
        onClose={() => setUploads([])}
        onCancel={(id) => {
          const xhr = xhrMapRef.current[id];
          if (xhr) xhr.abort();
        }}
      />

      {/* Duplicate Files Modal */}
      <DuplicateFilesModal
        isOpen={!!duplicateModalData}
        duplicateNames={duplicateModalData?.names || []}
        onReplace={() => duplicateModalData?.resolve('replace')}
        onKeepBoth={() => duplicateModalData?.resolve('keepBoth')}
        onSkip={() => duplicateModalData?.resolve('skip')}
        onClose={() => duplicateModalData?.resolve(null)}
      />
    </div>
  );
};

export default UserPanel;
