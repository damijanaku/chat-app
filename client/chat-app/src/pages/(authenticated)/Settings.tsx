import React, { useState, useRef, useEffect } from 'react';
import { useApiClient } from '../../utils/ApiClient';
import { useAuth } from '../../context/AuthContext';
import { IoCamera } from 'react-icons/io5';
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { apiCall } = useApiClient();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
      });
    }
  }, [user]);

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

      const response = await apiCall('/api/v1/users', {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
  setIsSaving(true);
  setSaveStatus({ type: null, message: '' });

  try {
    const response = await apiCall('/api/v1/users', {  
      method: 'PUT',
      body: JSON.stringify(editForm),
      requiresAuth: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }

    const data = await response.json();

    if (data.user) {
      updateUser({
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
      });
    }

    setSaveStatus({
      type: 'success',
      message: 'Profile updated successfully!',
    });

    setIsEditing(false);
  } catch (err) {
    setSaveStatus({
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to update profile',
    });
  } finally {
    setIsSaving(false);
  }
};

  const handleCancel = () => {
    if (user) {
      setEditForm({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
      });
    }
    setIsEditing(false);
    setSaveStatus({ type: null, message: '' });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center text-gray-600 hover:text-blue-600 transition-colors duration-200"
        >
          <IoMdArrowRoundBack size={24} className="mr-2" />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Account Settings</h1>

        {/* Avatar Upload Section*/}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-200 border-4 border-gray-300 shadow-md">
              {avatar ? (
                <img
                  src={fullImageUrl || avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-5xl">
                  {user?.username?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              aria-label="Upload avatar"
            >
              <IoCamera size={24} />
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
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              Uploading...
            </div>
          )}

          {uploadStatus.type === 'error' && (
            <div className="mt-2 text-red-500 text-sm bg-red-50 px-4 py-2 rounded-md">
              {uploadStatus.message}
            </div>
          )}

          {uploadStatus.type === 'success' && (
            <div className="mt-2 text-green-500 text-sm bg-green-50 px-4 py-2 rounded-md">
              {uploadStatus.message}
            </div>
          )}

          <p className="text-sm text-gray-500 mt-2">Click the camera icon to change your profile picture</p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          {/* Edit Toggle Button */}
          <div className="flex justify-end mb-4">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {/* User Info - Display or Edit Mode */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100">
              <label className="sm:w-32 font-medium text-gray-700">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleInputChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              ) : (
                <span className="flex-1 text-gray-900">{user?.name || 'Not set'}</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100">
              <label className="sm:w-32 font-medium text-gray-700">Username</label>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={editForm.username}
                  onChange={handleInputChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                />
              ) : (
                <span className="flex-1 text-gray-900">{user?.username}</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100">
              <label className="sm:w-32 font-medium text-gray-700">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleInputChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email"
                />
              ) : (
                <span className="flex-1 text-gray-900">{user?.email}</span>
              )}
            </div>

            {saveStatus.type === 'error' && (
              <div className="mt-4 p-3 bg-red-50 text-red-500 text-sm rounded-md">
                {saveStatus.message}
              </div>
            )}

            {saveStatus.type === 'success' && (
              <div className="mt-4 p-3 bg-green-50 text-green-500 text-sm rounded-md">
                {saveStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;