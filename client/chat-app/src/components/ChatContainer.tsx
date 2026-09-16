import React, { useState, useRef, useEffect, useCallback } from "react";
import { IoChatbubbleEllipses } from "react-icons/io5";
import { IoIosCamera, IoMdClose } from "react-icons/io";
import { FaArrowUp } from "react-icons/fa";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { useApiClient } from "../utils/ApiClient";

interface User {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

interface Message {
  id: string;
  content: string;
  userId?: string;
  roomId?: string;
  createdAt: string;
  isRead?: boolean;
  imageUrl?: string;
  messageType?: string;
  user?: {
    id: string;
    username: string;
    name: string;
    avatarUrl?: string;
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
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const markReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoadRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { accessToken, user: currentUser } = useAuth();
  const { apiCall } = useApiClient();

  const apiCallRef = useRef(apiCall);
  useEffect(() => {
    apiCallRef.current = apiCall;
  }, [apiCall]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async () => {
    if (!roomId || !accessToken || hasMarkedRead) return;

    try {
      const response = await apiCallRef.current(
        `/api/v1/messages/${roomId}/read`,
        {
          method: "PUT",
          requiresAuth: true,
        }
      );

      if (response.ok) {
        setHasMarkedRead(true);
        // Updating local messages to show as read
        setMessages((prev) =>
          prev.map((msg) => 
            msg.userId !== currentUser?._id 
              ? { ...msg, isRead: true } 
              : msg
          )
        );
        console.log("Messages marked as read");
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [roomId, accessToken, hasMarkedRead, currentUser?._id]);

  // Debounced mark as read
  const debouncedMarkAsRead = useCallback(() => {
    if (markReadTimeoutRef.current) {
      clearTimeout(markReadTimeoutRef.current);
    }

    markReadTimeoutRef.current = setTimeout(() => {
      markMessagesAsRead();
    }, 1500);
  }, [markMessagesAsRead]);

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
      
      // Only marks as read if message is from someone else and not already read
      if (message.userId !== currentUser?._id && !message.isRead) {
        debouncedMarkAsRead();
      }
    });

    socketInstance.on("messages_read", (data: { userId: string; roomId: string; count: number }) => {
      console.log("Messages read by other user:", data);
    });

    return () => {
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
      socketInstance.emit("leave_room", roomId);
      socketInstance.disconnect();
      socketRef.current = null;
      setHasMarkedRead(false);
      isFirstLoadRef.current = true;
    };
  }, [roomId, accessToken, currentUser?._id, debouncedMarkAsRead]);

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
          
