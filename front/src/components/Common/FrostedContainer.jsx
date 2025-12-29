import React from 'react';
import './FrostedContainer.css';

const FrostedContainer = ({ children, className = '', variant = 'default' }) => {
  return (
    <>
      {/* SVG Filter Definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="frosted" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.1" numOctaves="1" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8"/>
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"/>
          </filter>
        </defs>
      </svg>

      {/* Container with frosted effect */}
      <div className={`frosted-container ${variant} ${className}`}>
        {children}
      </div>
    </>
  );
};

export default FrostedContainer;