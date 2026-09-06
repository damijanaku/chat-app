import { useAuth } from "../context/AuthContext";
import { useCallback } from "react";

const API_BASE_URL = "http://localhost:3000";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const useApiClient = () => {
  const { accessToken, refreshAccessToken, logout } = useAuth();

  const apiCall = useCallback(
    async (url: string, options: RequestOptions = {}) => {
      const { requiresAuth = true, ...fetchOptions } = options;

      const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

      // checking if body is FormData
      const isFormData = fetchOptions.body instanceof FormData;
      
      // Only set Content-Type header if not FormData
      const headers: Record<string, string> = {};
      
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      if (requiresAuth) {
        if (!accessToken) {
          const error = new Error("No access token available");
          (error as any).status = 401;
          throw error;
        }
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      fetchOptions.headers = {
        ...headers,
        ...fetchOptions.headers,
      };

      // Don't stringify FormData
      if (fetchOptions.body && !isFormData && typeof fetchOptions.body === 'object') {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
      }

      let response = await fetch(fullUrl, fetchOptions);

      if (response.status === 401 && requiresAuth) {
        const refreshSuccess = await refreshAccessToken();

        if (refreshSuccess) {
          const newToken = localStorage.getItem("accessToken");
          if (newToken) {
            fetchOptions.headers = {
              ...fetchOptions.headers,
              Authorization: `Bearer ${newToken}`,
            };
            response = await fetch(fullUrl, fetchOptions);
          } else {
            throw new Error("Failed to get new token");
          }
        } else {
          logout();
          throw new Error("Session expired. Please login again.");
        }
      }

      return response;
    },
    [accessToken, refreshAccessToken, logout]
  );

  return { apiCall };
};