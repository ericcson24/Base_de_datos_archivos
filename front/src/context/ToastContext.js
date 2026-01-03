import React, { createContext, useState, useContext, useCallback } from 'react';
import Toast from '../components/Common/Toast';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((messageOrObj, type = 'info', duration = 3000) => {
    const id = Date.now();
    let toastData = {};

    if (typeof messageOrObj === 'object' && messageOrObj !== null) {
      toastData = {
        id,
        title: messageOrObj.title,
        message: messageOrObj.message,
        type: messageOrObj.type || type,
        duration: messageOrObj.duration || duration
      };
    } else {
      toastData = { id, message: messageOrObj, type, duration };
    }

    setToasts(prev => [...prev, toastData]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
