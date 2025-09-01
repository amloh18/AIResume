'use client';

import React, { useState } from 'react';
import { UserProfile } from '@/lib/data';
import { Edit3, Save, X, Loader2 } from 'lucide-react';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>;
  isOwner: boolean;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  onSave,
  isOwner
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: profile.jobTitle || '',
    location: profile.location || '',
    professionalSummary: profile.professionalSummary || '',
    allowMessage: profile.allowMessage,
    allowVideoCall: profile.allowVideoCall
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      jobTitle: profile.jobTitle || '',
      location: profile.location || '',
      professionalSummary: profile.professionalSummary || '',
      allowMessage: profile.allowMessage,
      allowVideoCall: profile.allowVideoCall
    });
    setIsEditing(false);
  };

  if (!isOwner) {
    return null;
  }

  return (
    <div className="mb-6">
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg transition-colors duration-200"
        >
          <Edit3 size={16} />
          Edit Profile
        </button>
      ) : (
        <div className="bg-gray-800/20 border border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Edit Profile</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                <X size={16} />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1 text-sm bg-lime-600 hover:bg-lime-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center gap-1"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="e.g., Senior Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                placeholder="e.g., San Francisco, CA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Professional Summary
            </label>
            <textarea
              value={formData.professionalSummary}
              onChange={(e) => setFormData(prev => ({ ...prev, professionalSummary: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent resize-none"
              placeholder="Write a brief professional summary..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowMessage"
                checked={formData.allowMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, allowMessage: e.target.checked }))}
                className="w-4 h-4 text-lime-600 bg-gray-800 border-gray-600 rounded focus:ring-lime-500 focus:ring-2"
              />
              <label htmlFor="allowMessage" className="text-sm text-gray-300">
                Allow messages from visitors
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowVideoCall"
                checked={formData.allowVideoCall}
                onChange={(e) => setFormData(prev => ({ ...prev, allowVideoCall: e.target.checked }))}
                className="w-4 h-4 text-lime-600 bg-gray-800 border-gray-600 rounded focus:ring-lime-500 focus:ring-2"
              />
              <label htmlFor="allowVideoCall" className="text-sm text-gray-300">
                Allow video calls
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEditor;
