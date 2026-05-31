'use client';

import axios from 'axios';

// instancia de axios para hablar con el backend
// las rutas /api van por el rewrite de next al gateway
const api = axios.create({
  baseURL: '/',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// si tengo token lo meto en cada peticion
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
