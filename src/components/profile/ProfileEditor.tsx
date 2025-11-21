'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/data';
import { Edit3, Save, X, Loader2, RefreshCw } from 'lucide-react';

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
  const [masterCVData, setMasterCVData] = useState<any>(null);
  const [hasUserModified, setHasUserModified] = useState({
    jobTitle: false,
    location: false,
    professionalSummary: false,
  });
  
  const [formData, setFormData] = useState({
    jobTitle: profile.jobTitle || '',
    location: profile.location || '',
    professionalSummary: profile.professionalSummary || '',
    allowMessage: profile.allowMessage,
    allowVideoCall: profile.allowVideoCall
  });

  // Fetch Master CV data and populate form if user hasn't modified fields
  useEffect(() => {
    const fetchMasterCV = async () => {
      try {
        console.log('🔍 ProfileEditor - Fetching master CV data for profile population');
        
        const response = await fetch('/api/cvs/master');
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 ProfileEditor - Master CV API response:', data);
          
          if (data.success && data.data?.masterCV) {
            const masterCV = data.data.masterCV;
            setMasterCVData(masterCV);
            
            console.log('🔍 ProfileEditor - Master CV data:', masterCV);
            
            // Only update fields that haven't been manually modified by user
            const updatedFormData = { ...formData };
            
            // Populate job title from label
            if (!hasUserModified.jobTitle && masterCV.cvData?.basics?.label) {
              updatedFormData.jobTitle = masterCV.cvData.basics.label.trim();
              console.log('🔍 ProfileEditor - Populated job title from master CV:', updatedFormData.jobTitle);
            }
            
            // Populate location
            if (!hasUserModified.location && masterCV.cvData?.basics?.location) {
              const location = masterCV.cvData.basics.location;
              const locationParts = [];
              if (location.city) locationParts.push(location.city);
              if (location.region) locationParts.push(location.region);
              if (location.address) locationParts.push(location.address);
              updatedFormData.location = locationParts.join(', ');
              console.log('🔍 ProfileEditor - Populated location from master CV:', updatedFormData.location);
            }
            
            // Populate professional summary
            if (!hasUserModified.professionalSummary && masterCV.cvData?.basics?.summary) {
              updatedFormData.professionalSummary = masterCV.cvData.basics.summary.trim();
              console.log('🔍 ProfileEditor - Populated professional summary from master CV');
            }
            
            setFormData(updatedFormData);
            console.log('✅ ProfileEditor - Successfully populated profile from master CV');
          } else {
            console.log('⚠️ ProfileEditor - No master CV found or API returned no data');
          }
        } else {
          console.error('❌ ProfileEditor - Failed to fetch master CV:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ ProfileEditor - Error fetching Master CV:', error);
      }
    };

    fetchMasterCV();
  }, []); // Only run once on mount

  // Function to refresh data from Master CV
  const refreshFromMasterCV = async () => {
    if (!masterCVData) return;
    
    console.log('🔄 ProfileEditor - Refreshing profile data from master CV');
    
    const updatedFormData = { ...formData };
    
    // Only update fields that haven't been manually modified by user
    if (!hasUserModified.jobTitle && masterCVData.cvData?.basics?.label) {
      updatedFormData.jobTitle = masterCVData.cvData.basics.label.trim();
    }
    
    if (!hasUserModified.location && masterCVData.cvData?.basics?.location) {
      const location = masterCVData.cvData.basics.location;
      const locationParts = [];
      if (location.city) locationParts.push(location.city);
      if (location.region) locationParts.push(location.region);
      if (location.address) locationParts.push(location.address);
      updatedFormData.location = locationParts.join(', ');
    }
    
    if (!hasUserModified.professionalSummary && masterCVData.cvData?.basics?.summary) {
      updatedFormData.professionalSummary = masterCVData.cvData.basics.summary.trim();
    }
    
    setFormData(updatedFormData);
    console.log('✅ ProfileEditor - Profile refreshed from master CV');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as user-modified to prevent Master CV from overriding it
    setHasUserModified(prev => ({ ...prev, [field]: true }));
  };

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
                onClick={refreshFromMasterCV}
                disabled={!masterCVData}
                className={`px-3 py-1 text-sm rounded-lg transition-colors duration-200 flex items-center gap-1 ${
                  masterCVData 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
                title={masterCVData ? "Sync profile data from your Master CV" : "No Master CV found"}
              >
                <RefreshCw size={16} />
                Sync
              </button>
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

          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
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
                onChange={(e) => handleInputChange('location', e.target.value)}
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
              onChange={(e) => handleInputChange('professionalSummary', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent resize-none"
              placeholder="Write a brief professional summary..."
            />
          </div>

          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
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
