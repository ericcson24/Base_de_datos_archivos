import React, { useState } from 'react';
import SettingsModal from '../Modals/SettingsModal';
import { useLanguage } from '../../context/LanguageContext';
import { FiFolder, FiMonitor, FiCalendar, FiTool, FiLogOut, FiSettings, FiMap } from 'react-icons/fi';
import './FolderSelector.css';

const FolderSelector = ({ user, onSelectFolder, onLogout, onThemeToggle, isDarkMode, onGoToAdmin, onGoToCalendar, onGoToRemote, onGoToRoadmap }) => {
  const { t } = useLanguage();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleFolderSelect = (tipo) => {
    // Establecer cookie como hacía el original
    document.cookie = `carpeta=${tipo}; path=/`;
    onSelectFolder(tipo);
  };

  const handleCalendar = () => {
    if (onGoToCalendar) {
      onGoToCalendar();
    }
  };

  const handleRemote = () => {
    if (onGoToRemote) {
      onGoToRemote();
    }
  };

  const handleRoadmap = () => {
    if (onGoToRoadmap) {
      onGoToRoadmap();
    }
  };

  return (
    <div className="folder-selector-page">
      {/* Background */}
      <div className="bg"></div>

      {/* Settings Button */}
      <button
        className="settings-btn-fixed"
        onClick={() => setShowSettingsModal(true)}
        title={t('userPanel.settings')}
      >
        <FiSettings />
      </button>

      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          user={user}
          onThemeToggle={onThemeToggle}
          isDarkMode={isDarkMode}
        />
      )}

      <div className="selector-container">
        <div className="options-container">
          <h2>{t('folders.subtitle')}</h2>
          
          {/* Mostrar información del usuario */}
          {user && (
            <div className="user-info">
              <p>{t('userPanel.welcome')}, <strong>{user.username}</strong></p>
              {user.role === 'admin' && <span className="admin-badge"><FiTool size={12} /> Admin</span>}
            </div>
          )}

          <div className="apps-grid">
            <button className="app-card" onClick={() => handleFolderSelect('privada')}>
              <div className="app-card-icon" style={{ background: 'linear-gradient(135deg, #4285f4, #2b6cb0)' }}>
                <FiFolder size={28} />
              </div>
              <span className="app-card-label">{t('userPanel.myFiles')}</span>
            </button>

            <button className="app-card" onClick={handleRemote}>
              <div className="app-card-icon" style={{ background: 'linear-gradient(135deg, #4285f4, #2b6cb0)' }}>
                <FiMonitor size={28} />
              </div>
              <span className="app-card-label">{t('userPanel.remoteWork')}</span>
            </button>

            <button className="app-card" onClick={handleCalendar}>
              <div className="app-card-icon" style={{ background: 'linear-gradient(135deg, #4285f4, #2b6cb0)' }}>
                <FiCalendar size={28} />
              </div>
              <span className="app-card-label">{t('userPanel.calendar')}</span>
            </button>

            <button className="app-card" onClick={handleRoadmap}>
              <div className="app-card-icon" style={{ background: 'linear-gradient(135deg, #4285f4, #2b6cb0)' }}>
                <FiMap size={28} />
              </div>
              <span className="app-card-label">{t('roadmap.title')}</span>
            </button>

            {user && user.role === 'admin' && onGoToAdmin && (
              <button className="app-card" onClick={onGoToAdmin}>
                <div className="app-card-icon" style={{ background: 'linear-gradient(135deg, #4285f4, #2b6cb0)' }}>
                  <FiTool size={28} />
                </div>
                <span className="app-card-label">{t('folders.adminPanel')}</span>
              </button>
            )}

            <button className="app-card app-card-logout" onClick={onLogout}>
              <div className="app-card-icon" style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                <FiLogOut size={28} />
              </div>
              <span className="app-card-label">{t('userPanel.logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderSelector;