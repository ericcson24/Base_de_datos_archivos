'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '../components/common/LoadingScreen';

// pagina raiz: verifica el token y redirige segun el rol (como hacia App.js)
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkStoredToken = async () => {
      const storedToken = localStorage.getItem('auth_token');
      try {
        const headers: any = {};
        if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;

        const response = await fetch('/api/auth/verify', {
          headers,
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) localStorage.setItem('auth_token', data.token);
          const role = (data.user?.role || '').toLowerCase();
          if (role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/folders');
          }
        } else {
          localStorage.removeItem('auth_token');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        localStorage.removeItem('auth_token');
        router.replace('/login');
      }
    };

    checkStoredToken();
  }, [router]);

  return <LoadingScreen />;
}
