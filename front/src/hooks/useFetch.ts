'use client';

import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';

// envuelve fetch para sacar notificaciones del backend igual que antes
export const useFetch = () => {
  const { addToast } = useToast();

  const fetchData = useCallback(
    async (url: string, options: RequestInit = {}) => {
      try {
        const response = await fetch(url, options);

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.indexOf('application/json') !== -1) {
          const data = await response.json();

          if (data.notification) {
            addToast(data.notification);
          }

          return {
            ok: response.ok,
            status: response.status,
            headers: response.headers,
            json: async () => data,
            originalResponse: response,
          };
        }

        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    },
    [addToast]
  );

  return fetchData;
};
