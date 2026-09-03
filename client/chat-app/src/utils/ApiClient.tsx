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

      const isFormData = fetchOptions.body instanceof FormData;
      const headers: Record<string, string> = isFormData
        ? {}
        : { "Content-Type": "application/json" };

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
