import React, { useCallback, useEffect, useState } from "react";
import { MdOutlineSearch } from "react-icons/md";
import { FiLogOut } from "react-icons/fi";
import { useApiClient } from "../utils/ApiClient";
import { useAuth } from "../context/AuthContext";
import { CiSettings } from "react-icons/ci";
import { useNavigate } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";
import { IoMdArrowRoundForward } from "react-icons/io";

interface User {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

interface Conversation {
  roomId: string;
  otherUser: User | null;
  lastMessage: {
    content?: string | null;
    imageUrl?: string | null;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface NavbarProps {
  isOpen: boolean;
  onToggle: () => void;
  onUserSelect?: (user: User, roomId: string) => void;
}

const Navbar = ({ isOpen, onToggle, onUserSelect }: NavbarProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const { apiCall } = useApiClient();
  const { isAuthenticated, logout, user: currentUser } = useAuth();

  // Helper function to get full image URL
  const getFullImageUrl = (imageUrl: string | null | undefined): string | null => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const baseUrl = 'http://localhost:3000'; 
    const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${cleanUrl}`;
  };

  const currentUserAvatarUrl = getFullImageUrl(currentUser?.avatarUrl);
  const searchedUserAvatarUrl = getFullImageUrl(searchedUser?.avatarUrl);

  const loadRecentConversations = useCallback(async () => {
    setIsLoadingConversations(true);

    try {
      const response = await apiCall("/api/v1/rooms/conversations", {
        method: "GET",
        requiresAuth: true,
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Error loading recent conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [apiCall]);

  useEffect(() => {
    loadRecentConversations();
  }, [loadRecentConversations]);

async function getUsers(event: React.SubmitEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!searchTerm.trim()) return;

  setLoading(true);
  setError(null);
  setSearchedUser(null);

  try {
    const response = await apiCall(`/api/v1/users/username/${searchTerm}`, {
      method: "GET",
      requiresAuth: true,
    });

    if (response.ok) {
      const data = await response.json();

      if (data.userToReturn) {
        const userData = data.userToReturn;
        
        if (userData._id === currentUser?._id) {
          setError("You cannot search for yourself");
          setSearchedUser(null);
          return;
        }

        setSearchedUser({
          _id: userData._id,
          name: userData.name,
          username: userData.username,
          avatarUrl: userData.avatarUrl || null,
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

  const handleStartConversation = async () => {
    if (!searchedUser) return;

    setIsStartingChat(true);
    setError(null);

    try {
      const requestBody = {
        participantId: searchedUser._id,
        name: `Chat with ${searchedUser.name}`,
      };

      console.log("Creating room with data:", requestBody);

      const response = await apiCall("/api/v1/rooms", {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        const roomId = data.room?.id || data.roomId;
        console.log("Room ID obtained:", roomId);
        if (onUserSelect) {
          onUserSelect(searchedUser, roomId);
        }

        await loadRecentConversations();

        // Clear the search
        setSearchTerm("");
        setSearchedUser(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Room creation failed:", errorData);
        setError(errorData.message || "Failed to create or find conversation");
      }
    } catch (err: any) {
      console.error("Error starting conversation:", err);
      setError(err.message || "Error starting conversation");
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleConversationSelect = (conversation: Conversation) => {
    if (!conversation.otherUser) return;

    onUserSelect?.(conversation.otherUser, conversation.roomId);
    setConversations((previous) =>
      previous.map((item) =>
        item.roomId === conversation.roomId
          ? { ...item, unreadCount: 0 }
          : item
      )
    );
  };

  if (!isAuthenticated) {
    return (
      <>
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow transition-colors duration-200 hover:bg-gray-100"
        >
          {isOpen ? <IoMdArrowRoundBack /> : <IoMdArrowRoundForward />}
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
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow transition-colors duration-200 hover:bg-gray-100"
      >
        {isOpen ? <IoMdArrowRoundBack /> : <IoMdArrowRoundForward />}
      </button>

      <div
        className={`
          fixed top-0 left-0 h-full bg-white shadow-lg z-40
          transition-transform duration-300 ease-in-out 
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-64 flex flex-col
        `}
      >
        <div className="flex items-center justify-end h-16 px-4 border-b border-gray-200 ">
          <button
            onClick={handleLogout}
            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-100"
            title="Logout"
          >
            <FiLogOut size={20} />
          </button>
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

          {searchedUser && (
          <div className="p-4 border border-gray-300 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar for searched user */}
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold overflow-hidden flex-shrink-0">
                {searchedUserAvatarUrl ? (
                  <img
                    src={searchedUserAvatarUrl}
                    alt={searchedUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{searchedUser.name?.charAt(0).toUpperCase() || "?"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{searchedUser.name}</p>
                <p className="text-xs text-gray-500 truncate">@{searchedUser.username}</p>
              </div>
              <button
                onClick={handleStartConversation}
                disabled={isStartingChat}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
              >
                {isStartingChat ? "Starting..." : "Chat"}
              </button>
            </div>
          </div>
        )}

          <div className="font-bold mb-2">
            <span>Conversations:</span>
          </div>

          {isLoadingConversations && (
            <p className="text-sm text-gray-500">Loading conversations...</p>
          )}

          {!isLoadingConversations && conversations.length === 0 && (
            <p className="text-sm text-gray-500">
              No conversations yet. Search for a user to start one.
            </p>
          )}

          <div className="space-y-1">
            {conversations.map((conversation) => {
              const user = conversation.otherUser;
              if (!user) return null;

              const avatarUrl = getFullImageUrl(user.avatarUrl);
              const preview = conversation.lastMessage?.content ||
                (conversation.lastMessage?.imageUrl ? "Image" : "No messages yet");

              return (
                <button
                  key={conversation.roomId}
                  onClick={() => handleConversationSelect(conversation)}
                  className={"w-full flex items-center gap-3 p-2 text-left transition-colors"}
                >
                  <div className="w-10 h-10 round ed-full bg-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name?.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`${conversation.unreadCount > 0 ? "font-bold" : "font-medium"} text-gray-800 truncate`}>
                      {user.name}
                    </p>
                    <p className={`text-xs truncate ${conversation.unreadCount > 0 ? "font-bold text-gray-700" : "text-gray-500"}`}>
                      {preview}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                      {conversation.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current User Avatar Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
              {currentUserAvatarUrl ? (
                <img
                  src={currentUserAvatarUrl}
                  alt={currentUser?.name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{currentUser?.name?.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-800">
                {currentUser?.name || "User"}
              </p>
              <p className="text-xs text-gray-500">
                @{currentUser?.username || "username"}
              </p>
            </div>
            <button 
              onClick={() => navigate("/settings")} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-100"
            >
              <CiSettings size={25} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;