'use client';

import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import './Toast.css';

type ToastProps = {
  id: number;
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
  onClose: (id: number) => void;
};

function Toast({ id, title, message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle />;
      case 'error':
        return <FiXCircle />;
      case 'warning':
        return <FiAlertTriangle />;
      default:
        return <FiInfo />;
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
}

export default Toast;
