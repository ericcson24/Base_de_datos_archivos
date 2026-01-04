import React, { createContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children, user }) => {
  const { addToast } = useToast();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Connect to socket
    // The path must match the nginx location for notifications
    const newSocket = io('/', {
      path: '/api/notifications/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification service');
    });

    newSocket.on('notification', (data) => {
      console.log('Notification received:', data);
      
      // Check if user wants notifications
      // We use ref to access latest user state without re-running effect
      if (userRef.current && userRef.current.notifications) {
        addToast({
          title: data.title || 'Notificación',
          message: data.message,
          type: data.type || 'info'
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [addToast]);

  return (
    <NotificationContext.Provider value={null}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
