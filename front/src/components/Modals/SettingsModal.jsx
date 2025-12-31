import React, { useState, useEffect } from 'react';
import FrostedContainer from '../Common/FrostedContainer';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { getAuthToken } from '../../utils/fileUtils';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import './SettingsModal.css';

const SettingsModal = ({ onClose, user, onThemeToggle, isDarkMode, initialTab = 'general' }) => {
  const { addToast } = useToast();
  const { t, changeLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState({
    username: '',
    role: '',
    avatarUrl: '',
    theme: 'light',
    language: 'es',
    notifications: true,
    storageUsed: 0,
    storageLimit: 1024 * 1024 * 1024, // 1GB default
    microsoftAccount: null // { email: '...', name: '...' }
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab); // general, security, storage
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [defaultAvatars, setDefaultAvatars] = useState([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchDefaultAvatars();
  }, []);

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
      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setSettings({ ...settings, avatarUrl: data.avatarUrl });
        addToast(t('settings.avatarUploaded'), 'success');
        setShowAvatarSelector(false);
      } else {
        addToast(data.message || t('settings.avatarUploadError'), 'error');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      addToast(t('settings.avatarConnectionError'), 'error');
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
          setSettings(data.settings);
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
      const response = await fetch('/api/events/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        addToast(data.message || t('settings.syncSuccess'), 'success');
      } else {
        addToast(t('settings.syncError'), 'error');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      addToast(t('settings.connectionErrorGeneric'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('settings.title')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('general')}
          >
            {t('settings.general')}
          </button>
          {settings.role === 'admin' && (
            <button
              className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              onClick={() => setActiveTab('security')}
            >
              {t('settings.security')}
            </button>
          )}
          <button
            className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'storage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('storage')}
          >
            {t('settings.storage')}
          </button>
          <button
            className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'integrations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('integrations')}
          >
            {t('settings.integrations')}
          </button>
        </div>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.avatar')}</label>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img 
                      src={settings.avatarUrl || `https://ui-avatars.com/api/?name=${settings.username}&background=random`} 
                      alt={t('settings.currentAvatar')} 
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    <button 
                      className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 transition-colors shadow-md"
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
                  <div className="avatar-selector-container animate-fade-in mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.uploadAvatar')}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                          disabled={uploadingAvatar}
                        />
                        <Button variant="secondary" onClick={handleAvatarDelete} disabled={deletingAvatar || uploadingAvatar}>
                          {deletingAvatar ? t('common.loading') : t('settings.removeAvatar')}
                        </Button>
                        {uploadingAvatar && <span className="text-sm text-blue-500">{t('settings.uploading')}</span>}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-slate-600 my-4"></div>
                    
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.defaultAvatars')}</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.username')}</label>
                <Input
                  value={settings.username}
                  disabled={true}
                  className="w-full opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500 mt-1">{t('settings.usernameLocked')}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.language')}</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pl">Polski</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('settings.notifications')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.notificationsDesc')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {/* Tema */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.theme')}</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'light' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${settings.theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>☀️</span>
                      <span className="text-gray-900 dark:text-white">{t('common.theme.light')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'dark' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${settings.theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🌙</span>
                      <span className="text-gray-900 dark:text-white">{t('common.theme.dark')}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('settings.changePassword')}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.newPassword')}</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.confirmPassword')}</label>
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
          
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-xl text-center">
                <div className="text-4xl mb-2">☁️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('settings.storage')}</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('settings.manageStorage')}</p>
                
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                        {t('settings.inUse')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {Math.round((settings.storageUsed / settings.storageLimit) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div style={{ width: `${(settings.storageUsed / settings.storageLimit) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                    <span>{t('settings.used', { size: formatBytes(settings.storageUsed) })}</span>
                    <span>{t('settings.total', { size: formatBytes(settings.storageLimit) })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('settings.microsoftAccount')}</h3>
                
                {settings.microsoftLinked ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                      <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl">
                          📧
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-lg">{settings.microsoftEmail}</p>
                          <div className="flex items-center mt-1">
                            <span className="relative flex h-3 w-3 mr-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <p className="text-sm text-green-600 dark:text-green-400 font-bold">
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

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">{t('settings.syncInfoTitle')}</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
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
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('settings.connectCalendar')}</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
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
        </div>

        <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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