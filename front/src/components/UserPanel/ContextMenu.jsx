import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

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
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default ContextMenu;
