'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

interface UsernameEditorProps {
  currentUsername?: string;
  displayName?: string;
  onSave: (username: string) => Promise<void>;
}

const UsernameEditor: React.FC<UsernameEditorProps> = ({
  currentUsername,
  displayName,
  onSave
}) => {
  const [username, setUsername] = useState(currentUsername || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availability, setAvailability] = useState<'available' | 'taken' | 'invalid' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate suggested username from display name
  const generateSuggestedUsername = () => {
    if (!displayName) return '';
    
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 20); // Limit length
  };

  // Check username availability
  const checkUsernameAvailability = async (value: string) => {
    if (!value || value.length < 3) {
      setAvailability(null);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch('/api/user/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: value }),
      });

      const data = await response.json();

      if (data.success) {
        setAvailability(data.available ? 'available' : 'taken');
      } else {
        setAvailability('invalid');
        setError(data.error);
      }
    } catch (error) {
      setAvailability('invalid');
      setError('Failed to check username availability');
    } finally {
      setIsChecking(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username && username !== currentUsername) {
        checkUsernameAvailability(username);
      } else {
        setAvailability(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, currentUsername]);

  const handleSave = async () => {
    if (!username || availability !== 'available') return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(username);
      setIsEditing(false);
      setAvailability(null);
    } catch (error: any) {
      setError(error.message || 'Failed to save username');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(currentUsername || '');
    setIsEditing(false);
    setAvailability(null);
    setError(null);
  };

  const handleSuggestUsername = () => {
    const suggested = generateSuggestedUsername();
    if (suggested) {
      setUsername(suggested);
    }
  };

  const getAvailabilityIcon = () => {
    if (isChecking) {
      return <Loader2 size={16} className="animate-spin text-gray-400" />;
    }
    
    switch (availability) {
      case 'available':
        return <Check size={16} className="text-green-500" />;
      case 'taken':
        return <X size={16} className="text-red-500" />;
      case 'invalid':
        return <X size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getAvailabilityText = () => {
    if (isChecking) return 'Checking...';
    
    switch (availability) {
      case 'available':
        return 'Username is available';
      case 'taken':
        return 'Username is already taken';
      case 'invalid':
        return error || 'Invalid username';
      default:
        return '';
    }
  };

  const getAvailabilityColor = () => {
    switch (availability) {
      case 'available':
        return 'text-green-500';
      case 'taken':
      case 'invalid':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  if (!isEditing) {
    return (
      <div className="flex justify-between items-center">
        <div>
          <span className="text-white/60">Username</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white font-medium">
              {currentUsername ? `@${currentUsername}` : 'Not set'}
            </span>
            {!currentUsername && (
              <span className="text-xs text-gray-400">(Click to set)</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="px-3 py-1 text-sm bg-lime-600 hover:bg-lime-700 text-white rounded-lg transition-colors duration-200"
        >
          {currentUsername ? 'Edit' : 'Set Username'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">
          Username
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-8 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
              placeholder="Enter username"
              maxLength={30}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getAvailabilityIcon()}
            </div>
          </div>
          {displayName && (
            <button
              onClick={handleSuggestUsername}
              className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
            >
              Suggest
            </button>
          )}
        </div>
        
        {/* Availability status */}
        {availability && (
          <p className={`text-sm mt-1 ${getAvailabilityColor()}`}>
            {getAvailabilityText()}
          </p>
        )}
        
        {/* Username requirements */}
        <div className="text-xs text-gray-400 mt-2 space-y-1">
          <p>• 3-30 characters long</p>
          <p>• Letters, numbers, hyphens, and underscores only</p>
          <p>• Must be unique</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!username || availability !== 'available' || isSaving}
          className="px-4 py-2 bg-lime-600 hover:bg-lime-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Save
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default UsernameEditor;
