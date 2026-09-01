import { useState } from "react";
import Navbar from "../../components/Navbar";

const Dashboard = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />

      <div
        className={`transition-all duration-300 p-8 ${
          isOpen ? "ml-64" : "ml-0"
        }`}
      >
        <h1 className="text-2xl font-bold mt-12">Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Card 1</h2>
            <p>Content goes here</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold">Card 2</h2>
            <p>Content goes here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
