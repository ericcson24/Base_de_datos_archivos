'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// verifica el token guardado contra /api/auth/verify (como hacia App.js)
export function useAuth(requireAdmin: boolean = false) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

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
          const userWithToken = {
            ...data.user,
            token: storedToken || data.token
          };
          userWithToken.role = (userWithToken.role || '').toLowerCase();
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
          }
          if (cancelled) return;

          if (requireAdmin && userWithToken.role !== 'admin') {
            router.replace('/folders');
            return;
          }

          setUser(userWithToken);
          setLoading(false);
        } else {
          localStorage.removeItem('auth_token');
          if (!cancelled) router.replace('/login');
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        localStorage.removeItem('auth_token');
        if (!cancelled) router.replace('/login');
      }
    };

    checkStoredToken();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = (updatedFields: any) => {
    setUser((prev: any) => ({ ...prev, ...updatedFields }));
  };

  return { user, loading, setUser, updateUser };
}

// cierra sesion como en App.js
export async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Error en logout:', error);
  }
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax';
  document.cookie = 'connect.sid=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax';
  window.location.href = '/login';
}
