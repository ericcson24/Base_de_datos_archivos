import React, { useState, useEffect } from 'react';
import FrostedContainer from '../Common/FrostedContainer';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { getAuthToken } from '../../utils/fileUtils';
import './SettingsModal.css';

const SettingsModal = ({ onClose, user, onThemeToggle, isDarkMode, initialTab = 'general' }) => {
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
    storageLimit: 1024 * 1024 * 1024 // 1GB default
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab); // general, security, storage

  useEffect(() => {
    fetchSettings();
  }, []);

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
      alert('Las contraseñas no coinciden');
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
        onClose();
      } else {
        alert('Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar configuración');
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
        alert('Error al iniciar vinculación: ' + (data.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error getting auth url:', error);
      alert(`Error de conexión: ${error.message}. Asegúrate de que el servidor backend está funcionando.`);
    }
  };

  const handleUnlinkMicrosoft = async () => {
    if (!window.confirm('¿Estás seguro de que quieres desvincular tu cuenta de Microsoft?')) return;
    
    try {
      const response = await fetch('/api/auth/unlink-microsoft', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });
      
      if (response.ok) {
        setSettings({ ...settings, microsoftLinked: false, microsoftEmail: null });
      }
    } catch (error) {
      console.error('Error unlinking microsoft:', error);
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
        alert(data.message || 'Sincronización completada');
      } else {
        alert('Error al sincronizar');
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error de conexión');
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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ajustes</h2>
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
            General
          </button>
          {settings.role === 'admin' && (
            <button
              className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
              onClick={() => setActiveTab('security')}
            >
              Seguridad
            </button>
          )}
          <button
            className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'storage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('storage')}
          >
            Almacenamiento
          </button>
          <button
            className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'integrations' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('integrations')}
          >
            Integraciones
          </button>
        </div>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {activeTab === 'general' && (
            <>
              {/* Perfil */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {settings.avatarUrl ? (
                    <img src={settings.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    settings.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{settings.username}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ID: {settings.id}</p>
                  <p className="text-xs text-blue-500 uppercase font-semibold mt-1">{settings.role}</p>
                </div>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL del Avatar</label>
                <Input
                  type="text"
                  value={settings.avatarUrl || ''}
                  onChange={(e) => setSettings({ ...settings, avatarUrl: e.target.value })}
                  placeholder="https://ejemplo.com/avatar.jpg"
                  className="w-full"
                />
              </div>

              {/* Tema */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tema</label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'light' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${settings.theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>☀️</span>
                      <span className="text-gray-900 dark:text-white">Claro</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'dark' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${settings.theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🌙</span>
                      <span className="text-gray-900 dark:text-white">Oscuro</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Idioma */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Idioma</label>
                <select
                  value={settings.language || 'es'}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cambiar Contraseña</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva Contraseña</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Contraseña</label>
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Almacenamiento</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Gestiona tu espacio en la nube</p>
                
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                        En uso
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
                    <span>{formatBytes(settings.storageUsed)} usados</span>
                    <span>{formatBytes(settings.storageLimit)} total</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Cuenta de Microsoft</h3>
                
                {settings.microsoftLinked ? (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                      <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl">
                          📧
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-lg">{settings.microsoftEmail}</p>
                          <p className="text-sm text-green-600 dark:text-green-400 flex items-center font-medium">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            Cuenta vinculada y activa
                          </p>
                        </div>
                      </div>
                      <Button variant="secondary" onClick={handleSync} disabled={syncing} className="w-full sm:w-auto">
                        {syncing ? '🔄 Sincronizando...' : '🔄 Sincronizar ahora'}
                      </Button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Información de sincronización</h4>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                            Los eventos se sincronizan automáticamente cada vez que abres el calendario. 
                            Usa el botón "Sincronizar ahora" si no ves tus últimos cambios de Outlook.
                        </p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button variant="danger" onClick={handleUnlinkMicrosoft}>
                        Desvincular cuenta
                        </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 text-gray-500 dark:text-gray-400">
                        📅
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Conecta tu calendario</h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                      Vincula tu cuenta de Microsoft Outlook para ver y gestionar tus eventos directamente desde aquí.
                    </p>
                    <Button variant="primary" onClick={handleLinkMicrosoft} className="px-8 py-3 text-lg">
                      Vincular con Microsoft
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;