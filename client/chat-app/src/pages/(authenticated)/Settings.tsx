import React, { useState, useRef } from 'react';
import { useApiClient } from '../../utils/ApiClient';
import { useAuth } from '../../context/AuthContext';
import { IoCamera } from 'react-icons/io5';
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';


const Settings = () => {
  const { apiCall } = useApiClient();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const avatar = user?.avatarUrl ?? null;
  const fullImageUrl = getFullImageUrl(avatar); 

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({
        type: 'error',
        message: 'Please upload a valid image file (JPEG, PNG, GIF, or WEBP)',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus({
        type: 'error',
        message: 'File size must be less than 5MB',
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await apiCall('/api/v1/users/profile-picture', {
        method: 'PUT',
        body: formData,
        requiresAuth: true,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload avatar');
      }

      const data = await response.json();

      if (data.user) {
        // new avatarUrl back into context + localStorage
        updateUser({ avatarUrl: data.user.avatarUrl ?? null });
      }

      setUploadStatus({
        type: 'success',
        message: 'Profile picture updated successfully!',
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to upload avatar',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-6">
        <button
            onClick={() => navigate("/dashboard")}
            className="mb-4 flex items-center text-black-500 hover:text-blue-700 transition-colors duration-200"
            >
            <IoMdArrowRoundBack size={24} className="mr-2" />
            Back
        </button>

        <h1 className="text-2xl font-bold mb-6 text-center">Settings</h1>

        {/* Avatar Upload Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-gray-300">
              {avatar ? (
                <img
                  src={fullImageUrl || avatar} 
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-4xl">
                  {user?.username?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Upload avatar"
            >
              <IoCamera size={20} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />

          {isUploading && (
            <div className="mt-2 text-blue-500 flex items-center gap-2">
              Uploading...
            </div>
          )}

          {uploadStatus.type === 'error' && (
            <div className="mt-2 text-red-500 text-sm">{uploadStatus.message}</div>
          )}

          {uploadStatus.type === 'success' && (
            <div className="mt-2 text-green-500 text-sm">{uploadStatus.message}</div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="mt-4 space-y-2">
            <p><strong>Name:</strong> {user?.name}</p>
            <p><strong>Username:</strong> {user?.username}</p>
            <p><strong>Email:</strong> {user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;