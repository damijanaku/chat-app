import React, { useState, useRef, useEffect, useCallback } from "react";
import { FaPhone } from "react-icons/fa6";
import { IoChatbubbleEllipses } from "react-icons/io5";
import { IoIosCamera } from "react-icons/io";
import { FaArrowUp } from "react-icons/fa";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useApiClient } from "../utils/ApiClient";

interface User {
  _id: string;
  name: string;
  username: string;
}

interface Message {
  id: string;
  content: string;
  userId?: string;
  roomId?: string;
  createdAt: string;
  user?: {
    id: string;
    username: string;
    name: string;
  };
}

interface ChatContainerProps {
  roomId?: string;
  roomName?: string;
  otherUser?: User;
  onBack?: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  roomId,
  roomName = "Chat Room",
  otherUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { accessToken, user: currentUser } = useAuth();
  const { apiCall } = useApiClient();

  const apiCallRef = useRef(apiCall);
  useEffect(() => {
    apiCallRef.current = apiCall;
  });

  // Socket connection
  useEffect(() => {
    if (!accessToken || !roomId) return;

    const socketInstance = io("http://localhost:3000", {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      socketInstance.emit("join_room", roomId, (response: any) => {
        console.log("Joined room:", response);
      });
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socketInstance.on("chat_message", (message: Message) => {
      console.log("Received chat_message:", message);
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socketInstance.emit("leave_room", roomId);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [roomId, accessToken]);

  // Fetch existing messages
  useEffect(() => {
    if (!roomId || !accessToken) return;

    let cancelled = false;

    const fetchMessages = async () => {
      console.log("Fetching messages for room:", roomId);
      try {
        setLoading(true);
        const response = await apiCallRef.current(
          `/api/v1/messages/${roomId}`,
          {
            method: "GET",
            requiresAuth: true,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Failed to fetch messages:", errorData);
          if (!cancelled) setLoading(false);
          return;
        }

        const data = await response.json();
        console.log("Messages response:", data);
        if (!cancelled) {
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [roomId, accessToken]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    const messageContent = inputValue.trim();
    if (!messageContent || !roomId) return;

    setInputValue("");

    try {
      const response = await apiCallRef.current("/api/v1/messages", {
        method: "POST",
        requiresAuth: true,
        body: JSON.stringify({ roomId, content: messageContent }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Failed to send message:", err);
        setInputValue(messageContent);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setInputValue(messageContent);
    }
  }, [inputValue, roomId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const formatTimestamp = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderMessage = (message: Message) => {
    const senderId = message.userId || message.user?.id;
    const isOwnMessage = senderId === currentUser?._id;

    return (
      <div
        key={message.id || message.createdAt}
        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[70%] p-3 rounded-lg ${
            isOwnMessage
              ? "bg-blue-500 text-white rounded-br-none"
              : "bg-white text-gray-800 rounded-bl-none shadow-sm"
          }`}
        >
          {!isOwnMessage && message.user?.name && (
            <div className="text-xs font-semibold text-gray-500 mb-1">
              {message.user.name}
            </div>
          )}
          <p className="break-words">{message.content}</p>
          <div
            className={`text-xs mt-1 ${
              isOwnMessage ? "text-blue-100" : "text-gray-400"
            }`}
          >
            {formatTimestamp(message.createdAt)}
          </div>
        </div>
      </div>
    );
  };

  if (!roomId) {
    return (
      <div className="flex flex-col h-190 w-full max-w-2xl mx-auto border border-gray-200 rounded-lg bg-white shadow-lg items-center justify-center">
        <IoChatbubbleEllipses size="60" className="text-gray-300" />
        <h3 className="text-xl font-semibold text-gray-400 mt-4">
          No Chat Selected
        </h3>
        <p className="text-gray-400">
          Select a conversation to start messaging
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col h-190 w-full max-w-2xl mx-auto border border-gray-200 rounded-lg bg-white shadow-lg items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-500">Loading messages...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col h-190 w-full max-w-2xl mx-auto border border-gray-200 rounded-lg bg-white shadow-lg items-center justify-center">
        <div className="text-red-500 mb-4">
          <svg
            className="w-16 h-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-700">Connection Lost</h3>
        <p className="text-gray-500">Unable to connect to chat server</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-190 w-full max-w-2xl mx-auto border border-gray-200 rounded-lg bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden mr-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {otherUser?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {otherUser?.name || roomName}
            </h3>
            <p className="text-sm text-green-500 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></span>
              Online
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 p-4">
          <FaPhone
            className="cursor-pointer hover:text-blue-500 transition-colors"
            size={20}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <IoChatbubbleEllipses size="50" />
            <p className="text-lg font-medium mt-2">
              {otherUser ? `Say hello to ${otherUser.name}` : "No messages yet"}
            </p>
            <p className="text-sm">
              {otherUser
                ? `Start a conversation with ${otherUser.name}`
                : "Send the first message to get started"}
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-2 flex flex-row rounded-lg items-center bg-white w-full border-t border-gray-200">
        <button className="flex-shrink-0 p-2 mr-1 rounded-2xl bg-gray-200 hover:bg-gray-300 transition-colors">
          <IoIosCamera size="25" />
        </button>
        <div className="flex-1 min-w-0 mx-1">
          <input
            className="focus:outline-none w-full px-2 py-1"
            type="text"
            placeholder="Enter your message"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className={`flex-shrink-0 p-3 ml-1 rounded-2xl transition-colors ${
            inputValue.trim()
              ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
              : "bg-gray-200 cursor-not-allowed opacity-50"
          }`}
          disabled={!inputValue.trim()}
          onClick={handleSendMessage}
        >
          <FaArrowUp
            size="15"
            className={inputValue.trim() ? "text-white" : "text-gray-500"}
          />
        </button>
      </div>
    </div>
  );
};

export default ChatContainer;
