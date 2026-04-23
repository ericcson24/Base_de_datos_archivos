import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
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
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <FiCheckCircle />;
      case 'error': return <FiXCircle />;
      case 'warning': return <FiAlertTriangle />;
      default: return <FiInfo />;
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
        x
      </button>
    </div>
  );
};

export default Toast;
