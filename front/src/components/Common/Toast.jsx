import React, { useEffect, useState } from 'react';
import './Toast.css';

const Toast = ({ id, title, message, type = 'info', duration = 3000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`toast ${type} ${isExiting ? 'exiting' : ''}`}>
      <div className="toast-content">
        <span className="toast-icon">{getIcon()}</span>
        <div className="toast-text">
          {title && <div className="toast-title">{title}</div>}
          <div className="toast-message">{message}</div>
        </div>
      </div>
      <button className="toast-close" onClick={handleClose}>
        ✕
      </button>
    </div>
  );
};

export default Toast;
