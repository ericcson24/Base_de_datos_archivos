import React from 'react';
import './BaseLayout.css';

type BaseLayoutProps = {
  children?: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  className?: string;
  backgroundColor?: string;
};

function BaseLayout({
  children,
  title,
  showHeader = true,
  showFooter = false,
  headerContent,
  footerContent,
  className = '',
  backgroundColor = '#f0f2f5',
}: BaseLayoutProps) {
  // paso el color de fondo como variable css
  const style = {
    '--bg-color': backgroundColor,
  } as React.CSSProperties;

  return (
    <div className={`base-layout ${className}`} style={style}>
      {showHeader && (
        <header className="layout-header">
          <div className="header-content">
            {title && <h1 className="layout-title">{title}</h1>}
            {headerContent}
          </div>
        </header>
      )}

      <main className="layout-main">{children}</main>

      {showFooter && (
        <footer className="layout-footer">
          <div className="footer-content">{footerContent}</div>
        </footer>
      )}
    </div>
  );
}

export default BaseLayout;
