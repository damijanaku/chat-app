import React, { useState } from "react";
import { useApiClient } from "../utils/ApiClient";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const { apiCall } = useApiClient();

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await apiCall("/api/v1/users/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
        requiresAuth: false,
      });

      if (response.ok) {
        navigate("/dashboard");
      } else {
        const errorBody = await response.text();
        setErrorMessage(errorBody || "Login failed. Please try again.");
      }
    } catch (error) {
      setErrorMessage("An error occurred while loging in. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 justify-center items-center bg-[#FFC5BB] min-h-screen">
      <div className="flex flex-col gap-2 bg-white p-8 rounded-lg shadow-md w-xl max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Login</h1>
        <p className="text-sm text-gray-500 text-center mb-4">
          Please enter your login information
        </p>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-[#F28378]"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              placeholder="johndoe"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-white py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F28378] focus:border-transparent"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-[#F28378]"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-white py-2 px-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F28378] focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full p-2 mt-4 rounded bg-[#EF9A9A] py-2.5 text-sm font-medium text-white transition-colors duration-300 hover:bg-[#E57373] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Logging in..." : "Submit"}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center mt-4">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-[#F28378] hover:underline font-medium"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
