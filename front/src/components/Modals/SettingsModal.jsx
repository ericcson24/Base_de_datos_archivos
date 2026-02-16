import React, { useState, useEffect } from 'react';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { getAuthToken } from '../../utils/fileUtils';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useFetch } from '../../hooks/useFetch';
import './SettingsModal.css';

const SettingsModal = ({ onClose, user, onThemeToggle, isDarkMode, initialTab = 'general', onUserUpdate }) => {
  const { addToast } = useToast();
  const fetchWithNotify = useFetch();
  const { t, changeLanguage, language: currentLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState({
    username: user?.username || '',
    role: user?.role || '',
    avatarUrl: user?.avatarUrl || '',
    theme: isDarkMode ? 'dark' : 'light',
    language: currentLanguage || 'es',
    notifications: user?.notifications ?? true,
    microsoftAccount: null // { email: '...', name: '...' }
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab); // general, security, integrations, ia
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [defaultAvatars, setDefaultAvatars] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchDefaultAvatars();
  }, []);

  useEffect(() => {
    let interval;
    if (activeTab === 'ia') {
      const fetchAiStatus = async () => {
        try {
          const response = await fetch('/api/ai/indexing-status', {
             headers: { 'Authorization': `Bearer ${getAuthToken()}` }
          });
          if (response.ok) {
            const data = await response.json();
            setAiStatus(data);
          }
        } catch (error) {
          console.error('Error fetching AI status', error);
        }
      };

      fetchAiStatus();
      interval = setInterval(fetchAiStatus, 1000); 
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchDefaultAvatars = async () => {
    try {
      const response = await fetch('/api/auth/avatars');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.avatars.length > 0) {
          setDefaultAvatars(data.avatars);
        } else {
          // Fallback to dicebear if no local avatars
          setDefaultAvatars([
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Calista',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Dante',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Elias',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Fiona',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Hanna',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Ivan',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Julia',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin'
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching avatars:', error);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const response = await fetchWithNotify('/api/auth/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setSettings({ ...settings, avatarUrl: data.avatarUrl });
        // Actualizar estado global inmediatamente
        if (onUserUpdate) {
          onUserUpdate({ avatarUrl: data.avatarUrl });
        }
        // Notification handled by backend
        setShowAvatarSelector(false);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      // Notification handled by backend or generic error
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    setDeletingAvatar(true);
    try {
      const response = await fetch('/api/auth/avatar', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSettings({ ...settings, avatarUrl: null });
        if (onUserUpdate) {
          onUserUpdate({ avatarUrl: null });
        }
        addToast(t('settings.avatarDeleted'), 'success');
        setShowAvatarSelector(false);
      } else {
        addToast(data.message || t('settings.avatarDeleteError'), 'error');
      }
    } catch (error) {
      console.error('Error deleting avatar:', error);
      addToast(t('settings.avatarConnectionError'), 'error');
    } finally {
      setDeletingAvatar(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/auth/settings', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSettings(prev => ({
            ...prev,
            ...data.settings,
            // Mantener el estado visual actual para evitar inconsistencias
            theme: isDarkMode ? 'dark' : 'light',
            language: currentLanguage,
            // Asegurar que notifications sea booleano
            notifications: data.settings.notifications === undefined ? true : !!data.settings.notifications
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      addToast(t('settings.passwordsDoNotMatch'), 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/auth/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          theme: settings.theme,
          avatarUrl: settings.avatarUrl,
          language: settings.language,
          notifications: settings.notifications,
          newPassword: newPassword || undefined
        })
      });

      if (response.ok) {
        // Actualizar estado global del usuario
        if (onUserUpdate) {
          onUserUpdate({
            avatarUrl: settings.avatarUrl,
            notifications: settings.notifications,
            language: settings.language,
            theme: settings.theme
          });
        }

        // Si cambió el tema, aplicar
        if ((settings.theme === 'dark' && !isDarkMode) || (settings.theme === 'light' && isDarkMode)) {
          onThemeToggle();
        }
        // Si cambió el idioma, aplicar
        changeLanguage(settings.language);
        
        addToast(t('common.success'), 'success');
        onClose();
      } else {
        addToast(t('common.error'), 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast(t('common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkMicrosoft = async () => {
    try {
      const response = await fetch('/api/auth/microsoft/url', {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      const data = await response.json();
      
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Error getting auth url:', data);
        addToast(t('settings.linkError', { error: data.message || 'Error desconocido' }), 'error');
      }
    } catch (error) {
      console.error('Error getting auth url:', error);
      addToast(t('settings.connectionError', { error: error.message }), 'error');
    }
  };

  const handleUnlinkMicrosoft = async () => {
    if (!window.confirm(t('settings.unlinkConfirm'))) return;
    
    try {
      const response = await fetch('/api/auth/unlink-microsoft', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      if (response.ok) {
        setSettings({ ...settings, microsoftLinked: false, microsoftEmail: null });
        addToast(t('settings.unlinkedSuccess'), 'success');
      }
    } catch (error) {
      console.error('Error unlinking microsoft:', error);
      addToast(t('settings.unlinkError'), 'error');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetchWithNotify('/api/events/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      if (response.ok) {
        // Notification handled by backend
      }
    } catch (error) {
      console.error('Error syncing:', error);
      // Notification handled by backend or generic error
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">{t('settings.title')}</h2>
          <button onClick={onClose} className="settings-close-btn">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            {t('settings.general')}
          </button>
          {settings.role === 'admin' && (
            <button
              className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              {t('settings.security')}
            </button>
          )}
          <button
            className={`settings-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            {t('settings.integrations')}
          </button>
          <button
            className={`settings-tab ${activeTab === 'ia' ? 'active' : ''}`}
            onClick={() => setActiveTab('ia')}
          >
            IA
          </button>
        </div>
        
        <div className="settings-content">
          {activeTab === 'general' && (
            <div className="settings-section">
              <div className="mb-6">
                <label className="settings-label">{t('settings.avatar')}</label>
                <div className="settings-avatar-container">
                  <div className="settings-avatar-wrapper">
                    <img 
                      src={settings.avatarUrl || `https://ui-avatars.com/api/?name=${settings.username}&background=random`} 
                      alt={t('settings.currentAvatar')} 
                      className="settings-avatar-img"
                      onError={(e) => {
                        e.target.onerror = null; 
                        e.target.src = `https://ui-avatars.com/api/?name=${settings.username}&background=random`;
                      }}
                    />
                    <button 
                      className="settings-avatar-edit-btn"
                      onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                      title={t('settings.changeAvatar')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    {t('settings.changeAvatar')}
                  </div>
                </div>
                
                {showAvatarSelector && (
                  <div className="avatar-selector-container">
                    <div className="mb-4">
                      <label className="settings-label">{t('settings.uploadAvatar')}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="avatar-upload-input"
                          disabled={uploadingAvatar}
                        />
                        <Button variant="secondary" onClick={handleAvatarDelete} disabled={deletingAvatar || uploadingAvatar}>
                          {deletingAvatar ? t('common.loading') : t('settings.removeAvatar')}
                        </Button>
                        {uploadingAvatar && <span className="text-sm text-blue-500">{t('settings.uploading')}</span>}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-slate-600 my-4"></div>
                    
                    <label className="settings-label mb-2">{t('settings.defaultAvatars')}</label>
                    <div className="avatar-selector">
                      {defaultAvatars.map((url, index) => (
                        <div 
                          key={index}
                          className={`avatar-option ${settings.avatarUrl === url ? 'selected' : ''}`}
                          onClick={() => {
                            setSettings({ ...settings, avatarUrl: url });
                            setShowAvatarSelector(false);
                          }}
                        >
                          <img src={url} alt={`Avatar ${index + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="settings-label">{t('settings.username')}</label>
                <Input
                  value={settings.username}
                  disabled={true}
                  className="w-full opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">{t('settings.usernameLocked')}</p>
              </div>
              
              <div className="mb-6">
                <label className="settings-label">{t('settings.language')}</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="settings-select"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pl">Polski</option>
                </select>
              </div>

              {/* Tema */}
              <div>
                <label className="settings-label mb-2">{t('settings.theme')}</label>
                <div className="theme-options">
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'light' })}
                    className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                  >
                    <div className="theme-btn-content">
                      <span>☀️</span>
                      <span className="theme-btn-text">{t('common.theme.light')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'dark' })}
                    className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                  >
                    <div className="theme-btn-content">
                      <span>🌙</span>
                      <span className="theme-btn-text">{t('common.theme.dark')}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="settings-section">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('settings.changePassword')}</h3>
              <div className="mb-4">
                <label className="settings-label">{t('settings.newPassword')}</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                />
              </div>
              <div>
                <label className="settings-label">{t('settings.confirmPassword')}</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                />
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="settings-section">
              <div className="storage-card">
                <h3 className="storage-card-title mb-4">{t('settings.microsoftAccount')}</h3>
                
                {settings.microsoftLinked ? (
                  <div className="space-y-4">
                    <div className="integration-card">
                      <div className="integration-info">
                        <div className="integration-icon">
                          📧
                        </div>
                        <div>
                          <p className="integration-email">{settings.microsoftEmail}</p>
                          <div className="integration-status">
                            <span className="integration-status-dot">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <p className="integration-status-text">
                              {t('settings.linkedActive')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button variant="secondary" onClick={handleSync} disabled={syncing} className="w-full sm:w-auto">
                        {syncing ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700 dark:text-gray-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('settings.syncing')}
                          </span>
                        ) : (
                          t('settings.syncNow')
                        )}
                      </Button>
                    </div>

                    <div className="sync-info-box">
                        <h4 className="sync-info-title">{t('settings.syncInfoTitle')}</h4>
                        <p className="sync-info-desc">
                            {t('settings.syncInfoDesc')}
                        </p>
                    </div>

                    <div className="flex justify-end pt-2 gap-2">
                        <Button variant="secondary" onClick={handleLinkMicrosoft}>
                          {t('settings.linkAnother')}
                        </Button>
                        <Button variant="danger" onClick={handleUnlinkMicrosoft}>
                          {t('settings.unlinkMicrosoft')}
                        </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 text-gray-500 dark:text-gray-400">
                        📅
                    </div>
                    <h4 className="connect-calendar-title">{t('settings.connectCalendar')}</h4>
                    <p className="connect-calendar-desc">
                      {t('settings.connectCalendarDesc')}
                    </p>
                    <Button variant="primary" onClick={handleLinkMicrosoft} className="px-8 py-3 text-lg">
                      {t('settings.linkMicrosoft')}
                    </Button>
                    <p className="text-xs text-gray-500 mt-4">
                      {t('settings.linkNote')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ia' && (
            <div className="settings-section">
              <div className="storage-card !text-left">
                 <h3 className="storage-card-title text-center">Estado de Indexación IA</h3>
                 <p className="storage-card-desc mb-6 text-center">
                    Visualiza el progreso de construcción de tu nodo personal de conocimiento. 
                    El sistema detecta automáticamente nuevos documentos y actualiza tu grafo de conocimiento.
                 </p>
                 
                 {!aiStatus ? (
                    <div className="p-8 text-center text-gray-500">
                        <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cargando estado...
                    </div>
                 ) : (
                    <div className="space-y-6">
                        {/* Estado General */}
                        <div className="bg-white dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-700 dark:text-gray-200">Estado del Nodo</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                    aiStatus.progress && aiStatus.progress.state === 'indexing' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                                    : aiStatus.progress && aiStatus.progress.state === 'error'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                }`}>
                                    {aiStatus.progress && aiStatus.progress.state === 'indexing' ? 'CONSTRUYENDO' 
                                     : aiStatus.progress && aiStatus.progress.state === 'error' ? 'ERROR'
                                     : 'ACTIVO'}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                <div className="flex justify-between">
                                    <span>Archivos indexados:</span>
                                    <span className="font-mono">{aiStatus.fileCount}</span>
                                </div>
                                {aiStatus.system && (
                                    <>
                                    <div className="flex justify-between">
                                        <span>Entradas en índice:</span>
                                        <span className="font-mono">{aiStatus.system.totalIndexedEntries}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Última sincronización:</span>
                                        <span className="font-mono">
                                            {aiStatus.system.lastUpdate 
                                              ? new Date(aiStatus.system.lastUpdate).toLocaleTimeString()
                                              : 'Nunca'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Servicio activo:</span>
                                        <span className="font-mono">
                                            {aiStatus.system.uptime 
                                              ? `${Math.floor(aiStatus.system.uptime / 3600)}h ${Math.floor((aiStatus.system.uptime % 3600) / 60)}m`
                                              : '-'}
                                        </span>
                                    </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Cache de búsquedas */}
                        {aiStatus.cache && (
                            <div className="bg-white dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm">
                                <div className="font-medium text-gray-700 dark:text-gray-200 mb-2">Caché de Búsquedas</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Consultas en caché:</span>
                                        <span className="font-mono">{aiStatus.cache.keys}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Aciertos / Fallos:</span>
                                        <span className="font-mono text-green-600 dark:text-green-400">{aiStatus.cache.hits}</span>
                                        <span className="font-mono opacity-40">/</span>
                                        <span className="font-mono text-orange-500 dark:text-orange-400">{aiStatus.cache.misses}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contenido en Progreso */}
                        {aiStatus.progress && aiStatus.progress.state === 'indexing' ? (
                            <div className="bg-white dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-600 shadow-sm animate-pulse">
                                <div className="flex justify-between text-sm mb-2 text-gray-600 dark:text-gray-300">
                                    <span>Construyendo conocimiento...</span>
                                    <span>{aiStatus.progress.percent}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-slate-600 mb-4 overflow-hidden">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                                         style={{ width: `${aiStatus.progress.percent}%` }}></div>
                                </div>
                                
                                <div className="bg-gray-100 dark:bg-slate-900 p-3 rounded text-xs font-mono text-gray-600 dark:text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap border border-gray-200 dark:border-slate-700">
                                    <span className="text-blue-500 mr-2">➜</span>
                                    {aiStatus.progress.currentFile || 'Iniciando proceso...'}
                                </div>
                                
                                {aiStatus.progress.processed > 0 && (
                                    <div className="mt-2 text-xs text-gray-400 text-right">
                                        {aiStatus.progress.processed} / {aiStatus.progress.total} archivos
                                    </div>
                                )}
                            </div>
                        ) : (
                             <div className="text-center py-6 text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-slate-700 pt-6">
                                <div className="text-4xl mb-3 opacity-80">🧠</div>
                                <p className="text-sm">El nodo está sincronizado.</p>
                                <p className="text-xs mt-1 opacity-70">Se actualiza automáticamente cada 30 segundos.</p>
                             </div>
                        )}
                    </div>
                 )}
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;