import React from 'react';
import FrostedContainer from './FrostedContainer';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) => {
  const buttonClasses = [
    'button',
    `button-${variant}`,
    `button-${size}`,
    fullWidth ? 'button-full-width' : '',
    loading ? 'button-loading' : '',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (loading || disabled) return;
    onClick?.(e);
  };

  if (variant === 'frosted') {
    return (
      <FrostedContainer variant="button" className={buttonClasses}>
        <button
          type={type}
          onClick={handleClick}
          disabled={disabled || loading}
          className="frosted-button-content"
          {...props}
        >
          {loading && <span className="button-spinner">⏳</span>}
          <span className="button-text">{children}</span>
        </button>
      </FrostedContainer>
    );
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={buttonClasses}
      {...props}
    >
      {loading && <span className="button-spinner">⏳</span>}
      <span className="button-text">{children}</span>
    </button>
  );
};

export default Button;