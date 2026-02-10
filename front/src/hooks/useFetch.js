import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';

export const useFetch = () => {
  const { addToast } = useToast();

  const fetchData = useCallback(async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      
      // Clone response to read body without consuming it for the caller if needed
      // But usually we parse JSON here.
      // If the caller expects a blob or text, this might be tricky.
      // For this refactor, we assume JSON API responses.
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        
        if (data.notification) {
          addToast(data.notification);
        }

        // Return a new object that mimics the response but with the parsed data
        return {
          ok: response.ok,
          status: response.status,
          headers: response.headers,
          json: async () => data, // Return the already parsed data
          originalResponse: response
        };
      }

      return response;
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }, [addToast]);

  return fetchData;
};
