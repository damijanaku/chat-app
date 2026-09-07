import React, { createContext, useContext, useState, useEffect } from "react";

export interface AuthUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshToken: string, userData: AuthUser) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  updateUser: (partial: Partial<AuthUser>) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    const storedUserData = localStorage.getItem("userData");

    if (storedAccessToken && storedRefreshToken && storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData) as AuthUser;
        setUser(parsedUser);
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
      } catch (error) {
        console.error("Failed to parse user data:", error);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userData");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (
    newAccessToken: string,
    newRefreshToken: string,
    userData: AuthUser
  ) => {
    localStorage.setItem("accessToken", newAccessToken);
    localStorage.setItem("refreshToken", newRefreshToken);
    localStorage.setItem("userData", JSON.stringify(userData));

    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUser(userData);
  };

  const logout = () => {
    console.log("Logging out...");

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("selectedRoomId");
    localStorage.removeItem("selectedUser");

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);

    window.location.href = "/login";
  };

  // rest of the app sees the new values without a full refetch.
  const updateUser = (partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("userData", JSON.stringify(updated));
      return updated;
    });
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken) {
      logout();
      return false;
    }

    try {
      const response = await fetch(
        "http://localhost:5204/api/users/refreshToken",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken;

        localStorage.setItem("accessToken", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);

        return true;
      } else {
        console.log("Refresh token failed with status:", response.status);
        logout();
        return false;
      }
    } catch (error) {
      console.error("Refresh token failed:", error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    login,
    logout,
    refreshAccessToken,
    updateUser,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};