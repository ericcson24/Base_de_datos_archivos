import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaCheckDouble, FaInfoCircle, FaTasks, FaExclamationTriangle, FaShareAlt, FaCalendarPlus } from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleNavigation } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useLanguage();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      handleNavigation(notification.link);
      setIsOpen(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'task':
        return <FaCalendarPlus color="#1890ff" />;
      case 'share':
      case 'info':
        return <FaShareAlt color="#4caf50" />;
      case 'warning':
        return <FaExclamationTriangle color="#faad14" />;
      case 'error':
        return <FaExclamationTriangle color="#ff4d4f" />;
      default:
        return <FaInfoCircle color="#1890ff" />;
    }
  };

  // Translate notification title/message based on metadata
  const getTranslatedTitle = (notification) => {
    const meta = notification.metadata;
    if (meta && meta.notifType === 'file_share') {
      return t('notifications.fileSharedTitle');
    }
    if (meta && meta.notifType === 'calendar_assign') {
      return t('notifications.eventAssignedTitle');
    }
    return notification.title;
  };

  const getTranslatedMessage = (notification) => {
    const meta = notification.metadata;
    if (meta && meta.notifType === 'file_share') {
      return t('notifications.fileSharedMessage', { user: meta.from, file: meta.fileName });
    }
    if (meta && meta.notifType === 'calendar_assign') {
      return t('notifications.eventAssignedMessage', { user: meta.from, event: meta.eventTitle });
    }
    return notification.message;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return t('notifications.justNow');
    if (diff < 3600000) return t('notifications.minutesAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('notifications.hoursAgo', { count: Math.floor(diff / 3600000) });
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button 
        className="notification-bell" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('notifications.title')}
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <ul className="notification-list">
            {notifications.length === 0 ? (
              <li className="notification-empty">
                {t('notifications.empty')}
              </li>
            ) : (
              notifications.map(notification => (
                <li 
                  key={notification.id} 
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{getTranslatedTitle(notification)}</div>
                    <div className="notification-message">{getTranslatedMessage(notification)}</div>
                    <div className="notification-time">{formatTime(notification.created_at)}</div>
                  </div>
                  {!notification.is_read && <div className="notification-dot" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;