import React from 'react';
import FrostedContainer from './FrostedContainer';
import Button from './Button';
import './FolderSelector.css';

const FolderSelector = ({ user, onSelectFolder, onLogout, onThemeToggle, isDarkMode, onGoToAdmin }) => {
  const handleFolderSelect = (tipo) => {
    // Establecer cookie como hacía el original
    document.cookie = `carpeta=${tipo}; path=/`;
    onSelectFolder(tipo);
  };

  const handleRemoteWork = () => {
    window.location.href = '/trabajar_remoto';
  };

  const handleCalendar = () => {
    window.location.href = 'http://localhost:3000/calendar';
  };

  return (
    <div className="folder-selector">
      {/* Background */}
      <div className="bg"></div>

      {/* Theme Toggle Button */}
      <button
        className="theme-toggle-btn"
        onClick={onThemeToggle}
        title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      <div className="selector-container">
        <FrostedContainer variant="card" className="options-container">
          <h2>¿Qué quieres hacer?</h2>
          
          {/* Mostrar información del usuario */}
          {user && (
            <div className="user-info">
              <p>Bienvenido, <strong>{user.username}</strong></p>
              {user.role === 'admin' && <span className="admin-badge">👑 Administrador</span>}
            </div>
          )}

          <Button
            variant="frosted"
            onClick={() => handleFolderSelect('privada')}
            className="option-btn"
          >
            📁 Carpeta Privada
          </Button>

          <Button
            variant="frosted"
            onClick={handleRemoteWork}
            className="option-btn"
          >
            💻 Trabajar Remoto
          </Button>

          <Button
            variant="frosted"
            onClick={handleCalendar}
            className="option-btn"
          >
            📅 Calendario
          </Button>

          {/* Botón de administrador solo para admins */}
          {user && user.role === 'admin' && onGoToAdmin && (
            <Button
              variant="warning"
              onClick={onGoToAdmin}
              className="option-btn admin-btn"
            >
              🛠️ Panel de Administración
            </Button>
          )}

          <Button
            variant="danger"
            onClick={onLogout}
            className="option-btn logout-btn"
          >
            🚪 Cerrar sesión
          </Button>
        </FrostedContainer>
      </div>
    </div>
  );
};

export default FolderSelector;