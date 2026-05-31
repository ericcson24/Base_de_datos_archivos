'use client';

import React from 'react';

// pantalla de carga igual que la de App.js
export default function LoadingScreen() {
  return (
    <div className="App app-loading-container">
      <div className="app-loading-content">
        <img className="app-loading-logo" src="/icons/nube.svg" alt="Logo" />
        <div className="app-loading-spinner"></div>
      </div>
    </div>
  );
}
