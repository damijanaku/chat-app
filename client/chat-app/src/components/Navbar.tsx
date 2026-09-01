import React, { useState } from "react";
import { MdOutlineSearch } from "react-icons/md";
import { useApiClient } from "../utils/ApiClient";
import { useAuth } from "../context/AuthContext";

interface User {
  _id: string;
  name: string;
  username: string;
  birthday: string;
  createdAt: string;
}

interface NavbarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Navbar = ({ isOpen, onToggle }: NavbarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { apiCall } = useApiClient();
  const { isAuthenticated, logout } = useAuth();

  async function getUsers(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setUser(null);

    try {
      const response = await apiCall(`/api/v1/users/username/${searchTerm}`, {
        method: "GET",
        requiresAuth: true,
      });

      if (response.ok) {
        const data = await response.json();

        // user from the response
        if (data.userToReturn) {
          const userData = data.userToReturn;
          setUser({
            _id: userData._id,
            name: userData.name,
            username: userData.username,
            birthday: userData.birthday,
            createdAt: userData.createdAt,
          });
          setError(null);
        } else {
          setError(`User "${searchTerm}" not found`);
        }
      } else if (response.status === 404) {
        setError(`User "${searchTerm}" not found`);
      } else {
        setError(`Error: ${response.status} - Failed to fetch user`);
      }
    } catch (err: any) {
      if (err.message === "Session expired. Please login again.") {
        setError("Session expired. Please login again.");
      } else if (err.status === 401) {
        setError("Authentication failed. Please login again.");
        logout();
      } else if (err.message.includes("No access token")) {
        setError("Please login to search for users.");
      } else {
        setError(err.message || "An error occurred while fetching the user");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow transition-colors duration-200"
        >
          {isOpen ? "<" : ">"}
        </button>
        <div
          className={`
            fixed top-0 left-0 h-full bg-white shadow-lg z-40
            transition-transform duration-300 ease-in-out
            ${isOpen ? "translate-x-0" : "-translate-x-full"}
            w-64 flex flex-col
          `}
        >
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <span className="text-xl font-bold text-center text-gray-800">
              Logo
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto flex items-center justify-center">
            <p className="text-red-500">Please login to continue</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow transition-colors duration-200"
      >
        {isOpen ? "<" : ">"}
      </button>

      <div
        className={`
          fixed top-0 left-0 h-full bg-white shadow-lg z-40
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-64 flex flex-col
        `}
      >
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
          <span className="text-xl font-bold text-center text-gray-800">
            Logo
          </span>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="font-bold mb-2">
            <span>Find user by username</span>
          </div>

          <form
            onSubmit={getUsers}
            className="flex items-center gap-2 mb-4 p-2 border border-gray-300 rounded-lg focus-within:border-blue-500"
          >
            <MdOutlineSearch className="text-gray-400 text-xl" />
            <input
              placeholder="Search"
              className="focus:outline-none flex-1 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          {loading && (
            <p className="text-sm text-gray-500 mb-4">Searching...</p>
          )}

          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          {user && (
            <div className="p-3 mb-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
                  <p className="text-xs text-gray-500">
                    Birthday: {new Date(user.birthday).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="font-bold mb-2">
            <span>Conversations:</span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200"></div>
      </div>
    </>
  );
};

export default Navbar;
