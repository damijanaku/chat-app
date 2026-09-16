import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar";
import ChatContainer from "../../components/ChatContainer";

interface User {
  _id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
}

const Dashboard = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const savedRoomId = localStorage.getItem("selectedRoomId");
    const savedUser = localStorage.getItem("selectedUser");

    if (savedRoomId) {
      setRoomId(savedRoomId);
    }
    if (savedUser) {
      try {
        setSelectedUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to parse saved user:", error);
        localStorage.removeItem("selectedUser");
      }
    }
  }, []);

  const handleUserSelect = (user: User, roomId: string) => {
    setSelectedUser(user);
    setRoomId(roomId);

    localStorage.setItem("selectedRoomId", roomId);
    localStorage.setItem("selectedUser", JSON.stringify(user));
  };

  return (
    <div className="min-h-screen relative">
      <Navbar
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        onUserSelect={handleUserSelect}
      />

      <div
        className={`transition-all duration-300 h-[calc(100vh-2rem)] p-4 md:p-8 ${
          isOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="h-full">
          <ChatContainer
            roomId={roomId}
            roomName={selectedUser?.name || "Chat Room"}
            otherUser={selectedUser || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;