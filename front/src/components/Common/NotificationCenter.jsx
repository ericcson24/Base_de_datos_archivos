import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaCheckDouble, FaInfoCircle, FaTasks, FaExclamationTriangle } from 'react-icons/fa';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleNavigation } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
        return <FaTasks color="#1890ff" />;
      case 'warning':
        return <FaExclamationTriangle color="#faad14" />;
      case 'error':
        return <FaExclamationTriangle color="#ff4d4f" />;
      default:
        return <FaInfoCircle color="#1890ff" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Hace un momento';
    
    // Less than 1 hour
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    
    // Less than 24 hours
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
    
    // Otherwise date
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button 
        className="notification-bell" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
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
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Marcar todas leídas
              </button>
            )}
          </div>

          <ul className="notification-list">
            {notifications.length === 0 ? (
              <li className="notification-empty">
                No tienes notificaciones
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
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
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