'use client';

import React from 'react';
import './FrostedContainer.css';

type FrostedContainerProps = {
  children?: React.ReactNode;
  className?: string;
  variant?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

function FrostedContainer({ children, className = '', variant = 'default', onClick }: FrostedContainerProps) {
  return (
    <>
      <svg className="frosted-svg-def">
        <defs>
          <filter id="frosted" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.1" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" />
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
          </filter>
        </defs>
      </svg>

      <div className={`frosted-container ${variant} ${className}`} onClick={onClick}>{children}</div>
    </>
  );
}

export default FrostedContainer;
