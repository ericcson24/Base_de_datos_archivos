'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Login from '../../components/auth/Login';
import { useTheme } from '../../context/ThemeContext';
import api from '../../lib/api';

// tipos de la respuesta del backend al hacer login
type LoginUser = {
  role?: string;
  token?: string;
  [key: string]: unknown;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  user?: LoginUser;
};

type LoginCredentials = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login', {
        username: credentials.username,
        password: credentials.password,
      });

      const data = response.data;

      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        // de momento mando todo a la home, los paneles los migro despues
        router.push('/');
      } else {
        throw new Error(data.message || 'Error');
      }
    } catch (error) {
      // axios mete el error del backend en response.data
      if (axios.isAxiosError(error) && error.response) {
        const data = (error.response.data || {}) as { message?: string; errorCode?: string };
        const e = new Error(data.message || `Error HTTP ${error.response.status}`) as Error & {
          code?: string;
        };
        e.code = data.errorCode;
        throw e;
      }
      throw error;
    }
  };

  return (
    <Login onLogin={handleLogin} onThemeToggle={toggleTheme} isDarkMode={isDarkMode} />
  );
}
