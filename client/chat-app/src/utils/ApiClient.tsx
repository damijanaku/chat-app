import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "http://localhost:3000";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export const useApiClient = () => {
  const { accessToken, refreshAccessToken, logout } = useAuth();

  const apiCall = async (url: string, options: RequestOptions = {}) => {
    const { requiresAuth = true, ...fetchOptions } = options;

    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

    // Prepare headers
    const isFormData = fetchOptions.body instanceof FormData;
    const headers: Record<string, string> = isFormData
      ? {}
      : { "Content-Type": "application/json" };

    if (requiresAuth) {
      if (!accessToken) {
        throw new Error("No access token available");
      }
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    fetchOptions.headers = {
      ...headers,
      ...fetchOptions.headers,
    };

    try {
      let response = await fetch(fullUrl, fetchOptions);

      if (response.status === 401 && requiresAuth) {
        console.log("Access token expired, attempting refresh...");

        const refreshSuccess = await refreshAccessToken();

        if (refreshSuccess) {
          const newToken = localStorage.getItem("accessToken");
          if (newToken) {
            fetchOptions.headers = {
              ...fetchOptions.headers,
              Authorization: `Bearer ${newToken}`,
            };

            // Retry the request
            response = await fetch(fullUrl, fetchOptions);
          } else {
            throw new Error("Failed to get new token");
          }
        } else {
          logout();
          throw new Error("Session expired. Please login again.");
        }
      }

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          try {
            const text = await response.text();
            if (text) {
              errorMessage = text;
            }
          } catch {}
        }
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }

      return response;
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  };

  return { apiCall };
};