          // Only marks as read on first load
          if (isFirstLoadRef.current && data.messages?.length > 0) {
            isFirstLoadRef.current = false;
            setTimeout(() => {
              markMessagesAsRead();
            }, 1000);
          }
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
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
    };
  }, [roomId, accessToken]); 

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Marks as read when user interacts - only if there are unread messages
  const handleUserInteraction = useCallback(() => {
    const hasUnreadMessages = messages.some(
      msg => msg.userId !== currentUser?._id && !msg.isRead
    );
    
    if (hasUnreadMessages) {
      debouncedMarkAsRead();
    }
  }, [messages, currentUser?._id, debouncedMarkAsRead]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Image selected:', file);

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image (JPEG, PNG, GIF, or WEBP)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('Image size should be less than 10MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle send message with image support
  const handleSendMessage = useCallback(async () => {
    const messageContent = inputValue.trim();
    
    // Check if there's content or image to send
    if ((!messageContent && !selectedImage) || !roomId || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append('roomId', roomId);
      
      if (messageContent) {
        formData.append('content', messageContent);
      }
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await apiCallRef.current('/api/v1/messages', {
        method: 'POST',
        requiresAuth: true,
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error('Failed to send message:', err);
        setInputValue(messageContent);
      } else {
        setInputValue('');
        removeSelectedImage();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setInputValue(messageContent);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, selectedImage, roomId, isSending]);

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
    const isRead = message.isRead;
    const fullImageUrl = getFullImageUrl(message.imageUrl);

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
          
          {message.imageUrl && (
          <img 
            src={fullImageUrl ?? undefined}
            alt="Message attachment"
            className="max-w-full rounded-lg mb-2 max-h-60 object-cover cursor-pointer"
            onClick={() => window.open(fullImageUrl ?? undefined, '_blank')}
          />
        )}
          
          {message.content && (
            <p className="break-words">{message.content}</p>
          )}
          
          <div
            className={`text-xs mt-1 flex items-center gap-1 ${
              isOwnMessage ? "text-blue-100" : "text-gray-400"
            }`}
          >
            {formatTimestamp(message.createdAt)}
            
            {isOwnMessage && (
              <span className="ml-1">
                {isRead ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Listen for scroll events to mark as read
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop > 0) {
      const hasUnreadMessages = messages.some(
        msg => msg.userId !== currentUser?._id && !msg.isRead
      );
      if (hasUnreadMessages) {
        debouncedMarkAsRead();
      }
    }
  }, [messages, currentUser?._id, debouncedMarkAsRead]);

  const getFullImageUrl = (imageUrl: string | null | undefined): string | null => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    const baseUrl = 'http://localhost:3000'; 
    const cleanUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${cleanUrl}`;
  };

  if (!roomId) {
    return (
      <div className="flex h-full min-h-[32rem] w-full flex-col border border-gray-200 rounded-lg bg-white shadow-lg items-center justify-center">
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
      <div className="flex h-full min-h-[32rem] w-full flex-col border border-gray-200 rounded-lg bg-white shadow-lg items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-500">Loading messages...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex h-full min-h-[32rem] w-full flex-col border border-gray-200 rounded-lg bg-white shadow-lg items-center justify-center">
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
    <div className="flex h-full min-h-[32rem] w-full flex-col border border-gray-200 rounded-lg bg-white shadow-lg">
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
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
            {otherUser?.avatarUrl ? (
              <img
                src={getFullImageUrl(otherUser.avatarUrl) ?? undefined}
                alt={`${otherUser.name || "User"}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg">{otherUser?.name?.charAt(0).toUpperCase() || "U"}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">
              {otherUser?.name || roomName}
            </h3>

          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-100"
        onScroll={handleScroll}
        onClick={handleUserInteraction}
      >
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

      {/* Input area with image support */}
      <div className="flex flex-col bg-white border-t border-gray-200">
        {/* Image Preview */}
        {imagePreview && (
          <div className="relative p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-32 rounded-lg object-cover"
              />
              <button
                onClick={removeSelectedImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                disabled={isSending}
              >
                <IoMdClose size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="p-2 flex flex-row rounded-lg items-center">
          <button 
            className="flex-shrink-0 p-2 mr-1 rounded-2xl bg-gray-200 hover:bg-gray-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <IoIosCamera size="25" className={isSending ? "opacity-50" : ""} />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isSending}
          />

          <div className="flex-1 min-w-0 mx-1">
            <input
              className="focus:outline-none w-full px-2 py-1"
              type="text"
              placeholder={selectedImage ? "Add a caption..." : "Enter your message"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleUserInteraction}
              disabled={isSending}
            />
          </div>

          <button
            className={`flex-shrink-0 p-3 ml-1 rounded-2xl transition-colors ${
              (inputValue.trim() || selectedImage) && !isSending
                ? "bg-blue-500 hover:bg-blue-600 cursor-pointer"
                : "bg-gray-200 cursor-not-allowed opacity-50"
            }`}
            disabled={(!inputValue.trim() && !selectedImage) || isSending}
            onClick={handleSendMessage}
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaArrowUp
                size="15"
                className={(inputValue.trim() || selectedImage) ? "text-white" : "text-gray-500"}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatContainer;