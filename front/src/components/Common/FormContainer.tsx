'use client';

import React from 'react';
import FrostedContainer from './FrostedContainer';
import './FormContainer.css';

type FormContainerProps = {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
};

function FormContainer({ children, title, subtitle, className = '' }: FormContainerProps) {
  return (
    <div className={`form-container-wrapper ${className}`}>
      <FrostedContainer variant="modal">
        {title && (
          <div className="form-header">
            <h2 className="form-title">{title}</h2>
            {subtitle && <p className="form-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="form-content">{children}</div>
      </FrostedContainer>
    </div>
  );
}

export default FormContainer;
