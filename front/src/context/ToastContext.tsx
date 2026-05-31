'use client';

import React, { createContext, useState, useContext, useCallback } from 'react';
import Toast from '../components/common/Toast';

// un toast puede crearse pasando un texto o un objeto con titulo/mensaje
type ToastData = {
  id: number;
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
};

type ToastInput = {
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
};

type ToastContextType = {
  addToast: (
    messageOrObj: string | ToastInput,
    type?: 'info' | 'success' | 'error' | 'warning',
    duration?: number
  ) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (
      messageOrObj: string | ToastInput,
      type: 'info' | 'success' | 'error' | 'warning' = 'info',
      duration = 3000
    ) => {
      const id = Date.now();
      let toastData: ToastData;

      if (typeof messageOrObj === 'object' && messageOrObj !== null) {
        toastData = {
          id,
          title: messageOrObj.title,
          message: messageOrObj.message,
          type: messageOrObj.type || type,
          duration: messageOrObj.duration || duration,
        };
      } else {
        toastData = { id, message: messageOrObj, type, duration };
      }

      setToasts((prev) => [...prev, toastData]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
