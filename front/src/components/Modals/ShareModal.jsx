import React, { useState } from 'react';
import './ShareModal.css';

const ShareModal = ({ isOpen, onClose, onShare, item }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      await onShare(item, username);
      setUsername('');
      onClose();
    } catch (err) {
      setError(err.message || 'Error al compartir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glassmorphism-modal" onClick={e => e.stopPropagation()}>
        <h3>Compartir "{item?.name}"</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Nombre de usuario destino:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: usuario123"
              autoFocus
              className="glassmorphism-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancelar
            </button>
            <button 
              type="submit" 
              className="confirm-btn"
              disabled={loading || !username.trim()}
            >
              {loading ? 'Compartiendo...' : 'Compartir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;
