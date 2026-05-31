'use client';

import React, { createContext, useEffect, useRef, useState, useCallback, useContext } from 'react';
import io, { Socket } from 'socket.io-client';
import { useToast } from './ToastContext';
import { getAuthToken } from '../utils/fileUtils';

// una notificacion tal cual viene del backend
type AppNotification = {
  id: number | string;
  title?: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  is_read?: boolean;
  user_id?: number | string;
  created_at?: string;
  metadata?: {
    notifType?: string;
    from?: string;
    fileName?: string;
    eventTitle?: string;
    permission?: string;
  };
};

type AppUser = {
  id?: number | string;
  [key: string]: unknown;
};

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: number | string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  handleNavigation: (link: string) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

type NotificationProviderProps = {
  children: React.ReactNode;
  user: AppUser | null;
  onNavigate?: (link: string) => void;
};

export const NotificationProvider = ({ children, user, onNavigate }: NotificationProviderProps) => {
  const { addToast } = useToast();
  const userRef = useRef<AppUser | null>(user);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const recentNotifIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const handleNavigation = (link: string) => {
    if (onNavigate) {
      onNavigate(link);
    } else if (link === '/calendar') {
      window.history.pushState(null, '', '/calendar');
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!userRef.current) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.filter((n: AppNotification) => !n.is_read).length);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const markAsRead = async (id: number | string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
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
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const token = getAuthToken();
    const newSocket: Socket = io('/', {
      path: '/api/notifications/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('Connected to notification service');
      if (userRef.current && userRef.current.id) {
        newSocket.emit('join', userRef.current.id);
      }
    });

    newSocket.on('notification', (data: AppNotification) => {
      console.log('Notification received:', data);

      const currentUserId = userRef.current?.id;
      if (data.user_id && currentUserId && data.user_id !== currentUserId) {
        return;
      }

      const notifId = String(data.id || `${data.title}_${data.created_at}`);
      if (recentNotifIds.current.has(notifId)) {
        return;
      }
      recentNotifIds.current.add(notifId);
      setTimeout(() => recentNotifIds.current.delete(notifId), 10000);

      fetchNotifications();

      if (userRef.current) {
        const meta = data.metadata || {};
        let toastTitle = data.title || 'Notificación';
        let toastMessage = data.message || '';

        if (meta.notifType === 'file_share') {
          toastTitle = '📁 Archivo compartido';
          toastMessage =
            meta.from && meta.fileName
              ? `${meta.from} compartió "${meta.fileName}" contigo`
              : toastMessage;
        } else if (meta.notifType === 'file_unshared') {
          toastTitle = '🚫 Acceso revocado';
          toastMessage =
            meta.from && meta.fileName
              ? `${meta.from} dejó de compartir "${meta.fileName}" contigo`
              : toastMessage;
        } else if (meta.notifType === 'file_shared_deleted') {
          toastTitle = '🗑️ Archivo eliminado';
          toastMessage =
            meta.from && meta.fileName
              ? `${meta.from} eliminó "${meta.fileName}" (compartido contigo)`
              : toastMessage;
        } else if (meta.notifType === 'file_permission_changed') {
          toastTitle = '🔑 Permiso actualizado';
          const permLabel = meta.permission === 'read' ? 'solo lectura' : 'edición';
          toastMessage =
            meta.from && meta.fileName
              ? `${meta.from} cambió el permiso de "${meta.fileName}" a ${permLabel}`
              : toastMessage;
        } else if (meta.notifType === 'calendar_assign' || meta.notifType === 'calendar_group') {
          toastTitle = '📅 Evento asignado';
          toastMessage =
            meta.from && meta.eventTitle
              ? `${meta.from} te asignó "${meta.eventTitle}"`
              : toastMessage;
        }

        addToast({
          title: toastTitle,
          message: toastMessage,
          type: data.type || 'info',
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, addToast, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        handleNavigation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
