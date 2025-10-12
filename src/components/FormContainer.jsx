import React from 'react';
import FrostedContainer from './FrostedContainer';
import './FormContainer.css';

const FormContainer = ({
  children,
  title,
  subtitle,
  className = '',
  maxWidth = '400px'
}) => {
  return (
    <div className={`form-container-wrapper ${className}`} style={{ maxWidth }}>
      <FrostedContainer variant="modal">
        {title && (
          <div className="form-header">
            <h2 className="form-title">{title}</h2>
            {subtitle && <p className="form-subtitle">{subtitle}</p>}
          </div>
        )}
        <div className="form-content">
          {children}
        </div>
      </FrostedContainer>
    </div>
  );
};

export default FormContainer;