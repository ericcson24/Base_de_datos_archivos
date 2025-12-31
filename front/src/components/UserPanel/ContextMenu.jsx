import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const ContextMenu = ({ isOpen, position, onClose, children }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      const menuElement = event.target.closest('.context-menu-portal');
      if (!menuElement) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="context-menu-portal"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000000,
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--sidebar-border)',
        borderRadius: '8px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.35)',
        padding: '8px 0',
        minWidth: '180px',
        animation: 'fadeInScale 0.2s ease-out'
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default ContextMenu;
