'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ContextMenu.css';

type Position = {
  top: number;
  left: number;
};

type ContextMenuProps = {
  isOpen: boolean;
  position: Position;
  onClose: () => void;
  children?: React.ReactNode;
};

function ContextMenu({ isOpen, position, onClose, children }: ContextMenuProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const menuElement = target.closest('.context-menu-portal');
      if (!menuElement) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
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
  // por si renderiza en el servidor, document no existe
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="context-menu-portal"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

export default ContextMenu;
