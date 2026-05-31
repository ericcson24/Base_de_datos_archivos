import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import './shared.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Mi Nube',
  description: 'Mi nube personal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
