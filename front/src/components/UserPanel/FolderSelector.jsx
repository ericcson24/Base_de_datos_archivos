import React, { useState } from 'react';
import FrostedContainer from '../Common/FrostedContainer';
import Button from '../Common/Button';
import SettingsModal from '../Modals/SettingsModal';
import { useLanguage } from '../../context/LanguageContext';
import './FolderSelector.css';

const FolderSelector = ({ user, onSelectFolder, onLogout, onThemeToggle, isDarkMode, onGoToAdmin, onGoToCalendar }) => {
  const { t } = useLanguage();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleFolderSelect = (tipo) => {
    // Establecer cookie como hacía el original
    document.cookie = `carpeta=${tipo}; path=/`;
    onSelectFolder(tipo);
  };

  const handleRemoteWork = () => {
    window.location.href = '/trabajar_remoto';
  };

  const handleCalendar = () => {
    if (onGoToCalendar) {
      onGoToCalendar();
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
        ⚙️
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
        <FrostedContainer variant="card" className="options-container">
          <h2>{t('folders.subtitle')}</h2>
          
          {/* Mostrar información del usuario */}
          {user && (
            <div className="user-info">
              <p>{t('userPanel.welcome')}, <strong>{user.username}</strong></p>
              {user.role === 'admin' && <span className="admin-badge">👑 Admin</span>}
            </div>
          )}

          <Button
            variant="frosted"
            onClick={() => handleFolderSelect('privada')}
            className="option-btn"
          >
            📁 {t('userPanel.myFiles')}
          </Button>

          <Button
            variant="frosted"
            onClick={handleRemoteWork}
            className="option-btn"
          >
            💻 {t('userPanel.remoteWork')}
          </Button>

          <Button
            variant="frosted"
            onClick={handleCalendar}
            className="option-btn"
          >
            📅 {t('userPanel.calendar')}
          </Button>

          {/* Botón de administrador solo para admins */}
          {user && user.role === 'admin' && onGoToAdmin && (
            <Button
              variant="warning"
              onClick={onGoToAdmin}
              className="option-btn admin-btn"
            >
              🛠️ {t('folders.adminPanel')}
            </Button>
          )}

          <Button
            variant="danger"
            onClick={onLogout}
            className="option-btn logout-btn"
          >
            {t('userPanel.logout')}
          </Button>
        </FrostedContainer>
      </div>
    </div>
  );
};

export default FolderSelector;