import React from 'react';
import FrostedContainer from './FrostedContainer';
import Button from './Button';
import './FolderSelector.css';

const FolderSelector = ({ onSelectFolder, onLogout }) => {
  const handleFolderSelect = (tipo) => {
    // Establecer cookie como hacía el original
    document.cookie = `carpeta=${tipo}; path=/`;
    onSelectFolder(tipo);
  };

  const handleRemoteWork = () => {
    window.location.href = '/trabajar_remoto';
  };

  const handleCalendar = () => {
    window.location.href = 'https://calendario.proyectonube.xyz/';
  };

  return (
    <div className="folder-selector">
      {/* Background */}
      <div className="bg"></div>

      <div className="selector-container">
        <FrostedContainer variant="card" className="options-container">
          <h2>¿Qué quieres hacer?</h2>

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