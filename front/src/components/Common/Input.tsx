'use client';

import React, { useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import FrostedContainer from './FrostedContainer';
import './Input.css';

type InputProps = {
  type?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'frosted';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  autoComplete?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'name' | 'placeholder' | 'value' | 'onChange' | 'size'
>;

function Input({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  error,
  icon,
  variant = 'default',
  size = 'medium',
  fullWidth = true,
  disabled = false,
  autoComplete,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const inputClasses = [
    'input-field',
    `input-${size}`,
    error ? 'input-error' : '',
    isFocused ? 'input-focused' : '',
    disabled ? 'input-disabled' : '',
    icon ? 'input-with-icon' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const containerClasses = [
    'input-container',
    fullWidth ? 'input-full-width' : '',
    variant === 'frosted' ? 'input-frosted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const inputElement = (
    <div className={containerClasses}>
      {icon && <span className="input-icon">{icon}</span>}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        autoComplete={autoComplete}
        className={inputClasses}
        {...props}
      />
      {error && (
        <span className="input-error-icon">
          <FiAlertTriangle />
        </span>
      )}
    </div>
  );

  if (variant === 'frosted') {
    return (
      <FrostedContainer variant="card" className="input-frosted-wrapper">
        {inputElement}
        {error && <div className="input-error-message">{error}</div>}
      </FrostedContainer>
    );
  }

  return (
    <div className="input-wrapper">
      {inputElement}
      {error && <div className="input-error-message">{error}</div>}
    </div>
  );
}

export default Input;
