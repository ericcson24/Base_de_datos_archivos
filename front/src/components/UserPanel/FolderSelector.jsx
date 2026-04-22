import React, { useState } from 'react';
import SettingsModal from '../Modals/SettingsModal';
import { useLanguage } from '../../context/LanguageContext';
import { FiFolder, FiMonitor, FiCalendar, FiTool, FiLogOut, FiSettings } from 'react-icons/fi';
import './FolderSelector.css';

const FolderSelector = ({ user, onSelectFolder, onLogout, onThemeToggle, isDarkMode, onGoToAdmin, onGoToCalendar, onGoToRemote }) => {
  const { t } = useLanguage();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleFolderSelect = (tipo) => {
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

  return (
    <div className="folder-selector-page">
      
      <div className="bg"></div>

      
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
          
          
          {user && (
            <div className="user-info">
              <p>{t('userPanel.welcome')}, <strong>{user.username}</strong></p>
              {user.role === 'admin' && <span className="admin-badge">[Admin] Admin</span>}
            </div>
          )}

          <button
            className="folder-btn"
            onClick={() => handleFolderSelect('privada')}
          >
            <FiFolder className="folder-btn-icon" /> {t('userPanel.myFiles')}
          </button>

          <button
            className="folder-btn"
            onClick={handleRemote}
          >
            <FiMonitor className="folder-btn-icon" /> {t('userPanel.remoteWork')}
          </button>

          <button
            className="folder-btn"
            onClick={handleCalendar}
          >
            <FiCalendar className="folder-btn-icon" /> {t('userPanel.calendar')}
          </button>

          
          {user && user.role === 'admin' && onGoToAdmin && (
            <button
              className="folder-btn"
              onClick={onGoToAdmin}
            >
              <FiTool className="folder-btn-icon" /> {t('folders.adminPanel')}
            </button>
          )}

          <button
            className="folder-btn folder-btn-logout"
            onClick={onLogout}
          >
            <FiLogOut className="folder-btn-icon" /> {t('userPanel.logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderSelector;