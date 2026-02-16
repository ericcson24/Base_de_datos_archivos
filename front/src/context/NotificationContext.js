import React, { createContext, useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children, user, onNavigate }) => {
  const { addToast } = useToast();
  const userRef = useRef(user);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const recentNotifIds = useRef(new Set()); // Dedup guard for socket events

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const handleNavigation = (link) => {
    if (onNavigate) {
      onNavigate(link);
    } else if (link === '/calendar') {
      // Fallback for specific known links if onNavigate is not provided
      // This relies on the app structure where we might not have passed the prop
      // But ideally onNavigate should be passed from App.js
      window.history.pushState(null, '', '/calendar');
      // We can't force App re-render from here easily without context
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!userRef.current) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.filter(n => !n.is_read).length);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Poll every 60 seconds as a fallback
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    // Connect to socket
    // The path must match the nginx location for notifications
    const newSocket = io('/', {
      path: '/api/notifications/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification service');
      // Join user-specific room for targeted notifications
      if (userRef.current && userRef.current.id) {
        newSocket.emit('join', userRef.current.id);
      }
    });

    newSocket.on('notification', (data) => {
      console.log('Notification received:', data);
      
      // Only process notifications for the current user
      const currentUserId = userRef.current?.id;
      if (data.user_id && currentUserId && data.user_id !== currentUserId) {
        return;
      }

      // Dedup: skip if we already processed this notification ID recently
      const notifId = data.id || `${data.title}_${data.created_at}`;
      if (recentNotifIds.current.has(notifId)) {
        return;
      }
      recentNotifIds.current.add(notifId);
      // Clean up old IDs after 10 seconds
      setTimeout(() => recentNotifIds.current.delete(notifId), 10000);

      // Refresh notifications list (this updates the bell icon + dropdown)
      fetchNotifications();

      // Show a translated toast notification
      if (userRef.current) {
        const meta = data.metadata || {};
        let toastTitle = data.title || 'Notificación';
        let toastMessage = data.message || '';

        // Translate known notification types for the toast
        if (meta.notifType === 'file_share') {
          toastTitle = '📁 Archivo compartido';
          toastMessage = meta.from && meta.fileName 
            ? `${meta.from} compartió "${meta.fileName}" contigo`
            : toastMessage;
        } else if (meta.notifType === 'calendar_assign' || meta.notifType === 'calendar_group') {
          toastTitle = '📅 Evento asignado';
          toastMessage = meta.from && meta.eventTitle
            ? `${meta.from} te asignó "${meta.eventTitle}"`
            : toastMessage;
        }

        addToast({
          title: toastTitle,
          message: toastMessage,
          type: data.type || 'info'
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, addToast, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead,
      fetchNotifications,
      handleNavigation
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
